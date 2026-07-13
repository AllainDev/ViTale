using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;

namespace WebApi.Controllers;

public class PartnersController : BaseController
{
    private readonly IPartnerRepository _partners;
    private readonly IVoucherRepository _vouchers;
    private readonly IGeolocationService _geo;

    public PartnersController(
        IPartnerRepository partners,
        IVoucherRepository vouchers,
        IGeolocationService geo)
    {
        _partners = partners;
        _vouchers = vouchers;
        _geo = geo;
    }

    /// <summary>GET /api/v1/partners/recommendations?type=Restaurant&lat=21.02&lng=105.85</summary>
    [HttpGet("partners/recommendations")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
    public async Task<IActionResult> GetRecommendations(
        [FromQuery] string? type = null,
        [FromQuery] decimal? lat = null,
        [FromQuery] decimal? lng = null,
        CancellationToken ct = default)
    {
        var partners = await _partners.GetActiveAsync(type, ct);

        var dtos = partners.Select(p =>
        {
            double? distance = null;
            if (lat.HasValue && lng.HasValue && p.Latitude.HasValue && p.Longitude.HasValue)
                distance = _geo.CalculateDistanceMeters(lat.Value, lng.Value, p.Latitude.Value, p.Longitude.Value);

            var availableVouchers = p.Vouchers
                .Count(v => v.IsActive && !v.IsExpired && !v.IsNotYetValid);

            return new PartnerDto(
                p.Id,
                p.Name,
                p.Type.ToString(),
                p.Address,
                p.Latitude,
                p.Longitude,
                distance,
                availableVouchers,
                p.PriorityScore);
        })
        .OrderBy(p => p.DistanceMeters ?? double.MaxValue)
        .ThenByDescending(p => p.PriorityScore)
        .ToList();

        return Ok(new PartnerRecommendationsResponse(dtos));
    }

    /// <summary>GET /api/v1/partners/{id}/vouchers</summary>
    [HttpGet("partners/{id:guid}/vouchers")]
    public async Task<IActionResult> GetPartnerVouchers(Guid id, CancellationToken ct)
    {
        var partner = await _partners.GetByIdAsync(id, ct);
        if (partner is null)
            return NotFound(new { error = "Partner not found" });

        var vouchers = partner.Vouchers
            .Where(v => v.IsActive && !v.IsExpired && !v.IsNotYetValid)
            .Select(v => new VoucherDetailsDto(
                v.Id,
                v.Title,
                v.Description,
                v.DiscountType.ToString(),
                v.DiscountValue,
                v.ValidUntil,
                partner.Name))
            .ToList();

        return Ok(vouchers);
    }
}

