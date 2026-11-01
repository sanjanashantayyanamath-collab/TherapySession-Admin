import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui/Button.jsx';

function readTheme() {
  try { return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { return 'light'; }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem('theme', theme); } catch { /* preference is optional */ }
  }, [theme]);
  return <Button aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} theme`} variant="ghost" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</Button>;
}
