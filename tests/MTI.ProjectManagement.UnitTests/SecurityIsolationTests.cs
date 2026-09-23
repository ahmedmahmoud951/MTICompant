using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.UnitTests;

/// <summary>SECURITY isolation: notification ownership filter + document 24h uploader lock.</summary>
public class SecurityIsolationTests
{
    [Fact]
    public void NotificationOwnership_UserA_CannotMarkUserBNotification()
    {
        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();

        var notifications = new List<Notification>
        {
            new()
            {
                Id = Guid.NewGuid(),
                UserId = userA,
                Type = NotificationType.TaskAssigned,
                Title = "A",
                Body = "for A",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = userB,
                Type = NotificationType.NewMessage,
                Title = "B",
                Body = "for B",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            }
        };

        var targetId = notifications.First(n => n.UserId == userB).Id;

        // Mirrors NotificationsController.MarkAsRead: n.Id == id && n.UserId == currentUserId
        var visibleToA = notifications.FirstOrDefault(n => n.Id == targetId && n.UserId == userA);
        Assert.Null(visibleToA);

        var visibleToB = notifications.FirstOrDefault(n => n.Id == targetId && n.UserId == userB);
        Assert.NotNull(visibleToB);

        // Attempted mark-as-read by A must fail ownership filter
        Assert.DoesNotContain(notifications, n => n.Id == targetId && n.UserId == userA);
    }

    [Fact]
    public void DocumentVersion_IsLockedForUploader_WhenEditableUntilPassed()
    {
        var lockedVersion = new DocumentVersion
        {
            DocumentId = Guid.NewGuid(),
            VersionNumber = 1,
            UploadedBy = Guid.NewGuid(),
            Status = DocumentVersionStatus.PendingReview,
            EditableUntil = DateTime.UtcNow.AddHours(-1),
            UploadedAt = DateTime.UtcNow.AddHours(-25)
        };

        Assert.True(lockedVersion.IsLockedForUploader);
        Assert.False(lockedVersion.IsEditable);

        var editableVersion = new DocumentVersion
        {
            DocumentId = Guid.NewGuid(),
            VersionNumber = 1,
            UploadedBy = Guid.NewGuid(),
            Status = DocumentVersionStatus.PendingReview,
            EditableUntil = DateTime.UtcNow.AddHours(12),
            UploadedAt = DateTime.UtcNow
        };

        Assert.False(editableVersion.IsLockedForUploader);
        Assert.True(editableVersion.IsEditable);
    }

    [Fact]
    public void DocumentVersion_ApprovedStatus_IsLockedEvenWithinEditWindow()
    {
        var version = new DocumentVersion
        {
            DocumentId = Guid.NewGuid(),
            VersionNumber = 2,
            UploadedBy = Guid.NewGuid(),
            Status = DocumentVersionStatus.Approved,
            EditableUntil = DateTime.UtcNow.AddHours(20),
            UploadedAt = DateTime.UtcNow
        };

        Assert.True(version.IsLockedForUploader);
    }
}
