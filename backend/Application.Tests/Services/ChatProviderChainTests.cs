using Application.Interfaces.Services;
using Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Application.Tests.Services;

public class ChatProviderChainTests
{
    private class FakeProvider : IChatProvider
    {
        public string Name { get; }
        public int Priority { get; }
        public bool SupportsToolCalling => true;
        public int CallCount { get; private set; }
        public Func<int, ChatCompletionResult>? OnCall { get; set; }

        public FakeProvider(string name, int priority, Func<int, ChatCompletionResult>? onCall = null)
        {
            Name = name;
            Priority = priority;
            OnCall = onCall;
        }

        public Task<ChatCompletionResult> CompleteAsync(ChatCompletionRequest req, CancellationToken ct = default)
        {
            CallCount++;
            if (OnCall != null) return Task.FromResult(OnCall(CallCount));
            return Task.FromResult(new ChatCompletionResult("ok", Array.Empty<ToolCall>(), Name, 0, 0));
        }
    }

    [Fact]
    public async Task CompleteAsync_CallsPrimaryProvider_WhenItSucceeds()
    {
        var primary = new FakeProvider("primary", 0);
        var fallback = new FakeProvider("fallback", 1);
        var chain = new ChatProviderChain(new[] { primary, fallback }, NullLogger<ChatProviderChain>.Instance);

        var result = await chain.CompleteAsync(new ChatCompletionRequest(
            "sys", Array.Empty<(string, string)>(), null, "model", 100, 0.7));

        Assert.Equal("primary", result.ProviderName);
        Assert.Equal(1, primary.CallCount);
        Assert.Equal(0, fallback.CallCount);
    }

    [Fact]
    public async Task CompleteAsync_FallsBackToSecondary_WhenPrimaryThrows()
    {
        var primary = new FakeProvider("primary", 0, _ => throw new HttpRequestException("fail"));
        var fallback = new FakeProvider("fallback", 1);
        var chain = new ChatProviderChain(new[] { primary, fallback }, NullLogger<ChatProviderChain>.Instance);

        var result = await chain.CompleteAsync(new ChatCompletionRequest(
            "sys", Array.Empty<(string, string)>(), null, "model", 100, 0.7));

        Assert.Equal("fallback", result.ProviderName);
        Assert.Equal(1, primary.CallCount);
        Assert.Equal(1, fallback.CallCount);
    }

    [Fact]
    public async Task CompleteAsync_ThrowsAggregate_WhenAllProvidersFail()
    {
        var p1 = new FakeProvider("p1", 0, _ => throw new HttpRequestException("fail1"));
        var p2 = new FakeProvider("p2", 1, _ => throw new HttpRequestException("fail2"));
        var chain = new ChatProviderChain(new[] { p1, p2 }, NullLogger<ChatProviderChain>.Instance);

        await Assert.ThrowsAsync<AggregateException>(() =>
            chain.CompleteAsync(new ChatCompletionRequest(
                "sys", Array.Empty<(string, string)>(), null, "model", 100, 0.7)));
    }

    [Fact]
    public async Task CompleteAsync_DoesNotFallback_OnNonRetryableError()
    {
        var primary = new FakeProvider("primary", 0, _ => throw new ArgumentException("bad arg"));
        var fallback = new FakeProvider("fallback", 1);
        var chain = new ChatProviderChain(new[] { primary, fallback }, NullLogger<ChatProviderChain>.Instance);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            chain.CompleteAsync(new ChatCompletionRequest(
                "sys", Array.Empty<(string, string)>(), null, "model", 100, 0.7)));
        Assert.Equal(0, fallback.CallCount);
    }
}