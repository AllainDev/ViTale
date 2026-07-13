using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class StoryChapterRepository : IStoryChapterRepository
{
    private readonly ApplicationDbContext _db;
    public StoryChapterRepository(ApplicationDbContext db) { _db = db; }

    public async Task<IReadOnlyList<StoryChapter>> GetByRegionAsync(string region, CancellationToken ct = default) =>
        await _db.StoryChapters.Where(s => s.Region == region).OrderBy(s => s.SortOrder).ToListAsync(ct);

    public async Task<IReadOnlyList<StoryChapter>> GetAllAsync(CancellationToken ct = default) =>
        await _db.StoryChapters.OrderBy(s => s.SortOrder).ToListAsync(ct);
}
