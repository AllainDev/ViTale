namespace Application.DTOs;

public class CreateDollRequest
{
    /// <summary>Internal SKU, e.g. "SKU-HANOI-001". Optional.</summary>
    public string? Sku { get; set; }

    /// <summary>Region the doll unlocks bonuses for, e.g. "Hà N?i". Required.</summary>
    public string Region { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}

