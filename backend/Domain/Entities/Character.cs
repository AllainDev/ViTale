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

    // ── Navigation properties ────────────────────────────────────────
    public virtual Product? Product { get; private set; }
    public virtual ICollection<Checkpoint> Checkpoints { get; private set; } = new List<Checkpoint>();

    protected Character() { }

    public static Character Create(string name, string region, string modelUrl, string animationClips, string? description = null, Guid? productId = null)
    {
        return new Character
        {
            Id = Guid.NewGuid(),
            Name = name,
            Region = region,
            ProductId = productId,
            ModelUrl = modelUrl,
            AnimationClips = animationClips,
            Description = description,
            IsDeleted = false
        };
    }

    public void Update(string name, string region, string modelUrl, string? description)
    {
        Name = name;
        Region = region;
        ModelUrl = modelUrl;
        Description = description;
    }

    public void SoftDelete()
    {
        IsDeleted = true;
    }
}

