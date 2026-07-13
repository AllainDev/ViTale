'use client';

/**
 * AvatarRenderer 3D component for ViTale Chat system.
 * Renders a 3D avatar with lips-sync, idle animations, lighting, and orbit controls.
 * Uses React Three Fiber + @react-three/drei.
 *
 * Requirements: 1 (3D Canvas), 13 (3D Model Rendering)
 */

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { LipsSyncEngine } from '@/lib/lipsSyncEngine';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const AVATAR_MODEL_URL =
  process.env.NEXT_PUBLIC_AVATAR_MODEL_URL ?? '/models/avatar.glb';

// ──────────────────────────────────────────────────────────────────────────────
// Inner avatar mesh component (rendered inside Canvas)
// ──────────────────────────────────────────────────────────────────────────────

interface AvatarMeshProps {
  modelUrl: string;
  lipsSyncEngine: LipsSyncEngine | null;
  animationTag: 'idle' | 'talking';
  onLoaded: (scene: THREE.Object3D) => void;
  onError: (err: Error) => void;
}

function AvatarMesh({ modelUrl, lipsSyncEngine, animationTag, onLoaded, onError }: AvatarMeshProps) {
  const { scene, animations } = useGLTF(modelUrl, true) as {
    scene: THREE.Object3D;
    animations: THREE.AnimationClip[];
  };
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const idleActionRef = useRef<THREE.AnimationAction | null>(null);
  const talkingActionRef = useRef<THREE.AnimationAction | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const hasInitialized = useRef(false);

  // Compute scale and position ONCE when loaded to avoid jitter on re-renders
  useEffect(() => {
    if (scene && !hasInitialized.current) {
      hasInitialized.current = true;

      // 1. Trigger loaded callback
      onLoaded(scene);
    }
  }, [scene, onLoaded]);

  // Set up animation mixer
  useEffect(() => {
    if (!scene || !animations || animations.length === 0) return;

    try {
      const mixer = new THREE.AnimationMixer(scene);
      mixerRef.current = mixer;

      // Find idle and talking animations by name convention
      const idleClip = animations.find(
        (a) => a.name.toLowerCase().includes('idle') || a.name.toLowerCase().includes('breathing')
      ) ?? animations[0];

      const talkingClip = animations.find(
        (a) => a.name.toLowerCase().includes('talk') || a.name.toLowerCase().includes('speak')
      );

      if (idleClip) {
        idleActionRef.current = mixer.clipAction(idleClip);
        idleActionRef.current.setLoop(THREE.LoopRepeat, Infinity);
        idleActionRef.current.play();
      }

      if (talkingClip) {
        talkingActionRef.current = mixer.clipAction(talkingClip);
        talkingActionRef.current.setLoop(THREE.LoopRepeat, Infinity);
      }

      return () => {
        mixer.stopAllAction();
        mixer.uncacheRoot(scene);
      };
    } catch (e) {
      console.error('[AvatarMesh] Failed to setup animations:', e);
      mixerRef.current = null;
    }
  }, [scene, animations]);

  // Switch between idle and talking animations
  useEffect(() => {
    if (!mixerRef.current) return;

    try {
      if (animationTag === 'talking' && talkingActionRef.current) {
        idleActionRef.current?.fadeOut(0.3);
        talkingActionRef.current.reset().fadeIn(0.3).play();
      } else {
        talkingActionRef.current?.fadeOut(0.3);
        if (idleActionRef.current) {
          idleActionRef.current.reset().fadeIn(0.3).play();
        }
      }
    } catch (e) {
      console.warn('[AvatarMesh] Failed to switch animations:', e);
    }
  }, [animationTag]);

  // Update animation mixer and lips-sync every frame
  useFrame((_, delta) => {
    try {
      mixerRef.current?.update(delta);
    } catch (e) {
      // Catch and disable mixer if it crashes during render loop
      console.warn('[AvatarMesh] Animation mixer update failed:', e);
      mixerRef.current = null;
    }
  });

  if (!scene) return null;

  return (
    <group ref={groupRef} position={[0, -1.2, 0]}>
      {/* 
        Adjusted scale to look good on the full height canvas without being terrifyingly huge.
      */}
      <primitive object={scene} scale={2.0} />
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Loading / Error fallbacks
// ──────────────────────────────────────────────────────────────────────────────

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#667eea" wireframe />
    </mesh>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main AvatarRenderer component (exported)
// ──────────────────────────────────────────────────────────────────────────────

interface AvatarRendererProps {
  lipsSyncEngine: LipsSyncEngine | null;
  animationTag: 'idle' | 'talking';
  onAvatarLoaded?: (scene: THREE.Object3D) => void;
  isPaused?: boolean;
  modelUrl?: string;
}

export default function AvatarRenderer({
  lipsSyncEngine,
  animationTag,
  onAvatarLoaded,
  isPaused = false,
  modelUrl
}: AvatarRendererProps) {
  const [modelError, setModelError] = useState<string | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const urlToUse = modelUrl || AVATAR_MODEL_URL;

  // Check WebGL support
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setWebglSupported(false);
    }
  }, []);

  const handleModelError = (err: Error) => {
    console.error('[AvatarRenderer] Model load error:', err.message);
    setModelError(err.message);
  };

  const handleModelLoaded = React.useCallback((scene: THREE.Object3D) => {
    setModelError(null);
    onAvatarLoaded?.(scene);
  }, [onAvatarLoaded]);

  if (!webglSupported) {
    return (
      <div className="avatar-fallback w-full h-full flex items-center justify-center text-center p-4" role="alert">
        <div>
          <p>⚠️ Trình duyệt của bạn không hỗ trợ WebGL.</p>
          <p>Vui lòng sử dụng Chrome, Firefox, hoặc Edge phiên bản mới nhất.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full" aria-label="Avatar 3D">
      {modelError && (
        <div className="avatar-error-overlay absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm text-white">
          <p className="font-bold text-lg mb-2">⚠️ Không thể tải avatar 3D</p>
          <p className="error-detail text-sm text-white/80 mb-4">{modelError}</p>
          <button
            className="retry-btn px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 font-bold"
            onClick={() => { setModelError(null); setRetryKey((k) => k + 1); }}
          >
            Thử lại
          </button>
        </div>
      )}

      <Canvas
        key={retryKey}
        camera={{ position: [0, 0, 3], fov: 50, near: 0.1, far: 100 }}
        frameloop={isPaused ? 'never' : 'always'}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          // Handle context loss gracefully - just log and show error
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('[AvatarRenderer] WebGL context lost.');
            setTimeout(() => setModelError('Lỗi đồ họa. Nhấn Thử lại.'), 100);
          });
        }}
      >
        {/* Simple lights - no HDR environment to avoid GPU overload */}
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 4, 3]} intensity={1.0} />
        <directionalLight position={[-2, 2, -1]} intensity={0.5} />
        <pointLight position={[0, 3, 2]} intensity={0.8} color="#c084fc" />

        {/* Avatar */}
        <ErrorBoundary 
          fallback={<LoadingFallback />}
          onError={(err) => {
            console.error('[AvatarRenderer] ErrorBoundary caught error:', err);
            // This allows us to show the error overlay instead of crashing
            setTimeout(() => setModelError("Vui lòng thêm file avatar.glb vào thư mục frontend/public/models/"), 0);
          }}
        >
          <React.Suspense fallback={<LoadingFallback />}>
            <AvatarMesh
              modelUrl={urlToUse}
              lipsSyncEngine={lipsSyncEngine}
              animationTag={animationTag}
              onLoaded={handleModelLoaded}
              onError={handleModelError}
            />
          </React.Suspense>
        </ErrorBoundary>

        {/* Orbit controls fixed so user cannot drag the camera, creating a cinematic feel */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}

// Preload model for faster initial render
if (typeof window !== 'undefined') {
  useGLTF.preload(AVATAR_MODEL_URL, true);
}
