import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ThemeColor = 'navy' | 'teal' | 'purple' | 'red';

interface ThemeContextType {
  theme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
  isSyncing: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'converza-theme-color';

export const themeColors: Record<ThemeColor, { 
  name: string; 
  primary: string; 
  accent: string;
  logoFilter: string;
}> = {
  navy: {
    name: 'Navy Blue',
    primary: '217 91% 22%',
    accent: '217 91% 60%',
    logoFilter: 'hue-rotate(0deg) saturate(1)',
  },
  teal: {
    name: 'Teal',
    primary: '175 70% 28%',
    accent: '175 70% 45%',
    logoFilter: 'hue-rotate(140deg) saturate(1.2)',
  },
  purple: {
    name: 'Purple',
    primary: '270 60% 35%',
    accent: '270 60% 55%',
    logoFilter: 'hue-rotate(230deg) saturate(1.1)',
  },
  red: {
    name: 'Red',
    primary: '0 70% 40%',
    accent: '0 70% 55%',
    logoFilter: 'hue-rotate(320deg) saturate(1.3)',
  },
};

function applyTheme(theme: ThemeColor) {
  const root = document.documentElement;
  const colors = themeColors[theme];
  
  root.classList.add('theme-transitioning');
  
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--ring', colors.accent);
  root.style.setProperty('--sidebar-primary', colors.accent);
  root.style.setProperty('--sidebar-ring', colors.accent);
  
  const primaryHsl = `hsl(${colors.primary})`;
  const accentHsl = `hsl(${colors.accent})`;
  root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${primaryHsl} 0%, ${accentHsl} 100%)`);
  root.style.setProperty('--gradient-accent', `linear-gradient(135deg, ${accentHsl} 0%, hsl(${colors.accent.split(' ')[0]} ${colors.accent.split(' ')[1]} 75%) 100%)`);
  
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  
  setTimeout(() => {
    root.classList.remove('theme-transitioning');
  }, 500);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeColor>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && stored in themeColors) {
        return stored as ThemeColor;
      }
    }
    return 'navy';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Load theme from database on auth change
  useEffect(() => {
    const loadThemeFromDB = async (uid: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('theme_preference')
        .eq('id', uid)
        .maybeSingle();
      
      if (data?.theme_preference && data.theme_preference in themeColors) {
        const dbTheme = data.theme_preference as ThemeColor;
        setThemeState(dbTheme);
        applyTheme(dbTheme);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
        // Defer DB load to avoid blocking
        setTimeout(() => {
          loadThemeFromDB(session.user.id);
        }, 0);
      } else {
        setUserId(null);
      }
    });

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
        loadThemeFromDB(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback(async (newTheme: ThemeColor) => {
    setThemeState(newTheme);
    
    // Sync to database if logged in
    if (userId) {
      setIsSyncing(true);
      await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('id', userId);
      setIsSyncing(false);
    }
  }, [userId]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isSyncing }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useLogoFilter() {
  const { theme } = useTheme();
  return themeColors[theme].logoFilter;
}
