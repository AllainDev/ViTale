namespace Application.DTOs;

public record ProcessCheckinBatchResponse(
    int ProcessedCount,
    int SkippedCount,
    IReadOnlyList<BadgeDto> NewBadges,
    IReadOnlyList<StoryChapterDto> UnlockedStories,
    IReadOnlyList<InvalidCheckinDto> InvalidCheckins);