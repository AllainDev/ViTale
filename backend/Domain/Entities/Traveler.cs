using System.Text.Json;

namespace Domain.Entities;

public class Traveler
{
    public Guid Id { get; private set; }
    public string AnonymousId { get; private set; } = string.Empty;
    public Guid? LinkedAccountId { get; private set; }
    public JsonDocument? Preferences { get; private set; }
    public DateTime CreatedAt { get; private set; }

    // Computed
    public bool IsAnonymous => LinkedAccountId is null;
    public bool IsRegistered => LinkedAccountId is not null;

    // EF constructor
    protected Traveler() { }

    public static Traveler CreateAnonymous(string anonymousId)
    {
        return new Traveler
        {
            Id = Guid.NewGuid(),
            AnonymousId = anonymousId,
            LinkedAccountId = null,
            CreatedAt = DateTime.UtcNow,
            Preferences = JsonDocument.Parse("{\"preferredLanguage\":\"en\",\"notificationsEnabled\":true}")
        };
    }

    public void LinkAccount(Guid passportAccountId)
    {
        LinkedAccountId = passportAccountId;
    }

    public void UpdatePreferences(JsonDocument preferences)
    {
        Preferences = preferences;
    }
}

