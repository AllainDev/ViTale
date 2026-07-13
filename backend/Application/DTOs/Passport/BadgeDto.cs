namespace Application.DTOs;

public record BadgeDto(Guid BadgeId, string Name, string? Description, string ImageUrl, DateTime EarnedAt);