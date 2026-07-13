namespace Application.DTOs;

public record LinkAccountResponse(bool Success, string Jwt, TravelerDto Traveler);