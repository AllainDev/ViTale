import { useState } from 'react';

export function useR2Upload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<string | null> => {
    setUploading(true);
    setError(null);

    try {
      // 1. Get presigned URL from backend
      const token = localStorage.getItem('vitale_admin_token');
      const presignedRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/upload-presigned-url?fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (!presignedRes.ok) {
        throw new Error('Failed to get presigned URL');
      }

      const { presignedUrl, publicUrl } = await presignedRes.json();

      // 2. Upload directly to Cloudflare R2
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to R2');
      }

      return publicUrl;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, error };
}
