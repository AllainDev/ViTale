namespace Application.DTOs;

public record PassportStatusResponse(
    IReadOnlyList<StampDto> Stamps,
    IReadOnlyList<BadgeDto> Badges,
    IReadOnlyList<StoryChapterDto> UnlockedStories,
    Dictionary<string, double> RegionProgress,
    int TotalCheckpoints,
    int VisitedCheckpoints);