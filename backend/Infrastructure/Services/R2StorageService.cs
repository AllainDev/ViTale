using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Application.Interfaces.Services;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services;

/// <summary>
/// Cloudflare R2 object storage service (S3-compatible).
/// Handles file uploads with content type detection.
/// </summary>
public class R2StorageService : IStorageService
{
    private readonly IAmazonS3 _s3;
    private readonly string _bucket;
    private readonly string _publicUrl;
    private readonly ILogger<R2StorageService> _logger;

    public R2StorageService(ILogger<R2StorageService> logger)
    {
        _logger = logger;
        _bucket = Environment.GetEnvironmentVariable("CLOUDFLARE_R2_BUCKET_ASSETS") ?? "vitale-assets";
        _publicUrl = Environment.GetEnvironmentVariable("CLOUDFLARE_R2_PUBLIC_URL") ?? string.Empty;

        var accessKey = Environment.GetEnvironmentVariable("CLOUDFLARE_R2_ACCESS_KEY") ?? string.Empty;
        var secretKey = Environment.GetEnvironmentVariable("CLOUDFLARE_R2_SECRET_KEY") ?? string.Empty;
        var endpoint  = Environment.GetEnvironmentVariable("CLOUDFLARE_R2_ENDPOINT")   ?? string.Empty;

        var credentials = new BasicAWSCredentials(accessKey, secretKey);
        var config = new AmazonS3Config
        {
            ServiceURL            = endpoint,
            ForcePathStyle        = true,   // R2 requires path-style access
            AuthenticationRegion  = "auto", // R2 uses "auto" region
        };

        _s3 = new AmazonS3Client(credentials, config);
    }

    /// <inheritdoc />
    public async Task<string?> UploadAsync(
        byte[] data,
        string key,
        string contentType,
        CancellationToken ct = default)
    {
        ValidateKey(key);

        if (string.IsNullOrEmpty(_publicUrl))
        {
            _logger.LogWarning("R2 not configured (CLOUDFLARE_R2_PUBLIC_URL empty) — upload skipped");
            return null;
        }

        try
        {
            using var ms = new MemoryStream(data);
            var request = new PutObjectRequest
            {
                BucketName  = _bucket,
                Key         = key,
                InputStream = ms,
                ContentType = contentType,
                DisablePayloadSigning = true
            };

            await _s3.PutObjectAsync(request, ct);

            var publicUrl = $"{_publicUrl.TrimEnd('/')}/{key}";
            _logger.LogInformation("Uploaded to R2: {Key} → {Url}", key, publicUrl);
            return publicUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "R2 upload failed for key {Key}", key);
            return null;
        }
    }

    /// <inheritdoc />
    public async Task<bool> DeleteAsync(string key, CancellationToken ct = default)
    {
        ValidateKey(key);
        try
        {
            await _s3.DeleteObjectAsync(_bucket, key, ct);
            _logger.LogInformation("Deleted from R2: {Key}", key);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "R2 delete failed for key {Key}", key);
            return false;
        }
    }

    /// <inheritdoc />
    public string GetPublicUrl(string key)
    {
        ValidateKey(key);
        return string.IsNullOrEmpty(_publicUrl) ? key : $"{_publicUrl.TrimEnd('/')}/{key}";
    }

    /// <inheritdoc />
    public string GeneratePreSignedUrl(string key, string contentType, TimeSpan expiresIn)
    {
        ValidateKey(key);

        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucket,
            Key = key,
            Verb = HttpVerb.PUT,
            Expires = DateTime.UtcNow.Add(expiresIn),
            ContentType = contentType
        };

        return _s3.GetPreSignedURL(request);
    }

    private static void ValidateKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("Key cannot be null or empty", nameof(key));

        if (key.Contains("../") || key.Contains("..\\"))
            throw new ArgumentException("Path traversal is not allowed in object key", nameof(key));
    }
}
