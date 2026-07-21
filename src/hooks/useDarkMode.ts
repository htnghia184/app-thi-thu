import { useState, useCallback } from 'react';

const STORAGE_KEY = 'vstep-dark-mode';

function getInitialDark(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitialDark);

  const toggle = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  return { isDark, toggle };
}
