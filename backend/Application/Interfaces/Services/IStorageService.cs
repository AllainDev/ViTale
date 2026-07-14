namespace Application.Interfaces.Services;

/// <summary>
/// Abstracts Cloudflare R2 (S3-compatible) object storage.
/// </summary>
public interface IStorageService
{
    /// <summary>Uploads raw bytes and returns the public URL, or null if not configured.</summary>
    Task<string?> UploadAsync(byte[] data, string key, string contentType, CancellationToken ct = default);

    /// <summary>Deletes an object by key. Returns false if the operation fails.</summary>
    Task<bool> DeleteAsync(string key, CancellationToken ct = default);

    /// <summary>Returns the public URL for a given key.</summary>
    string GetPublicUrl(string key);

    /// <summary>Generates a pre-signed URL for direct client uploads.</summary>
    string GeneratePreSignedUrl(string key, string contentType, TimeSpan expiresIn);
}
