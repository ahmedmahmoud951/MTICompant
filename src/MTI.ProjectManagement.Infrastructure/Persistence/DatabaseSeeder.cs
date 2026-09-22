using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(AppDbContext context, IPasswordHasher passwordHasher)
    {
        // 1. Seed Roles
        var roleNames = new[]
        {
            (Name: nameof(UserRoleType.SystemAdmin), Desc: "Full access to system settings and all operations"),
            (Name: nameof(UserRoleType.Admin), Desc: "Enterprise administration and resource management"),
            (Name: nameof(UserRoleType.ProjectManager), Desc: "Manage projects, sites, review submissions and tasks"),
            (Name: nameof(UserRoleType.Engineer), Desc: "Site-specific engineer access for data submissions and tasks"),
            (Name: nameof(UserRoleType.Viewer), Desc: "Read-only access to authorized resources")
        };

        var rolesMap = new Dictionary<string, Role>();
        foreach (var r in roleNames)
        {
            var role = await context.Roles.FirstOrDefaultAsync(x => x.Name == r.Name);
            if (role == null)
            {
                role = new Role
                {
                    Name = r.Name,
                    Description = r.Desc,
                    IsSystemRole = true,
                    CreatedAt = DateTime.UtcNow
                };
                context.Roles.Add(role);
                await context.SaveChangesAsync();
            }
            rolesMap[r.Name] = role;
        }

        // 2. Seed Permissions
        var permissionsMap = new Dictionary<string, Permission>();
        foreach (var code in Permissions.All)
        {
            var perm = await context.Permissions.FirstOrDefaultAsync(p => p.Code == code);
            if (perm == null)
            {
                var parts = code.Split('.');
                var module = parts.Length > 0 ? parts[0] : "General";
                var action = parts.Length > 1 ? parts[1] : code;

                perm = new Permission
                {
                    Code = code,
                    Name = $"{module} - {action}",
                    Module = module,
                    Description = $"Permission to {action} in {module}"
                };
                context.Permissions.Add(perm);
                await context.SaveChangesAsync();
            }
            permissionsMap[code] = perm;
        }

        // 3. Seed RolePermissions
        var adminRoles = new[] { rolesMap[nameof(UserRoleType.SystemAdmin)], rolesMap[nameof(UserRoleType.Admin)] };
        foreach (var role in adminRoles)
        {
            foreach (var perm in permissionsMap.Values)
            {
                var exists = await context.RolePermissions.AnyAsync(rp => rp.RoleId == role.Id && rp.PermissionId == perm.Id);
                if (!exists)
                {
                    context.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = perm.Id });
                }
            }
        }
        await context.SaveChangesAsync();

        // ProjectManager permissions
        var pmPermissions = new[]
        {
            Permissions.ProjectsView, Permissions.ProjectsCreate, Permissions.ProjectsUpdate,
            Permissions.SitesView, Permissions.SitesCreate, Permissions.SitesUpdate, Permissions.SitesAssign,
            Permissions.ProjectDataView, Permissions.ProjectDataApprove, Permissions.ProjectDataReject,
            Permissions.TasksView, Permissions.TasksCreate, Permissions.TasksUpdate, Permissions.TasksAssign,
            Permissions.ChatView, Permissions.ChatSend,
            Permissions.ReportsView, Permissions.ReportsExport
        };
        var pmRole = rolesMap[nameof(UserRoleType.ProjectManager)];
        foreach (var code in pmPermissions)
        {
            if (permissionsMap.TryGetValue(code, out var perm))
            {
                var exists = await context.RolePermissions.AnyAsync(rp => rp.RoleId == pmRole.Id && rp.PermissionId == perm.Id);
                if (!exists)
                {
                    context.RolePermissions.Add(new RolePermission { RoleId = pmRole.Id, PermissionId = perm.Id });
                }
            }
        }

        // Engineer permissions
        var engPermissions = new[]
        {
            Permissions.ProjectsView,
            Permissions.SitesView,
            Permissions.ProjectDataView, Permissions.ProjectDataCreate, Permissions.ProjectDataUpdate, Permissions.ProjectDataSubmit,
            Permissions.TasksView, Permissions.TasksUpdate,
            Permissions.ChatView, Permissions.ChatSend
        };
        var engRole = rolesMap[nameof(UserRoleType.Engineer)];
        foreach (var code in engPermissions)
        {
            if (permissionsMap.TryGetValue(code, out var perm))
            {
                var exists = await context.RolePermissions.AnyAsync(rp => rp.RoleId == engRole.Id && rp.PermissionId == perm.Id);
                if (!exists)
                {
                    context.RolePermissions.Add(new RolePermission { RoleId = engRole.Id, PermissionId = perm.Id });
                }
            }
        }

        // Viewer permissions
        var viewerPermissions = new[]
        {
            Permissions.ProjectsView, Permissions.SitesView, Permissions.ProjectDataView, Permissions.TasksView,
            Permissions.ChatView, Permissions.ReportsView
        };
        var viewerRole = rolesMap[nameof(UserRoleType.Viewer)];
        foreach (var code in viewerPermissions)
        {
            if (permissionsMap.TryGetValue(code, out var perm))
            {
                var exists = await context.RolePermissions.AnyAsync(rp => rp.RoleId == viewerRole.Id && rp.PermissionId == perm.Id);
                if (!exists)
                {
                    context.RolePermissions.Add(new RolePermission { RoleId = viewerRole.Id, PermissionId = perm.Id });
                }
            }
        }
        await context.SaveChangesAsync();

        // 4. Seed Users
        // Root Admin with username 'admin' and password 'admin'
        var rootAdmin = await context.Users.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Email.ToLower() == "admin");
        if (rootAdmin == null)
        {
            rootAdmin = new User
            {
                Email = "admin",
                FirstName = "System",
                LastName = "Administrator",
                PhoneNumber = "01000000000",
                PasswordHash = passwordHasher.HashPassword("admin"),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(rootAdmin);
            await context.SaveChangesAsync();

            context.UserRoles.Add(new UserRole { UserId = rootAdmin.Id, RoleId = rolesMap[nameof(UserRoleType.SystemAdmin)].Id });
            context.UserRoles.Add(new UserRole { UserId = rootAdmin.Id, RoleId = rolesMap[nameof(UserRoleType.Admin)].Id });
            await context.SaveChangesAsync();
        }
        else
        {
            rootAdmin.PasswordHash = passwordHasher.HashPassword("admin");
            rootAdmin.IsActive = true;
            rootAdmin.LockoutEnd = null;
            rootAdmin.AccessFailedCount = 0;
            
            // Ensure roles
            if (!rootAdmin.UserRoles.Any(ur => ur.RoleId == rolesMap[nameof(UserRoleType.SystemAdmin)].Id))
            {
                context.UserRoles.Add(new UserRole { UserId = rootAdmin.Id, RoleId = rolesMap[nameof(UserRoleType.SystemAdmin)].Id });
            }
            if (!rootAdmin.UserRoles.Any(ur => ur.RoleId == rolesMap[nameof(UserRoleType.Admin)].Id))
            {
                context.UserRoles.Add(new UserRole { UserId = rootAdmin.Id, RoleId = rolesMap[nameof(UserRoleType.Admin)].Id });
            }
            await context.SaveChangesAsync();
        }

        // Also ensure admin@mti.com exists with password 'admin'
        var adminUser = await context.Users.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Email == "admin@mti.com");
        if (adminUser == null)
        {
            adminUser = new User
            {
                Email = "admin@mti.com",
                FirstName = "MTI",
                LastName = "Administrator",
                PasswordHash = passwordHasher.HashPassword("admin"),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(adminUser);
            await context.SaveChangesAsync();

            context.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = rolesMap[nameof(UserRoleType.SystemAdmin)].Id });
            context.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = rolesMap[nameof(UserRoleType.Admin)].Id });
            await context.SaveChangesAsync();
        }
        else
        {
            adminUser.PasswordHash = passwordHasher.HashPassword("admin");
            adminUser.IsActive = true;
            adminUser.LockoutEnd = null;
            adminUser.AccessFailedCount = 0;
            await context.SaveChangesAsync();
        }

        // Engineer
        var engUser = await context.Users.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Email == "engineer@mti.com");
        if (engUser == null)
        {
            engUser = new User
            {
                Email = "engineer@mti.com",
                FirstName = "Ahmed",
                LastName = "Hassan",
                PhoneNumber = "+201000000001",
                PasswordHash = passwordHasher.HashPassword("Engineer@MTI2026!"),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(engUser);
            await context.SaveChangesAsync();

            context.UserRoles.Add(new UserRole { UserId = engUser.Id, RoleId = rolesMap[nameof(UserRoleType.Engineer)].Id });

            var profile = new EngineerProfile
            {
                UserId = engUser.Id,
                Specialization = "Civil Engineering",
                LicenseNumber = "EGY-ENG-9821"
            };
            context.EngineerProfiles.Add(profile);
            await context.SaveChangesAsync();
        }

        // Project Manager
        var pmUser = await context.Users.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Email == "pm@mti.com");
        if (pmUser == null)
        {
            pmUser = new User
            {
                Email = "pm@mti.com",
                FirstName = "Sarah",
                LastName = "Mahmoud",
                PhoneNumber = "+201000000002",
                PasswordHash = passwordHasher.HashPassword("Pm@MTI2026!"),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(pmUser);
            await context.SaveChangesAsync();

            context.UserRoles.Add(new UserRole { UserId = pmUser.Id, RoleId = rolesMap[nameof(UserRoleType.ProjectManager)].Id });
            await context.SaveChangesAsync();
        }

        // 5. Seed SystemSettings (SignalR & Platform)
        var settingsToSeed = new[]
        {
            ("SignalR", "HubEnabled", "true", "boolean", "Enables or disables real-time SignalR hubs"),
            ("SignalR", "HubPath", "/hubs/project", "string", "Relative path to project SignalR hub"),
            ("SignalR", "HubUrl", "https://mtiapi.runasp.net/hubs/project", "string", "Absolute SignalR Hub URL if external"),
            ("SignalR", "ReconnectEnabled", "true", "boolean", "Whether client should automatically reconnect"),
            ("SignalR", "AllowedOrigins", "http://localhost:3000,http://localhost:3001", "string", "Allowed CORS origins for SignalR"),
            ("Security", "MaxFailedLogins", "5", "int", "Maximum failed logins before account lockout"),
            ("Security", "LockoutMinutes", "15", "int", "Duration of lockout in minutes"),
            ("General", "CompanyName", "MTI Engineering Solutions", "string", "Company brand name")
        };

        foreach (var s in settingsToSeed)
        {
            var exists = await context.SystemSettings.AnyAsync(st => st.Category == s.Item1 && st.Key == s.Item2);
            if (!exists)
            {
                context.SystemSettings.Add(new SystemSetting
                {
                    Category = s.Item1,
                    Key = s.Item2,
                    Value = s.Item3,
                    DataType = s.Item4,
                    Description = s.Item5,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        await context.SaveChangesAsync();
    }
}
