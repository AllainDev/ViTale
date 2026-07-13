using Application.Interfaces.Services;

namespace Infrastructure.Services;

/// <summary>Haversine-based geolocation calculations.</summary>
public class GeolocationService : IGeolocationService
{
    private const double EarthRadiusMeters = 6_371_000.0;

    public double CalculateDistanceMeters(decimal lat1, decimal lon1, decimal lat2, decimal lon2)
    {
        var dLat = ToRad((double)(lat2 - lat1));
        var dLon = ToRad((double)(lon2 - lon1));
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(ToRad((double)lat1)) * Math.Cos(ToRad((double)lat2))
              * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return EarthRadiusMeters * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    public bool IsWithinRadius(decimal lat, decimal lon, decimal cpLat, decimal cpLon, int radiusMeters)
        => CalculateDistanceMeters(lat, lon, cpLat, cpLon) <= radiusMeters;

    private static double ToRad(double deg) => deg * Math.PI / 180;
}

