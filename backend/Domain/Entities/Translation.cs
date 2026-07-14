namespace Domain.Entities;

public class Translation
{
    public Guid Id { get; private set; }
    public string LanguageCode { get; private set; } = string.Empty;
    public string ContentKey { get; private set; } = string.Empty;
    public string ContentValue { get; private set; } = string.Empty;

    protected Translation() { }

    public static Translation Create(string languageCode, string contentKey, string contentValue)
    {
        return new Translation
        {
            Id = Guid.NewGuid(),
            LanguageCode = languageCode,
            ContentKey = contentKey,
            ContentValue = contentValue
        };
    }
}

