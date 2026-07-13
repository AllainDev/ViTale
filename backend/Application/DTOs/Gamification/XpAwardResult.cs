using System.Collections.Generic;
using Domain.ValueObjects;

namespace Application.DTOs;

public record XpAwardResult
{
    public int PreviousXp { get; init; }
    public int NewXp { get; init; }
    public int PreviousLevel { get; init; }
    public int NewLevel { get; init; }
    public List<VoucherReward> UnlockedVouchers { get; init; } = new();
}
