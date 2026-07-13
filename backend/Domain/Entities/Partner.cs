using Domain.Enums;

namespace Domain.Entities;

public class Partner
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public PartnerType Type { get; private set; }
    public string? ContactEmail { get; private set; }
    public string? PhoneNumber { get; private set; }
    public string? Address { get; private set; }
    public decimal? Latitude { get; private set; }
    public decimal? Longitude { get; private set; }
    public int PriorityScore { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public ICollection<Voucher> Vouchers { get; private set; } = [];

    protected Partner() { }
}

