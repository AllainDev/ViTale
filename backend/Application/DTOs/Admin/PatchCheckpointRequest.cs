namespace Application.DTOs;

public class PatchCheckpointRequest
{
    public string? Name { get; set; }
    public string? Region { get; set; }
    public string? StoryAssetUrl { get; set; }
    public bool? IsActive { get; set; }
    public Guid? RegionId { get; set; }
}

