'use client';

import { useCallback, useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileIcon, Loader2 } from 'lucide-react';

type DropzoneProps = {
  accept: Record<string, string[]>;
  maxSizeMB: number;
  uploadUrl: string;
  onSuccess: (url: string) => void;
  label: string;
};

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function FileDropzone({ accept, maxSizeMB, uploadUrl, onSuccess, label }: DropzoneProps) {
  const [state, setState]     = useState<UploadState>('idle');
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName]     = useState('');

  const getAdminKey = () => document.cookie
    .split('; ')
    .find(r => r.startsWith('admin_session='))
    ?.split('=')[1] ?? '';

  const upload = useCallback(async (file: File) => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setState('error');
      setMessage(`File vượt quá giới hạn ${maxSizeMB}MB`);
      return;
    }

    setState('uploading');
    setFileName(file.name);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'X-Admin-Key': getAdminKey() },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setState('error');
        setMessage(data.message ?? 'Upload thất bại');
        return;
      }

      setState('success');
      setMessage(data.url);
      onSuccess(data.url);
    } catch {
      setState('error');
      setMessage('Lỗi kết nối đến server');
    }
  }, [uploadUrl, maxSizeMB, onSuccess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  const reset = () => { setState('idle'); setMessage(''); setFileName(''); };

  const acceptStr = Object.keys(accept).join(',');

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed transition-all duration-200 p-8 text-center
        ${isDragging ? 'border-emerald-400 bg-emerald-500/5' : 'border-white/10 hover:border-white/20 bg-white/2'}
        ${state === 'error' ? 'border-red-500/40 bg-red-500/5' : ''}
        ${state === 'success' ? 'border-emerald-500/40 bg-emerald-500/5' : ''}
      `}
    >
      {state === 'idle' && (
        <>
          <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <Upload className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm text-slate-300 font-medium mb-1">{label}</p>
          <p className="text-xs text-slate-500 mb-4">Kéo thả hoặc nhấn để chọn · Tối đa {maxSizeMB}MB</p>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">
            <FileIcon className="w-4 h-4" />
            Chọn file
            <input type="file" accept={acceptStr} className="hidden" onChange={handleChange} />
          </label>
        </>
      )}

      {state === 'uploading' && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm text-slate-300">Đang tải lên <span className="text-emerald-400">{fileName}</span>...</p>
        </div>
      )}

      {state === 'success' && (
        <div className="flex flex-col items-center gap-3">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
          <p className="text-sm text-slate-300 font-medium">Upload thành công!</p>
          <p className="text-xs text-emerald-400 break-all font-mono bg-emerald-900/20 px-3 py-1.5 rounded-lg max-w-full">{message}</p>
          <button onClick={reset} className="mt-2 text-xs text-slate-500 hover:text-white underline transition-colors">Upload file khác</button>
        </div>
      )}

      {state === 'error' && (
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-red-300 font-medium">{message}</p>
          <button onClick={reset} className="mt-2 text-xs text-slate-500 hover:text-white underline transition-colors">Thử lại</button>
        </div>
      )}
    </div>
  );
}
