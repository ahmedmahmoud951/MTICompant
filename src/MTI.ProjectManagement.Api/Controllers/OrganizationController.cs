using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Entities;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/organization")]
[Authorize]
public class OrganizationController : ControllerBase
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public OrganizationController(
        IAppDbContext context,
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
    // 1. Departments
    // ==========================================

    [HttpGet("departments")]
    public async Task<ActionResult<ApiResponse<List<DepartmentDto>>>> GetDepartments()
    {
        var depts = await _context.Departments
            .Include(d => d.Teams)
            .OrderBy(d => d.Code)
            .Select(d => new DepartmentDto(
                d.Id,
                d.Code,
                d.NameAr,
                d.NameEn,
                d.Description,
                d.IsActive,
                d.Teams.Count(t => t.IsActive)
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<DepartmentDto>>.SuccessResult(depts));
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
            return BadRequest(ApiResponse<DepartmentDto>.ErrorResult("Ø±Ù…Ø² Ø§Ù„Ù‚Ø³Ù… Ù…Ø³Ø¬Ù„ Ù…Ø³Ø¨Ù‚Ø§Ù‹"));
        }

        var dept = new Department
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            NameAr = request.NameAr.Trim(),
            NameEn = request.NameEn.Trim(),
            Description = request.Description?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Departments.Add(dept);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("CreateDepartment", "Department", dept.Id.ToString(), null, new
        {
            dept.Code,
            dept.NameAr
        });

        return Ok(ApiResponse<DepartmentDto>.SuccessResult(new DepartmentDto(
            dept.Id,
            dept.Code,
            dept.NameAr,
            dept.NameEn,
            dept.Description,
            dept.IsActive,
            0
        ), "ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù‚Ø³Ù… Ø¨Ù†Ø¬Ø§Ø­"));
    }

    // ==========================================
    // 2. Teams
    // ==========================================

    [HttpGet("teams")]
    public async Task<ActionResult<ApiResponse<List<TeamDto>>>> GetTeams([FromQuery] Guid? departmentId)
    {
        var query = _context.Teams
            .Include(t => t.Department)
            .Include(t => t.LeaderUser)
            .Include(t => t.Members)
            .AsQueryable();

        if (departmentId.HasValue)
        {
            query = query.Where(t => t.DepartmentId == departmentId.Value);
        }

        var teams = await query
            .OrderBy(t => t.Name)
            .Select(t => new TeamDto(
                t.Id,
                t.DepartmentId,
                t.Department.NameAr,
                t.Department.NameEn,
                t.Code,
                t.Name,
                t.Description,
                t.LeaderUserId,
                t.LeaderUser != null ? t.LeaderUser.FullName : null,
                t.IsActive,
                t.Members.Count(m => m.IsActive)
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<TeamDto>>.SuccessResult(teams));
    }

    [HttpPost("teams")]
    public async Task<ActionResult<ApiResponse<TeamDto>>> CreateTeam([FromBody] CreateTeamRequest request)
    {
        if (!HasPermission(Permissions.OrganizationManage) && !_currentUserService.IsAdmin)
        {
            return Forbid();
        }

        var dept = await _context.Departments.FindAsync(request.DepartmentId);
        if (dept == null) return BadRequest(ApiResponse<TeamDto>.ErrorResult("Ø§Ù„Ù‚Ø³Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯"));

        var team = new Team
        {
            DepartmentId = request.DepartmentId,
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            LeaderUserId = request.LeaderUserId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Teams.Add(team);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("CreateTeam", "Team", team.Id.ToString(), null, new
        {
            team.Code,
            team.Name,
            team.DepartmentId
        });

        return Ok(ApiResponse<TeamDto>.SuccessResult(new TeamDto(
            team.Id,
            team.DepartmentId,
            dept.NameAr,
            dept.NameEn,
            team.Code,
            team.Name,
            team.Description,
            team.LeaderUserId,
            null,
            team.IsActive,
            0
        ), "ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ÙØ±ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„ Ø¨Ù†Ø¬Ø§Ø­"));
    }

    // ==========================================
    // 3. Team Members
    // ==========================================

    [HttpGet("teams/{teamId:guid}/members")]
    public async Task<ActionResult<ApiResponse<List<TeamMemberDto>>>> GetTeamMembers(Guid teamId)
    {
        var members = await _context.TeamMembers
            .Include(m => m.User)
            .Where(m => m.TeamId == teamId && m.IsActive)
            .OrderBy(m => m.RoleInTeam)
            .Select(m => new TeamMemberDto(
                m.Id,
                m.TeamId,
                m.UserId,
                m.User.FullName,
                m.User.Email,
                m.RoleInTeam,
                m.JoinedAt,
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
        if (team == null) return NotFound(ApiResponse<TeamMemberDto>.ErrorResult("ÙØ±ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯"));

        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null) return BadRequest(ApiResponse<TeamMemberDto>.ErrorResult("Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯"));

        var existing = await _context.TeamMembers
            .FirstOrDefaultAsync(m => m.TeamId == teamId && m.UserId == request.UserId);

        if (existing != null)
        {
            if (existing.IsActive)
            {
                return BadRequest(ApiResponse<TeamMemberDto>.ErrorResult("Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¹Ø¶Ùˆ Ù…Ø³Ø¬Ù„ Ø¨Ø§Ù„ÙØ¹Ù„ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ÙØ±ÙŠÙ‚"));
            }

            existing.IsActive = true;
            existing.RoleInTeam = request.RoleInTeam.Trim();
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<TeamMemberDto>.SuccessResult(new TeamMemberDto(
                existing.Id,
                team.Id,
                user.Id,
                user.FullName,
                user.Email,
                existing.RoleInTeam,
                existing.JoinedAt,
                true
            ), "ØªÙ…Øª Ø¥Ø¹Ø§Ø¯Ø© ØªÙØ¹ÙŠÙ„ Ø¹Ø¶ÙˆÙŠØ© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙÙŠ Ø§Ù„ÙØ±ÙŠÙ‚ Ø¨Ù†Ø¬Ø§Ø­"));
        }

        var member = new TeamMember
        {
            TeamId = teamId,
            UserId = request.UserId,
            RoleInTeam = request.RoleInTeam.Trim(),
            JoinedAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.TeamMembers.Add(member);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("AddTeamMember", "TeamMember", member.Id.ToString(), null, new
        {
            member.TeamId,
            member.UserId,
            member.RoleInTeam
        });

        return Ok(ApiResponse<TeamMemberDto>.SuccessResult(new TeamMemberDto(
            member.Id,
            team.Id,
            user.Id,
            user.FullName,
            user.Email,
            member.RoleInTeam,
            member.JoinedAt,
            true
        ), "ØªÙ… Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¹Ø¶Ùˆ Ø¥Ù„Ù‰ ÙØ±ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„ Ø¨Ù†Ø¬Ø§Ø­"));
    }
}

