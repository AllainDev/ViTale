namespace Application.Interfaces.Services;

public interface ITextToSpeechService
{
    Task<string?> GenerateAudioAsync(string text, string languageCode, string sessionId, CancellationToken ct = default);
}
