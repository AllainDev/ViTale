namespace Application.Interfaces.Services;

public interface ISecureRandomService
{
    string GenerateAnonymousId(int length = 12);
    string GenerateRedemptionCode(int length = 8);
    string GenerateQrCode(int length = 20);
    string GenerateFileHash(string input);
}
