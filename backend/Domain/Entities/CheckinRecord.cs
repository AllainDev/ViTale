using Domain.Enums;

namespace Domain.Entities;

public class CheckinRecord
{
    public Guid Id { get; private set; }
    public Guid TravelerId { get; private set; }
    public Guid CheckpointId { get; private set; }
    public DateTime CheckinAt { get; private set; }
    public Guid ClientGeneratedId { get; private set; }
    public SyncStatus SyncStatus { get; private set; }
    public DateTime CreatedAt { get; private set; }

    // ── Gamification fields (added for digital passport gamification) ──────────
    public Guid? DollTokenId { get; private set; } // Null if no token used
    public int XpAwarded { get; private set; }

    // ── GPS fields (added for gamification GPS check-in flow) ─────────────────
    public double Latitude { get; private set; }
    public double Longitude { get; private set; }
    public double? Accuracy { get; private set; }

    // ── Computed property ─────────────────────────────────────────────────────
    public bool IsTokenCheckin => DollTokenId.HasValue;

    public Checkpoint? Checkpoint { get; private set; }
    public Traveler? Traveler { get; private set; }

    // ── Navigation (tightened FK) ───────────────────────────────────────────────
    public virtual DollToken? DollToken { get; private set; }

    protected CheckinRecord() { }

    /// <summary>
    /// Creates a check-in record via the legacy batch-sync flow.
    /// GPS and gamification fields default to zero/null.
    /// </summary>
    public static CheckinRecord Create(Guid travelerId, Guid checkpointId, DateTime checkinAt, Guid clientGeneratedId)
    {
        return new CheckinRecord
        {
            Id = Guid.NewGuid(),
            TravelerId = travelerId,
            CheckpointId = checkpointId,
            CheckinAt = checkinAt,
            ClientGeneratedId = clientGeneratedId,
            SyncStatus = SyncStatus.Synced,
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Creates a check-in record for the gamification GPS check-in flow.
    /// </summary>
    /// <param name="userId">The traveler's user ID.</param>
    /// <param name="checkpointId">The checkpoint being checked into.</param>
    /// <param name="latitude">GPS latitude of the check-in location.</param>
    /// <param name="longitude">GPS longitude of the check-in location.</param>
    /// <param name="accuracy">GPS accuracy in metres, or null if unavailable.</param>
    /// <param name="xpAwarded">XP awarded for this check-in (50 base or 150 with token).</param>
    /// <param name="dollTokenId">The DollToken.Id consumed, or null for a standard check-in.</param>
    public static CheckinRecord CreateGamificationCheckin(Guid userId, Guid checkpointId, double latitude, double longitude,
                         double? accuracy, int xpAwarded, Guid? dollTokenId = null)
    {
        return new CheckinRecord
        {
            Id = Guid.NewGuid(),
            TravelerId = userId,
            CheckpointId = checkpointId,
            Latitude = latitude,
            Longitude = longitude,
            Accuracy = accuracy,
            CheckinAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            ClientGeneratedId = Guid.NewGuid(), // auto-generate for GPS flow
            SyncStatus = SyncStatus.Synced,
            XpAwarded = xpAwarded,
            DollTokenId = dollTokenId
        };
    }
}
