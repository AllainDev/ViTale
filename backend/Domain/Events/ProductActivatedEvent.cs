using Domain.Common;

namespace Domain.Events;

public sealed class ProductActivatedEvent : DomainEvent
{
    public Guid ProductId { get; }
    public Guid TravelerId { get; }
    public ProductActivatedEvent(Guid productId, Guid travelerId)
    {
        ProductId = productId;
        TravelerId = travelerId;
    }
}