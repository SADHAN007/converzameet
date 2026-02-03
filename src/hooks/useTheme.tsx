import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeColor = 'navy' | 'teal' | 'purple' | 'red';

interface ThemeContextType {
  theme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
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

  useEffect(() => {
    const root = document.documentElement;
    const colors = themeColors[theme];
    
    // Add transition class for smooth color changes
    root.classList.add('theme-transitioning');
    
    // Update CSS variables for light mode
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--ring', colors.accent);
    root.style.setProperty('--sidebar-primary', colors.accent);
    root.style.setProperty('--sidebar-ring', colors.accent);
    
    // Update gradient
    const primaryHsl = `hsl(${colors.primary})`;
    const accentHsl = `hsl(${colors.accent})`;
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${primaryHsl} 0%, ${accentHsl} 100%)`);
    root.style.setProperty('--gradient-accent', `linear-gradient(135deg, ${accentHsl} 0%, hsl(${colors.accent.split(' ')[0]} ${colors.accent.split(' ')[1]} 75%) 100%)`);
    
    // Store in localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    
    // Remove transition class after animation completes
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [theme]);

  const setTheme = (newTheme: ThemeColor) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
