namespace Application.DTOs;

public class GenerateTokenRequest
{
    public Guid DollId { get; set; }
    public DateTime? ExpiryDate { get; set; }
}
