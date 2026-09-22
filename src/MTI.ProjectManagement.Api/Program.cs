using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Infrastructure;
using MTI.ProjectManagement.Infrastructure.Persistence;
using MTI.ProjectManagement.Infrastructure.SignalR;
using MTI.ProjectManagement.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

// 1. Add Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();

// 2. Swagger with JWT Support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MTI Project Management System API",
        Version = "v1",
        Description = "Enterprise Backend API for MTI Engineering Solutions Project & Site Monitoring Platform"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
});

// 3. Infrastructure Services & EF Core
builder.Services.AddInfrastructureServices(builder.Configuration);

// 4. JWT Authentication & SignalR Token Support
var jwtSecret = builder.Configuration["Jwt:SecretKey"] ?? "MTI_ENGINEERING_SOLUTIONS_SUPER_SECURE_JWT_KEY_2026_PRODUCTION_READY_AUTHENTICATION_TOKEN";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "MTI.ProjectManagement.Api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "MTI.ProjectManagement.Client";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    // Support token query string for SignalR WebSocket connection
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// 5. CORS Configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// 6. Automatic Database Seeding on Startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        var hasher = services.GetRequiredService<IPasswordHasher>();
        await DatabaseSeeder.SeedAsync(context, hasher);
        logger.LogInformation("Database seed check completed successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while seeding the database: {Message}", ex.Message);
    }
}

// 7. Middleware Pipeline
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseStaticFiles();

// Always enable Swagger UI in Development and Production
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "MTI Project Management API v1");
    c.RoutePrefix = "swagger";
    c.HeadContent = "<style>.swagger-ui .topbar { background-color: #0b0f19 !important; border-bottom: 2px solid #0284c7; } .swagger-ui .topbar .topbar-wrapper a svg { display: none !important; } .swagger-ui .topbar .topbar-wrapper a::before { content: ''; display: inline-block; background-image: url('/images/CompanyLogo.png'); background-size: contain; background-repeat: no-repeat; width: 150px; height: 44px; vertical-align: middle; }</style>";
});

// Friendly browser inspection for SignalR hubs (runs before routing to prevent 401 when clicking in browser)
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value?.ToLower() ?? "";
    if ((path == "/hubs/project" || path == "/hubs/events" || path == "/hubs/chat-hub" || path == "/hubs/project-hub")
        && context.Request.Method == "GET"
        && !context.Request.Headers.Upgrade.ToString().Equals("websocket", StringComparison.OrdinalIgnoreCase)
        && !context.Request.Query.ContainsKey("id"))
    {
        context.Response.ContentType = "application/json; charset=utf-8";
        await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new
        {
            status = "Online",
            service = "MTI Engineering Solutions — SignalR Real-Time Gateway",
            message = "⚡ مسار SignalR Hub يعمل بكفاءة. هذا المسار مخصص لبروتوكول WebSockets أو عميل SignalR مع توكن JWT.",
            hub = path,
            transport = "WebSockets / LongPolling",
            supportedEvents = new[] { "ProjectCreated", "SiteAssigned", "DataRecordSubmitted", "DataRecordApproved", "TaskStatusChanged", "MessageSent", "UserOnline" }
        }));
        return;
    }
    await next();
});

app.UseRouting();
app.UseCors("CorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

// 8. Health Check Endpoint
app.MapGet("/health", () => Results.Ok(new
{
    status = "Online",
    service = "MTI Engineering Solutions API",
    version = "1.0.0",
    environment = app.Environment.EnvironmentName,
    timestamp = DateTime.UtcNow
}));

// 9. Root Landing Page Endpoint (Online Status & Interactive Guide)
app.MapGet("/", () => Results.Content(GetMtiLandingHtml(), "text/html", System.Text.Encoding.UTF8));

app.MapControllers();

// SignalR Hubs & Aliases
app.MapHub<ProjectHub>("/hubs/project");
app.MapHub<ProjectHub>("/hubs/events");
app.MapHub<ProjectHub>("/hubs/project-hub");
app.MapHub<ProjectHub>("/hubs/chat-hub");

app.Run();

// Corporate Landing Page HTML Generator
static string GetMtiLandingHtml()
{
    return @"<!DOCTYPE html>
<html lang=""ar"" dir=""rtl"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>MTI Engineering Solutions — API & Real-Time Gateway</title>
    <link rel=""preconnect"" href=""https://fonts.googleapis.com"">
    <link rel=""preconnect"" href=""https://fonts.gstatic.com"" crossorigin>
    <link href=""https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"" rel=""stylesheet"">
    <style>
        :root {
            --bg-primary: #0b0f19;
            --bg-card: rgba(17, 24, 39, 0.75);
            --border-color: rgba(51, 65, 85, 0.6);
            --primary: #0284c7;
            --primary-light: #38bdf8;
            --accent: #10b981;
            --text-main: #f1f5f9;
            --text-muted: #94a3b8;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: var(--bg-primary);
            background-image: radial-gradient(at 0% 0%, rgba(2, 132, 199, 0.15) 0px, transparent 50%),
                              radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.1) 0px, transparent 50%);
            color: var(--text-main);
            font-family: 'Cairo', system-ui, -apple-system, sans-serif;
            min-height: 100vh;
            padding: 2.5rem 1rem;
            line-height: 1.6;
        }
        .container {
            max-width: 1100px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 2.5rem;
        }
        .badge-online {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.35);
            color: #34d399;
            padding: 0.4rem 1.25rem;
            border-radius: 9999px;
            font-size: 0.95rem;
            font-weight: 700;
            margin-bottom: 1.25rem;
        }
        .pulse-dot {
            width: 10px;
            height: 10px;
            background-color: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 12px #10b981;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        h1 {
            font-size: 2.2rem;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 0.5rem;
            letter-spacing: -0.5px;
        }
        .subtitle {
            color: var(--text-muted);
            font-size: 1.1rem;
            max-width: 700px;
            margin: 0 auto 1.75rem auto;
        }
        .actions-bar {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 2.5rem;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.8rem 1.6rem;
            border-radius: 0.75rem;
            font-weight: 700;
            font-size: 1rem;
            text-decoration: none;
            transition: all 0.2s ease;
        }
        .btn-primary {
            background: linear-gradient(135deg, #0284c7, #0369a1);
            color: #ffffff;
            box-shadow: 0 10px 20px -5px rgba(2, 132, 199, 0.4);
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 25px -5px rgba(2, 132, 199, 0.5);
        }
        .btn-secondary {
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid var(--border-color);
            color: #e2e8f0;
        }
        .btn-secondary:hover {
            background: rgba(51, 65, 85, 0.9);
            transform: translateY(-2px);
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2.5rem;
        }
        .card {
            background: var(--bg-card);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border-color);
            border-radius: 1rem;
            padding: 1.5rem;
            transition: border-color 0.2s;
        }
        .card:hover {
            border-color: rgba(56, 189, 248, 0.4);
        }
        .card-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 1.2rem;
            font-weight: 700;
            color: #f8fafc;
            margin-bottom: 0.75rem;
            border-bottom: 1px solid rgba(51, 65, 85, 0.4);
            padding-bottom: 0.75rem;
        }
        .card-desc {
            font-size: 0.9rem;
            color: var(--text-muted);
            margin-bottom: 1rem;
        }
        .endpoint-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            direction: ltr;
            text-align: left;
        }
        .endpoint-item {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            background: rgba(15, 23, 42, 0.6);
            padding: 0.45rem 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(51, 65, 85, 0.3);
        }
        .method {
            font-size: 0.75rem;
            font-weight: 700;
            padding: 0.15rem 0.45rem;
            border-radius: 0.3rem;
            letter-spacing: 0.5px;
        }
        .method-get { background: rgba(16, 185, 129, 0.2); color: #34d399; }
        .method-post { background: rgba(2, 132, 199, 0.2); color: #38bdf8; }
        .method-put { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
        .method-delete { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .method-hub { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
        .footer {
            text-align: center;
            color: var(--text-muted);
            font-size: 0.9rem;
            border-top: 1px solid var(--border-color);
            padding-top: 1.5rem;
        }
        .logo-container {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 1.25rem 2.25rem;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 1.5rem;
            box-shadow: 0 15px 35px -5px rgba(2, 132, 199, 0.35);
            backdrop-filter: blur(16px);
            margin-bottom: 1.5rem;
            transition: transform 0.3s ease;
        }
        .logo-container:hover {
            transform: translateY(-3px) scale(1.02);
        }
        .brand-logo {
            height: 90px;
            width: auto;
            object-fit: contain;
            filter: drop-shadow(0 6px 20px rgba(2, 132, 199, 0.45));
        }
    </style>
</head>
<body>
    <div class=""container"">
        <header class=""header"">
            <div class=""logo-container"">
                <img src=""/images/CompanyLogo.png"" alt=""MTI Engineering Solutions"" class=""brand-logo"" />
            </div>
            <br>
            <div class=""badge-online"">
                <span class=""pulse-dot""></span>
                السيرفر يعمل بكفاءة (Online)
            </div>
            <h1>MTI Engineering Solutions 🏗️</h1>
            <p class=""subtitle"">
                منصة إدارة المشاريع والمواقع الهندسية للمقاولات — واجهة برمجة التطبيقات وقناة Real-Time المباشرة
            </p>

            <div class=""actions-bar"">
                <a href=""/swagger"" class=""btn btn-primary"">
                    <span>🚀</span> فتح توثيق Swagger UI
                </a>
                <a href=""/hubs/project"" class=""btn btn-secondary"">
                    <span>⚡</span> مسار SignalR Hub: /hubs/project
                </a>
                <a href=""/health"" class=""btn btn-secondary"">
                    <span>🩺</span> فحص الحالة: /health
                </a>
            </div>
        </header>

        <main class=""grid"">
            <!-- SignalR Hub -->
            <div class=""card"">
                <div class=""card-header"">
                    <span>⚡</span> قنوات Real-Time (SignalR)
                </div>
                <p class=""card-desc"">
                    يتم البث اللحظي عبر الـ Hub الموحد فور تأكيد العمليات بقاعدة البيانات SQL Server ومستودع Backblaze B2.
                </p>
                <ul class=""endpoint-list"">
                    <li class=""endpoint-item""><span class=""method method-hub"">HUB</span> /hubs/project</li>
                    <li class=""endpoint-item""><span class=""method method-hub"">HUB</span> /hubs/events</li>
                    <li class=""endpoint-item""><span class=""method method-hub"">HUB</span> /hubs/chat-hub</li>
                </ul>
                <p class=""card-desc"" style=""margin-top: 0.75rem; font-size: 0.8rem;"">
                    <strong>الأحداث المدعومة:</strong> ProjectCreated, SiteAssigned, DataRecordSubmitted, DataRecordApproved, TaskStatusChanged, MessageSent, UserOnline.
                </p>
            </div>

            <!-- Projects & Sites -->
            <div class=""card"">
                <div class=""card-header"">
                    <span>📍</span> المشاريع والمواقع (Projects & Sites)
                </div>
                <p class=""card-desc"">
                    إدارة المشاريع الاستراتيجية، إسناد المواقع، والتحكم في النطاقات الهندسية.
                </p>
                <ul class=""endpoint-list"">
                    <li class=""endpoint-item""><span class=""method method-get"">GET</span> /api/projects</li>
                    <li class=""endpoint-item""><span class=""method method-post"">POST</span> /api/projects</li>
                    <li class=""endpoint-item""><span class=""method method-get"">GET</span> /api/sites</li>
                    <li class=""endpoint-item""><span class=""method method-post"">POST</span> /api/sites/{id}/assign</li>
                </ul>
            </div>

            <!-- Project Data & Approvals -->
            <div class=""card"">
                <div class=""card-header"">
                    <span>📋</span> البيانات الميدانية والاعتمادات
                </div>
                <p class=""card-desc"">
                    استلام التقارير اليومية، التفتيش، المعدات، القياسات، ودورة حياة الموافقات.
                </p>
                <ul class=""endpoint-list"">
                    <li class=""endpoint-item""><span class=""method method-get"">GET</span> /api/data</li>
                    <li class=""endpoint-item""><span class=""method method-post"">POST</span> /api/data</li>
                    <li class=""endpoint-item""><span class=""method method-post"">POST</span> /api/data/{id}/approve</li>
                    <li class=""endpoint-item""><span class=""method method-post"">POST</span> /api/data/{id}/reject</li>
                </ul>
            </div>

            <!-- Tasks -->
            <div class=""card"">
                <div class=""card-header"">
                    <span>📌</span> إدارة المهام (Tasks)
                </div>
                <p class=""card-desc"">
                    توزيع المهام الميدانية، متابعة المواعيد النهائية، وتحديثات التقدم.
                </p>
                <ul class=""endpoint-list"">
                    <li class=""endpoint-item""><span class=""method method-get"">GET</span> /api/tasks</li>
                    <li class=""endpoint-item""><span class=""method method-post"">POST</span> /api/tasks</li>
                    <li class=""endpoint-item""><span class=""method method-post"">POST</span> /api/tasks/{id}/status</li>
                    <li class=""endpoint-item""><span class=""method method-post"">POST</span> /api/tasks/{id}/assign</li>
                </ul>
            </div>

            <!-- Chat & Media -->
            <div class=""card"">
                <div class=""card-header"">
                    <span>💬</span> المحادثات الفورية والوسائط
                </div>
                <p class=""card-desc"">
                    مراسلة فورية مشفرة بين الإدارة والمهندسين مع تخزين سحابي عبر Backblaze B2.
                </p>
                <ul class=""endpoint-list"">
                    <li class=""endpoint-item""><span class=""method method-get"">GET</span> /api/chat/conversations</li>
                    <li class=""endpoint-item""><span class=""method method-post"">POST</span> /api/chat/conversations/direct</li>
                    <li class=""endpoint-item""><span class=""method method-post"">POST</span> /api/media/upload-url</li>
                    <li class=""endpoint-item""><span class=""method method-get"">GET</span> /api/media/{id}/download-url</li>
                </ul>
            </div>

            <!-- Auth & Security -->
            <div class=""card"">
                <div class=""card-header"">
                    <span>🔒</span> المصادقة والأمان (Auth & RBAC)
                </div>
                <p class=""card-desc"">
                    نظام أمان مؤسسي، توكنات JWT، تفويض الأدوار والصلاحيات، وإدارة المستخدمين.
                </p>
                <ul class=""endpoint-list"">
                    <li class=""endpoint-item""><span class=""method method-post"">POST</span> /api/auth/login</li>
                    <li class=""endpoint-item""><span class=""method method-post"">POST</span> /api/auth/refresh-token</li>
                    <li class=""endpoint-item""><span class=""method method-get"">GET</span> /api/users</li>
                    <li class=""endpoint-item""><span class=""method method-get"">GET</span> /api/audit</li>
                </ul>
            </div>
        </main>

        <footer class=""footer"">
            &copy; 2026 MTI Engineering Solutions • جميع الحقوق محفوظة
        </footer>
    </div>
</body>
</html>";
}
