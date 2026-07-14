using System.Text.Json;

namespace Domain.Entities;

public class Traveler
{
    public Guid Id { get; private set; }
    public string AnonymousId { get; private set; } = string.Empty;
    public Guid? LinkedAccountId { get; private set; }
    public string? Preferences { get; private set; }
    public bool IsAnonymous { get; private set; }
    public DateTime CreatedAt { get; private set; }

    // Computed
    public bool IsRegistered => !IsAnonymous;

    // EF constructor
    protected Traveler() { }

    /// <summary>Creates an anonymous traveler session.</summary>
    public static Traveler CreateAnonymous(string anonymousId)
    {
        return new Traveler
        {
            Id = Guid.NewGuid(),
            AnonymousId = anonymousId,
            IsAnonymous = true,
            CreatedAt = DateTime.UtcNow,
            Preferences = "{\"preferredLanguage\":\"en\",\"notificationsEnabled\":true}"
        };
    }

    /// <summary>Links this traveler to a registered account.</summary>
    public void LinkAccount(Guid accountId)
    {
        LinkedAccountId = accountId;
        IsAnonymous = false;
    }

    public void UpdatePreferences(string preferences)
    {
        Preferences = preferences;
    }
}
