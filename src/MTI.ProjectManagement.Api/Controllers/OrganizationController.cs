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
}
