'use client';
import React, { useState } from 'react';
import Canvas from './Canvas';
import { AppBackground } from './AppBackground';
import { ActiveScreen, HeritageNode, HeritageEdge, BrandTheme } from '../types';
import { INITIAL_NODES, INITIAL_EDGES } from '../data';
import { useAuth } from '../context/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

const DEFAULT_THEME: BrandTheme = {
  primaryColor: "#0f3a2c",
  secondaryColor: "#c9a76d",
  backgroundColor: "#f5f3ef",
  fontFamilyHeading: "Playfair Display",
  fontFamilyBody: "Outfit",
};

const DEFAULT_PRICES: Record<string, string> = {
  "doll": "₫850,000",
  "passport-cover": "₫450,000",
};

export default function CanvasWrapper() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("home");
  const [nodes, setNodes] = useState<HeritageNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<HeritageEdge[]>(INITIAL_EDGES);
  const { setJwt } = useAuth();

  // Sync screen state with URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const screen = params.get('screen') as ActiveScreen;
    if (screen) {
      setActiveScreen(screen);
    }
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('screen') !== activeScreen) {
      // Preserve other query params (e.g. ?dev=1) when rewriting the URL.
      const next = new URLSearchParams(params);
      if (activeScreen === 'home') {
        next.delete('screen');
      } else {
        next.set('screen', activeScreen);
      }
      const queryString = next.toString();
      const newUrl = window.location.pathname + (queryString ? `?${queryString}` : '');
      window.history.replaceState(null, '', newUrl);
    }
  }, [activeScreen]);

  // Dev bypass: auto-login as the seeded dev user when ?dev=1 is present.
  // Lets a developer reach the 3D Assistant without scanning a QR code.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') !== '1') return;
    if (window.localStorage.getItem('vitale_jwt')) return; // already authenticated

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'dev@vitale.vn', password: 'DevPass123!' }),
        });
        if (!res.ok) {
          console.error('[dev-bypass] login failed', res.status, await res.text());
          return;
        }
        const data = await res.json();
        if (data.token) {
          setJwt(data.token);
        }
      } catch (err) {
        console.error('[dev-bypass] network error', err);
      }
    })();
  }, [setJwt]);

  const handleSimulateQrScan = () => {
    console.log("Simulating QR scan...");
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative' }}>
      <AppBackground />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Canvas 
          activeScreen={activeScreen}
          setActiveScreen={setActiveScreen}
          nodes={nodes}
          edges={edges}
          setNodes={setNodes}
          setEdges={setEdges}
          prices={DEFAULT_PRICES}
          brandTheme={DEFAULT_THEME}
          onSimulateQrScan={handleSimulateQrScan}
        />
      </div>
    </div>
  );
}
