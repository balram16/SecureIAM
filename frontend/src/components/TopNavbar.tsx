import React from 'react';
import { Search, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';

export const TopNavbar: React.FC = () => {
  const { user } = useAuth();
  const [theme, setTheme] = React.useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  React.useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const initials = (user?.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="h-[64px] border-b border-border/40 bg-card/20 backdrop-blur-md px-8 flex items-center justify-between shrink-0 select-none z-20">
      {/* Search Bar */}
      <div className="relative w-72 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search resources, logs, policies..."
          className="w-full pl-9 pr-4 py-1.5 bg-black/30 border border-border/50 rounded-xl text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-foreground bg-transparent"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Decorative Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
          onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <Moon className="h-4.5 w-4.5 text-primary" />
          ) : (
            <Sun className="h-4.5 w-4.5 text-amber-500" />
          )}
        </Button>

        {/* User Session Info */}
        <div className="flex items-center gap-3 pl-4 border-l border-border/30">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
