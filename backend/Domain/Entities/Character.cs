using System.Text.Json;

namespace Domain.Entities;

public class Character
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Region { get; private set; } = string.Empty;
    public Guid? ProductId { get; private set; }
    public string ModelUrl { get; private set; } = string.Empty;
    public string AnimationClips { get; private set; } = "{}";
    public string? Description { get; private set; }
    public bool IsDeleted { get; private set; }

    /// <summary>FK to the canonical Region entity. Nullable for backward compatibility.</summary>
    public Guid? RegionId { get; private set; }

    // ── Navigation properties ────────────────────────────────────────────────
    public virtual Product? Product { get; private set; }
    public virtual ICollection<Checkpoint> Checkpoints { get; private set; } = new List<Checkpoint>();
    public virtual Region? RegionEntity { get; private set; }

    protected Character() { }

    public static Character Create(string name, string region, string modelUrl, string animationClips, string? description = null, Guid? productId = null, Guid? regionId = null)
    {
        return new Character
        {
            Id = Guid.NewGuid(),
            Name = name,
            Region = region,
            RegionId = regionId,
            ProductId = productId,
            ModelUrl = modelUrl,
            AnimationClips = animationClips,
            Description = description,
            IsDeleted = false
        };
    }

    public void Update(string name, string region, string modelUrl, string? description, Guid? regionId = null)
    {
        Name = name;
        Region = region;
        ModelUrl = modelUrl;
        Description = description;
        if (regionId.HasValue) RegionId = regionId.Value;
    }

    public void SoftDelete()
    {
        IsDeleted = true;
    }
}

