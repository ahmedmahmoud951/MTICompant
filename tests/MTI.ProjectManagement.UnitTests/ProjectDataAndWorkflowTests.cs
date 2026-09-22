using Microsoft.Extensions.Configuration;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;
using MTI.ProjectManagement.Infrastructure.Services;
using Xunit;

namespace MTI.ProjectManagement.UnitTests;

public class ProjectDataAndWorkflowTests
{
    [Fact]
    public void ObjectKeyConventions_FollowPrompt08Specifications()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"BackblazeB2:KeyId", "005bc9fb11d7d470000000001"},
            {"BackblazeB2:ApplicationKey", "K005HsOSzl/nxjJq3k7Pit0160P2U2w"},
            {"BackblazeB2:BucketName", "MTICompany"},
            {"BackblazeB2:ServiceUrl", "https://s3.us-east-005.backblazeb2.com"},
            {"BackblazeB2:DownloadUrl", "https://f005.backblazeb2.com"}
        };

        IConfiguration config = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
        var storage = new BackblazeB2StorageService(config);

        var projectId = Guid.NewGuid();
        var siteId = Guid.NewGuid();
        var dataId = Guid.NewGuid();
        var mediaId = Guid.NewGuid();

        // 1. Project Site Data key
        var dataKey = storage.BuildObjectKey("ProjectData", projectId, siteId, dataId, mediaId, "daily report.pdf");
        Assert.Equal($"projects/{projectId}/sites/{siteId}/data/{dataId}/media/{mediaId}/daily_report.pdf", dataKey);

        // 2. Task Attachment key
        var taskId = Guid.NewGuid();
        var taskKey = storage.BuildObjectKey("Task", null, null, taskId, mediaId, "evidence.jpg");
        Assert.Equal($"tasks/{taskId}/attachments/{mediaId}/evidence.jpg", taskKey);

        // 3. Chat Attachment key
        var convId = Guid.NewGuid();
        var chatKey = storage.BuildObjectKey("Chat", null, null, convId, mediaId, "photo.png");
        Assert.Equal($"chat/{convId}/media/{mediaId}/photo.png", chatKey);

        // 4. User Profile key
        var userId = Guid.NewGuid();
        var profileKey = storage.BuildObjectKey("User", null, null, userId, mediaId, "avatar.jpg");
        Assert.Equal($"users/{userId}/profile/{mediaId}/avatar.jpg", profileKey);
    }

    [Fact]
    public async Task CanGeneratePreSignedUploadAndDownloadUrls()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"BackblazeB2:KeyId", "005bc9fb11d7d470000000001"},
            {"BackblazeB2:ApplicationKey", "K005HsOSzl/nxjJq3k7Pit0160P2U2w"},
            {"BackblazeB2:BucketName", "MTICompany"},
            {"BackblazeB2:ServiceUrl", "https://s3.us-east-005.backblazeb2.com"},
            {"BackblazeB2:DownloadUrl", "https://f005.backblazeb2.com"}
        };

        IConfiguration config = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
        var storage = new BackblazeB2StorageService(config);

        var objectKey = $"test/{Guid.NewGuid():N}/spec.pdf";

        // Upload Pre-signed URL (PUT)
        var uploadUrl = await storage.GeneratePreSignedUploadUrlAsync(objectKey, "application/pdf", TimeSpan.FromMinutes(15));
        Assert.NotNull(uploadUrl);
        Assert.Contains("MTICompany", uploadUrl);
        Assert.Contains("X-Amz-Signature", uploadUrl);

        // Download Pre-signed URL (GET)
        var downloadUrl = await storage.GeneratePreSignedDownloadUrlAsync(objectKey, TimeSpan.FromHours(1));
        Assert.NotNull(downloadUrl);
        Assert.Contains("MTICompany", downloadUrl);
        Assert.Contains("X-Amz-Signature", downloadUrl);
    }

    [Fact]
    public void TaskDeadline_EvaluatesOverdue_WhenDueDatePassedAndNotCompleted()
    {
        var pastDue = DateTime.UtcNow.AddHours(-5);
        var task1 = new TaskItem
        {
            Title = "Repair Foundation",
            DueAt = pastDue,
            Status = TaskItemStatus.InProgress
        };

        var isOverdue1 = task1.DueAt.HasValue && task1.DueAt < DateTime.UtcNow && task1.Status != TaskItemStatus.Completed && task1.Status != TaskItemStatus.Cancelled;
        Assert.True(isOverdue1);

        var task2 = new TaskItem
        {
            Title = "Repair Foundation Done",
            DueAt = pastDue,
            Status = TaskItemStatus.Completed
        };

        var isOverdue2 = task2.DueAt.HasValue && task2.DueAt < DateTime.UtcNow && task2.Status != TaskItemStatus.Completed && task2.Status != TaskItemStatus.Cancelled;
        Assert.False(isOverdue2);
    }

    [Fact]
    public void ApprovedRecord_IsImmutableForEngineers()
    {
        var record = new ProjectDataRecord
        {
            Title = "Concrete Test Record",
            Status = DataRecordStatus.Approved,
            Version = 1
        };

        Assert.True(record.IsImmutableForEngineers);
    }
}
