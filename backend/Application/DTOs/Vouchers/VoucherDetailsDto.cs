namespace Application.DTOs;

public record VoucherDetailsDto(
    Guid VoucherId,
    string Title,
    string? Description,
    string DiscountType,
    decimal DiscountValue,
    DateTime ValidUntil,
    string PartnerName);