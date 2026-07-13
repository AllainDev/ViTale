using System.Text;
using Microsoft.Extensions.Logging;
using Application.Interfaces.Services;

namespace Infrastructure.Services;

/// <summary>
/// Azure Cognitive Services TTS.
/// Generates MP3 via Azure TTS and returns it directly as a base64 Data URI.
/// Per security and privacy requirements, voice data is NEVER saved to persistent storage.
/// </summary>
public class AzureTtsService : ITextToSpeechService
{
    private readonly HttpClient _http;
    private readonly ILogger<AzureTtsService> _logger;
    private readonly string _region;
    private readonly string _key;

    private static readonly Dictionary<string, string> VoiceMap = new()
    {
        ["vi"] = "vi-VN-HoaiMyNeural",
        ["en"] = "en-US-JennyNeural"
    };

    public AzureTtsService(
        IHttpClientFactory factory,
        ILogger<AzureTtsService> logger)
    {
        _http    = factory.CreateClient("AzureTts");
        _logger  = logger;
        _region  = Environment.GetEnvironmentVariable("AZURE_TTS_REGION") ?? "southeastasia";
        _key     = Environment.GetEnvironmentVariable("AZURE_TTS_KEY")    ?? string.Empty;
    }

    public async Task<string?> GenerateAudioAsync(
        string text,
        string languageCode,
        string sessionId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_key))
        {
            _logger.LogWarning("AZURE_TTS_KEY not configured — skipping TTS");
            return null;
        }

        try
        {
            var voice   = VoiceMap.TryGetValue(languageCode.Split('-')[0], out var v) ? v : VoiceMap["en"];
            var langAttr = languageCode.Length >= 2 ? languageCode : "en-US";

            var ssml = string.Concat(
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
                $"<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" xml:lang=\"{langAttr}\">",
                $"<voice name=\"{voice}\">",
                $"<prosody rate=\"+0%\">{EscapeXml(text)}</prosody>",
                "</voice>",
                "</speak>");

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"https://{_region}.tts.speech.microsoft.com/cognitiveservices/v1");

            request.Headers.Add("Ocp-Apim-Subscription-Key", _key);
            request.Content = new StringContent(ssml, Encoding.UTF8, "application/ssml+xml");
            request.Headers.Add("X-Microsoft-OutputFormat", "audio-16khz-32kbitrate-mono-mp3");

            var response = await _http.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();

            var audioBytes = await response.Content.ReadAsByteArrayAsync(ct);
            
            // Return as base64 Data URI to prevent saving to storage
            var base64 = Convert.ToBase64String(audioBytes);
            return $"data:audio/mpeg;base64,{base64}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Azure TTS generation failed");
            return null;
        }
    }

    private static string EscapeXml(string text) =>
        text.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
}
