using System.Security.Cryptography;
using Application.Interfaces.Services;

namespace Infrastructure.Services;

/// <summary>Cryptographically secure random string generation.</summary>
public class SecureRandomService : ISecureRandomService
{
    private const string AlphanumericChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    public string GenerateAnonymousId(int length = 12) => GenerateRandom(length);
    public string GenerateRedemptionCode(int length = 8) => GenerateRandom(length).ToUpperInvariant();
    public string GenerateQrCode(int length = 20) => GenerateRandom(length);

    public string GenerateFileHash(string input)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(input + DateTimeOffset.UtcNow.Ticks);
        return Convert.ToHexString(SHA256.HashData(bytes))[..16].ToLowerInvariant();
    }

    private static string GenerateRandom(int length)
    {
        return RandomNumberGenerator.GetString(AlphanumericChars, length);
    }
}

