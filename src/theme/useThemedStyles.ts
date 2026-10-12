import { useMemo } from 'react';
import { useTheme } from './ThemeContext';
import type { Theme } from './colors';

/** Cache native style sheets until the existing theme preference changes. */
export function useThemedStyles<T>(createStyles: (colors: Theme) => T) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors, createStyles]);
  return { colors, styles };
}
