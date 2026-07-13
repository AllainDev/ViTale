using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface IChatMessageRepository
{
    Task<ChatMessage> CreateAsync(ChatMessage message, CancellationToken ct = default);
    Task<IReadOnlyList<ChatMessage>> GetBySessionIdAsync(Guid sessionId, CancellationToken ct = default);
}
