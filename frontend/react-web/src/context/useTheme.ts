import { useContext } from 'react';

import { ThemeContext } from '@context/ThemeContextValue';
import type { ThemeContextValue } from '@context/ThemeContextValue';

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
