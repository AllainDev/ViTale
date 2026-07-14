namespace Domain.Entities;

/// <summary>
/// Represents a managed tourist region (e.g., "Hà Nội", "Hội An").
/// Acts as the canonical source of region names for the whole system.
/// </summary>
public class Region
{
    public Guid Id { get; private set; }

    /// <summary>Display name of the region (e.g., "Hà Nội").</summary>
    public string Name { get; private set; } = string.Empty;

    /// <summary>URL-safe slug derived from the name (e.g., "ha-noi"). Unique.</summary>
    public string Slug { get; private set; } = string.Empty;

    /// <summary>Optional short description shown in admin UI and mobile app.</summary>
    public string? Description { get; private set; }

    /// <summary>Controls display order in dropdowns and listings (ascending).</summary>
    public int SortOrder { get; private set; }

    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }

    // ── Navigation properties ────────────────────────────────────────────────
    public virtual ICollection<Checkpoint> Checkpoints { get; private set; } = new List<Checkpoint>();
    public virtual ICollection<Character> Characters { get; private set; } = new List<Character>();
    public virtual ICollection<Product> Products { get; private set; } = new List<Product>();

    protected Region() { }

    public static Region Create(string name, string slug, string? description = null, int sortOrder = 0)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Region name is required.", nameof(name));
        if (string.IsNullOrWhiteSpace(slug))
            throw new ArgumentException("Region slug is required.", nameof(slug));

        return new Region
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Slug = slug.Trim().ToLowerInvariant(),
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            SortOrder = sortOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Update(string? name, string? slug, string? description, int? sortOrder, bool? isActive)
    {
        if (name != null) Name = name.Trim();
        if (slug != null) Slug = slug.Trim().ToLowerInvariant();
        if (description != null) Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        if (sortOrder.HasValue) SortOrder = sortOrder.Value;
        if (isActive.HasValue) IsActive = isActive.Value;
    }
}
