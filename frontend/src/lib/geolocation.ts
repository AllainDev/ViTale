'use client';
import { useEffect, useState, useCallback } from 'react';

export interface GeoState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    latitude: null, longitude: null, accuracy: null, error: null, loading: false,
  });

  const requestPosition = useCallback((opts?: { highAccuracy?: boolean; timeoutMs?: number }): Promise<GeoState> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        const errState = { latitude: null, longitude: null, accuracy: null, error: 'Geolocation not supported', loading: false };
        setState(errState);
        resolve(errState);
        return;
      }

      const highAccuracy = opts?.highAccuracy ?? false;
      const timeoutMs = opts?.timeoutMs ?? 20000;

      setState(s => ({ ...s, loading: true, error: null }));

      let settled = false;
      const settle = (s: GeoState) => {
        if (settled) return;
        settled = true;
        setState(s);
        resolve(s);
      };

      navigator.geolocation.getCurrentPosition(
        pos => {
          settle({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            error: null,
            loading: false,
          });
        },
        err => {
          // Friendly error messages per common GeolocationPositionError codes.
          let friendly = err.message || 'Unable to retrieve location.';
          if (err.code === 1) friendly = 'User denied Geolocation';
          else if (err.code === 2) friendly = 'Location unavailable — please enable GPS / Wi-Fi positioning and try again.';
          else if (err.code === 3) friendly = 'GPS request timed out — please try again outdoors or near a window.';

          settle({
            latitude: null,
            longitude: null,
            accuracy: null,
            error: friendly,
            loading: false,
          });
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: timeoutMs,
          // Allow a 30s cached fix to speed up repeat taps; falls back to a fresh fix if needed.
          maximumAge: 30000,
        }
      );
    });
  }, []);

  return { ...state, requestPosition };
}

export function haversineDistance(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
