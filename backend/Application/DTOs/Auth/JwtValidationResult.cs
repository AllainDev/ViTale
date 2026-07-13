using System;

namespace Application.DTOs;

public record JwtValidationResult(
    Guid Id,
    string? EmailOrUsername,
    bool IsRegistered,
    string Role,
    DateTime IssuedAt);
