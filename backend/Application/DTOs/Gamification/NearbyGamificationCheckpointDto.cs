using System;

namespace Application.DTOs;

public class NearbyGamificationCheckpointDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public double DistanceMeters { get; set; }
    public string? StoryAssetUrl { get; set; }
    public bool IsVisited { get; set; }
    public bool HasDollBonus { get; set; }
    public bool RegionDollOwned { get; set; }
}
