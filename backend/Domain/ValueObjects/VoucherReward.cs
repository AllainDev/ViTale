namespace Domain.ValueObjects;

/// <summary>Represents a voucher reward granted when a traveler levels up.</summary>
public sealed record VoucherReward(Guid VoucherId, string Title, int AwardedAtLevel);
