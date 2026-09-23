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
            (Name: nameof(UserRoleType.Viewer), Desc: "Read-only access to authorized resources"),
            (Name: nameof(UserRoleType.Accountant), Desc: "Accounting workspace: invoices, approved BOQs, commercial records")
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

        // 2. Seed Permissions (case-insensitive — SQL unique index is CI)
        var permissionsMap = new Dictionary<string, Permission>(StringComparer.OrdinalIgnoreCase);
        foreach (var code in Permissions.All.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var perm = await context.Permissions.FirstOrDefaultAsync(p => p.Code == code);
            if (perm == null)
            {
                // Also check CI collision (e.g. Boq.View vs BOQ.View)
                perm = await context.Permissions
                    .FirstOrDefaultAsync(p => p.Code.ToLower() == code.ToLower());
            }
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
        var pendingRolePerms = new HashSet<(Guid RoleId, Guid PermissionId)>();
        foreach (var role in adminRoles)
        {
            foreach (var perm in permissionsMap.Values.DistinctBy(p => p.Id))
            {
                var key = (role.Id, perm.Id);
                if (pendingRolePerms.Contains(key)) continue;
                var exists = await context.RolePermissions.AnyAsync(rp => rp.RoleId == role.Id && rp.PermissionId == perm.Id);
                if (!exists)
                {
                    context.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = perm.Id });
                    pendingRolePerms.Add(key);
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
            Permissions.BoqView, Permissions.BoqManage,
            Permissions.OffersView, Permissions.OffersManage, Permissions.OffersApprove,
            Permissions.InvoicesView, Permissions.InvoicesManage,
            Permissions.MaterialsView, Permissions.MaterialsRequest, Permissions.MaterialsApprove,
            Permissions.AssetsView, Permissions.AssetsManage,
            Permissions.GovernanceView, Permissions.GovernanceManage,
            Permissions.DocumentsView, Permissions.DocumentsCreate, Permissions.DocumentsUpdate, Permissions.DocumentsApprove, Permissions.DocumentsCorrect,
            Permissions.MilestonesView, Permissions.MilestonesManage,
            Permissions.OrganizationView,
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
            Permissions.ChatView, Permissions.ChatSend,
            Permissions.BoqView,
            Permissions.OffersView,
            Permissions.InvoicesView,
            Permissions.MaterialsView, Permissions.MaterialsRequest,
            Permissions.AssetsView,
            Permissions.GovernanceView,
            Permissions.DocumentsView, Permissions.DocumentsCreate, Permissions.DocumentsUpdate,
            Permissions.MilestonesView,
            Permissions.OrganizationView
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
            Permissions.ChatView, Permissions.ReportsView,
            Permissions.BoqView, Permissions.OffersView, Permissions.InvoicesView,
            Permissions.MaterialsView, Permissions.AssetsView, Permissions.GovernanceView
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

        // Accountant isolated permissions (ACCOUNTING-01)
        var accountantPermissions = new[]
        {
            Permissions.AccountingViewInvoices,
            Permissions.AccountingDownloadInvoices,
            Permissions.AccountingViewApprovedBOQ,
            Permissions.AccountingDownloadApprovedBOQ,
            Permissions.AccountingViewPurchaseOrders,
            Permissions.AccountingViewCommercialDocuments,
            Permissions.InvoicesView,
            Permissions.BoqView,
            Permissions.OffersView,
            Permissions.ReportsView,
            Permissions.ReportsExport
        };
        var accountantRole = rolesMap[nameof(UserRoleType.Accountant)];
        foreach (var code in accountantPermissions)
        {
            if (permissionsMap.TryGetValue(code, out var perm))
            {
                var exists = await context.RolePermissions.AnyAsync(rp => rp.RoleId == accountantRole.Id && rp.PermissionId == perm.Id);
                if (!exists)
                {
                    context.RolePermissions.Add(new RolePermission { RoleId = accountantRole.Id, PermissionId = perm.Id });
                }
            }
        }
        await context.SaveChangesAsync();

        // 4. Seed Users
        // Root Admin with username 'admin' — create only if missing; NEVER reset existing password
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
            // Do NOT reset admin password if already exists with a different hash
            rootAdmin.IsActive = true;
            if (!rootAdmin.UserRoles.Any(ur => ur.RoleId == rolesMap[nameof(UserRoleType.SystemAdmin)].Id))
                context.UserRoles.Add(new UserRole { UserId = rootAdmin.Id, RoleId = rolesMap[nameof(UserRoleType.SystemAdmin)].Id });
            if (!rootAdmin.UserRoles.Any(ur => ur.RoleId == rolesMap[nameof(UserRoleType.Admin)].Id))
                context.UserRoles.Add(new UserRole { UserId = rootAdmin.Id, RoleId = rolesMap[nameof(UserRoleType.Admin)].Id });
            await context.SaveChangesAsync();
        }

        // Also ensure admin@mti.com exists — create only; skip password reset on existing
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
            // Do NOT reset password on existing admin@mti.com
            adminUser.IsActive = true;
            if (!adminUser.UserRoles.Any(ur => ur.RoleId == rolesMap[nameof(UserRoleType.SystemAdmin)].Id))
                context.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = rolesMap[nameof(UserRoleType.SystemAdmin)].Id });
            if (!adminUser.UserRoles.Any(ur => ur.RoleId == rolesMap[nameof(UserRoleType.Admin)].Id))
                context.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = rolesMap[nameof(UserRoleType.Admin)].Id });
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

        // 6. Seed Standard Document Types
        var docTypesToSeed = new[]
        {
            ("SiteSheet", "شيت موقع", "Site Sheet", "Daily site progress and inspection logs"),
            ("DailyReport", "تقرير يومي", "Daily Report", "Daily site execution reports"),
            ("InstallationReport", "تقرير تركيب", "Installation Report", "CCTV, Access Control, and Networking installation records"),
            ("TechnicalOffer", "عرض فني", "Technical Offer", "Technical specs and scope proposals"),
            ("BOQ", "جدول كميات", "Bill of Quantities", "Project bill of quantities and priced items"),
            ("Quotation", "عرض أسعار", "Quotation", "Commercial proposals and price quotations"),
            ("Invoice", "فاتورة", "Invoice", "Client progress invoices and billing certificates"),
            ("Drawing", "مخططات ورسومات", "Engineering Drawing", "As-built and schematic CAD drawings"),
            ("Datasheet", "صحيفة بيانات فنية", "Datasheet", "Product and material manufacturer specs"),
            ("MethodStatement", "بيان طريقة العمل", "Method Statement", "Standard operating procedures for site execution"),
            ("TestingReport", "تقرير اختبار وفحص", "Testing Report", "Testing and commissioning quality checks"),
            ("HandoverDocument", "وثيقة تسليم", "Handover Document", "Preliminary and final acceptance certificates"),
            ("MaintenanceReport", "تقرير صيانة", "Maintenance Report", "Preventive and corrective maintenance logs"),
            ("SoftwareRelease", "إصدار برمجي", "Software Release", "Software deployment notes and deliverables"),
            ("Configuration", "إعدادات وتهيئة", "Configuration File", "Network switch, NVR, and access controller configs"),
            ("Other", "مستندات أخرى", "Other Document", "General project attachments and correspondence")
        };

        foreach (var dt in docTypesToSeed)
        {
            var exists = await context.DocumentTypes.AnyAsync(x => x.Code == dt.Item1);
            if (!exists)
            {
                context.DocumentTypes.Add(new DocumentType
                {
                    Code = dt.Item1,
                    NameAr = dt.Item2,
                    NameEn = dt.Item3,
                    Description = dt.Item4,
                    IsActive = true
                });
            }
        }
        await context.SaveChangesAsync();

        // 7. Seed Departments
        var deptsToSeed = new[]
        {
            ("DEPT-MGMT", "الإدارة العامة", "Executive Management", "Company leadership and general administration"),
            ("DEPT-ENG", "الهندسة والمشاريع", "Engineering & Operations", "Site engineers, low-current supervisors and field operations"),
            ("DEPT-SOFT", "تطوير البرمجيات والأنظمة", "Software Engineering", "Web, mobile, and backend system development"),
            ("DEPT-TO", "المكتب الفني", "Technical Office", "Tendering, BOQ preparation, shop drawings and technical offers"),
            ("DEPT-ACC", "الحسابات والمالية", "Finance & Accounting", "Invoicing, cost control and billing"),
            ("DEPT-PROC", "المشتريات والتوريد", "Procurement & Logistics", "Material sourcing, site delivery and stock management"),
            ("DEPT-MAINT", "الصيانة والتشغيل", "Maintenance & Support", "Warranty support, SLA contracts and preventive site visits")
        };

        foreach (var d in deptsToSeed)
        {
            var exists = await context.Departments.AnyAsync(x => x.Code == d.Item1);
            if (!exists)
            {
                context.Departments.Add(new Department
                {
                    Code = d.Item1,
                    NameAr = d.Item2,
                    NameEn = d.Item3,
                    Description = d.Item4,
                    IsActive = true
                });
            }
        }
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// DB-SEED: Rich fake sample data — Development only. Uses *@dev.mti.local emails
    /// and password Dev@MTI2026! (never production passwords).
    /// </summary>
    public static async Task SeedDevelopmentSampleDataAsync(AppDbContext context, IPasswordHasher passwordHasher)
    {
        const string devPassword = "Dev@MTI2026!";

        // Ensure roles exist (may have been created by Program.cs role seed)
        async Task<Role> EnsureRole(string name, string desc)
        {
            var role = await context.Roles.FirstOrDefaultAsync(r => r.Name == name);
            if (role != null) return role;
            role = new Role { Name = name, Description = desc, IsSystemRole = true, CreatedAt = DateTime.UtcNow };
            context.Roles.Add(role);
            await context.SaveChangesAsync();
            return role;
        }

        var accountingRole = await EnsureRole("Accounting", "Accounting workspace");
        var technicalOfficeRole = await EnsureRole("TechnicalOffice", "Technical office");
        var siteEngineerRole = await EnsureRole("SiteEngineer", "Site engineer");
        var viewerRole = await EnsureRole(nameof(UserRoleType.Viewer), "Read-only viewer");

        async Task<User> EnsureDevUser(string email, string first, string last, Role role)
        {
            var user = await context.Users.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Email == email);
            if (user != null) return user;
            user = new User
            {
                Email = email,
                FirstName = first,
                LastName = last,
                PasswordHash = passwordHasher.HashPassword(devPassword),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();
            context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
            await context.SaveChangesAsync();
            return user;
        }

        var accountingUser = await EnsureDevUser("accounting@dev.mti.local", "Fake", "Accountant", accountingRole);
        var technicalUser = await EnsureDevUser("technical@dev.mti.local", "Fake", "TechnicalOffice", technicalOfficeRole);
        var siteEngUser = await EnsureDevUser("site-engineer@dev.mti.local", "Fake", "SiteEngineer", siteEngineerRole);
        var viewerUser = await EnsureDevUser("viewer@dev.mti.local", "Fake", "Viewer", viewerRole);
        _ = accountingUser; _ = technicalUser; _ = viewerUser;

        // Ensure Submittal + ClientRequirement document types
        foreach (var (code, nameAr, nameEn) in new[]
        {
            ("Submittal", "مستند تقديم", "Submittal"),
            ("ClientRequirement", "متطلبات العميل", "Client Requirement")
        })
        {
            if (!await context.DocumentTypes.AnyAsync(x => x.Code == code))
            {
                context.DocumentTypes.Add(new DocumentType
                {
                    Code = code,
                    NameAr = nameAr,
                    NameEn = nameEn,
                    Description = $"Dev seed: {nameEn}",
                    IsActive = true
                });
            }
        }
        await context.SaveChangesAsync();

        // 1-2 fake projects / sites / tasks / documents / boq / assets / notifications
        if (!await context.Projects.AnyAsync(p => p.Code == "DEV-PRJ-001"))
        {
            var project = new Project
            {
                Code = "DEV-PRJ-001",
                Name = "Dev Sample Project Alpha",
                Description = "Clearly fake development project — do not use in production",
                ClientName = "Fake Client Dev",
                Status = ProjectStatus.Active,
                Priority = ProjectPriority.Medium,
                Type = ProjectType.GeneralEngineering,
                StartDate = DateTime.UtcNow.Date.AddDays(-30),
                EndDate = DateTime.UtcNow.Date.AddDays(120),
                CreatedAt = DateTime.UtcNow
            };
            context.Projects.Add(project);
            await context.SaveChangesAsync();

            var site = new Site
            {
                ProjectId = project.Id,
                Code = "DEV-SITE-01",
                Name = "Dev Sample Site Cairo",
                Description = "Fake site for local development",
                Address = "123 Dev Street, Cairo",
                Status = SiteStatus.Active,
                CreatedAt = DateTime.UtcNow
            };
            context.Sites.Add(site);
            await context.SaveChangesAsync();

            context.SiteAssignments.Add(new SiteAssignment
            {
                SiteId = site.Id,
                UserId = siteEngUser.Id,
                Role = "PrimaryEngineer",
                IsPrimary = true,
                AssignedAt = DateTime.UtcNow
            });
            context.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = project.Id,
                UserId = siteEngUser.Id,
                Role = "Engineer",
                JoinedAt = DateTime.UtcNow
            });

            context.Tasks.Add(new TaskItem
            {
                ProjectId = project.Id,
                SiteId = site.Id,
                Title = "Dev Task: Install CCTV cameras",
                Description = "Fake development task",
                Status = TaskItemStatus.InProgress,
                Priority = TaskPriority.High,
                AssignedToUserId = siteEngUser.Id,
                DueAt = DateTime.UtcNow.AddDays(3),
                CreatedAt = DateTime.UtcNow
            });
            context.Tasks.Add(new TaskItem
            {
                ProjectId = project.Id,
                SiteId = site.Id,
                Title = "Dev Task: Overdue wiring check",
                Description = "Fake overdue task for dashboard testing",
                Status = TaskItemStatus.ToDo,
                Priority = TaskPriority.Medium,
                AssignedToUserId = siteEngUser.Id,
                DueAt = DateTime.UtcNow.AddDays(-2),
                CreatedAt = DateTime.UtcNow
            });

            var drawingType = await context.DocumentTypes.FirstAsync(d => d.Code == "Drawing");
            context.Documents.Add(new Document
            {
                DocumentNumber = "DEV-DOC-001",
                ProjectId = project.Id,
                SiteId = site.Id,
                DocumentTypeId = drawingType.Id,
                Title = "Dev Sample Drawing",
                Description = "Fake document",
                OwnerUserId = siteEngUser.Id,
                UploadedBy = siteEngUser.Id,
                Status = DocumentStatus.Submitted,
                EditableUntil = DateTime.UtcNow.AddHours(20),
                CreatedAt = DateTime.UtcNow
            });

            context.BoqItems.Add(new BoqItem
            {
                ProjectId = project.Id,
                SiteId = site.Id,
                ItemCode = "DEV-BOQ-01",
                Description = "Fake BOQ item — CCTV camera",
                Unit = "pcs",
                Quantity = 10,
                UnitPrice = 1500,
                Category = "CCTV",
                CreatedAt = DateTime.UtcNow
            });

            context.CompanyAssets.Add(new CompanyAsset
            {
                AssetTag = "DEV-AST-001",
                Name = "Dev Sample Fluke Meter",
                Brand = "FakeBrand",
                Model = "DEV-100",
                SerialNumber = "DEV-SN-0001",
                Category = "TestingEquipment",
                ProjectId = project.Id,
                AssignedToSiteId = site.Id,
                AssignedToUserId = siteEngUser.Id,
                Status = AssetStatus.AssignedToEngineer,
                CreatedAt = DateTime.UtcNow
            });

            context.Notifications.Add(new Notification
            {
                UserId = siteEngUser.Id,
                Type = NotificationType.TaskAssigned,
                Title = "Dev notification",
                Body = "Fake notification for local development",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            // Second lightweight project
            var project2 = new Project
            {
                Code = "DEV-PRJ-002",
                Name = "Dev Sample Project Beta",
                Description = "Second fake development project",
                ClientName = "Fake Client Beta",
                Status = ProjectStatus.Planning,
                CreatedAt = DateTime.UtcNow
            };
            context.Projects.Add(project2);
            await context.SaveChangesAsync();
        }

        await context.SaveChangesAsync();
    }
}

