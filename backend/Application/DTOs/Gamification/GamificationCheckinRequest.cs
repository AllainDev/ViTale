using System;

namespace Application.DTOs;

public class GamificationCheckinRequest
{
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public double? AccuracyMeters { get; set; }
    public Guid? CheckpointId { get; set; }
}
