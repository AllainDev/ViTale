using Domain.Common;

namespace Domain.Common;

public static class FileValidator
{
    private static readonly byte[] PngMagicBytes = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
    private static readonly byte[] JpegMagicBytes = { 0xFF, 0xD8, 0xFF };
    private static readonly byte[] GlbMagicBytes = { 0x67, 0x6C, 0x54, 0x46 }; // 'g' 'l' 'T' 'F'

    public static Result<string> ValidateImage(byte[] fileBytes, string filename)
    {
        if (fileBytes == null || fileBytes.Length < 8)
            return Result<string>.Failure("File is too small or empty.");

        var ext = Path.GetExtension(filename).ToLowerInvariant();

        if (ext is ".png")
        {
            if (!fileBytes.Take(PngMagicBytes.Length).SequenceEqual(PngMagicBytes))
                return Result<string>.Failure("Invalid PNG file signature (Magic Bytes mismatch). Potential malicious file.");
            return Result<string>.Success("image/png");
        }
        
        if (ext is ".jpg" or ".jpeg")
        {
            if (!fileBytes.Take(JpegMagicBytes.Length).SequenceEqual(JpegMagicBytes))
                return Result<string>.Failure("Invalid JPEG file signature (Magic Bytes mismatch). Potential malicious file.");
            return Result<string>.Success("image/jpeg");
        }

        return Result<string>.Failure("Unsupported image format. Only PNG and JPEG are allowed.");
    }

    public static Result<string> Validate3DModel(byte[] fileBytes, string filename)
    {
        if (fileBytes == null || fileBytes.Length < 12)
            return Result<string>.Failure("File is too small or empty.");

        var ext = Path.GetExtension(filename).ToLowerInvariant();

        if (ext is ".glb")
        {
            if (!fileBytes.Take(GlbMagicBytes.Length).SequenceEqual(GlbMagicBytes))
                return Result<string>.Failure("Invalid GLB file signature. Expected 'glTF' header. Potential malicious file.");
            
            return Result<string>.Success("model/gltf-binary");
        }

        return Result<string>.Failure("Unsupported 3D model format. Only .glb is allowed.");
    }
}
