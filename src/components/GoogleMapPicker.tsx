import { useState, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { MapPin, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface GoogleMapPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

export default function GoogleMapPicker({ latitude, longitude, onLocationSelect }: GoogleMapPickerProps) {
  const [position, setPosition] = useState({
    lat: latitude || 20.5937,
    lng: longitude || 78.9629,
  });
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`
      );
      const data = await res.json();
      return data.results?.[0]?.formatted_address || 'Unknown location';
    } catch {
      // Fallback to Nominatim
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const data = await res.json();
        return data.display_name || 'Unknown location';
      } catch {
        return 'Unknown location';
      }
    }
  }, []);

  const handleMapClick = useCallback(async (e: any) => {
    const lat = e.detail?.latLng?.lat;
    const lng = e.detail?.latLng?.lng;
    if (lat == null || lng == null) return;
    setPosition({ lat, lng });
    const addr = await reverseGeocode(lat, lng);
    setAddress(addr);
    onLocationSelect(lat, lng, addr);
  }, [reverseGeocode, onLocationSelect]);

  const useCurrentLocation = useCallback(async () => {
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      setPosition({ lat, lng });
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
      onLocationSelect(lat, lng, addr);
    } catch {
      // Fallback: do nothing
    } finally {
      setLoading(false);
    }
  }, [reverseGeocode, onLocationSelect]);

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Google Maps API key not configured.</p>
        <p className="text-xs mt-1">Add VITE_GOOGLE_MAPS_API_KEY to use Google Maps.</p>
        <Button variant="outline" className="mt-3 gap-2" onClick={useCurrentLocation} disabled={loading}>
          <Crosshair className="h-4 w-4" />
          {loading ? 'Getting location...' : 'Use Current Location (OpenStreetMap)'}
        </Button>
        {address && <p className="text-xs mt-2 text-foreground">{address}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button variant="outline" className="w-full gap-2" onClick={useCurrentLocation} disabled={loading}>
        <Crosshair className="h-4 w-4" />
        {loading ? 'Getting location...' : 'Use Current Location'}
      </Button>

      <div className="rounded-xl overflow-hidden border border-border h-[250px]">
        <APIProvider apiKey={GOOGLE_MAPS_KEY}>
          <Map
            defaultCenter={position}
            center={position}
            defaultZoom={14}
            mapId="main-map"
            onClick={handleMapClick}
            gestureHandling="greedy"
            disableDefaultUI
            style={{ width: '100%', height: '100%' }}
          >
            <AdvancedMarker position={position} />
          </Map>
        </APIProvider>
      </div>

      {address && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {address}
        </p>
      )}
    </div>
  );
}
