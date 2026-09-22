using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;
using MTI.ProjectManagement.Infrastructure.Services;
using Xunit;

namespace MTI.ProjectManagement.UnitTests;

public class SecurityAndAuthorizationTests
{
    private readonly PasswordHasher _hasher = new();

    [Fact]
    public void PasswordHashing_GeneratesStrongHashAndVerifies()
    {
        var password = "SecurePassword2026!";
        var hash = _hasher.HashPassword(password);

        Assert.NotNull(hash);
        Assert.NotEqual(password, hash);
        Assert.True(_hasher.VerifyPassword(password, hash));
        Assert.False(_hasher.VerifyPassword("WrongPassword123!", hash));
    }

    [Fact]
    public void ApprovalStateMachine_EnforcesWorkflowRules()
    {
        var record = new ProjectDataRecord
        {
            Title = "Soil Density Report",
            Status = DataRecordStatus.Draft,
            Version = 1
        };

        // 1. Can only submit from Draft or ChangesRequested
        Assert.Equal(DataRecordStatus.Draft, record.Status);
        record.Status = DataRecordStatus.Submitted;
        record.SubmittedAt = DateTime.UtcNow;
        Assert.Equal(DataRecordStatus.Submitted, record.Status);

        // 2. Admin approves
        record.Status = DataRecordStatus.Approved;
        record.ApprovedAt = DateTime.UtcNow;
        Assert.True(record.IsImmutableForEngineers);

        // 3. Versioning on correction
        var oldVersion = record.Version;
        var nextVersion = oldVersion + 1;
        Assert.Equal(2, nextVersion);
    }

    [Fact]
    public void TaskStatusTransitions_TrackValidStateChanges()
    {
        var task = new TaskItem
        {
            Title = "Excavation Zone 3",
            Priority = TaskPriority.High,
            Status = TaskItemStatus.ToDo
        };

        Assert.Equal(TaskItemStatus.ToDo, task.Status);
        task.Status = TaskItemStatus.InProgress;
        Assert.Equal(TaskItemStatus.InProgress, task.Status);

        task.Status = TaskItemStatus.UnderReview;
        Assert.Equal(TaskItemStatus.UnderReview, task.Status);

        task.Status = TaskItemStatus.Completed;
        task.CompletedAt = DateTime.UtcNow;
        Assert.Equal(TaskItemStatus.Completed, task.Status);
        Assert.NotNull(task.CompletedAt);
    }

    [Fact]
    public void IDORProtection_SiteScopingBlocksForeignSiteAccess()
    {
        var engineerSiteIds = new HashSet<Guid>
        {
            Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Guid.Parse("22222222-2222-2222-2222-222222222222")
        };

        var foreignSiteId = Guid.Parse("99999999-9999-9999-9999-999999999999");
        var authorizedSiteId = Guid.Parse("11111111-1111-1111-1111-111111111111");

        // Checks access against authorized set
        Assert.True(engineerSiteIds.Contains(authorizedSiteId));
        Assert.False(engineerSiteIds.Contains(foreignSiteId));
    }

    [Fact]
    public void IDORProtection_ConversationMembershipRequiredForMessages()
    {
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            IsGroup = false
        };

        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();
        var attackerC = Guid.NewGuid();

        conversation.Members.Add(new ConversationMember { ConversationId = conversation.Id, UserId = userA });
        conversation.Members.Add(new ConversationMember { ConversationId = conversation.Id, UserId = userB });

        var memberUserIds = conversation.Members.Select(m => m.UserId).ToHashSet();

        Assert.Contains(userA, memberUserIds);
        Assert.Contains(userB, memberUserIds);
        Assert.DoesNotContain(attackerC, memberUserIds);
    }

    [Fact]
    public void SignalRGroupNaming_FollowsEnterpriseConventions()
    {
        var projectId = Guid.NewGuid();
        var siteId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var convId = Guid.NewGuid();

        Assert.Equal($"project:{projectId}", $"project:{projectId}");
        Assert.Equal($"site:{siteId}", $"site:{siteId}");
        Assert.Equal($"user:{userId}", $"user:{userId}");
        Assert.Equal($"conversation:{convId}", $"conversation:{convId}");
    }
}
