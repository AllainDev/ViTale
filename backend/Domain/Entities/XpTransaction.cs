using Domain.Enums;

namespace Domain.Entities;

public class XpTransaction
{
    public Guid Id { get; private set; }
    /// <summary>FK to UserGamificationProfile.Id (not Traveler.Id).</summary>
    public Guid UserId { get; private set; }
    public int Amount { get; private set; }
    public XpSource Source { get; private set; }
    public DateTime Timestamp { get; private set; }

    // EF Core
    protected XpTransaction() { }

    /// <param name="profileId">UserGamificationProfile.Id — the parent profile's PK.</param>
    public XpTransaction(Guid profileId, int amount, XpSource source)
    {
        Id = Guid.NewGuid();
        UserId = profileId; // stored in 'user_id' column, FK to user_gamification_profiles
        Amount = amount;
        Source = source;
        Timestamp = DateTime.UtcNow;
    }
}

