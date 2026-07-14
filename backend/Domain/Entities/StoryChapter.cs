using System.Text.Json;

namespace Domain.Entities;

public class StoryChapter
{
    public Guid Id { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string ContentKey { get; private set; } = string.Empty;
    public string Region { get; private set; } = string.Empty;
    public string UnlockCondition { get; private set; } = "{}";
    public int SortOrder { get; private set; }
    public bool IsPublished { get; private set; }
    public DateTime CreatedAt { get; private set; }

    // Navigation property
    public virtual ICollection<Checkpoint> Checkpoints { get; private set; } = new List<Checkpoint>();

    protected StoryChapter() { }

    /// <summary>Parses unlock condition to get required checkpoint IDs.</summary>
    public IReadOnlyList<Guid> GetRequiredCheckpointIds()
    {
        using var doc = JsonDocument.Parse(UnlockCondition);
        var root = doc.RootElement;
        if (!root.TryGetProperty("requiredCheckpointIds", out var arr))
            return [];

        return arr.EnumerateArray()
                  .Select(e => Guid.TryParse(e.GetString(), out var g) ? g : Guid.Empty)
                  .Where(g => g != Guid.Empty)
                  .ToList();
    }

    /// <summary>
    /// Creates a new, unpublished story chapter.
    /// </summary>
    /// <param name="title">The localized title key or direct title.</param>
    /// <param name="contentKey">Key used to fetch the actual text/content from the CMS or translation service.</param>
    /// <param name="region">The region this chapter belongs to (e.g., 'hoan-kiem').</param>
    /// <param name="unlockCondition">JSON representing how this chapter is unlocked (e.g., '{ "requiredXp": 100 }').</param>
    /// <param name="sortOrder">The order of this chapter in the overarching story.</param>
    public static StoryChapter Create(string title, string contentKey, string region, string unlockCondition, int sortOrder)
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

