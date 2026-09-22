using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace MTI.ProjectManagement.Infrastructure.Persistence;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var basePath = Path.Combine(Directory.GetCurrentDirectory(), "..", "MTI.ProjectManagement.Api");
        if (!Directory.Exists(basePath))
        {
            basePath = Directory.GetCurrentDirectory();
        }

        var configuration = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Server=db69544.public.databaseasp.net; Database=db69544; User Id=db69544; Password=mF?76nB_!5dZ; Encrypt=True; TrustServerCertificate=True; MultipleActiveResultSets=True;";

        var builder = new DbContextOptionsBuilder<AppDbContext>();
        builder.UseSqlServer(connectionString, b =>
        {
            b.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
            b.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null);
        });

        return new AppDbContext(builder.Options, null);
    }
}
