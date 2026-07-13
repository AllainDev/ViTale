using System.Text.Json;

namespace Domain.Entities;

public class StoryChapter
{
    public Guid Id { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string ContentKey { get; private set; } = string.Empty;
    public string Region { get; private set; } = string.Empty;
    public JsonDocument UnlockCondition { get; private set; } = JsonDocument.Parse("{}");
    public int SortOrder { get; private set; }
    public DateTime CreatedAt { get; private set; }

    protected StoryChapter() { }

    /// <summary>Parses unlock condition to get required checkpoint IDs.</summary>
    public IReadOnlyList<Guid> GetRequiredCheckpointIds()
    {
        var root = UnlockCondition.RootElement;
        if (!root.TryGetProperty("requiredCheckpointIds", out var arr))
            return [];

        return arr.EnumerateArray()
                  .Select(e => Guid.TryParse(e.GetString(), out var g) ? g : Guid.Empty)
                  .Where(g => g != Guid.Empty)
                  .ToList();
    }

    public static StoryChapter Create(string title, string contentKey, string region, JsonDocument unlockCondition, int sortOrder)
    {
        return new StoryChapter
        {
            Id = Guid.NewGuid(),
            Title = title,
            ContentKey = contentKey,
            Region = region,
            UnlockCondition = unlockCondition,
            SortOrder = sortOrder,
            CreatedAt = DateTime.UtcNow
        };
    }
}

