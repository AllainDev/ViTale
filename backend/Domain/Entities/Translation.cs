namespace Domain.Entities;

public class Translation
{
    public Guid Id { get; private set; }
    public string LanguageCode { get; private set; } = string.Empty;
    public string ContentKey { get; private set; } = string.Empty;
    public string ContentValue { get; private set; } = string.Empty;

    protected Translation() { }
}

