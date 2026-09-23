using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/organization")]
[Authorize]
public class OrganizationController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public OrganizationController(
        AppDbContext context,
        ICurrentUserService currentUserService,
        IAuditService auditService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _auditService = auditService;
    }

    private bool HasPermission(string permission)
    {
        return _currentUserService.IsAdmin ||
               _currentUserService.IsSystemAdmin ||
               _currentUserService.Permissions.Contains(permission);
    }

    // ==========================================
    // 1. Departments & Hierarchy (ORG-01)
    // ==========================================

    [HttpGet("departments")]
    public async Task<ActionResult<ApiResponse<List<DepartmentDto>>>> GetDepartments([FromQuery] bool includeInactive = false)
    {
        var query = _context.Departments
            .Include(d => d.ParentDepartment)
            .Include(d => d.ManagerUser)
            .Include(d => d.Teams)
            .Include(d => d.Members)
            .AsNoTracking()
            .AsQueryable();

        if (!includeInactive)
        {
            query = query.Where(d => d.IsActive);
        }

        var depts = await query
            .OrderBy(d => d.Code)
            .Select(d => new DepartmentDto(
                d.Id,
                d.Code,
                !string.IsNullOrWhiteSpace(d.NameAr) ? d.NameAr : d.NameEn,
                d.NameAr,
                d.NameEn,
                d.Description,
                d.ManagerUserId,
                d.ManagerUser != null ? d.ManagerUser.FullName : null,
                d.ParentDepartmentId,
                d.ParentDepartment != null ? (!string.IsNullOrWhiteSpace(d.ParentDepartment.NameAr) ? d.ParentDepartment.NameAr : d.ParentDepartment.NameEn) : null,
                d.IsActive,
                d.Teams.Count(t => t.IsActive),
                d.Members.Count(m => m.IsActive),
                d.CreatedAt
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<DepartmentDto>>.SuccessResult(depts));
    }

    [HttpGet("departments/tree")]
    public async Task<ActionResult<ApiResponse<List<DepartmentTreeDto>>>> GetDepartmentTree()
    {
        var allDepts = await _context.Departments
            .Include(d => d.ManagerUser)
            .Include(d => d.Teams)
            .Include(d => d.Members)
            .Where(d => d.IsActive)
            .AsNoTracking()
            .ToListAsync();

        var rootDepts = allDepts.Where(d => d.ParentDepartmentId == null).ToList();

        DepartmentTreeDto BuildNode(Department d)
        {
            var children = allDepts.Where(c => c.ParentDepartmentId == d.Id).Select(BuildNode).ToList();
            return new DepartmentTreeDto(
                d.Id,
                d.Code,
                !string.IsNullOrWhiteSpace(d.NameAr) ? d.NameAr : d.NameEn,
                d.Description,
                d.ManagerUserId,
                d.ManagerUser?.FullName,
                d.IsActive,
                d.Teams.Count(t => t.IsActive),
                d.Members.Count(m => m.IsActive),
                children
            );
        }

        var tree = rootDepts.Select(BuildNode).ToList();
        return Ok(ApiResponse<List<DepartmentTreeDto>>.SuccessResult(tree));
    }

    [HttpGet("departments/{id:guid}")]
    public async Task<ActionResult<ApiResponse<DepartmentDto>>> GetDepartmentById(Guid id)
    {
        var d = await _context.Departments
            .Include(d => d.ParentDepartment)
            .Include(d => d.ManagerUser)
            .Include(d => d.Teams)
            .Include(d => d.Members)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id);

        if (d == null) return NotFound(ApiResponse<DepartmentDto>.ErrorResult("القسم غير موجود"));

        var dto = new DepartmentDto(
            d.Id,
            d.Code,
            !string.IsNullOrWhiteSpace(d.NameAr) ? d.NameAr : d.NameEn,
            d.NameAr,
            d.NameEn,
            d.Description,
            d.ManagerUserId,
            d.ManagerUser?.FullName,
            d.ParentDepartmentId,
            d.ParentDepartment != null ? (!string.IsNullOrWhiteSpace(d.ParentDepartment.NameAr) ? d.ParentDepartment.NameAr : d.ParentDepartment.NameEn) : null,
            d.IsActive,
            d.Teams.Count(t => t.IsActive),
            d.Members.Count(m => m.IsActive),
            d.CreatedAt
        );

        return Ok(ApiResponse<DepartmentDto>.SuccessResult(dto));
    }

    [HttpPost("departments")]
    public async Task<ActionResult<ApiResponse<DepartmentDto>>> CreateDepartment([FromBody] CreateDepartmentRequest request)
    {
        if (!HasPermission(Permissions.OrganizationManage) && !_currentUserService.IsAdmin)
        {
            return Forbid();
        }

        var exists = await _context.Departments.AnyAsync(d => d.Code == request.Code);
        if (exists)
        {
            return BadRequest(ApiResponse<DepartmentDto>.ErrorResult("رمز القسم مسجل مسبقاً"));
        }

        if (request.ParentDepartmentId.HasValue)
        {
            var parentExists = await _context.Departments.AnyAsync(d => d.Id == request.ParentDepartmentId.Value);
            if (!parentExists)
            {
                return BadRequest(ApiResponse<DepartmentDto>.ErrorResult("القسم الرئيسي المحدد غير موجود"));
            }
        }

        var dept = new Department
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            NameAr = !string.IsNullOrWhiteSpace(request.NameAr) ? request.NameAr.Trim() : request.Name.Trim(),
            NameEn = !string.IsNullOrWhiteSpace(request.NameEn) ? request.NameEn.Trim() : request.Name.Trim(),
            Description = request.Description?.Trim(),
            ManagerUserId = request.ManagerUserId,
            ParentDepartmentId = request.ParentDepartmentId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = _currentUserService.UserId
        };

        _context.Departments.Add(dept);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("CreateDepartment", "Department", dept.Id.ToString(), null, new
        {
            dept.Code,
            dept.NameAr,
            dept.ParentDepartmentId,
            dept.ManagerUserId
        });

        return Ok(ApiResponse<DepartmentDto>.SuccessResult(new DepartmentDto(
            dept.Id,
            dept.Code,
            dept.NameAr,
            dept.NameAr,
            dept.NameEn,
            dept.Description,
            dept.ManagerUserId,
            null,
            dept.ParentDepartmentId,
            null,
            dept.IsActive,
            0,
            0,
            dept.CreatedAt
        ), "تم إنشاء القسم بنجاح"));
    }

    [HttpPut("departments/{id:guid}")]
    public async Task<ActionResult<ApiResponse<DepartmentDto>>> UpdateDepartment(Guid id, [FromBody] UpdateDepartmentRequest request)
    {
        if (!HasPermission(Permissions.OrganizationManage) && !_currentUserService.IsAdmin)
        {
            return Forbid();
        }

        var dept = await _context.Departments.FindAsync(id);
        if (dept == null) return NotFound(ApiResponse<DepartmentDto>.ErrorResult("القسم غير موجود"));

        if (request.ParentDepartmentId.HasValue && request.ParentDepartmentId.Value == id)
        {
            return BadRequest(ApiResponse<DepartmentDto>.ErrorResult("لا يمكن تعيين القسم كقسم رئيسي لنفسه"));
        }

        dept.NameAr = !string.IsNullOrWhiteSpace(request.NameAr) ? request.NameAr.Trim() : request.Name.Trim();
        dept.NameEn = !string.IsNullOrWhiteSpace(request.NameEn) ? request.NameEn.Trim() : request.Name.Trim();
        dept.Description = request.Description?.Trim();
        dept.ManagerUserId = request.ManagerUserId;
        dept.ParentDepartmentId = request.ParentDepartmentId;
        dept.IsActive = request.IsActive;
        dept.UpdatedAt = DateTime.UtcNow;
        dept.UpdatedBy = _currentUserService.UserId;

        await _context.SaveChangesAsync();

        await _auditService.LogAsync("UpdateDepartment", "Department", dept.Id.ToString(), null, new
        {
            dept.NameAr,
            dept.ManagerUserId,
            dept.ParentDepartmentId,
            dept.IsActive
        });

        return Ok(ApiResponse<DepartmentDto>.SuccessResult(new DepartmentDto(
            dept.Id,
            dept.Code,
            dept.NameAr,
            dept.NameAr,
            dept.NameEn,
            dept.Description,
            dept.ManagerUserId,
            null,
            dept.ParentDepartmentId,
            null,
            dept.IsActive,
            0,
            0,
            dept.CreatedAt
        ), "تم تحديث بيانات القسم بنجاح"));
    }

    // ==========================================
    // 2. Department Members (ORG-01)
    // ==========================================

    [HttpGet("departments/{departmentId:guid}/members")]
    public async Task<ActionResult<ApiResponse<List<DepartmentMemberDto>>>> GetDepartmentMembers(Guid departmentId, [FromQuery] bool includeHistorical = false)
    {
        var query = _context.DepartmentMembers
            .Include(m => m.Department)
            .Include(m => m.User)
            .Where(m => m.DepartmentId == departmentId)
            .AsNoTracking()
            .AsQueryable();

        if (!includeHistorical)
        {
            query = query.Where(m => m.IsActive);
        }

        var members = await query
            .OrderByDescending(m => m.IsPrimary)
            .ThenBy(m => m.DepartmentRole)
            .Select(m => new DepartmentMemberDto(
                m.Id,
                m.DepartmentId,
                !string.IsNullOrWhiteSpace(m.Department.NameAr) ? m.Department.NameAr : m.Department.NameEn,
                m.UserId,
                m.User.FullName,
                m.User.Email,
                m.DepartmentRole,
                m.IsPrimary,
                m.JoinedAt,
                m.LeftAt,
                m.IsActive
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<DepartmentMemberDto>>.SuccessResult(members));
    }

    [HttpPost("departments/{departmentId:guid}/members")]
    public async Task<ActionResult<ApiResponse<DepartmentMemberDto>>> AddDepartmentMember(Guid departmentId, [FromBody] AddDepartmentMemberRequest request)
    {
        if (!HasPermission(Permissions.OrganizationManage) && !_currentUserService.IsAdmin)
        {
            return Forbid();
        }

        var dept = await _context.Departments.FindAsync(departmentId);
        if (dept == null) return NotFound(ApiResponse<DepartmentMemberDto>.ErrorResult("القسم غير موجود"));

        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null) return BadRequest(ApiResponse<DepartmentMemberDto>.ErrorResult("المستخدم غير موجود"));

        // Check if user already has active membership in this department
        var existing = await _context.DepartmentMembers
            .FirstOrDefaultAsync(m => m.DepartmentId == departmentId && m.UserId == request.UserId);

        if (existing != null)
        {
            if (existing.IsActive)
            {
                return BadRequest(ApiResponse<DepartmentMemberDto>.ErrorResult("المستخدم مسجل بالفعل في هذا القسم"));
            }

            // Re-activate historical record
            existing.IsActive = true;
            existing.LeftAt = null;
            existing.DepartmentRole = request.DepartmentRole;
            existing.IsPrimary = request.IsPrimary;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<DepartmentMemberDto>.SuccessResult(new DepartmentMemberDto(
                existing.Id,
                dept.Id,
                dept.NameAr,
                user.Id,
                user.FullName,
                user.Email,
                existing.DepartmentRole,
                existing.IsPrimary,
                existing.JoinedAt,
                existing.LeftAt,
                existing.IsActive
            ), "تم إعادة تفعيل عضوية المستخدم في القسم"));
        }

        // If primary, ensure user has only one primary department
        if (request.IsPrimary)
        {
            var primaryMemberships = await _context.DepartmentMembers
                .Where(m => m.UserId == request.UserId && m.IsActive && m.IsPrimary)
                .ToListAsync();

            foreach (var pm in primaryMemberships)
            {
                pm.IsPrimary = false;
            }
        }

        var member = new DepartmentMember
        {
            DepartmentId = departmentId,
            UserId = request.UserId,
            DepartmentRole = request.DepartmentRole,
            IsPrimary = request.IsPrimary,
            JoinedAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.DepartmentMembers.Add(member);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("AddDepartmentMember", "DepartmentMember", member.Id.ToString(), null, new
        {
            member.DepartmentId,
            member.UserId,
            member.DepartmentRole,
            member.IsPrimary
        });

        return Ok(ApiResponse<DepartmentMemberDto>.SuccessResult(new DepartmentMemberDto(
            member.Id,
            dept.Id,
            dept.NameAr,
            user.Id,
            user.FullName,
            user.Email,
            member.DepartmentRole,
            member.IsPrimary,
            member.JoinedAt,
            null,
            member.IsActive
        ), "تم إضافة العضو إلى القسم بنجاح"));
    }

    [HttpDelete("departments/{departmentId:guid}/members/{memberId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveDepartmentMember(Guid departmentId, Guid memberId)
    {
        if (!HasPermission(Permissions.OrganizationManage) && !_currentUserService.IsAdmin)
        {
            return Forbid();
        }

        var member = await _context.DepartmentMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.DepartmentId == departmentId);
        if (member == null) return NotFound(ApiResponse<bool>.ErrorResult("عضوية القسم غير موجودة"));

        // RULE ORG-01: Do not delete historical department membership. Use inactive/end-date behavior.
        member.IsActive = false;
        member.LeftAt = DateTime.UtcNow;
        member.IsPrimary = false;
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("RemoveDepartmentMember", "DepartmentMember", member.Id.ToString(), null, new
        {
            member.DepartmentId,
            member.UserId,
            member.LeftAt
        });

        return Ok(ApiResponse<bool>.SuccessResult(true, "تم إنهاء عضوية القسم وحفظ السجل التاريخي"));
    }

    [HttpGet("users/{userId:guid}/departments")]
    public async Task<ActionResult<ApiResponse<List<DepartmentMemberDto>>>> GetUserDepartments(Guid userId)
    {
        var memberships = await _context.DepartmentMembers
            .Include(m => m.Department)
            .Include(m => m.User)
            .Where(m => m.UserId == userId && m.IsActive)
            .OrderByDescending(m => m.IsPrimary)
            .Select(m => new DepartmentMemberDto(
                m.Id,
                m.DepartmentId,
                !string.IsNullOrWhiteSpace(m.Department.NameAr) ? m.Department.NameAr : m.Department.NameEn,
                m.UserId,
                m.User.FullName,
                m.User.Email,
                m.DepartmentRole,
                m.IsPrimary,
                m.JoinedAt,
                m.LeftAt,
                m.IsActive
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<DepartmentMemberDto>>.SuccessResult(memberships));
    }

    // ==========================================
    // 3. Teams & Roles (ORG-02)
    // ==========================================

    [HttpGet("teams")]
    public async Task<ActionResult<ApiResponse<List<TeamDto>>>> GetTeams([FromQuery] Guid? departmentId, [FromQuery] bool includeInactive = false)
    {
        var query = _context.Teams
            .Include(t => t.Department)
            .Include(t => t.ManagerUser)
            .Include(t => t.AssistantManagerUser)
            .Include(t => t.SupervisorUser)
            .Include(t => t.Members)
            .AsNoTracking()
            .AsQueryable();

        if (departmentId.HasValue)
        {
            query = query.Where(t => t.DepartmentId == departmentId.Value);
        }

        if (!includeInactive)
        {
            query = query.Where(t => t.IsActive);
        }

        var teams = await query
            .OrderBy(t => t.Name)
            .Select(t => new TeamDto(
                t.Id,
                t.DepartmentId,
                !string.IsNullOrWhiteSpace(t.Department.NameAr) ? t.Department.NameAr : t.Department.NameEn,
                t.Code,
                t.Name,
                t.Description,
                t.ManagerUserId,
                t.ManagerUser != null ? t.ManagerUser.FullName : null,
                t.AssistantManagerUserId,
                t.AssistantManagerUser != null ? t.AssistantManagerUser.FullName : null,
                t.SupervisorUserId,
                t.SupervisorUser != null ? t.SupervisorUser.FullName : null,
                t.IsActive,
                t.Members.Count(m => m.IsActive),
                t.CreatedAt
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<TeamDto>>.SuccessResult(teams));
    }

    [HttpGet("teams/{id:guid}")]
    public async Task<ActionResult<ApiResponse<TeamDto>>> GetTeamById(Guid id)
    {
        var t = await _context.Teams
            .Include(t => t.Department)
            .Include(t => t.ManagerUser)
            .Include(t => t.AssistantManagerUser)
            .Include(t => t.SupervisorUser)
            .Include(t => t.Members)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);

        if (t == null) return NotFound(ApiResponse<TeamDto>.ErrorResult("فريق العمل غير موجود"));

        var dto = new TeamDto(
            t.Id,
            t.DepartmentId,
            !string.IsNullOrWhiteSpace(t.Department.NameAr) ? t.Department.NameAr : t.Department.NameEn,
            t.Code,
            t.Name,
            t.Description,
            t.ManagerUserId,
            t.ManagerUser?.FullName,
            t.AssistantManagerUserId,
            t.AssistantManagerUser?.FullName,
            t.SupervisorUserId,
            t.SupervisorUser?.FullName,
            t.IsActive,
            t.Members.Count(m => m.IsActive),
            t.CreatedAt
        );

        return Ok(ApiResponse<TeamDto>.SuccessResult(dto));
    }

    [HttpPost("teams")]
    public async Task<ActionResult<ApiResponse<TeamDto>>> CreateTeam([FromBody] CreateTeamRequest request)
    {
        if (!HasPermission(Permissions.OrganizationManage) && !_currentUserService.IsAdmin)
        {
            return Forbid();
        }

        var dept = await _context.Departments.FindAsync(request.DepartmentId);
        if (dept == null) return BadRequest(ApiResponse<TeamDto>.ErrorResult("القسم المحدد غير موجود"));

        var team = new Team
        {
            DepartmentId = request.DepartmentId,
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            ManagerUserId = request.ManagerUserId,
            AssistantManagerUserId = request.AssistantManagerUserId,
            SupervisorUserId = request.SupervisorUserId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = _currentUserService.UserId
        };

        _context.Teams.Add(team);
        await _context.SaveChangesAsync();

        // If team manager is assigned, automatically ensure membership in team with role 'Manager'
        if (request.ManagerUserId.HasValue)
        {
            var isMember = await _context.TeamMembers.AnyAsync(tm => tm.TeamId == team.Id && tm.UserId == request.ManagerUserId.Value);
            if (!isMember)
            {
                _context.TeamMembers.Add(new TeamMember
                {
                    TeamId = team.Id,
                    UserId = request.ManagerUserId.Value,
                    TeamRole = "Manager",
                    IsActive = true,
                    JoinedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }
        }

        await _auditService.LogAsync("CreateTeam", "Team", team.Id.ToString(), null, new
        {
            team.Code,
            team.Name,
            team.DepartmentId,
            team.ManagerUserId
        });

        return Ok(ApiResponse<TeamDto>.SuccessResult(new TeamDto(
            team.Id,
            team.DepartmentId,
            dept.NameAr,
            team.Code,
            team.Name,
            team.Description,
            team.ManagerUserId,
            null,
            team.AssistantManagerUserId,
            null,
            team.SupervisorUserId,
            null,
            team.IsActive,
            1,
            team.CreatedAt
        ), "تم إنشاء فريق العمل بنجاح"));
    }

    [HttpPut("teams/{id:guid}")]
    public async Task<ActionResult<ApiResponse<TeamDto>>> UpdateTeam(Guid id, [FromBody] UpdateTeamRequest request)
    {
        if (!HasPermission(Permissions.OrganizationManage) && !_currentUserService.IsAdmin)
        {
            return Forbid();
        }

        var team = await _context.Teams.FindAsync(id);
        if (team == null) return NotFound(ApiResponse<TeamDto>.ErrorResult("فريق العمل غير موجود"));

        team.Name = request.Name.Trim();
        team.Description = request.Description?.Trim();
        team.ManagerUserId = request.ManagerUserId;
        team.AssistantManagerUserId = request.AssistantManagerUserId;
        team.SupervisorUserId = request.SupervisorUserId;
        team.IsActive = request.IsActive;
        team.UpdatedAt = DateTime.UtcNow;
        team.UpdatedBy = _currentUserService.UserId;

        await _context.SaveChangesAsync();

        return Ok(ApiResponse<TeamDto>.SuccessResult(new TeamDto(
            team.Id,
            team.DepartmentId,
            "",
            team.Code,
            team.Name,
            team.Description,
            team.ManagerUserId,
            null,
            team.AssistantManagerUserId,
            null,
            team.SupervisorUserId,
            null,
            team.IsActive,
            0,
            team.CreatedAt
        ), "تم تحديث بيانات الفريق بنجاح"));
    }

    // ==========================================
    // 4. Team Members (ORG-02)
    // ==========================================

    [HttpGet("teams/{teamId:guid}/members")]
    public async Task<ActionResult<ApiResponse<List<TeamMemberDto>>>> GetTeamMembers(Guid teamId, [FromQuery] bool includeHistorical = false)
    {
        var query = _context.TeamMembers
            .Include(m => m.Team)
            .Include(m => m.User)
            .Where(m => m.TeamId == teamId)
            .AsNoTracking()
            .AsQueryable();

        if (!includeHistorical)
        {
            query = query.Where(m => m.IsActive);
        }

        var members = await query
            .OrderBy(m => m.TeamRole)
            .Select(m => new TeamMemberDto(
                m.Id,
                m.TeamId,
                m.Team.Name,
                m.UserId,
                m.User.FullName,
                m.User.Email,
                m.TeamRole,
                m.IsPrimaryTeam,
                m.JoinedAt,
                m.LeftAt,
                m.IsActive
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<TeamMemberDto>>.SuccessResult(members));
    }

    [HttpPost("teams/{teamId:guid}/members")]
    public async Task<ActionResult<ApiResponse<TeamMemberDto>>> AddTeamMember(Guid teamId, [FromBody] AddTeamMemberRequest request)
    {
        if (!HasPermission(Permissions.OrganizationManage) && !_currentUserService.IsAdmin)
        {
            return Forbid();
        }

        var team = await _context.Teams.FindAsync(teamId);
        if (team == null) return NotFound(ApiResponse<TeamMemberDto>.ErrorResult("فريق العمل غير موجود"));

        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null) return BadRequest(ApiResponse<TeamMemberDto>.ErrorResult("المستخدم غير موجود"));

        var existing = await _context.TeamMembers
            .FirstOrDefaultAsync(m => m.TeamId == teamId && m.UserId == request.UserId);

        if (existing != null)
        {
            if (existing.IsActive)
            {
                return BadRequest(ApiResponse<TeamMemberDto>.ErrorResult("المستخدم مسجل بالفعل في هذا الفريق"));
            }

            existing.IsActive = true;
            existing.LeftAt = null;
            existing.TeamRole = request.TeamRole.Trim();
            existing.IsPrimaryTeam = request.IsPrimaryTeam;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<TeamMemberDto>.SuccessResult(new TeamMemberDto(
                existing.Id,
                team.Id,
                team.Name,
                user.Id,
                user.FullName,
                user.Email,
                existing.TeamRole,
                existing.IsPrimaryTeam,
                existing.JoinedAt,
                existing.LeftAt,
                existing.IsActive
            ), "تم إعادة تفعيل عضوية المستخدم في الفريق"));
        }

        var member = new TeamMember
        {
            TeamId = teamId,
            UserId = request.UserId,
            TeamRole = request.TeamRole.Trim(),
            IsPrimaryTeam = request.IsPrimaryTeam,
            JoinedAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.TeamMembers.Add(member);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("AddTeamMember", "TeamMember", member.Id.ToString(), null, new
        {
            member.TeamId,
            member.UserId,
            member.TeamRole
        });

        return Ok(ApiResponse<TeamMemberDto>.SuccessResult(new TeamMemberDto(
            member.Id,
            team.Id,
            team.Name,
            user.Id,
            user.FullName,
            user.Email,
            member.TeamRole,
            member.IsPrimaryTeam,
            member.JoinedAt,
            null,
            member.IsActive
        ), "تم إضافة العضو إلى الفريق بنجاح"));
    }

    [HttpDelete("teams/{teamId:guid}/members/{memberId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveTeamMember(Guid teamId, Guid memberId)
    {
        if (!HasPermission(Permissions.OrganizationManage) && !_currentUserService.IsAdmin)
        {
            return Forbid();
        }

        var member = await _context.TeamMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.TeamId == teamId);
        if (member == null) return NotFound(ApiResponse<bool>.ErrorResult("عضو الفريق غير موجود"));

        // RULE ORG-02: Do not delete historical membership, use inactive/end-date
        member.IsActive = false;
        member.LeftAt = DateTime.UtcNow;
        member.IsPrimaryTeam = false;
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("RemoveTeamMember", "TeamMember", member.Id.ToString(), null, new
        {
            member.TeamId,
            member.UserId,
            member.LeftAt
        });

        return Ok(ApiResponse<bool>.SuccessResult(true, "تم إنهاء عضوية الفريق وحفظ السجل التاريخي"));
    }

    [HttpGet("users/{userId:guid}/teams")]
    public async Task<ActionResult<ApiResponse<List<TeamMemberDto>>>> GetUserTeams(Guid userId)
    {
        var memberships = await _context.TeamMembers
            .Include(m => m.Team)
            .Include(m => m.User)
            .Where(m => m.UserId == userId && m.IsActive)
            .OrderByDescending(m => m.IsPrimaryTeam)
            .Select(m => new TeamMemberDto(
                m.Id,
                m.TeamId,
                m.Team.Name,
                m.UserId,
                m.User.FullName,
                m.User.Email,
                m.TeamRole,
                m.IsPrimaryTeam,
                m.JoinedAt,
                m.LeftAt,
                m.IsActive
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<TeamMemberDto>>.SuccessResult(memberships));
    }

    // ==========================================
    // 5. Configurable Roles Reference
    // ==========================================

    [HttpGet("roles")]
    public ActionResult<ApiResponse<OrganizationRolesDto>> GetConfigurableRoles()
    {
        var roles = new OrganizationRolesDto(
            DepartmentRoles: new List<string> { "Manager", "Supervisor", "TechnicalLead", "Member", "Coordinator", "Viewer" },
            TeamRoles: new List<string> { "Manager", "Supervisor", "Engineer", "SeniorEngineer", "Technician", "Developer", "Support", "Coordinator", "Viewer" },
            ProjectRoles: new List<string> { "ProjectManager", "ProjectCoordinator", "SiteManager", "SiteEngineer", "SoftwareEngineer", "NetworkEngineer", "AccessControlEngineer", "CCTVEngineer", "TechnicalOffice", "Accountant", "Procurement", "Viewer" },
            SiteRoles: new List<string> { "SiteManager", "SiteSupervisor", "SiteEngineer", "Technician", "Installer", "Programmer", "MaintenanceEngineer", "Viewer" }
        );

        return Ok(ApiResponse<OrganizationRolesDto>.SuccessResult(roles));
    }

    // ==========================================
    // 6. ORG-06: RACI Responsibility Matrix
    // ==========================================

    [HttpGet("raci/{resourceType}/{resourceId:guid}")]
    public async Task<ActionResult<ApiResponse<RaciMatrixDto>>> GetRaciMatrix(string resourceType, Guid resourceId)
    {
        var responsibilities = await _context.ResourceResponsibilities
            .Include(r => r.User)
            .Include(r => r.Team)
            .Include(r => r.AssignedByUser)
            .Where(r => r.ResourceType.ToLower() == resourceType.ToLower() && r.ResourceId == resourceId && r.IsActive)
            .ToListAsync();

        string? resourceName = null;
        if (resourceType.Equals("Project", StringComparison.OrdinalIgnoreCase))
        {
            resourceName = await _context.Projects.Where(p => p.Id == resourceId).Select(p => p.Name).FirstOrDefaultAsync();
        }
        else if (resourceType.Equals("Site", StringComparison.OrdinalIgnoreCase))
        {
            resourceName = await _context.Sites.Where(s => s.Id == resourceId).Select(s => s.Name).FirstOrDefaultAsync();
        }

        var dtos = responsibilities.Select(r => new ResourceResponsibilityDto(
            r.Id,
            r.ResourceType,
            r.ResourceId,
            resourceName,
            r.UserId,
            r.User?.FullName,
            r.User?.Email,
            r.TeamId,
            r.Team?.Name,
            r.ResponsibilityType,
            r.AssignedBy,
            r.AssignedByUser?.FullName,
            r.CreatedAt,
            r.IsActive,
            r.Notes
        )).ToList();

        var matrix = new RaciMatrixDto(
            resourceId,
            resourceType,
            resourceName,
            dtos.Where(d => d.ResponsibilityType.Equals("Responsible", StringComparison.OrdinalIgnoreCase)).ToList(),
            dtos.Where(d => d.ResponsibilityType.Equals("Accountable", StringComparison.OrdinalIgnoreCase)).ToList(),
            dtos.Where(d => d.ResponsibilityType.Equals("Consulted", StringComparison.OrdinalIgnoreCase)).ToList(),
            dtos.Where(d => d.ResponsibilityType.Equals("Informed", StringComparison.OrdinalIgnoreCase)).ToList()
        );

        return Ok(ApiResponse<RaciMatrixDto>.SuccessResult(matrix));
    }

    [HttpPost("raci")]
    public async Task<ActionResult<ApiResponse<ResourceResponsibilityDto>>> AssignResponsibility([FromBody] AssignResponsibilityRequest request)
    {
        if (!request.UserId.HasValue && !request.TeamId.HasValue)
        {
            return BadRequest(ApiResponse<ResourceResponsibilityDto>.ErrorResult("يجب تحديد مستخدم أو فريق للإسناد"));
        }

        var responsibility = new ResourceResponsibility
        {
            ResourceType = request.ResourceType,
            ResourceId = request.ResourceId,
            UserId = request.UserId,
            TeamId = request.TeamId,
            ResponsibilityType = request.ResponsibilityType,
            AssignedBy = _currentUserService.UserId,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.ResourceResponsibilities.Add(responsibility);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("AssignRaciResponsibility", "ResourceResponsibility", responsibility.Id.ToString(), null, new
        {
            responsibility.ResourceType,
            responsibility.ResourceId,
            responsibility.UserId,
            responsibility.TeamId,
            responsibility.ResponsibilityType
        });

        var user = request.UserId.HasValue ? await _context.Users.FindAsync(request.UserId.Value) : null;
        var team = request.TeamId.HasValue ? await _context.Teams.FindAsync(request.TeamId.Value) : null;

        var dto = new ResourceResponsibilityDto(
            responsibility.Id,
            responsibility.ResourceType,
            responsibility.ResourceId,
            null,
            responsibility.UserId,
            user?.FullName,
            user?.Email,
            responsibility.TeamId,
            team?.Name,
            responsibility.ResponsibilityType,
            responsibility.AssignedBy,
            null,
            responsibility.CreatedAt,
            responsibility.IsActive,
            responsibility.Notes
        );

        return Ok(ApiResponse<ResourceResponsibilityDto>.SuccessResult(dto, "تم إسناد المسؤولية بنجاح"));
    }

    [HttpDelete("raci/{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveResponsibility(Guid id)
    {
        var item = await _context.ResourceResponsibilities.FindAsync(id);
        if (item == null) return NotFound(ApiResponse<bool>.ErrorResult("المسؤولية غير موجودة"));

        // Historical preservation: soft inactive
        item.IsActive = false;
        item.LeftAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("RemoveRaciResponsibility", "ResourceResponsibility", id.ToString());

        return Ok(ApiResponse<bool>.SuccessResult(true, "تم إنهاء المسؤولية بنجاح مع حفظ السجل التاريخي"));
    }

    // ==========================================
    // 7. ORG-07: Team Manager Scoped Operations
    // ==========================================

    [HttpGet("teams/{teamId:guid}/manager-scope")]
    public async Task<ActionResult<ApiResponse<object>>> GetTeamManagerScope(Guid teamId)
    {
        var team = await _context.Teams
            .Include(t => t.Department)
            .Include(t => t.ManagerUser)
            .Include(t => t.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(t => t.Id == teamId);

        if (team == null) return NotFound(ApiResponse<object>.ErrorResult("الفريق غير موجود"));

        var isTeamManager = _currentUserService.UserId.HasValue &&
            (team.ManagerUserId == _currentUserService.UserId.Value ||
             team.AssistantManagerUserId == _currentUserService.UserId.Value ||
             team.SupervisorUserId == _currentUserService.UserId.Value ||
             _currentUserService.IsAdmin ||
             _currentUserService.IsSystemAdmin);

        if (!isTeamManager) return Forbid();

        var memberUserIds = team.Members.Where(m => m.IsActive).Select(m => m.UserId).ToList();

        // Assigned projects for this team
        var assignedProjects = await _context.ProjectTeams
            .Include(pt => pt.Project)
            .Where(pt => pt.TeamId == teamId && pt.IsActive)
            .Select(pt => new
            {
                pt.ProjectId,
                pt.Project.Code,
                pt.Project.Name,
                pt.Project.Status,
                pt.TeamRole,
                pt.AssignedAt
            })
            .ToListAsync();

        // Assigned sites for this team
        var assignedSites = await _context.SiteTeams
            .Include(st => st.Site).ThenInclude(s => s.Project)
            .Where(st => st.TeamId == teamId && st.IsActive)
            .Select(st => new
            {
                st.SiteId,
                st.Site.Code,
                st.Site.Name,
                st.Site.ProjectId,
                ProjectName = st.Site.Project.Name,
                st.Site.Status,
                st.TeamRole,
                st.AssignedAt
            })
            .ToListAsync();

        // Tasks assigned to team members
        var teamTasks = await _context.Tasks
            .Include(t => t.Project)
            .Where(t => memberUserIds.Contains(t.AssigneeId ?? Guid.Empty) && !t.IsDeleted)
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .Select(t => new
            {
                t.Id,
                t.Title,
                t.Status,
                t.Priority,
                t.AssigneeId,
                AssigneeName = t.Assignee != null ? t.Assignee.FullName : null,
                t.ProjectId,
                ProjectName = t.Project != null ? t.Project.Name : null,
                t.DueDate,
                IsOverdue = t.DueDate.HasValue && t.DueDate.Value < DateTime.UtcNow && t.Status != Domain.Enums.TaskItemStatus.Completed
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.SuccessResult(new
        {
            Team = new
            {
                team.Id,
                team.Name,
                team.Code,
                DepartmentName = team.Department.NameAr,
                ManagerName = team.ManagerUser?.FullName,
                MembersCount = team.Members.Count(m => m.IsActive)
            },
            AssignedProjects = assignedProjects,
            AssignedSites = assignedSites,
            RecentTasks = teamTasks
        }));
    }

    // ==========================================
    // 8. ORG-08: Workload Management
    // ==========================================

    [HttpGet("workload/users")]
    public async Task<ActionResult<ApiResponse<List<UserWorkloadDto>>>> GetUsersWorkload(
        [FromQuery] Guid? departmentId = null,
        [FromQuery] Guid? teamId = null)
    {
        var usersQuery = _context.Users.AsNoTracking().Where(u => u.IsActive && !u.IsDeleted);

        if (departmentId.HasValue)
        {
            var deptUserIds = await _context.DepartmentMembers
                .Where(dm => dm.DepartmentId == departmentId.Value && dm.IsActive)
                .Select(dm => dm.UserId)
                .ToListAsync();
            usersQuery = usersQuery.Where(u => deptUserIds.Contains(u.Id));
        }

        if (teamId.HasValue)
        {
            var teamUserIds = await _context.TeamMembers
                .Where(tm => tm.TeamId == teamId.Value && tm.IsActive)
                .Select(tm => tm.UserId)
                .ToListAsync();
            usersQuery = usersQuery.Where(u => teamUserIds.Contains(u.Id));
        }

        var users = await usersQuery.ToListAsync();
        var userIds = users.Select(u => u.Id).ToList();

        var now = DateTime.UtcNow;

        var projectCounts = await _context.ProjectMembers
            .Where(pm => userIds.Contains(pm.UserId) && pm.IsActive && pm.RemovedAt == null)
            .GroupBy(pm => pm.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Select(x => x.ProjectId).Distinct().Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count);

        var siteCounts = await _context.SiteMembers
            .Where(sm => userIds.Contains(sm.UserId) && sm.IsActive && sm.RemovedAt == null)
            .GroupBy(sm => sm.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Select(x => x.SiteId).Distinct().Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count);

        var tasksStats = await _context.Tasks
            .Where(t => userIds.Contains(t.AssigneeId ?? Guid.Empty) && !t.IsDeleted)
            .GroupBy(t => t.AssigneeId!.Value)
            .Select(g => new
            {
                UserId = g.Key,
                Open = g.Count(x => x.Status != Domain.Enums.TaskItemStatus.Completed && x.Status != Domain.Enums.TaskItemStatus.Cancelled),
                Completed = g.Count(x => x.Status == Domain.Enums.TaskItemStatus.Completed),
                Overdue = g.Count(x => x.Status != Domain.Enums.TaskItemStatus.Completed && x.DueDate.HasValue && x.DueDate.Value < now),
                UpcomingDeadlines = g.Count(x => x.Status != Domain.Enums.TaskItemStatus.Completed && x.DueDate.HasValue && x.DueDate.Value >= now && x.DueDate.Value <= now.AddDays(7))
            })
            .ToDictionaryAsync(x => x.UserId, x => x);

        var list = users.Select(u =>
        {
            projectCounts.TryGetValue(u.Id, out var pCount);
            siteCounts.TryGetValue(u.Id, out var sCount);
            tasksStats.TryGetValue(u.Id, out var tStat);

            return new UserWorkloadDto(
                u.Id,
                u.FullName,
                u.Email,
                u.JobTitle,
                null,
                pCount,
                sCount,
                tStat?.Open ?? 0,
                tStat?.Overdue ?? 0,
                tStat?.UpcomingDeadlines ?? 0,
                0,
                tStat?.Completed ?? 0
            );
        }).OrderByDescending(w => w.OpenTasksCount).ToList();

        return Ok(ApiResponse<List<UserWorkloadDto>>.SuccessResult(list));
    }

    [HttpGet("workload/teams")]
    public async Task<ActionResult<ApiResponse<List<TeamWorkloadDto>>>> GetTeamsWorkload([FromQuery] Guid? departmentId = null)
    {
        var teamsQuery = _context.Teams
            .Include(t => t.ManagerUser)
            .Include(t => t.Members).ThenInclude(m => m.User)
            .Where(t => t.IsActive);

        if (departmentId.HasValue)
        {
            teamsQuery = teamsQuery.Where(t => t.DepartmentId == departmentId.Value);
        }

        var teams = await teamsQuery.ToListAsync();
        var now = DateTime.UtcNow;

        var teamList = new List<TeamWorkloadDto>();

        foreach (var team in teams)
        {
            var memberIds = team.Members.Where(m => m.IsActive).Select(m => m.UserId).ToList();

            var activeProjectsCount = await _context.ProjectTeams
                .Where(pt => pt.TeamId == team.Id && pt.IsActive && pt.RemovedAt == null)
                .Select(pt => pt.ProjectId)
                .Distinct()
                .CountAsync();

            var activeSitesCount = await _context.SiteTeams
                .Where(st => st.TeamId == team.Id && st.IsActive && st.RemovedAt == null)
                .Select(st => st.SiteId)
                .Distinct()
                .CountAsync();

            var teamTasks = await _context.Tasks
                .Where(t => memberIds.Contains(t.AssigneeId ?? Guid.Empty) && !t.IsDeleted)
                .ToListAsync();

            var openTasks = teamTasks.Count(x => x.Status != Domain.Enums.TaskItemStatus.Completed && x.Status != Domain.Enums.TaskItemStatus.Cancelled);
            var overdueTasks = teamTasks.Count(x => x.Status != Domain.Enums.TaskItemStatus.Completed && x.DueDate.HasValue && x.DueDate.Value < now);
            var completedTasks = teamTasks.Count(x => x.Status == Domain.Enums.TaskItemStatus.Completed);

            teamList.Add(new TeamWorkloadDto(
                team.Id,
                team.Name,
                team.Code,
                team.ManagerUser?.FullName,
                memberIds.Count,
                activeProjectsCount,
                activeSitesCount,
                openTasks,
                overdueTasks,
                completedTasks,
                new List<UserWorkloadDto>()
            ));
        }

        return Ok(ApiResponse<List<TeamWorkloadDto>>.SuccessResult(teamList.OrderByDescending(t => t.OpenTasksCount).ToList()));
    }

    [HttpGet("workload/projects")]
    public async Task<ActionResult<ApiResponse<List<ProjectWorkloadDto>>>> GetProjectsWorkload()
    {
        var now = DateTime.UtcNow;
        var projects = await _context.Projects
            .Where(p => !p.IsDeleted)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ProjectWorkloadDto(
                p.Id,
                p.Name,
                p.Code,
                p.Members.Count(m => m.IsActive && m.RemovedAt == null),
                p.Teams.Count(t => t.IsActive && t.RemovedAt == null),
                p.Tasks.Count(t => !t.IsDeleted),
                p.Tasks.Count(t => !t.IsDeleted && t.Status != Domain.Enums.TaskItemStatus.Completed && t.Status != Domain.Enums.TaskItemStatus.Cancelled),
                p.Tasks.Count(t => !t.IsDeleted && t.Status != Domain.Enums.TaskItemStatus.Completed && t.DueDate.HasValue && t.DueDate.Value < now),
                p.Tasks.Count(t => !t.IsDeleted && t.Status == Domain.Enums.TaskItemStatus.Completed)
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<ProjectWorkloadDto>>.SuccessResult(projects));
    }

    // ==========================================
    // 9. ORG-09: Temporary Responsibility Delegation
    // ==========================================

    [HttpGet("delegations")]
    public async Task<ActionResult<ApiResponse<List<DelegationDto>>>> GetDelegations(
        [FromQuery] string? scopeType = null,
        [FromQuery] Guid? scopeId = null,
        [FromQuery] Guid? delegateUserId = null)
    {
        var query = _context.Delegations
            .Include(d => d.User)
            .Include(d => d.DelegateUser)
            .Include(d => d.CreatedByUser)
            .Where(d => d.IsActive)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(scopeType))
        {
            query = query.Where(d => d.ScopeType.ToLower() == scopeType.ToLower());
        }

        if (scopeId.HasValue)
        {
            query = query.Where(d => d.ScopeId == scopeId.Value);
        }

        if (delegateUserId.HasValue)
        {
            query = query.Where(d => d.DelegateUserId == delegateUserId.Value);
        }

        var delegations = await query.OrderByDescending(d => d.CreatedAt).ToListAsync();
        var now = DateTime.UtcNow;

        var dtos = delegations.Select(d => new DelegationDto(
            d.Id,
            d.UserId,
            d.User.FullName,
            d.User.Email,
            d.DelegateUserId,
            d.DelegateUser.FullName,
            d.DelegateUser.Email,
            d.ScopeType,
            d.ScopeId,
            null,
            d.Role,
            d.Permissions,
            d.StartAt,
            d.EndAt,
            d.CreatedBy,
            d.CreatedByUser?.FullName,
            d.CreatedAt,
            d.IsActive,
            d.IsCurrentlyActive,
            d.Reason
        )).ToList();

        return Ok(ApiResponse<List<DelegationDto>>.SuccessResult(dtos));
    }

    [HttpPost("delegations")]
    public async Task<ActionResult<ApiResponse<DelegationDto>>> CreateDelegation([FromBody] CreateDelegationRequest request)
    {
        if (request.StartAt >= request.EndAt)
        {
            return BadRequest(ApiResponse<DelegationDto>.ErrorResult("تاريخ البداية يجب أن يكون قبل تاريخ الانتهاء"));
        }

        var delegatorId = _currentUserService.UserId;
        if (!delegatorId.HasValue) return Unauthorized();

        var delegateUser = await _context.Users.FindAsync(request.DelegateUserId);
        if (delegateUser == null || !delegateUser.IsActive)
        {
            return BadRequest(ApiResponse<DelegationDto>.ErrorResult("المستخدم المفوض إليه غير صالح أو معطل"));
        }

        var delegation = new Delegation
        {
            UserId = delegatorId.Value,
            DelegateUserId = request.DelegateUserId,
            ScopeType = request.ScopeType,
            ScopeId = request.ScopeId,
            Role = request.Role,
            Permissions = request.Permissions != null ? System.Text.Json.JsonSerializer.Serialize(request.Permissions) : null,
            StartAt = request.StartAt,
            EndAt = request.EndAt,
            Reason = request.Reason,
            CreatedBy = delegatorId.Value,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.Delegations.Add(delegation);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("CreateDelegation", "Delegation", delegation.Id.ToString(), null, new
        {
            delegation.UserId,
            delegation.DelegateUserId,
            delegation.ScopeType,
            delegation.ScopeId,
            delegation.StartAt,
            delegation.EndAt
        });

        var delegatorUser = await _context.Users.FindAsync(delegatorId.Value);

        var dto = new DelegationDto(
            delegation.Id,
            delegation.UserId,
            delegatorUser?.FullName ?? "",
            delegatorUser?.Email ?? "",
            delegation.DelegateUserId,
            delegateUser.FullName,
            delegateUser.Email,
            delegation.ScopeType,
            delegation.ScopeId,
            null,
            delegation.Role,
            delegation.Permissions,
            delegation.StartAt,
            delegation.EndAt,
            delegation.CreatedBy,
            delegatorUser?.FullName,
            delegation.CreatedAt,
            delegation.IsActive,
            delegation.IsCurrentlyActive,
            delegation.Reason
        );

        return Ok(ApiResponse<DelegationDto>.SuccessResult(dto, "تم إنشاء التفويض بنجاح"));
    }

    [HttpDelete("delegations/{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> RevokeDelegation(Guid id)
    {
        var delegation = await _context.Delegations.FindAsync(id);
        if (delegation == null) return NotFound(ApiResponse<bool>.ErrorResult("التفويض غير موجود"));

        delegation.IsActive = false;
        delegation.RevokedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("RevokeDelegation", "Delegation", id.ToString());

        return Ok(ApiResponse<bool>.SuccessResult(true, "تم إلغاء التفويض بنجاح"));
    }
}
