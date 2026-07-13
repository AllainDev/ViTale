using Domain.Enums;

namespace Domain.Entities;

public class Product
{
    public Guid Id { get; private set; }
    public string QRCode { get; private set; } = string.Empty;
    public ProductType ProductType { get; private set; }
    public string Region { get; private set; } = string.Empty;
    public DateTime? ActivatedAt { get; private set; }
    public Guid? ActivatedByTravelerId { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public bool IsActivated => ActivatedAt.HasValue;

    protected Product() { }

    public static Product Create(string qrCode, ProductType productType, string region)
    {
        return new Product
        {
            Id = Guid.NewGuid(),
            QRCode = qrCode,
            ProductType = productType,
            Region = region,
            ActivatedAt = null,
            ActivatedByTravelerId = null,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Activate(Guid travelerId)
    {
        if (IsActivated)
            throw new InvalidOperationException("Product is already activated.");
        ActivatedAt = DateTime.UtcNow;
        ActivatedByTravelerId = travelerId;
    }
}

