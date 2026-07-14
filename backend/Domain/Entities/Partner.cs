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

    public static Partner Create(string name, PartnerType type, string? contactEmail, string? phoneNumber, string? address, decimal? latitude, decimal? longitude, int priorityScore)
    {
        return new Partner
        {
            Id = Guid.NewGuid(),
            Name = name,
            Type = type,
            ContactEmail = contactEmail,
            PhoneNumber = phoneNumber,
            Address = address,
            Latitude = latitude,
            Longitude = longitude,
            PriorityScore = priorityScore,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }
}

