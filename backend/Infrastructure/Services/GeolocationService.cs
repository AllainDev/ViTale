using Application.Interfaces.Services;

namespace Infrastructure.Services;

/// <summary>Haversine-based geolocation calculations.</summary>
public class GeolocationService : IGeolocationService
{
    public double CalculateDistanceMeters(decimal lat1, decimal lon1, decimal lat2, decimal lon2)
    {
        var coord1 = Domain.ValueObjects.GeoCoordinate.Create(lat1, lon1);
        var coord2 = Domain.ValueObjects.GeoCoordinate.Create(lat2, lon2);

        if (!coord1.IsSuccess || !coord2.IsSuccess)
        {
            // Fallback or exception depending on design. Since original code didn't validate, 
            // returning 0 or throwing might break. Let's just calculate directly if invalid, 
            // but wait, GeoCoordinate validates. Let's assume input is valid or throw.
            throw new ArgumentException("Invalid coordinates provided to GeolocationService.");
        }

        return coord1.Value!.DistanceTo(coord2.Value!);
    }

    public bool IsWithinRadius(decimal lat, decimal lon, decimal cpLat, decimal cpLon, int radiusMeters)
        => CalculateDistanceMeters(lat, lon, cpLat, cpLon) <= radiusMeters;
}

