using MTI.ProjectManagement.Domain.Common;

namespace MTI.ProjectManagement.Domain.Entities;

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT DB-I18N: Language infrastructure
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>DB-I18N: Master list of supported UI languages.</summary>
public class SupportedLanguage : BaseEntity
{
    /// <summary>BCP-47 code e.g. "ar", "en"</summary>
    public string Code { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string Direction { get; set; } = "ltr"; // "rtl" or "ltr"
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; } = false;
    public int SortOrder { get; set; }
}

/// <summary>DB-I18N: Stores each user's chosen language preference.</summary>
public class UserLanguagePreference : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string LanguageCode { get; set; } = "ar"; // default Arabic
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// DB-I18N: Configurable business terminology translations.
/// Use ONLY when entities require user-editable multilingual content.
/// Do NOT create rows for ordinary UI labels — those belong in frontend locale files.
/// </summary>
public class TranslationEntry : BaseEntity
{
    /// <summary>e.g. "ProjectType", "Department", "Role"</summary>
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string LanguageCode { get; set; } = string.Empty;
    /// <summary>e.g. "Name", "Description"</summary>
    public string FieldName { get; set; } = string.Empty;
    public string TranslatedValue { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT REALTIME-02: Transactional Outbox
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>
/// REALTIME-02: Outbox pattern — event is written in the same DB transaction
/// as the business record. A background dispatcher sends it to SignalR.
/// If SignalR is offline, the event is NOT lost.
/// </summary>
public class OutboxMessage : BaseEntity
{
    public string EventType { get; set; } = string.Empty;       // e.g. "MessageCreated", "TaskAssigned"
    public string AggregateType { get; set; } = string.Empty;   // e.g. "Message", "Task"
    public string AggregateId { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;         // JSON
    public string? TargetGroup { get; set; }                    // e.g. "user:{id}", "conversation:{id}"
    public string Status { get; set; } = "Pending";             // Pending | Processing | Sent | Failed
    public int RetryCount { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public string? ErrorMessage { get; set; }
}
