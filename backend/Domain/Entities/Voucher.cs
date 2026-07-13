using Domain.Enums;

namespace Domain.Entities;

public class Voucher
{
    public Guid Id { get; private set; }
    public Guid PartnerId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public DiscountType DiscountType { get; private set; }
    public decimal DiscountValue { get; private set; }
    public decimal? MinimumSpend { get; private set; }
    public int? MaxRedemptions { get; private set; }
    public DateTime ValidFrom { get; private set; }
    public DateTime ValidUntil { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public Partner? Partner { get; private set; }

    public bool IsExpired => DateTime.UtcNow > ValidUntil;
    public bool IsNotYetValid => DateTime.UtcNow < ValidFrom;

    protected Voucher() { }
}

public class TravelerVoucher
{
    public Guid Id { get; private set; }
    public Guid TravelerId { get; private set; }
    public Guid VoucherId { get; private set; }
    public DateTime ClaimedAt { get; private set; }
    public DateTime? RedeemedAt { get; private set; }
    public string RedemptionCode { get; private set; } = string.Empty;

    public Voucher? Voucher { get; private set; }

    public bool IsRedeemed => RedeemedAt.HasValue;

    protected TravelerVoucher() { }

    public static TravelerVoucher Create(Guid travelerId, Guid voucherId, string redemptionCode)
    {
        return new TravelerVoucher
        {
            Id = Guid.NewGuid(),
            TravelerId = travelerId,
            VoucherId = voucherId,
            ClaimedAt = DateTime.UtcNow,
            RedeemedAt = null,
            RedemptionCode = redemptionCode
        };
    }
}

