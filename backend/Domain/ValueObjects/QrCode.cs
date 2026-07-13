using Domain.Common;

namespace Domain.ValueObjects;

/// <summary>Validates and wraps a QR code string (16-32 alphanumeric chars).</summary>
public sealed class QrCode : ValueObject
{
    public string Value { get; }

    private QrCode(string value) { Value = value; }

    public static Result<QrCode> Create(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return Result<QrCode>.Failure("QR code cannot be empty");
        if (value.Length < 16 || value.Length > 32)
            return Result<QrCode>.Failure("QR code must be between 16 and 32 characters");
        if (!value.All(char.IsLetterOrDigit))
            return Result<QrCode>.Failure("QR code must contain only alphanumeric characters");
        return Result<QrCode>.Success(new QrCode(value));
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;
}

