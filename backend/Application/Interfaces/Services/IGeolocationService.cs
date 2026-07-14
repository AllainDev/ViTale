namespace Application.Interfaces.Services;

public interface IGeolocationService
{
    double CalculateDistanceMeters(decimal lat1, decimal lon1, decimal lat2, decimal lon2);
    bool IsWithinRadius(decimal lat, decimal lon, decimal checkpointLat, decimal checkpointLon, int radiusMeters);
}
