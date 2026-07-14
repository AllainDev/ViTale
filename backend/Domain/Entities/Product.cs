using Domain.Enums;

namespace Domain.Entities;

/// <summary>
/// Represents a product (e.g., Búp bê Hà Nội, Vỏ hộ chiếu Hội An).
/// Products of type Doll can be linked to a 3D Character model and have DollTokens (QR codes).
/// All products appear in the customer-facing catalog.
/// </summary>
public class Product
{
    public Guid Id { get; private set; }

    // ── Display / Catalog Fields ─────────────────────────────────────────────
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string Material { get; private set; } = string.Empty;
    public string Price { get; private set; } = string.Empty;
    public bool IsHighlight { get; private set; }
    public bool IsDeleted { get; private set; }

    // ── Product Classification ────────────────────────────────────────────────
    /// <summary>Internal SKU / product code. For admin reference only. Not a claim token.</summary>
    public string? Sku { get; private set; }

    public ProductType ProductType { get; private set; }
    public string? ImageUrl { get; private set; }
    public string Region { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }

    // ── Navigation properties ────────────────────────────────────────────────
    public virtual ICollection<DollToken> DollTokens { get; private set; } = new List<DollToken>();
    public virtual ICollection<Character> Characters { get; private set; } = new List<Character>();
    public virtual Region? RegionEntity { get; private set; }

    /// <summary>FK to the canonical Region entity. Nullable for backward compatibility.</summary>
    public Guid? RegionId { get; private set; }

    protected Product() { }

    public static Product Create(
        string name,
        string region,
        ProductType productType,
        string? sku = null,
        string? imageUrl = null,
        string? description = null,
        string? material = null,
        string? price = null,
        bool isHighlight = false)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required.", nameof(name));

        if (string.IsNullOrWhiteSpace(region))
            throw new ArgumentException("Region is required.", nameof(region));

        if (sku != null && sku.Length > 64)
            throw new ArgumentException("Sku must be 64 characters or fewer.", nameof(sku));

        return new Product
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Region = region.Trim(),
            RegionId = null, // set separately via LinkRegion()
            ProductType = productType,
            Sku = string.IsNullOrWhiteSpace(sku) ? null : sku.Trim(),
            ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim(),
            Description = description?.Trim() ?? string.Empty,
            Material = material?.Trim() ?? string.Empty,
            Price = price?.Trim() ?? string.Empty,
            IsHighlight = isHighlight,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Update(
        string? name = null,
        string? region = null,
        string? sku = null,
        string? description = null,
        string? material = null,
        string? price = null,
        string? imageUrl = null,
        bool? isHighlight = null)
    {
        if (name    != null) Name        = name.Trim();
        if (region  != null) Region      = region.Trim();
        if (sku     != null) Sku         = string.IsNullOrWhiteSpace(sku) ? null : sku.Trim();
        if (description != null) Description = description.Trim();
        if (material    != null) Material    = material.Trim();
        if (price       != null) Price       = price.Trim();
        if (imageUrl    != null) ImageUrl    = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
        if (isHighlight.HasValue) IsHighlight = isHighlight.Value;
    }

    /// <summary>Links this product to the canonical Region entity.</summary>
    public void LinkRegion(Guid? regionId) => RegionId = regionId;

    public void UpdateImageUrl(string? imageUrl)
    {
        ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
    }

    public void MarkAsDeleted() => IsDeleted = true;
}
