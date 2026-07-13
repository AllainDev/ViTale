using System;

namespace Application.DTOs;

public record GamificationCheckinResult(
    bool Success,
    string Message,
    int? XpAwarded,
    int? TotalXp,
    bool? StampUnlocked,
    Guid? StampId);
