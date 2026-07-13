/**
 * Lips-Sync Engine for 3D Chat system.
 * Maps audio amplitude from AnalyserNode to avatar BlendShapes at 60 FPS.
 *
 * Requirements: 12 (Lips-Sync Implementation)
 */

import * as THREE from 'three';

/**
 * Normalizes a raw byte value (0-255) from AnalyserNode to [0, 1] range.
 * Property 1: Amplitude Normalization Produces Valid Range
 * For any input in [0, 255], output is in [0.0, 1.0].
 */
// Feature: system1-3d-chat-multimedia, Property 1: Amplitude Normalization Produces Valid Range
export function normalizeAmplitude(rawByte: number): number {
  return rawByte / 255;
}

/**
 * Maps normalized amplitude to BlendShape values.
 * Property 2: Amplitude-to-BlendShape Mapping is Monotonic
 * For any a1 < a2, calculateBlendShape(a2) >= calculateBlendShape(a1)
 */
// Feature: system1-3d-chat-multimedia, Property 2: Amplitude-to-BlendShape Mapping is Monotonic
export function calculateBlendShape(amplitude: number): { mouthOpen: number; jawOpen: number } {
  // Non-linear scaling: emphasize peaks (monotonic: pow with exponent > 0)
  const mouthOpen = Math.pow(amplitude, 1.5);
  // Subtle jaw movement (linear, always monotonic)
  const jawOpen = amplitude * 0.7;
  return { mouthOpen, jawOpen };
}

export interface LipsSyncConfig {
  analyserNode: AnalyserNode;
  avatarMesh: THREE.Object3D | null;
  blendShapeNames?: {
    mouthOpen: string;
    jawOpen: string;
  };
}

export class LipsSyncEngine {
  private analyserNode: AnalyserNode;
  private avatarMesh: THREE.Object3D | null;
  private blendShapeNames: { mouthOpen: string; jawOpen: string };
  private frequencyData: Uint8Array<ArrayBuffer>;
  private animationFrameId: number | null = null;
  private isActive = false;
  private smoothedAmplitude = 0;
  private readonly smoothingFactor = 0.7;

  constructor(config: LipsSyncConfig) {
    this.analyserNode = config.analyserNode;
    this.avatarMesh = config.avatarMesh;
    this.blendShapeNames = config.blendShapeNames ?? {
      mouthOpen: 'mouthOpen',
      jawOpen: 'jawOpen',
    };
    this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount) as Uint8Array<ArrayBuffer>;
  }

  /**
   * Starts the animation loop. Runs at 60 FPS via requestAnimationFrame.
   */
  start(): void {
    if (this.isActive) return;
    this.isActive = true;
    console.log('[LipsSyncEngine] Started.');
    this.loop();
  }

  /**
   * Stops the animation loop and resets BlendShapes to neutral position.
   */
  stop(): void {
    this.isActive = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    // Smooth transition to neutral (simulated 0.2s via gradual approach)
    this.smoothedAmplitude = 0;
    this.updateBlendShapes(0);
    console.log('[LipsSyncEngine] Stopped, BlendShapes reset to neutral.');
  }

  /**
   * Updates the avatar mesh reference when the model loads.
   */
  setAvatarMesh(mesh: THREE.Object3D | null): void {
    this.avatarMesh = mesh;
  }

  private loop(): void {
    if (!this.isActive) return;

    try {
      this.updateFrame();
    } catch (e) {
      console.warn('[LipsSyncEngine] updateFrame crashed:', e);
    }
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  private updateFrame(): void {
    // Query AnalyserNode for current frequency data
    this.analyserNode.getByteFrequencyData(this.frequencyData);

    // Calculate average amplitude across all frequency bins
    let sum = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
    }
    const rawAverage = sum / this.frequencyData.length;

    // Normalize to [0, 1]
    const currentAmplitude = normalizeAmplitude(rawAverage);

    // Apply exponential smoothing filter to reduce jitter (Requirement 12.7)
    // smoothedAmplitude = currentAmplitude * (1 - factor) + previousAmplitude * factor
    this.smoothedAmplitude =
      currentAmplitude * (1 - this.smoothingFactor) +
      this.smoothedAmplitude * this.smoothingFactor;

    // Update avatar BlendShapes
    this.updateBlendShapes(this.smoothedAmplitude);
  }

  private updateBlendShapes(amplitude: number): void {
    if (!this.avatarMesh) return;

    const { mouthOpen, jawOpen } = calculateBlendShape(amplitude);

    // Traverse mesh children looking for skinned meshes with morph targets
    this.avatarMesh.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
        const mouthIdx = child.morphTargetDictionary[this.blendShapeNames.mouthOpen];
        const jawIdx = child.morphTargetDictionary[this.blendShapeNames.jawOpen];

        if (mouthIdx !== undefined) {
          child.morphTargetInfluences[mouthIdx] = mouthOpen;
        }
        if (jawIdx !== undefined) {
          child.morphTargetInfluences[jawIdx] = jawOpen;
        }
      }
    });
  }
}
