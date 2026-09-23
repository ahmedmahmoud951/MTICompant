using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Entities;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,SystemAdmin,ProjectManager")]
public class UsersController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditService _auditService;

    public UsersController(
        IAppDbContext dbContext,
        IPasswordHasher passwordHasher,
        IAuditService auditService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<List<AdminUserDto>>> GetAll(
        [FromQuery] string? role = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Users
            .AsNoTracking()
            .Where(u => !u.IsDeleted)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
        {
            query = query.Where(u => u.UserRoles.Any(ur => ur.Role.Name == role));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u => u.FirstName.ToLower().Contains(term) ||
                                     u.LastName.ToLower().Contains(term) ||
                                     u.Email.ToLower().Contains(term));
        }

        var users = await query
            .OrderBy(u => u.FirstName)
            .Select(u => new AdminUserDto(
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                u.PhoneNumber,
                u.JobTitle,
                u.IsActive,
                u.UserRoles.Select(ur => ur.Role.Name).ToList(),
                u.CreatedAt,
                u.LastLoginAt
            ))
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AdminUserDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == id && !u.IsDeleted)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(cancellationToken);

        if (user == null) return NotFound();

        return Ok(new AdminUserDto(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.PhoneNumber,
            user.JobTitle,
            user.IsActive,
            user.UserRoles.Select(ur => ur.Role.Name).ToList(),
            user.CreatedAt,
            user.LastLoginAt
        ));
    }

    [HttpPost]
    public async Task<ActionResult<AdminUserDto>> Create(
        [FromBody] CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        var exists = await _dbContext.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower() && !u.IsDeleted, cancellationToken: cancellationToken);
        if (exists) return BadRequest(new { message = "A user with this email address already exists." });

        var adminIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(adminIdString, out var adminId);

        var user = new User
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email.Trim().ToLower(),
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            PhoneNumber = request.PhoneNumber,
            JobTitle = request.JobTitle,
            IsActive = true,
            CreatedBy = adminId
        };

        var roleName = string.IsNullOrWhiteSpace(request.Role) ? "Engineer" : request.Role;
        var role = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Name == roleName, cancellationToken: cancellationToken);
        if (role != null)
        {
            user.UserRoles.Add(new UserRole { User = user, RoleId = role.Id });
        }

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "UserCreated",
            "User",
            user.Id.ToString(),
            null,
            new { user.Email, user.FirstName, user.LastName, user.JobTitle, Role = roleName },
            cancellationToken: cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, new AdminUserDto(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.PhoneNumber,
            user.JobTitle,
            user.IsActive,
            new List<string> { roleName },
            user.CreatedAt,
            null
        ));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AdminUserDto>> Update(
        Guid id,
        [FromBody] UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken: cancellationToken);

        if (user == null) return NotFound();

        var adminIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(adminIdString, out var adminId);

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.PhoneNumber = request.PhoneNumber;
        if (request.JobTitle != null) user.JobTitle = request.JobTitle;
        user.IsActive = request.IsActive;
        user.UpdatedBy = adminId;
        user.UpdatedAt = DateTime.UtcNow;

        if (request.Roles != null)
        {
            _dbContext.UserRoles.RemoveRange(user.UserRoles);
            user.UserRoles.Clear();

            var roles = await _dbContext.Roles.Where(r => request.Roles.Contains(r.Name)).ToListAsync(cancellationToken);
            foreach (var r in roles)
            {
                user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = r.Id });
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "UserUpdated",
            "User",
            user.Id.ToString(),
            null,
            new { user.FirstName, user.LastName, user.JobTitle, user.IsActive, request.Roles },
            cancellationToken: cancellationToken);

        var updatedRoles = await _dbContext.UserRoles
            .Where(ur => ur.UserId == user.Id)
            .Select(ur => ur.Role.Name)
            .ToListAsync(cancellationToken);

        return Ok(new AdminUserDto(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.PhoneNumber,
            user.JobTitle,
            user.IsActive,
            updatedRoles,
            user.CreatedAt,
            user.LastLoginAt
        ));
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(
        Guid id,
        [FromBody] AdminResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            return BadRequest(new { message = "Password must be at least 6 characters long." });

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken: cancellationToken);
        if (user == null) return NotFound();

        var adminIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(adminIdString, out var adminId);

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        user.UpdatedBy = adminId;
        user.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "ResetPassword",
            "User",
            user.Id.ToString(),
            null,
            new { Message = "Admin reset user password" },
            cancellationToken: cancellationToken);

        return Ok(new { success = true, message = "Password successfully reset." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken: cancellationToken);
        if (user == null) return NotFound();

        var adminIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(adminIdString, out var adminId);

        user.IsDeleted = true;
        user.IsActive = false;
        user.DeletedAt = DateTime.UtcNow;
        user.DeletedBy = adminId;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "UserDeleted",
            "User",
            user.Id.ToString(),
            null,
            new { user.Email },
            cancellationToken: cancellationToken);

        return NoContent();
    }

    // ==========================================
    // ADMIN-04: User Profile & Assignments
    // ==========================================

    [HttpGet("{id:guid}/profile")]
    public async Task<ActionResult<ApiResponse<AdminUserDetailDto>>> GetUserProfile(Guid id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .AsNoTracking()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserProfile).ThenInclude(up => up!.Department)
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);

        if (user == null) return NotFound(ApiResponse<AdminUserDetailDto>.Fail("User not found."));

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

        // Get permissions associated with roles
        var roleIds = user.UserRoles.Select(ur => ur.RoleId).ToList();
        var permissions = await _dbContext.RolePermissions
            .Where(rp => roleIds.Contains(rp.RoleId))
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToListAsync(cancellationToken);

        var teamsCount = await _dbContext.TeamMembers.CountAsync(tm => tm.UserId == id && tm.IsActive, cancellationToken);
        var projectsCount = await _dbContext.ProjectMembers.CountAsync(pm => pm.UserId == id && pm.IsActive && pm.RemovedAt == null, cancellationToken);
        var sitesCount = await _dbContext.SiteMembers.CountAsync(sm => sm.UserId == id && sm.IsActive && sm.RemovedAt == null, cancellationToken);

        var dto = new AdminUserDetailDto(
            user.Id,
            user.EmployeeCode ?? user.UserProfile?.EmployeeCode,
            user.FirstName,
            user.LastName,
            user.FullName,
            user.Email,
            user.PhoneNumber,
            user.JobTitle,
            user.IsActive,
            user.UserProfile?.HireDate,
            user.UserProfile?.DepartmentId,
            user.UserProfile?.Department?.NameAr,
            user.UserProfile?.ProfilePictureUrl,
            roles,
            permissions,
            user.CreatedAt,
            user.LastLoginAt,
            teamsCount,
            projectsCount,
            sitesCount
        );

        return Ok(ApiResponse<AdminUserDetailDto>.Ok(dto));
    }

    [HttpPut("{id:guid}/profile")]
    public async Task<ActionResult<ApiResponse<AdminUserDetailDto>>> UpdateUserProfile(Guid id, [FromBody] UpdateUserAdminRequest request, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserProfile)
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);

        if (user == null) return NotFound(ApiResponse<AdminUserDetailDto>.Fail("User not found."));

        var adminIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(adminIdString, out var adminId);

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.PhoneNumber = request.PhoneNumber?.Trim();
        user.JobTitle = request.JobTitle?.Trim();
        user.EmployeeCode = request.EmployeeCode?.Trim();
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = adminId;

        if (user.UserProfile == null)
        {
            user.UserProfile = new UserProfile
            {
                UserId = user.Id,
                EmployeeCode = request.EmployeeCode?.Trim(),
                DepartmentId = request.DepartmentId,
                HireDate = request.HireDate,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = adminId
            };
            _dbContext.UserProfiles.Add(user.UserProfile);
        }
        else
        {
            user.UserProfile.EmployeeCode = request.EmployeeCode?.Trim();
            user.UserProfile.DepartmentId = request.DepartmentId;
            user.UserProfile.HireDate = request.HireDate;
            user.UserProfile.UpdatedAt = DateTime.UtcNow;
            user.UserProfile.UpdatedBy = adminId;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("UpdateUserProfile", "User", user.Id.ToString(), null, new
        {
            user.FullName,
            user.JobTitle,
            user.EmployeeCode,
        }, cancellationToken: cancellationToken);

        return await GetUserProfile(id, cancellationToken);
    }

    [HttpGet("{id:guid}/assignments")]
    public async Task<ActionResult<ApiResponse<object>>> GetUserAssignments(Guid id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.FindAsync(new object[] { id }, cancellationToken);
        if (user == null || user.IsDeleted) return NotFound(ApiResponse<object>.Fail("User not found."));

        var departments = await _dbContext.DepartmentMembers
            .Include(dm => dm.Department)
            .Where(dm => dm.UserId == id)
            .OrderByDescending(dm => dm.IsActive)
            .Select(dm => new
            {
                dm.Id,
                dm.DepartmentId,
                DepartmentName = dm.Department.NameAr,
                dm.DepartmentRole,
                dm.IsPrimary,
                dm.JoinedAt,
                dm.LeftAt,
                dm.IsActive
            })
            .ToListAsync(cancellationToken);

        var teams = await _dbContext.TeamMembers
            .Include(tm => tm.Team).ThenInclude(t => t.Department)
            .Where(tm => tm.UserId == id)
            .OrderByDescending(tm => tm.IsActive)
            .Select(tm => new
            {
                tm.Id,
                tm.TeamId,
                TeamName = tm.Team.Name,
                TeamCode = tm.Team.Code,
                DepartmentName = tm.Team.Department.NameAr,
                tm.TeamRole,
                tm.IsPrimaryTeam,
                tm.JoinedAt,
                tm.LeftAt,
                tm.IsActive
            })
            .ToListAsync(cancellationToken);

        var projects = await _dbContext.ProjectMembers
            .Include(pm => pm.Project)
            .Where(pm => pm.UserId == id)
            .OrderByDescending(pm => pm.IsActive)
            .Select(pm => new
            {
                pm.Id,
                pm.ProjectId,
                ProjectName = pm.Project.Name,
                ProjectCode = pm.Project.Code,
                ProjectStatus = pm.Project.Status.ToString(),
                pm.ProjectRole,
                pm.IsPrimary,
                pm.AssignedAt,
                pm.RemovedAt,
                pm.IsActive
            })
            .ToListAsync(cancellationToken);

        var sites = await _dbContext.SiteMembers
            .Include(sm => sm.Site).ThenInclude(s => s.Project)
            .Where(sm => sm.UserId == id)
            .OrderByDescending(sm => sm.IsActive)
            .Select(sm => new
            {
                sm.Id,
                sm.SiteId,
                SiteName = sm.Site.Name,
                SiteCode = sm.Site.Code,
                ProjectName = sm.Site.Project.Name,
                SiteStatus = sm.Site.Status.ToString(),
                sm.SiteRole,
                sm.IsPrimary,
                sm.AssignedAt,
                sm.RemovedAt,
                sm.IsActive
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<object>.Ok(new
        {
            UserId = id,
            UserName = user.FullName,
            Departments = departments,
            Teams = teams,
            Projects = projects,
            Sites = sites
        }));
    }

    [HttpGet("{id:guid}/activity")]
    public async Task<ActionResult<ApiResponse<List<object>>>> GetUserActivity(Guid id, CancellationToken cancellationToken)
    {
        var logs = await _dbContext.AuditLogs
            .Where(a => a.UserId == id)
            .OrderByDescending(a => a.CreatedAt)
            .Take(100)
            .Select(a => new
            {
                a.Id,
                a.Action,
                a.EntityType,
                a.EntityId,
                a.ProjectId,
                a.SiteId,
                a.IpAddress,
                a.UserAgent,
                a.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<List<object>>.Ok(logs.Cast<object>().ToList()));
    }

    [HttpPost("{id:guid}/assign-department")]
    public async Task<ActionResult<ApiResponse<bool>>> AssignDepartment(Guid id, [FromBody] AssignUserDepartmentRequest request, CancellationToken cancellationToken)
    {
        var dept = await _dbContext.Departments.FindAsync(new object[] { request.DepartmentId }, cancellationToken);
        if (dept == null) return NotFound(ApiResponse<bool>.Fail("Department not found."));

        var user = await _dbContext.Users.FindAsync(new object[] { id }, cancellationToken);
        if (user == null || user.IsDeleted) return NotFound(ApiResponse<bool>.Fail("User not found."));

        var existing = await _dbContext.DepartmentMembers.FirstOrDefaultAsync(dm => dm.DepartmentId == request.DepartmentId && dm.UserId == id && dm.IsActive, cancellationToken);
        if (existing != null)
        {
            existing.DepartmentRole = request.DepartmentRole;
            existing.IsPrimary = request.IsPrimary;
        }
        else
        {
            _dbContext.DepartmentMembers.Add(new DepartmentMember
            {
                DepartmentId = request.DepartmentId,
                UserId = id,
                DepartmentRole = request.DepartmentRole,
                IsPrimary = request.IsPrimary,
                JoinedAt = DateTime.UtcNow,
                IsActive = true
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("AssignUserDepartment", "DepartmentMember", id.ToString(), null, request, cancellationToken: cancellationToken);

        return Ok(ApiResponse<bool>.Ok(true, "User assigned to department successfully."));
    }

    [HttpPost("{id:guid}/assign-team")]
    public async Task<ActionResult<ApiResponse<bool>>> AssignTeam(Guid id, [FromBody] AssignUserTeamRequest request, CancellationToken cancellationToken)
    {
        var team = await _dbContext.Teams.FindAsync(new object[] { request.TeamId }, cancellationToken);
        if (team == null) return NotFound(ApiResponse<bool>.Fail("Team not found."));

        var user = await _dbContext.Users.FindAsync(new object[] { id }, cancellationToken);
        if (user == null || user.IsDeleted) return NotFound(ApiResponse<bool>.Fail("User not found."));

        var existing = await _dbContext.TeamMembers.FirstOrDefaultAsync(tm => tm.TeamId == request.TeamId && tm.UserId == id && tm.IsActive, cancellationToken);
        if (existing != null)
        {
            existing.TeamRole = request.TeamRole;
            existing.IsPrimaryTeam = request.IsPrimaryTeam;
        }
        else
        {
            _dbContext.TeamMembers.Add(new TeamMember
            {
                TeamId = request.TeamId,
                UserId = id,
                TeamRole = request.TeamRole,
                IsPrimaryTeam = request.IsPrimaryTeam,
                JoinedAt = DateTime.UtcNow,
                IsActive = true
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("AssignUserTeam", "TeamMember", id.ToString(), null, new { request.TeamId, request.TeamRole }, cancellationToken: cancellationToken);

        return Ok(ApiResponse<bool>.Ok(true, "User assigned to team successfully."));
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<bool>>> ToggleUserStatus(Guid id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);
        if (user == null) return NotFound(ApiResponse<bool>.Fail("User not found."));

        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("ToggleUserStatus", "User", id.ToString(), null, new { user.Email, user.IsActive }, cancellationToken: cancellationToken);

        return Ok(ApiResponse<bool>.Ok(user.IsActive, $"User is now {(user.IsActive ? "Active" : "Inactive")}."));
    }
}


