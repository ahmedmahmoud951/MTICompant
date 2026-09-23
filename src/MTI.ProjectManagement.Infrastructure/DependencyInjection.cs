using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Infrastructure.Persistence;
using MTI.ProjectManagement.Infrastructure.Services;

namespace MTI.ProjectManagement.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(connectionString, b =>
            {
                b.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
                b.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null);
            }));

        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IResourceAuthorizationService, ResourceAuthorizationService>();
        services.AddScoped<IB2StorageService, BackblazeB2StorageService>();
        services.AddScoped<IMediaStorageService, BackblazeB2StorageService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IPermissionService, PermissionService>();
        services.AddScoped<IOutboxService, OutboxService>();

        // REALTIME-02: Outbox dispatcher (background SignalR publisher)
        services.AddHostedService<OutboxDispatcher>();

        // Required for PermissionService caching (SECURITY-02)
        services.AddMemoryCache();

        services.AddSignalR();

        return services;
    }
}
