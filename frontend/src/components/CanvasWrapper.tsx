'use client';
import React, { useState } from 'react';
import Canvas from './Canvas';
import { ActiveScreen, HeritageNode, HeritageEdge, BrandTheme } from '../types';
import { INITIAL_NODES, INITIAL_EDGES } from '../data';

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
      const newUrl = activeScreen === 'home' 
          ? window.location.pathname 
          : `${window.location.pathname}?screen=${activeScreen}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [activeScreen]);

  const handleSimulateQrScan = () => {
    console.log("Simulating QR scan...");
  };

  return (
    <div style={{ width: '100%' }}>
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
  );
}
