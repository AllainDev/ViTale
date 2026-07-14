### Task 17: ChatToolExecutor — runs 5 tools against DB

**Files:**
- Create: `backend/Infrastructure/Services/ChatToolExecutor.cs`

- [ ] **Step 1: Create executor**

Create `backend/Infrastructure/Services/ChatToolExecutor.cs`:

```csharp
using System.Text.Json;
using Application.DTOs;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Domain.Enums;

namespace Infrastructure.Services;

/// <summary>
/// Executes tool calls from the LLM by querying DB repositories.
/// Returns a JSON-serializable result to send back to the LLM.
/// </summary>
public class ChatToolExecutor
{
    private readonly ICheckpointRepository _checkpoints;
    private readonly IPartnerRepository _partners;
    private readonly IVoucherRepository _vouchers;
    private readonly IHanoiKnowledgeService _kb;

    public ChatToolExecutor(
        ICheckpointRepository checkpoints,
        IPartnerRepository partners,
        IVoucherRepository vouchers,
        IHanoiKnowledgeService kb)
    {
        _checkpoints = checkpoints;
        _partners = partners;
        _vouchers = vouchers;
        _kb = kb;
    }

    public async Task<object> ExecuteAsync(string toolName, string argumentsJson, string language, CancellationToken ct)
    {
        try
        {
            var args = JsonDocument.Parse(string.IsNullOrWhiteSpace(argumentsJson) ? "{}" : argumentsJson);
            return toolName switch
            {
                "get_checkpoint_details" => await GetCheckpointDetailsAsync(args, ct),
                "get_nearby_checkpoints" => await GetNearbyCheckpointsAsync(args, ct),
                "get_nearby_partners" => await GetNearbyPartnersAsync(args, ct),
                "search_knowledge_base" => await SearchKbAsync(args, language, ct),
                "plan_simple_itinerary" => await PlanItineraryAsync(args, ct),
                _ => new { error = $"Unknown tool: {toolName}" }
            };
        }
        catch (Exception ex)
        {
            return new { error = $"Tool execution failed: {ex.Message}" };
        }
    }

    private async Task<object> GetCheckpointDetailsAsync(JsonDocument args, CancellationToken ct)
    {
        if (!args.RootElement.TryGetProperty("checkpointId", out var idProp) || !Guid.TryParse(idProp.GetString(), out var id))
            return new { error = "checkpointId required (UUID)" };

        var cp = await _checkpoints.GetByIdAsync(id, ct);
        if (cp == null) return new { error = "Checkpoint not found" };

        return new
        {
            id = cp.Id,
            name = cp.Name,
            region = cp.Region,
            latitude = cp.Latitude,
            longitude = cp.Longitude,
            radius = cp.Radius,
            storyAssetUrl = cp.StoryAssetUrl
        };
    }

    private async Task<object> GetNearbyCheckpointsAsync(JsonDocument args, CancellationToken ct)
    {
        var lat = args.RootElement.GetProperty("latitude").GetDouble();
        var lon = args.RootElement.GetProperty("longitude").GetDouble();
        var radiusKm = args.RootElement.TryGetProperty("radiusKm", out var r) ? r.GetDouble() : 2.0;

        var all = await _checkpoints.GetActiveAsync(ct);
        var nearby = all
            .Where(c => HaversineKm(lat, lon, (double)c.Latitude, (double)c.Longitude) <= radiusKm)
            .OrderBy(c => HaversineKm(lat, lon, (double)c.Latitude, (double)c.Longitude))
            .Take(10)
            .Select(c => new
            {
                id = c.Id,
                name = c.Name,
                region = c.Region,
                distanceKm = Math.Round(HaversineKm(lat, lon, (double)c.Latitude, (double)c.Longitude), 2)
            })
            .ToList();
        return new { count = nearby.Count, checkpoints = nearby };
    }

    private async Task<object> GetNearbyPartnersAsync(JsonDocument args, CancellationToken ct)
    {
        var lat = args.RootElement.GetProperty("latitude").GetDouble();
        var lon = args.RootElement.GetProperty("longitude").GetDouble();
        var radiusKm = args.RootElement.TryGetProperty("radiusKm", out var r) ? r.GetDouble() : 2.0;
        var categoryFilter = args.RootElement.TryGetProperty("category", out var c) ? c.GetString() : null;

        var all = await _partners.GetActiveAsync(ct);
        var nearby = all
            .Where(p => HaversineKm(lat, lon, (double)p.Latitude, (double)p.Longitude) <= radiusKm)
            .Where(p => categoryFilter == null || p.Type.ToString().Equals(categoryFilter, StringComparison.OrdinalIgnoreCase))
            .OrderBy(p => HaversineKm(lat, lon, (double)p.Latitude, (double)p.Longitude))
            .Take(10)
            .Select(p => new
            {
                id = p.Id,
                name = p.Name,
                type = p.Type.ToString(),
                distanceKm = Math.Round(HaversineKm(lat, lon, (double)p.Latitude, (double)p.Longitude), 2),
                address = p.Address
            })
            .ToList();
        return new { count = nearby.Count, partners = nearby };
    }

    private async Task<object> SearchKbAsync(JsonDocument args, string language, CancellationToken ct)
    {
        var query = args.RootElement.GetProperty("query").GetString() ?? "";
        var category = args.RootElement.TryGetProperty("category", out var c) ? c.GetString() : null;
        var chunks = await _kb.SearchAsync(query, language, topK: 5, category: category, ct: ct);
        return new
        {
            count = chunks.Count,
            chunks = chunks.Select(ch => new
            {
                topic = ch.Topic,
                category = ch.Category,
                question = ch.Question,
                answer = ch.Answer,
                source = ch.Source
            })
        };
    }

    private async Task<object> PlanItineraryAsync(JsonDocument args, CancellationToken ct)
    {
        var durationHours = args.RootElement.TryGetProperty("durationHours", out var d) ? d.GetDouble() : 8.0;
        var region = args.RootElement.TryGetProperty("region", out var r) ? r.GetString() : null;

        var allCheckpoints = await _checkpoints.GetActiveAsync(ct);
        var filtered = allCheckpoints
            .Where(c => region == null || c.Region.Contains(region, StringComparison.OrdinalIgnoreCase))
            .Take(5)
            .ToList();

        return new
        {
            durationHours,
            region = region ?? "any",
            suggestedOrder = filtered.Select((c, i) => new
            {
                order = i + 1,
                name = c.Name,
                suggestedDuration = "1-2 hours"
            }),
            note = "Simple suggestion. Verify opening hours and travel time before going."
        };
    }

    private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }
}
```

- [ ] **Step 2: Check repository interfaces exist**

Verify these interfaces exist in `backend/Application/Interfaces/Repositories/`:
- `ICheckpointRepository` with `GetByIdAsync(Guid, CancellationToken)` and `GetActiveAsync(CancellationToken)`
- `IPartnerRepository` with `GetActiveAsync(CancellationToken)`
- `IVoucherRepository` (used?)

If `GetActiveAsync` doesn't exist on `ICheckpointRepository`/`IPartnerRepository`, add them to those interfaces and implement in respective repositories.

- [ ] **Step 3: Build**

```bash
cd backend && dotnet build --no-restore 2>&1 | tail -10
```

Expected: `Build succeeded` (or list of missing interface methods to add).

- [ ] **Step 4: Commit**

```bash
git add backend/Infrastructure/Services/ChatToolExecutor.cs
git commit -m "feat: ChatToolExecutor executes 5 tools against DB"
```

---

