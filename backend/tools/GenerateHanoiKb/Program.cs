using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using Infrastructure.Persistence;

return await MainAsync(args);

static async Task<int> MainAsync(string[] args)
{
    Env.Load();

    var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING")
        ?? throw new InvalidOperationException("DB_CONNECTION_STRING not set");
    var apiKey = Environment.GetEnvironmentVariable("GROQ_API_KEY")
        ?? throw new InvalidOperationException("GROQ_API_KEY not set");

    var topicsJsonPath = Path.Combine(AppContext.BaseDirectory, "topics.json");
    var topicsRaw = await File.ReadAllTextAsync(topicsJsonPath);
    var topics = JsonSerializer.Deserialize<List<TopicConfig>>(topicsRaw)
        ?? throw new InvalidOperationException("topics.json empty");

    var options = new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseNpgsql(connectionString)
        .Options;

    var http = new HttpClient { BaseAddress = new Uri("https://api.groq.com/openai/") };
    http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
    http.Timeout = TimeSpan.FromSeconds(30);

    int totalInserted = 0, totalErrors = 0;

    using var db = new ApplicationDbContext(options);

    // Ensure unaccent is installed (idempotent)
    await db.Database.ExecuteSqlRawAsync("CREATE EXTENSION IF NOT EXISTS unaccent;");

    foreach (var topic in topics)
    {
        foreach (var lang in new[] { "vi", "en" })
        {
            try
            {
                var existing = await db.HanoiKnowledges
                    .AnyAsync(k => k.Topic == topic.Topic && k.Language == lang && k.Category == topic.Category);
                if (existing)
                {
                    Console.WriteLine($"SKIP: {topic.Topic} ({lang})");
                    continue;
                }

                var qaPairs = await GenerateQAPairAsync(http, topic, lang);
                foreach (var qa in qaPairs)
                {
                    var entity = HanoiKnowledge.Create(
                        category: topic.Category,
                        topic: topic.Topic,
                        question: qa.Question,
                        answer: qa.Answer,
                        language: lang,
                        keywords: qa.Keywords,
                        source: "ViTale KB"
                    );
                    db.HanoiKnowledges.Add(entity);
                    totalInserted++;
                }
                await db.SaveChangesAsync();
                Console.WriteLine($"OK:   {topic.Topic} ({lang}) — {qaPairs.Count} entries");

                // Be polite to the API — 2.5s between requests to stay under 30 req/min
                await Task.Delay(2500);
            }
            catch (Exception ex)
            {
                totalErrors++;
                Console.Error.WriteLine($"ERR:  {topic.Topic} ({lang}) — {ex.Message}");
            }
        }
    }

    Console.WriteLine($"\nDone. Inserted: {totalInserted}, Errors: {totalErrors}");
    return totalErrors == 0 ? 0 : 1;
}

static async Task<List<QAPair>> GenerateQAPairAsync(HttpClient http, TopicConfig topic, string lang)
{
    var langPrompt = lang == "vi"
        ? "Trả lời bằng tiếng Việt. Ngôn ngữ tự nhiên, thân thiện như người Hà Nội chính gốc."
        : "Respond in English. Natural, friendly tone like a Hanoi local.";

    var prompt = $$"""
You are a Hanoi tourism expert. Generate 1-2 question-answer pairs about "{{topic.Topic}}" for tourists.
{{langPrompt}}

Output STRICT JSON in this exact format (no markdown, no commentary):
{
  "pairs": [
    {
      "question": "natural question a tourist would ask",
      "answer": "50-200 words factual answer with practical tips",
      "keywords": "comma,separated,keywords,synonyms"
    }
  ]
}
""";

    var body = new
    {
        model = "llama-3.1-8b-instant",
        messages = new object[]
        {
            new { role = "system", content = "You output only valid JSON. No prose." },
            new { role = "user", content = prompt }
        },
        temperature = 0.5,
        max_tokens = 800
    };

    var json = JsonSerializer.Serialize(body);

    // Retry with exponential backoff on 429 (rate limit) and 5xx
    HttpResponseMessage? response = null;
    int delayMs = 2000;
    for (int attempt = 0; attempt < 5; attempt++)
    {
        response = await http.PostAsync("v1/chat/completions",
            new StringContent(json, Encoding.UTF8, "application/json"));
        if (response.IsSuccessStatusCode) break;
        if ((int)response.StatusCode == 429 || (int)response.StatusCode >= 500)
        {
            var wait = delayMs * (int)Math.Pow(2, attempt);
            Console.Error.WriteLine($"  Retry {attempt + 1}/5 after {wait}ms (status {(int)response.StatusCode})");
            await Task.Delay(wait);
            continue;
        }
        break; // non-retryable (400, 401, 404)
    }

    response!.EnsureSuccessStatusCode();
    var result = await response.Content.ReadFromJsonAsync<GroqResponse>();
    var text = result?.choices?.FirstOrDefault()?.message?.content ?? "{}";

    // Strip markdown code fences if present
    text = text.Trim();
    if (text.StartsWith("```")) text = text.Substring(text.IndexOf('{'));
    if (text.EndsWith("```")) text = text.Substring(0, text.LastIndexOf('}') + 1);

    var parsed = JsonDocument.Parse(text);
    var pairs = parsed.RootElement.GetProperty("pairs");

    return pairs.EnumerateArray()
        .Select(p => new QAPair(
            Question: p.GetProperty("question").GetString() ?? "",
            Answer: p.GetProperty("answer").GetString() ?? "",
            Keywords: p.TryGetProperty("keywords", out var k) ? k.GetString() : null
        ))
        .ToList();
}

// === Local helpers ===

record TopicConfig(string Category, string Topic);

record QAPair(string Question, string Answer, string? Keywords);

class GroqResponse
{
    public List<GroqChoice>? choices { get; set; }
}
class GroqChoice
{
    public GroqMessage? message { get; set; }
}
class GroqMessage
{
    public string? content { get; set; }
}
