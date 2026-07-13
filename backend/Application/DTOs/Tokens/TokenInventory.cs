using System.Collections.Generic;

namespace Application.DTOs;

public record TokenInventory
{
    public List<TokenInfo> Tokens { get; init; } = new();
}
