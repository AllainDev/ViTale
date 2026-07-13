namespace Application.DTOs;

public record LoginResponse(string Jwt, DateTime ExpiresAt, TravelerDto Traveler);