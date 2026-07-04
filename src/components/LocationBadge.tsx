import { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLocationDetect } from '@/hooks/use-location-detect';

export default function LocationBadge() {
  const { profile } = useAuth();
  const { detecting, error, detect, setManual } = useLocationDetect();
  const [city, setCity] = useState('');
  const [open, setOpen] = useState(false);

  const label = profile?.location_name || (detecting ? 'Detecting…' : 'Set location');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 gap-1 text-xs font-semibold max-w-[140px]"
        >
          {detecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 text-primary" />
          )}
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div>
          <p className="font-semibold text-sm">Your location</p>
          <p className="text-xs text-muted-foreground">
            {profile?.location_name || 'No location set yet.'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={detect}
          disabled={detecting}
        >
          {detecting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Detecting…</>
          ) : (
            <><MapPin className="h-4 w-4 mr-2" /> Use current location</>
          )}
        </Button>
        {error && <p className="text-xs text-muted-foreground">{error}</p>}
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!city.trim()) return;
            await setManual(city.trim());
            setCity('');
            setOpen(false);
          }}
        >
          <Input
            placeholder="Search city…"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={!city.trim()}>Save</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
