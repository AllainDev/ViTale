namespace Application.DTOs;

public class GenerateTokenResponse
{
    /// <summary>
    /// The generated 16-character alphanumeric token.
    /// </summary>
    public string Token { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}
