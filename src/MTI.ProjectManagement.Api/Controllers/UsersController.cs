using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        var exists = await _dbContext.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower() && !u.IsDeleted, cancellationToken);
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
        var role = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Name == roleName, cancellationToken);
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
            cancellationToken);

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
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);

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
            cancellationToken);

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

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);
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
            cancellationToken);

        return Ok(new { success = true, message = "Password successfully reset." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);
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
            cancellationToken);

        return NoContent();
    }
}
