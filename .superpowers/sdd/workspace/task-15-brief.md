### Task 15: ToolDefinitions — 5 tools

**Files:**
- Create: `backend/Application/DTOs/Tools/ToolDefinitions.cs`

- [ ] **Step 1: Create file**

Create `backend/Application/DTOs/Tools/ToolDefinitions.cs`:

```csharp
using Application.Interfaces.Services;

namespace Application.DTOs.Tools;

/// <summary>
/// The 5 tools exposed to the LLM for tool-calling. Each maps to a backend
/// data source (checkpoints, partners, KB, or itinerary builder).
/// </summary>
public static class ToolDefinitions
{
    public static IReadOnlyList<ToolDefinition> All { get; } = new[]
    {
        new ToolDefinition(
            name: "get_checkpoint_details",
            description: "Get detailed info about one specific checkpoint (name, location, history, check-in radius). Use when user asks about a specific place in the system.",
            parameters: new
            {
                type = "object",
                properties = new
                {
                    checkpointId = new { type = "string", description = "UUID of the checkpoint" }
                },
                required = new[] { "checkpointId" }
            }),

        new ToolDefinition(
            name: "get_nearby_checkpoints",
            description: "Find Hà Nội checkpoints within X km of a GPS location. Use when user asks 'what's nearby' or 'where to go next' from a location.",
            parameters: new
            {
                type = "object",
                properties = new
                {
                    latitude = new { type = "number", description = "GPS latitude" },
                    longitude = new { type = "number", description = "GPS longitude" },
                    radiusKm = new { type = "number", description = "Search radius in km (default 2)" }
                },
                required = new[] { "latitude", "longitude" }
            }),

        new ToolDefinition(
            name: "get_nearby_partners",
            description: "Find partner businesses (restaurants, hotels, tour operators) within X km with available vouchers. Use for dining/stay recommendations.",
            parameters: new
            {
                type = "object",
                properties = new
                {
                    latitude = new { type = "number" },
                    longitude = new { type = "number" },
                    radiusKm = new { type = "number", description = "Default 2" },
                    category = new { type = "string", description = "Restaurant | Hotel | TourOperator (optional)" }
                },
                required = new[] { "latitude", "longitude" }
            }),

        new ToolDefinition(
            name: "search_knowledge_base",
            description: "Search the curated Hà Nội knowledge base by query and optional category. Use for culture/history/tips questions not tied to a specific GPS location.",
            parameters: new
            {
                type = "object",
                properties = new
                {
                    query = new { type = "string", description = "Search query" },
                    category = new { type = "string", description = "history | food | practical_tips | culture | transport | nightlife | neighborhood | shopping | weather (optional)" }
                },
                required = new[] { "query" }
            }),

        new ToolDefinition(
            name: "plan_simple_itinerary",
            description: "Suggest a simple day itinerary in Hà Nội based on duration, interests, and region. Logic: group places in the same area, order by open hours.",
            parameters: new
            {
                type = "object",
                properties = new
                {
                    durationHours = new { type = "number", description = "Hours available (default 8)" },
                    interests = new { type = "array", items = new { type = "string" }, description = "['history','food','shopping']" },
                    region = new { type = "string", description = "Old Quarter | West Lake | Ba Dinh (default Old Quarter)" }
                }
            })
    };
}
```

- [ ] **Step 2: Build**

```bash
cd backend && dotnet build --no-restore 2>&1 | tail -5
```

Expected: `Build succeeded`.

- [ ] **Step 3: Commit**

```bash
git add backend/Application/DTOs/Tools/ToolDefinitions.cs
git commit -m "feat: add 5 tool definitions for LLM tool-calling"
```

---

