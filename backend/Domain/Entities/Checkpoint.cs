namespace Domain.Entities;

public class Checkpoint
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public decimal Latitude { get; private set; }
    public decimal Longitude { get; private set; }
    public int Radius { get; private set; } // metres
    public Guid? StoryChapterId { get; private set; }

    /// <summary>FK to the canonical Region entity. Nullable to allow legacy data.</summary>
    public Guid? RegionId { get; private set; }

    /// <summary>
    /// Legacy string region — kept for backward compatibility.
    /// For new records prefer <see cref="RegionId"/> + navigation property.
    /// </summary>
    public string Region { get; private set; } = string.Empty;

    public string? StoryAssetUrl { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }

    // ── Navigation properties ────────────────────────────────────────────────
    public virtual StoryChapter? StoryChapter { get; private set; }
    public virtual Region? RegionEntity { get; private set; }

    protected Checkpoint() { }

    public static Checkpoint Create(
        string name, decimal latitude, decimal longitude, int radius,
        string region, Guid? storyChapterId = null, string? storyAssetUrl = null,
        Guid? regionId = null)
    {
        if (radius < 10 || radius > 1000)
            throw new ArgumentOutOfRangeException(nameof(radius), "Radius must be between 10 and 1000 metres.");

        return new Checkpoint
        {
            Id = Guid.NewGuid(),
            Name = name,
            Latitude = latitude,
            Longitude = longitude,
            Radius = radius,
            Region = region,
            RegionId = regionId,
            StoryChapterId = storyChapterId,
            StoryAssetUrl = storyAssetUrl,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Updates mutable fields. Pass null to leave a field unchanged.
    /// </summary>
    public void Update(string? name = null, string? region = null,
                       string? storyAssetUrl = null, bool? isActive = null,
                       Guid? regionId = null)
    {
        if (name          != null) Name          = name;
        if (region        != null) Region        = region;
        if (storyAssetUrl != null) StoryAssetUrl = storyAssetUrl;
        if (isActive.HasValue)    IsActive       = isActive.Value;
        if (regionId.HasValue)    RegionId       = regionId.Value;
    }

    /// <summary>
    /// Clears the RegionId FK (unlink from managed region).
    /// </summary>
    public void ClearRegion() => RegionId = null;

    /// <summary>
    /// Updates the GPS check-in radius. Bounded to 10–1000m to match Create().
    /// </summary>
    public void UpdateRadius(int newRadius)
    {
        if (newRadius < 10 || newRadius > 1000)
            throw new ArgumentOutOfRangeException(nameof(newRadius), "Radius must be between 10 and 1000 metres.");
        Radius = newRadius;
    }
}
