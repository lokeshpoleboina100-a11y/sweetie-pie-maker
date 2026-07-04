import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DetectedLocation {
  city: string;
  state?: string;
  country?: string;
  full_address?: string;
  latitude: number;
  longitude: number;
}

async function reverseGeocode(lat: number, lng: number): Promise<DetectedLocation | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const j = await res.json();
    const a = j.address || {};
    const city =
      a.city || a.town || a.village || a.suburb || a.county || a.state_district || 'Unknown';
    return {
      city,
      state: a.state,
      country: a.country,
      full_address: j.display_name,
      latitude: lat,
      longitude: lng,
    };
  } catch {
    return null;
  }
}

/**
 * Prompt 1 location detection: auto-request geolocation on login, reverse-geocode,
 * persist to profiles (latitude/longitude/location_name). Falls back to manual entry.
 */
export function useLocationDetect() {
  const { user, profile, refreshProfile } = useAuth();
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsManual, setNeedsManual] = useState(false);

  const saveLocation = useCallback(
    async (loc: DetectedLocation) => {
      if (!user) return;
      await supabase
        .from('profiles')
        .update({
          latitude: loc.latitude,
          longitude: loc.longitude,
          location_name: [loc.city, loc.state].filter(Boolean).join(', '),
        })
        .eq('user_id', user.id);
      await refreshProfile();
    },
    [user, refreshProfile]
  );

  const detect = useCallback(async () => {
    setError(null);
    setNeedsManual(false);
    if (!('geolocation' in navigator)) {
      setNeedsManual(true);
      setError('Your browser does not support location.');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (!loc) {
          setNeedsManual(true);
          setError('Could not look up your city. Please pick it manually.');
        } else {
          await saveLocation(loc);
        }
        setDetecting(false);
      },
      () => {
        setNeedsManual(true);
        setError('Enable location for better results, or search your city below.');
        setDetecting(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }, [saveLocation]);

  const setManual = useCallback(
    async (city: string) => {
      if (!user) return;
      // Try to geocode the manual city for coords, but don't require it
      let coords: { lat: number; lng: number } | null = null;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(city)}&limit=1`
        );
        const arr = await res.json();
        if (Array.isArray(arr) && arr[0]) {
          coords = { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
        }
      } catch {
        /* ignore */
      }
      await supabase
        .from('profiles')
        .update({
          location_name: city,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        })
        .eq('user_id', user.id);
      await refreshProfile();
      setNeedsManual(false);
      setError(null);
    },
    [user, refreshProfile]
  );

  // Auto-run once per session if the user has no saved location yet.
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.location_name) return;
    if (detecting) return;
    detect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.location_name]);

  return { detecting, error, needsManual, detect, setManual };
}
