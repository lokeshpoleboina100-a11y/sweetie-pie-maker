import { useState, useEffect, useCallback } from 'react';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string;
  onLocationChange?: (lat: number, lng: number, name: string) => void;
  readonly?: boolean;
}

export default function LocationPicker({
  latitude,
  longitude,
  locationName,
  onLocationChange,
  readonly = false,
}: LocationPickerProps) {
  const { t } = useTranslation();
  const [lat, setLat] = useState(latitude || 0);
  const [lng, setLng] = useState(longitude || 0);
  const [name, setName] = useState(locationName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (latitude && longitude) {
      setLat(latitude);
      setLng(longitude);
    }
  }, [latitude, longitude]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setLat(newLat);
        setLng(newLng);

        // Reverse geocode using free Nominatim API
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json`
          );
          const data = await resp.json();
          const locName = data.address
            ? `${data.address.suburb || data.address.neighbourhood || data.address.city_district || ''}, ${data.address.city || data.address.town || data.address.county || ''}`
            : `${newLat.toFixed(4)}, ${newLng.toFixed(4)}`;
          setName(locName);
          onLocationChange?.(newLat, newLng, locName);
        } catch {
          const locName = `${newLat.toFixed(4)}, ${newLng.toFixed(4)}`;
          setName(locName);
          onLocationChange?.(newLat, newLng, locName);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onLocationChange]);

  const hasLocation = lat !== 0 && lng !== 0;

  // OpenStreetMap embed URL
  const mapUrl = hasLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`
    : null;

  return (
    <Card className="overflow-hidden">
      {/* Map display */}
      <div className="relative bg-muted" style={{ height: 200 }}>
        {mapUrl ? (
          <iframe
            src={mapUrl}
            className="w-full h-full border-0"
            title="Location map"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <MapPin className="h-8 w-8 mb-2" />
            <p className="text-sm">{t('location.no_location', 'No location set')}</p>
          </div>
        )}
      </div>

      {/* Location info & actions */}
      <div className="p-3">
        {name && (
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{name}</span>
          </div>
        )}
        {error && <p className="text-xs text-destructive mb-2">{error}</p>}

        {!readonly && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={getCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crosshair className="h-4 w-4" />
            )}
            {t('location.use_current', 'Use Current Location')}
          </Button>
        )}
      </div>
    </Card>
  );
}
