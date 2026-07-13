using System;

namespace Application.DTOs;

public record TokenValidationResult
{
    public bool IsValid { get; init; }
    public Guid? DollId { get; init; }
    public string? DollName { get; init; }
    public DateTime? TokenExpiry { get; init; }
    public string? ErrorMessage { get; init; }
}
