using System.Text.Json;

namespace Domain.Entities;

public class Character
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Region { get; private set; } = string.Empty;
    public string ModelUrl { get; private set; } = string.Empty;
    public JsonDocument AnimationClips { get; private set; } = JsonDocument.Parse("{}");
    public string? Description { get; private set; }
    public bool IsDeleted { get; private set; }

    protected Character() { }

    public static Character Create(string name, string region, string modelUrl, JsonDocument animationClips, string? description = null)
    {
        return new Character
        {
            Id = Guid.NewGuid(),
            Name = name,
            Region = region,
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

