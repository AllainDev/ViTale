namespace Application.DTOs;

public class CreateCheckpointRequest
{
    public string Name { get; set; } = string.Empty;
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public int Radius { get; set; } = 100;
    public string Region { get; set; } = string.Empty;
    public string? StoryAssetUrl { get; set; }

    /// <summary>Optional FK to the canonical Region entity. When provided,
    /// the Region string is auto-populated from the entity if left blank.</summary>
    public Guid? RegionId { get; set; }
}

