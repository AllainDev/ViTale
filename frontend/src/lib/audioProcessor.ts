/**
 * Audio Processor for 3D Chat system.
 * Handles Base64 audio decoding, playback, and exposes AnalyserNode for lips-sync.
 * Implements single-play policy: audio plays once and is immediately disposed.
 *
 * Requirements: 10 (Audio Decode and Playback), 11 (Autoplay Unlocking), 27 (Audio Lifecycle)
 */

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isDisposed = false;

  private onPlaybackStartCallback: (() => void) | null = null;
  private onPlaybackEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;

  constructor(
    onPlaybackStart?: () => void,
    onPlaybackEnd?: () => void,
    onError?: (error: Error) => void
  ) {
    this.onPlaybackStartCallback = onPlaybackStart ?? null;
    this.onPlaybackEndCallback = onPlaybackEnd ?? null;
    this.onErrorCallback = onError ?? null;
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      // Start in suspended state per browser autoplay policy (Requirement 11)
      this.audioContext = new AudioContext();
      // AudioContext starts suspended by default in most browsers
      
      // Create AnalyserNode for lips-sync amplitude extraction
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256; // Good frequency resolution for lips-sync
      this.analyserNode.smoothingTimeConstant = 0.3;
      this.analyserNode.connect(this.audioContext.destination);

      console.log('[AudioProcessor] AudioContext initialized. State:', this.audioContext.state);
    } catch (error) {
      console.error('[AudioProcessor] Failed to initialize AudioContext:', error);
    }
  }

  /**
   * Unlocks AudioContext after first user gesture.
   * Must be called from a user interaction event handler (e.g., button click).
   */
  async unlock(): Promise<boolean> {
    if (!this.audioContext) return false;

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        const state = this.audioContext.state as string;
        console.log('[AudioProcessor] AudioContext unlocked. State:', state);
        return state === 'running';
      } catch (error) {
        console.error('[AudioProcessor] Failed to resume AudioContext:', error);
        return false;
      }
    }

    return this.audioContext.state === 'running';
  }

  /**
   * Returns whether the AudioContext is ready for playback.
   */
  isUnlocked(): boolean {
    return this.audioContext?.state === 'running';
  }

  /**
   * Decodes a Base64 audio string and plays it immediately.
   * Stops any currently playing audio first.
   * Audio is disposed after playback completes (single-play policy).
   */
  async decodeAndPlay(base64Audio: string): Promise<void> {
    if (this.isDisposed || !this.audioContext) {
      console.error('[AudioProcessor] Cannot play - disposed or no AudioContext');
      return;
    }

    // Ensure AudioContext is running
    if (this.audioContext.state === 'suspended') {
      console.warn('[AudioProcessor] AudioContext is suspended. Attempting resume...');
      await this.audioContext.resume();
    }

    if (this.audioContext.state !== 'running') {
      console.warn('[AudioProcessor] AudioContext not running. Skipping playback.');
      this.onErrorCallback?.(new Error('AudioContext not running - user gesture required.'));
      return;
    }

    // Stop previous audio immediately (Requirement 27.4)
    this.stopCurrentPlayback();

    try {
      console.log('[AudioProcessor] Decoding Base64 audio...');

      // Step 1: Decode Base64 to bytes
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Step 2: Decode audio bytes to AudioBuffer
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
      console.log('[AudioProcessor] Audio decoded. Duration:', audioBuffer.duration.toFixed(2), 's');

      // Step 3: Create source node and connect through analyser for lips-sync
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      if (this.analyserNode) {
        source.connect(this.analyserNode);
        // analyserNode is already connected to destination in initAudioContext
      } else {
        source.connect(this.audioContext.destination);
      }

      this.currentSource = source;

      // Step 4: Set up completion handler - dispose buffer and reset
      source.onended = () => {
        console.log('[AudioProcessor] Playback ended. Disposing buffer.');
        // Release references (Requirement 27.2)
        source.disconnect();
        this.currentSource = null;
        this.onPlaybackEndCallback?.();
      };

      // Step 5: Start playback immediately
      source.start(0);
      console.log('[AudioProcessor] Playback started.');
      this.onPlaybackStartCallback?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[AudioProcessor] Decode/playback error:', err.message);
      this.currentSource = null;
      this.onErrorCallback?.(err);
    }
  }

  /**
   * Stops current audio playback and disposes the buffer.
   * Called when new audio arrives or user leaves page.
   */
  stopCurrentPlayback(): void {
    if (this.currentSource) {
      try {
        this.currentSource.onended = null; // Prevent double-call
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Already stopped - ignore
      }
      this.currentSource = null;
      console.log('[AudioProcessor] Playback stopped and buffer released.');
    }
  }

  /**
   * Returns the AnalyserNode for the lips-sync engine to read amplitude data.
   */
  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Returns whether audio is currently playing.
   */
  isPlaying(): boolean {
    return this.currentSource !== null;
  }

  /**
   * Cleans up all resources. Call when unmounting.
   */
  dispose(): void {
    this.isDisposed = true;
    this.stopCurrentPlayback();
    
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    console.log('[AudioProcessor] Disposed.');
  }
}
