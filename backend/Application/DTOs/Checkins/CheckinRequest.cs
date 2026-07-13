namespace Application.DTOs;

public class CheckinRequest
{
    public Guid UserId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? Accuracy { get; set; }
    public string? DollToken { get; set; }
}
