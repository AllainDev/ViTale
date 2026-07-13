using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface IStoryChapterRepository
{
    Task<IReadOnlyList<StoryChapter>> GetByRegionAsync(string region, CancellationToken ct = default);
    Task<IReadOnlyList<StoryChapter>> GetAllAsync(CancellationToken ct = default);
}
