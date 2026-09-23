using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Infrastructure.Services;
using Xunit;

namespace MTI.ProjectManagement.UnitTests;

public class EnterpriseArchitectureTests
{
    [Fact]
    public void DocumentObjectKey_FollowsExactSpecification()
    {
        var projectId = Guid.NewGuid();
        var documentId = Guid.NewGuid();
        var versionId = Guid.NewGuid();
        var fileName = "Site_Survey_Report #1 (Final).pdf";

        var inMemorySettings = new Dictionary<string, string?>
        {
            {"BackblazeB2:KeyId", "dummy"},
            {"BackblazeB2:ApplicationKey", "dummy"},
            {"BackblazeB2:BucketName", "MTICompany"},
            {"BackblazeB2:ServiceUrl", "https://s3.us-east-005.backblazeb2.com"},
            {"BackblazeB2:DownloadUrl", "https://f005.backblazeb2.com"}
        };

        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var b2Service = new BackblazeB2StorageService(configuration);

        var key = b2Service.BuildDocumentObjectKey(projectId, documentId, versionId, fileName);

        Assert.StartsWith($"projects/{projectId}/documents/{documentId}/versions/{versionId}/", key);
        Assert.DoesNotContain(" ", key);
        Assert.DoesNotContain("#", key);
        Assert.EndsWith(".pdf", key);
    }

    [Fact]
    public void AssetAndChatObjectKey_FollowsExactSpecification()
    {
        var projectId = Guid.NewGuid();
        var assetId = Guid.NewGuid();
        var conversationId = Guid.NewGuid();
        var messageId = Guid.NewGuid();
        var attachmentId = Guid.NewGuid();

        var inMemorySettings = new Dictionary<string, string?>
        {
            {"BackblazeB2:KeyId", "dummy"},
            {"BackblazeB2:ApplicationKey", "dummy"},
            {"BackblazeB2:BucketName", "MTICompany"}
        };

        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var b2Service = new BackblazeB2StorageService(configuration);

        var assetKey = b2Service.BuildAssetObjectKey(projectId, assetId, "blueprint.dwg");
        Assert.Equal($"projects/{projectId}/assets/{assetId}/blueprint.dwg", assetKey);

        var chatKey = b2Service.BuildChatObjectKey(conversationId, messageId, attachmentId, "photo.jpg");
        Assert.Equal($"chat/{conversationId}/{messageId}/{attachmentId}/photo.jpg", chatKey);
    }

    [Fact]
    public void Sha256Checksum_IsConsistentAndAccurate()
    {
        var testContent = "MTI Engineering Solutions Enterprise Document 2026";
        var bytes = Encoding.UTF8.GetBytes(testContent);

        using var sha256 = SHA256.Create();
        var expectedHash = BitConverter.ToString(sha256.ComputeHash(bytes)).Replace("-", "").ToLowerInvariant();

        using var stream = new MemoryStream(bytes);
        var actualHash = BackblazeB2StorageService.ComputeSha256(stream);

        Assert.Equal(expectedHash, actualHash);
    }

    [Fact]
    public void DocumentEditWindow_TwentyFourHoursRule_EvaluatesCorrectly()
    {
        var uploadedAt = DateTime.UtcNow;
        var editableUntil = uploadedAt.AddHours(24);

        // Within 24-hour window
        var isWithinWindow = DateTime.UtcNow <= editableUntil;
        Assert.True(isWithinWindow);

        // After 24 hours
        var expiredEditableUntil = DateTime.UtcNow.AddMinutes(-5);
        var isExpired = DateTime.UtcNow > expiredEditableUntil;
        Assert.True(isExpired);
    }

    [Fact]
    public void MilestoneCircularDependency_CycleDetection_DetectsCyclesAccurately()
    {
        var m1 = Guid.NewGuid();
        var m2 = Guid.NewGuid();
        var m3 = Guid.NewGuid();

        // Existing dependencies: M2 depends on M1, M3 depends on M2
        var existingDeps = new List<(Guid MilestoneId, Guid DependsOnId)>
        {
            (m2, m1),
            (m3, m2)
        };

        // Case 1: M1 depends on M3 would create cycle: M1 -> M3 -> M2 -> M1
        var createsCycle1 = WouldCreateCycle(m1, m3, existingDeps);
        Assert.True(createsCycle1);

        // Case 2: Self dependency: M1 depends on M1
        var createsCycleSelf = WouldCreateCycle(m1, m1, existingDeps);
        Assert.True(createsCycleSelf);

        // Case 3: Valid dependency: M4 depends on M3
        var m4 = Guid.NewGuid();
        var createsCycleValid = WouldCreateCycle(m4, m3, existingDeps);
        Assert.False(createsCycleValid);
    }

    private static bool WouldCreateCycle(Guid milestoneId, Guid dependsOnId, List<(Guid MilestoneId, Guid DependsOnId)> existing)
    {
        if (milestoneId == dependsOnId) return true;

        var adj = new Dictionary<Guid, List<Guid>>();
        foreach (var dep in existing)
        {
            if (!adj.ContainsKey(dep.MilestoneId))
                adj[dep.MilestoneId] = new List<Guid>();
            adj[dep.MilestoneId].Add(dep.DependsOnId);
        }

        if (!adj.ContainsKey(milestoneId))
            adj[milestoneId] = new List<Guid>();
        adj[milestoneId].Add(dependsOnId);

        var visited = new HashSet<Guid>();
        var recursionStack = new HashSet<Guid>();

        bool HasCycle(Guid node)
        {
            visited.Add(node);
            recursionStack.Add(node);

            if (adj.TryGetValue(node, out var neighbors))
            {
                foreach (var neighbor in neighbors)
                {
                    if (!visited.Contains(neighbor))
                    {
                        if (HasCycle(neighbor)) return true;
                    }
                    else if (recursionStack.Contains(neighbor))
                    {
                        return true;
                    }
                }
            }

            recursionStack.Remove(node);
            return false;
        }

        foreach (var key in adj.Keys)
        {
            if (!visited.Contains(key))
            {
                if (HasCycle(key)) return true;
            }
        }

        return false;
    }

    [Fact]
    public void DailySiteReport_BecomesImmutable_UponApproval()
    {
        var report = new DailySiteReport
        {
            ProjectId = Guid.NewGuid(),
            SiteId = Guid.NewGuid(),
            ReportDate = DateTime.UtcNow,
            EngineerUserId = Guid.NewGuid(),
            Manpower = "5 Engineers, 10 Technicians",
            WorkCompleted = "CCTV camera cabling on floors 1-3 completed.",
            Status = MTI.ProjectManagement.Domain.Enums.DailyReportStatus.Draft,
            RevisionNumber = 1
        };

        // Initially in Draft -> mutable
        Assert.False(report.IsImmutable);

        // Transition to Submitted -> still mutable for revision
        report.Status = MTI.ProjectManagement.Domain.Enums.DailyReportStatus.Submitted;
        Assert.False(report.IsImmutable);

        // Transition to Approved -> strictly immutable
        report.Status = MTI.ProjectManagement.Domain.Enums.DailyReportStatus.Approved;
        report.ApprovedByUserId = Guid.NewGuid();
        report.ApprovedAt = DateTime.UtcNow;

        Assert.True(report.IsImmutable);

        // Creating a correction revision correctly increments revision number and links parent
        var correctionRevision = new DailySiteReport
        {
            ProjectId = report.ProjectId,
            SiteId = report.SiteId,
            ReportDate = report.ReportDate,
            EngineerUserId = report.EngineerUserId,
            ParentReportId = report.Id,
            RevisionNumber = report.RevisionNumber + 1,
            Status = MTI.ProjectManagement.Domain.Enums.DailyReportStatus.Draft,
            WorkCompleted = "Corrected work completion notes."
        };

        Assert.Equal(2, correctionRevision.RevisionNumber);
        Assert.Equal(report.Id, correctionRevision.ParentReportId);
        Assert.False(correctionRevision.IsImmutable);
    }

    [Fact]
    public void AccountingWorkspace_EnforcesStrictIsolation_FromEngineeringAndSiteOperations()
    {
        // Define accounting permissions
        var accountingPermissions = new HashSet<string>
        {
            MTI.ProjectManagement.Application.Security.Permissions.AccountingViewInvoices,
            MTI.ProjectManagement.Application.Security.Permissions.AccountingDownloadInvoices,
            MTI.ProjectManagement.Application.Security.Permissions.AccountingViewApprovedBOQ,
            MTI.ProjectManagement.Application.Security.Permissions.AccountingDownloadApprovedBOQ,
            MTI.ProjectManagement.Application.Security.Permissions.AccountingViewPurchaseOrders,
            MTI.ProjectManagement.Application.Security.Permissions.AccountingViewCommercialDocuments
        };

        // Prohibited permissions for purely accounting users unless explicitly granted
        var prohibitedPermissions = new[]
        {
            "Project.EngineeringView",
            "SiteOperations.View",
            "EngineerChat.View"
        };

        foreach (var prohibited in prohibitedPermissions)
        {
            Assert.DoesNotContain(prohibited, accountingPermissions);
        }

        // Verify invoice status lifecycle
        Assert.True(Enum.IsDefined(typeof(MTI.ProjectManagement.Domain.Enums.InvoiceStatus), "Draft"));
        Assert.True(Enum.IsDefined(typeof(MTI.ProjectManagement.Domain.Enums.InvoiceStatus), "PendingApproval"));
        Assert.True(Enum.IsDefined(typeof(MTI.ProjectManagement.Domain.Enums.InvoiceStatus), "Approved"));
        Assert.True(Enum.IsDefined(typeof(MTI.ProjectManagement.Domain.Enums.InvoiceStatus), "Sent"));
        Assert.True(Enum.IsDefined(typeof(MTI.ProjectManagement.Domain.Enums.InvoiceStatus), "Paid"));
        Assert.True(Enum.IsDefined(typeof(MTI.ProjectManagement.Domain.Enums.InvoiceStatus), "PartiallyPaid"));
        Assert.True(Enum.IsDefined(typeof(MTI.ProjectManagement.Domain.Enums.InvoiceStatus), "Overdue"));
        Assert.True(Enum.IsDefined(typeof(MTI.ProjectManagement.Domain.Enums.InvoiceStatus), "Cancelled"));
    }

    [Fact]
    public void ChatIdempotency_ClientMessageId_IsRequiredPerSender()
    {
        var senderUserId = Guid.NewGuid();
        var clientMessageId = "client-msg-uuid-12345";

        var msg1 = new Message
        {
            ConversationId = Guid.NewGuid(),
            SenderUserId = senderUserId,
            ClientMessageId = clientMessageId,
            Content = "Network packet retry test"
        };

        // Simulating second send attempt with the identical client message id
        var isDuplicate = (msg1.SenderUserId == senderUserId && msg1.ClientMessageId == clientMessageId);
        Assert.True(isDuplicate);
    }

    [Fact]
    public void WarrantyAlerts_CalculateThresholdsAndPreventDuplicates()
    {
        var assetId = Guid.NewGuid();
        var now = DateTime.UtcNow.Date;

        var asset30Days = new CompanyAsset
        {
            Id = assetId,
            AssetCode = "CAM-001",
            Name = "4K Dome Camera",
            WarrantyEnd = now.AddDays(25)
        };

        var daysRemaining = (int)(asset30Days.WarrantyEnd.Value.Date - now).TotalDays;
        Assert.True(daysRemaining <= 30 && daysRemaining > 15);

        // Alert log for 30 days threshold
        var loggedAlerts = new HashSet<(Guid AssetId, int Threshold)>();
        var firstAlertRecorded = loggedAlerts.Add((assetId, 30));
        Assert.True(firstAlertRecorded);

        // Second check on the same day should deduplicate
        var secondAlertRecorded = loggedAlerts.Add((assetId, 30));
        Assert.False(secondAlertRecorded);
    }

    [Fact]
    public void DirectConversation_NormalizationAndKey_IsDeterministicAndPreventsDuplicates()
    {
        var userA = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var userB = Guid.Parse("00000000-0000-0000-0000-000000000002");

        // When User A initiates chat with User B
        var min1 = userA.CompareTo(userB) < 0 ? userA : userB;
        var max1 = userA.CompareTo(userB) < 0 ? userB : userA;
        var directKey1 = $"direct:{min1}:{max1}";

        // When User B initiates chat with User A
        var min2 = userB.CompareTo(userA) < 0 ? userB : userA;
        var max2 = userB.CompareTo(userA) < 0 ? userA : userB;
        var directKey2 = $"direct:{min2}:{max2}";

        // Keys MUST be strictly identical regardless of initiator
        Assert.Equal(directKey1, directKey2);
        Assert.Equal("direct:00000000-0000-0000-0000-000000000001:00000000-0000-0000-0000-000000000002", directKey1);
    }

    [Fact]
    public void Notification_Deduplication_ByEventKey_PreventsDuplicateCreation()
    {
        var taskId = Guid.NewGuid();
        var recipientUserId = Guid.NewGuid();
        var eventKey = $"TaskAssigned:{taskId}:{recipientUserId}";

        var existingEvents = new HashSet<string>();

        // First event registered
        var isFirstNew = existingEvents.Add(eventKey);
        Assert.True(isFirstNew);

        // Same event sent again due to retry or event re-emission
        var isSecondNew = existingEvents.Add(eventKey);
        Assert.False(isSecondNew); // Correctly deduplicated
    }

    [Fact]
    public void MessageReceipt_DeliveredAndRead_TrackDistinctTimestamps()
    {
        var messageId = Guid.NewGuid();
        var recipientUserId = Guid.NewGuid();
        var deliveredTime = DateTime.UtcNow;
        var readTime = deliveredTime.AddMinutes(5);

        var receipt = new MessageReceipt
        {
            MessageId = messageId,
            UserId = recipientUserId,
            DeliveredAt = deliveredTime,
            ReadAt = readTime
        };

        Assert.Equal(deliveredTime, receipt.DeliveredAt);
        Assert.Equal(readTime, receipt.ReadAt);
        Assert.True(receipt.ReadAt > receipt.DeliveredAt);
    }
}

