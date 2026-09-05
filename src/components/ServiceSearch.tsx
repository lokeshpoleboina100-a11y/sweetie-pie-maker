import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { searchServices } from '@/lib/serviceCatalog';

interface ServiceSearchProps {
  placeholder?: string;
  /** When set, the parent handles the query (e.g. filtering a list) instead of navigating. */
  value?: string;
  onValueChange?: (value: string) => void;
}

export default function ServiceSearch({
  placeholder = 'Try "AC repair near me", "laptop repair", "math tutor"',
  value,
  onValueChange,
}: ServiceSearchProps) {
  const navigate = useNavigate();
  const [inner, setInner] = useState('');
  const [focused, setFocused] = useState(false);
  const query = value ?? inner;

  const setQuery = (v: string) => {
    if (onValueChange) onValueChange(v);
    else setInner(v);
  };

  const suggestions = useMemo(() => searchServices(query), [query]);

  return (
    <div className="relative mb-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          aria-label="Search services, categories and locations"
          className="h-12 pl-10 pr-10 rounded-xl"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {focused && query.trim().length > 0 && suggestions.length > 0 && (
        <Card className="absolute z-30 left-0 right-0 mt-1 p-1 max-h-72 overflow-y-auto shadow-lg">
          {suggestions.map((item) => (
            <button
              key={`${item.groupId}-${item.slug}`}
              type="button"
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted flex items-center gap-2"
              onClick={() =>
                navigate(`/customer/post-job?category=${item.groupId}&service=${encodeURIComponent(item.name)}`)
              }
            >
              <span aria-hidden>{item.groupIcon}</span>
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">{item.groupName}</span>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
