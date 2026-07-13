using Domain.Enums;

namespace Domain.Entities;

/// <summary>
/// Represents a "doll model" — the type of physical product (e.g., "Búp bê Hà Nội").
/// Each model can have many <see cref="DollToken"/> records, one per physical unit sold.
/// The QR code printed on the physical packaging is the DollToken.Token, NOT this entity.
///
/// IMPORTANT: <see cref="Sku"/> is an INTERNAL reference code only. It is NEVER used
/// to claim or activate a doll. The only valid claim token lives in <see cref="DollToken.Token"/>.
/// </summary>
public class Product
{
    public Guid Id { get; private set; }

    /// <summary>Internal SKU / product code. For admin reference only. Not a claim token.</summary>
    public string? Sku { get; private set; }

    public ProductType ProductType { get; private set; }
    public string Region { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }

    protected Product() { }

    /// <summary>
    /// Creates a new doll model. The actual claim tokens (QR codes) are created separately
    /// by the admin via the token generation endpoint — one DollToken per physical unit sold.
    /// </summary>
    public static Product Create(string? sku, ProductType productType, string region)
    {
        if (productType != ProductType.Doll)
            throw new ArgumentException("Product.Create only supports Doll type here. Use other factories for non-doll products.");

        if (string.IsNullOrWhiteSpace(region))
            throw new ArgumentException("Region is required for a Doll product.", nameof(region));

        if (sku != null && sku.Length > 64)
            throw new ArgumentException("Sku must be 64 characters or fewer.", nameof(sku));

        return new Product
        {
            Id = Guid.NewGuid(),
            Sku = string.IsNullOrWhiteSpace(sku) ? null : sku.Trim(),
            ProductType = productType,
            Region = region.Trim(),
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Updates mutable fields. Pass null to leave a field unchanged.
    /// </summary>
    public void Update(string? sku = null, string? region = null)
    {
        if (sku    != null) Sku    = string.IsNullOrWhiteSpace(sku) ? null : sku.Trim();
        if (region != null) Region = region.Trim();
    }
}
