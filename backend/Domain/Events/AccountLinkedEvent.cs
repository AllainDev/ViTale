using Domain.Common;

namespace Domain.Events;

public sealed class AccountLinkedEvent : DomainEvent
{
    public Guid TravelerId { get; }
    public Guid PassportAccountId { get; }
    public AccountLinkedEvent(Guid travelerId, Guid passportAccountId)
    {
        TravelerId = travelerId;
        PassportAccountId = passportAccountId;
    }
}