'use client';

/**
 * VoiceRecorder React component for 3D Chat system.
 * Press-and-hold microphone button to record audio.
 * Uses MediaRecorder API with WebM/Mono/16kHz configuration.
 *
 * Requirements: 2 (Voice Recording), 16 (Error Handling), 18 (Browser Compatibility)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onError: (error: Error) => void;
  disabled?: boolean;
}

type RecorderStatus =
  | 'idle'
  | 'requesting-permission'
  | 'ready'
  | 'recording'
  | 'permission-denied'
  | 'unsupported';

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    channelCount: 1,        // Mono
    sampleRate: 16000,      // 16kHz - optimal for Whisper STT
    echoCancellation: true,
    noiseSuppression: true,
  },
};

export default function VoiceRecorder({ onRecordingComplete, onError, disabled = false }: VoiceRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check browser compatibility on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('[VoiceRecorder] MediaDevices API not supported.');
      setStatus('unsupported');
      return;
    }

    if (!window.MediaRecorder) {
      console.warn('[VoiceRecorder] MediaRecorder API not supported.');
      setStatus('unsupported');
      return;
    }

    setStatus('idle');
  }, []);

  const requestPermissionAndSetup = useCallback(async () => {
    if (status === 'recording' || status === 'requesting-permission') return;

    setStatus('requesting-permission');
    console.log('[VoiceRecorder] Requesting microphone permission...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      streamRef.current = stream;

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg;codecs=opus';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const chunks = audioChunksRef.current;
        if (chunks.length === 0) {
          console.warn('[VoiceRecorder] Recording stopped with no audio data.');
          onError(new Error('Không có âm thanh được ghi lại. Vui lòng thử lại.'));
          return;
        }

        const audioBlob = new Blob(chunks, { type: mimeType });
        audioChunksRef.current = [];
        console.log('[VoiceRecorder] Audio blob created:', audioBlob.size, 'bytes, type:', audioBlob.type);
        onRecordingComplete(audioBlob);
      };

      mediaRecorderRef.current = recorder;
      setStatus('ready');
      console.log('[VoiceRecorder] Ready to record. MIME:', mimeType);
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.warn('[VoiceRecorder] Microphone permission denied.');
        setStatus('permission-denied');
        onError(new Error('Quyền truy cập microphone bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.'));
      } else {
        console.error('[VoiceRecorder] Setup error:', error);
        setStatus('idle');
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }, [status, onRecordingComplete, onError]);

  const startRecording = useCallback(async () => {
    if (disabled) return;

    // Setup if not ready yet
    if (status === 'idle') {
      await requestPermissionAndSetup();
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'recording') return;

    audioChunksRef.current = [];
    recorder.start(100); // Collect data every 100ms
    setIsRecording(true);
    console.log('[VoiceRecorder] Recording started.');
  }, [disabled, status, requestPermissionAndSetup]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;

    recorder.stop();
    setIsRecording(false);
    console.log('[VoiceRecorder] Recording stopped.');
  }, []);

  const toggleRecording = useCallback(async () => {
    if (disabled) return;

    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [disabled, isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (status === 'unsupported') {
    return (
      <div className="voice-recorder-error" role="alert">
        <span className="error-icon">⚠️</span>
        <p>Trình duyệt của bạn không hỗ trợ ghi âm. Vui lòng dùng Chrome 90+, Firefox 88+, hoặc Safari 14+.</p>
      </div>
    );
  }

  if (status === 'permission-denied') {
    return (
      <div className="voice-recorder-error" role="alert">
        <span className="error-icon">🎤</span>
        <p>Quyền microphone bị từ chối.</p>
        <p className="error-hint">Nhấn vào biểu tượng 🔒 trong thanh địa chỉ để bật quyền microphone.</p>
        <button
          className="retry-btn"
          onClick={() => setStatus('idle')}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="voice-recorder-form"
      aria-label="Ghi âm"
    >
      <button
        id="voice-record-btn"
        type="button"
        className={`mic-button ${isRecording ? 'recording' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={toggleRecording}
        disabled={disabled || status === 'requesting-permission'}
        aria-label={isRecording ? 'Đang ghi âm - nhấn để gửi' : 'Nhấn để ghi âm'}
        aria-pressed={isRecording}
      >
        <span className="mic-icon">{status === 'requesting-permission' ? '⏳' : '🎤'}</span>
        {isRecording && (
          <span className="pulse-ring" aria-hidden="true" />
        )}
      </button>

      <p className="mic-hint">
        {isRecording
          ? '🔴 Đang ghi âm... Nhấn để gửi'
          : status === 'requesting-permission'
          ? 'Đang yêu cầu quyền microphone...'
          : 'Nhấn để ghi âm'}
      </p>
    </form>
  );
}
