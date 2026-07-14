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
            Name: "get_checkpoint_details",
            Description: "Get detailed info about one specific checkpoint (name, location, history, check-in radius). Use when user asks about a specific place in the system.",
            Parameters: new
            {
                type = "object",
                properties = new
                {
                    checkpointId = new { type = "string", description = "UUID of the checkpoint" }
                },
                required = new[] { "checkpointId" }
            }),

        new ToolDefinition(
            Name: "get_nearby_checkpoints",
            Description: "Find Hà Nội checkpoints within X km of a GPS location. Use when user asks 'what's nearby' or 'where to go next' from a location.",
            Parameters: new
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
            Name: "get_nearby_partners",
            Description: "Find partner businesses (restaurants, hotels, tour operators) within X km with available vouchers. Use for dining/stay recommendations.",
            Parameters: new
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
            Name: "search_knowledge_base",
            Description: "Search the curated Hà Nội knowledge base by query and optional category. Use for culture/history/tips questions not tied to a specific GPS location.",
            Parameters: new
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
            Name: "plan_simple_itinerary",
            Description: "Suggest a simple day itinerary in Hà Nội based on duration, interests, and region. Logic: group places in the same area, order by open hours.",
            Parameters: new
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