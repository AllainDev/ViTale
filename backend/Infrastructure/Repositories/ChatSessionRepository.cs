using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class ChatSessionRepository : IChatSessionRepository
{
    private readonly ApplicationDbContext _db;
    public ChatSessionRepository(ApplicationDbContext db) { _db = db; }

    public Task<ChatSession?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.ChatSessions.Include(s => s.Messages).FirstOrDefaultAsync(s => s.Id == id, ct);

    public async Task<ChatSession> CreateAsync(ChatSession session, CancellationToken ct = default)
    {
        _db.ChatSessions.Add(session);
        await _db.SaveChangesAsync(ct);
        return session;
    }

    public async Task UpdateAsync(ChatSession session, CancellationToken ct = default)
    {
        _db.ChatSessions.Update(session);
        await _db.SaveChangesAsync(ct);
    }
}
