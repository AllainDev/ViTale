namespace Application.DTOs;

public class CreateCheckpointRequest
{
    public string Name { get; set; } = string.Empty;
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public int Radius { get; set; } = 100;
    public string Region { get; set; } = string.Empty;
    public string? StoryAssetUrl { get; set; }
}
