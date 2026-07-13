using Domain.Common;

namespace Domain.ValueObjects;

/// <summary>Validates geographic coordinates and provides haversine distance calculation.</summary>
public sealed class GeoCoordinate : ValueObject
{
    private const double EarthRadiusMeters = 6_371_000.0;

    public decimal Latitude { get; }
    public decimal Longitude { get; }

    private GeoCoordinate(decimal latitude, decimal longitude)
    {
        Latitude = latitude;
        Longitude = longitude;
    }

    public static Result<GeoCoordinate> Create(decimal latitude, decimal longitude)
    {
        if (latitude < -90 || latitude > 90)
            return Result<GeoCoordinate>.Failure("Latitude must be between -90 and 90");
        if (longitude < -180 || longitude > 180)
            return Result<GeoCoordinate>.Failure("Longitude must be between -180 and 180");
        return Result<GeoCoordinate>.Success(new GeoCoordinate(latitude, longitude));
    }

    /// <summary>Haversine formula — returns distance in metres.</summary>
    public double DistanceTo(GeoCoordinate other)
    {
        var lat1 = ToRadians((double)Latitude);
        var lat2 = ToRadians((double)other.Latitude);
        var dLat = ToRadians((double)(other.Latitude - Latitude));
        var dLon = ToRadians((double)(other.Longitude - Longitude));

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(lat1) * Math.Cos(lat2)
              * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return EarthRadiusMeters * c;
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Latitude;
        yield return Longitude;
    }
}

