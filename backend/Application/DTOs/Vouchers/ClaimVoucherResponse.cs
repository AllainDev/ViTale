namespace Application.DTOs;

public record ClaimVoucherResponse(string RedemptionCode, VoucherDetailsDto Voucher);