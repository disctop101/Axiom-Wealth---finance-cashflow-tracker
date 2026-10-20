import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('axiom_theme_mode');
        if (stored === 'dark' || stored === 'light') {
          return stored;
        }
      }
      // Check system preference safely
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        if (mq && mq.matches) {
          return 'dark';
        }
      }
    } catch {
      // fallback if storage or matchMedia access is denied
    }
    return 'light';
  });

  const isDark = theme === 'dark';

  const applyThemeToDocument = (mode: ThemeMode) => {
    try {
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      if (!root) return;
      if (mode === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // Listen to OS prefers-color-scheme changes if user hasn't explicitly set a preference
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (!mediaQuery) return;

      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        try {
          const hasStored = window.localStorage ? localStorage.getItem('axiom_theme_mode') : null;
          if (!hasStored) {
            const newTheme: ThemeMode = e.matches ? 'dark' : 'light';
            setThemeState(newTheme);
          }
        } catch {
          // ignore
        }
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else if (typeof (mediaQuery as any).addListener === 'function') {
        (mediaQuery as any).addListener(handleChange);
        return () => (mediaQuery as any).removeListener(handleChange);
      }
    } catch {
      // ignore
    }
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('axiom_theme_mode', newTheme);
      }
    } catch {}
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
