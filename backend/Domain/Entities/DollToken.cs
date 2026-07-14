namespace Domain.Entities;

public class DollToken
{
    public Guid Id { get; private set; }
    public string Token { get; private set; } = string.Empty; // VID-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
    public Guid DollId { get; private set; }
    public Guid? UserId { get; private set; } // Null until claimed
    public DateTime GeneratedAt { get; private set; }
    public DateTime? ClaimedAt { get; private set; }
    public DateTime? ExpiresAt { get; private set; }
    public bool IsUsed { get; private set; }
    public DateTime? UsedAt { get; private set; }
    [System.ComponentModel.DataAnnotations.Timestamp]
    public byte[] RowVersion { get; private set; } = Array.Empty<byte>(); // For optimistic concurrency

    // ── Navigation properties ────────────────────────────────────────
    public virtual Product? Doll { get; private set; }
    public virtual ICollection<CheckinRecord> CheckinRecords { get; private set; } = new List<CheckinRecord>();

    // EF Core
    protected DollToken() { }

    public DollToken(Guid dollId, string token, DateTime expiresAt)
    {
        Id = Guid.NewGuid();
        DollId = dollId;
        Token = token;
        GeneratedAt = DateTime.UtcNow;
        ExpiresAt = expiresAt;
        IsUsed = false;
    }

    /// <summary>
    /// Claims this token for the specified user.
    /// Throws InvalidOperationException if already claimed.
    /// </summary>
    public void Claim(Guid userId)
    {
        if (UserId.HasValue)
            throw new InvalidOperationException("Token already claimed");

        UserId = userId;
        ClaimedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Marks this token as used (consumed during a check-in).
    /// Throws InvalidOperationException if already used.
    /// </summary>
    public void MarkAsUsed()
    {
        if (IsUsed)
            throw new InvalidOperationException("Token already used");

        IsUsed = true;
        UsedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Reassigns this token to a different user (migration only).
    /// Used when an anonymous traveler's data is merged into a persistent account on login.
    /// </summary>
    public void ReassignUser(Guid newUserId)
    {
        UserId = newUserId;
    }
}
