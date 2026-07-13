using System;

namespace Domain.Exceptions;

public class RateLimitExceededException(int retryAfterSeconds)
    : Exception("Rate limit exceeded, retry in {retryAfterSeconds}s")
{
    public int RetryAfterSeconds { get; } = retryAfterSeconds;
}
