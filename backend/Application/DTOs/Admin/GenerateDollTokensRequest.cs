namespace Application.DTOs;

public class GenerateDollTokensRequest
{
    /// <summary>How many tokens to generate (default 1, max 1000).</summary>
    public int? Count { get; set; }
}
