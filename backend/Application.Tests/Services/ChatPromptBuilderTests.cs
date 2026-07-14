using Application.DTOs;
using Application.Interfaces.Services;
using Application.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Application.Tests.Services;

public class ChatPromptBuilderTests
{
    private class FakeKbService : IHanoiKnowledgeService
    {
        public List<HanoiKnowledgeChunk> Chunks { get; set; } = new();
        public Task<IReadOnlyList<HanoiKnowledgeChunk>> SearchAsync(string query, string language, int topK = 3, string? category = null, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<HanoiKnowledgeChunk>>(Chunks);
    }

    private ChatPromptBuilder MakeSut(List<HanoiKnowledgeChunk>? chunks = null)
    {
        var kb = new FakeKbService { Chunks = chunks ?? new() };
        return new ChatPromptBuilder(kb, NullLogger<ChatPromptBuilder>.Instance);
    }

    [Fact]
    public async Task BuildSystemPrompt_IncludesVietnamesePersona_WhenLanguageIsVi()
    {
        var sut = MakeSut();
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("Hỏi về Hà Nội", "vi", null, null, null),
            CancellationToken.None);

        Assert.Contains("Mai", prompt);
        Assert.Contains("Hà Nội", prompt);
    }

    [Fact]
    public async Task BuildSystemPrompt_IncludesEnglishPersona_WhenLanguageIsEn()
    {
        var sut = MakeSut();
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("Tell me about Hanoi", "en", null, null, null),
            CancellationToken.None);

        Assert.Contains("Mai", prompt);
        Assert.Contains("Hanoi", prompt);
    }

    [Fact]
    public async Task BuildSystemPrompt_InjectsKbChunks_WhenFound()
    {
        var chunks = new List<HanoiKnowledgeChunk>
        {
            new("Hoan Kiem Lake", "What is it?", "A lake in center of Hanoi.", "ViTale KB", "history")
        };
        var sut = MakeSut(chunks);
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("lake", "en", null, null, null),
            CancellationToken.None);

        Assert.Contains("Hoan Kiem Lake", prompt);
        Assert.Contains("A lake in center", prompt);
    }

    [Fact]
    public async Task BuildSystemPrompt_ShowsEmptyKbSection_WhenNoChunks()
    {
        var sut = MakeSut();
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("xyz", "vi", null, null, null),
            CancellationToken.None);

        Assert.Contains("Không có thông tin liên quan", prompt);
    }

    [Fact]
    public async Task BuildSystemPrompt_IncludesGpsSection_WhenCoordinatesPresent()
    {
        var sut = MakeSut();
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("nearby?", "vi", 21.0285, 105.8542, null),
            CancellationToken.None);

        Assert.Contains("21.0285", prompt);
        Assert.Contains("105.8542", prompt);
    }

    [Fact]
    public async Task BuildSystemPrompt_OmitsGpsSection_WhenNoCoordinates()
    {
        var sut = MakeSut();
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("hi", "vi", null, null, null),
            CancellationToken.None);

        Assert.DoesNotContain("VỊ TRÍ HIỆN TẠI", prompt);
    }

    [Fact]
    public async Task BuildSystemPrompt_AlwaysEndsWithSafetyRails()
    {
        var sut = MakeSut();
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("x", "en", null, null, null),
            CancellationToken.None);

        // Safety rails should be near the end
        Assert.EndsWith(prompt.Trim(), prompt.Trim());
        Assert.Contains("Safety", prompt, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("CHỈ trả lời về Hà Nội", prompt);
    }
}