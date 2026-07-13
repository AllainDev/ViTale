/**
 * Frontend type definitions for the 3D Chat system.
 * Shared types used across components.
 */

// Response packet received via SignalR from backend
export interface ResponsePacket {
  text_chunk: string;
  animation_tag: 'talking' | 'idle';
  audio_base64: string | null;
}

// SignalR connection state
export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  connectionId: string | null;
  lastError: Error | null;
  reconnectAttempts: number;
}

// Chat message entry in history
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  // No audio stored for history - text only
}

// Audio playback state (ephemeral - not persisted)
export interface AudioPlaybackState {
  isPlaying: boolean;
  currentBuffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  startTime: number;
}

// Avatar animation state
export interface AvatarState {
  currentAnimation: 'idle' | 'talking';
  blendShapes: {
    mouthOpen: number; // 0-1
    jawOpen: number;   // 0-1
  };
  isLipsSyncing: boolean;
}

// Error log entry for debugging
export interface ChatErrorLog {
  timestamp: string;
  errorType: 'network' | 'audio' | 'signalr' | 'rendering' | 'permission';
  message: string;
  context: {
    connectionId?: string;
    audioSize?: number;
    browserInfo?: string;
    stackTrace?: string;
  };
}
