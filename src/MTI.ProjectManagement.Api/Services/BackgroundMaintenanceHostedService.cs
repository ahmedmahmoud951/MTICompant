using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Domain.Enums;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Api.Services;

/// <summary>
/// BACKGROUND-01: Periodic maintenance — document lock expiry, temp media cleanup, B2 verify.
/// Runs every 30 minutes; all operations are idempotent.
/// </summary>
public class BackgroundMaintenanceHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BackgroundMaintenanceHostedService> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(30);

    public BackgroundMaintenanceHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<BackgroundMaintenanceHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[BackgroundMaintenance] Started. Interval={Minutes}m.", Interval.TotalMinutes);

        // Small startup delay so the app finishes warming up
        try { await Task.Delay(TimeSpan.FromSeconds(45), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCycleAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[BackgroundMaintenance] Cycle failed.");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IMediaStorageService>();
        var now = DateTime.UtcNow;

        await LockExpiredDocumentVersionsAsync(db, now, ct);
        await LockExpiredDocumentsAsync(db, now, ct);
        await CleanupTempMediaAsync(db, now, ct);
        await VerifyB2UploadsAsync(db, storage, ct);

        _logger.LogInformation("[BackgroundMaintenance] Cycle completed at {UtcNow}.", now);
    }

    private static async Task LockExpiredDocumentVersionsAsync(AppDbContext db, DateTime now, CancellationToken ct)
    {
        var versions = await db.DocumentVersions
            .Where(v =>
                v.EditableUntil < now &&
                (v.Status == DocumentVersionStatus.PendingReview || v.Status == DocumentVersionStatus.Draft))
            .Take(200)
            .ToListAsync(ct);

        foreach (var v in versions)
            v.Status = DocumentVersionStatus.Locked;

        if (versions.Count > 0)
            await db.SaveChangesAsync(ct);
    }

    private static async Task LockExpiredDocumentsAsync(AppDbContext db, DateTime now, CancellationToken ct)
    {
        var docs = await db.Documents
            .Where(d =>
                !d.IsDeleted &&
                d.EditableUntil.HasValue &&
                d.EditableUntil < now &&
                d.Status != DocumentStatus.Approved &&
                d.Status != DocumentStatus.Locked)
            .Take(200)
            .ToListAsync(ct);

        foreach (var d in docs)
        {
            d.Status = DocumentStatus.Locked;
            d.LockedAt ??= now;
        }

        if (docs.Count > 0)
            await db.SaveChangesAsync(ct);
    }

    private static async Task CleanupTempMediaAsync(AppDbContext db, DateTime now, CancellationToken ct)
    {
        var cutoff = now.AddHours(-48);
        var stale = await db.MediaFiles
            .Where(m =>
                (m.Status == "Pending" || m.Status == "Uploading") &&
                m.UploadedAt < cutoff)
            .Take(200)
            .ToListAsync(ct);

        foreach (var m in stale)
            m.Status = "Failed"; // soft-mark; do not hard-delete B2 blindly

        if (stale.Count > 0)
            await db.SaveChangesAsync(ct);
    }

    private async Task VerifyB2UploadsAsync(AppDbContext db, IMediaStorageService storage, CancellationToken ct)
    {
        var sample = await db.MediaFiles
            .Where(m => m.Status == "Uploaded" && !string.IsNullOrEmpty(m.ObjectKey))
            .OrderBy(m => m.UploadedAt)
            .Take(20)
            .ToListAsync(ct);

        var changed = false;
        foreach (var m in sample)
        {
            try
            {
                var exists = await storage.DoesObjectExistAsync(m.ObjectKey, ct);
                if (!exists)
                {
                    m.Status = "Failed";
                    changed = true;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[BackgroundMaintenance] B2 verify failed for MediaFile {Id}.", m.Id);
            }
        }

        if (changed)
            await db.SaveChangesAsync(ct);
    }
}
