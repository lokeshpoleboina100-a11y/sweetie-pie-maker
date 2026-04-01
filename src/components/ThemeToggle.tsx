import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ThemeProvider';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTheme(next)} title={`Theme: ${theme}`}>
      <Icon className="h-5 w-5" />
    </Button>
  );
}
