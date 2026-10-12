import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { Theme } from '../../theme/colors';

export function ScreenIntro({ label, title, description }: { label: string; title: string; description?: string }) {
  const { styles } = useThemedStyles(createStyles);
  return <View style={styles.container}><Text style={styles.label}>{label.toUpperCase()}</Text><Text accessibilityRole="header" style={styles.title}>{title}</Text>{description && <Text style={styles.description}>{description}</Text>}</View>;
}
const createStyles = (colors: Theme) => StyleSheet.create({
  container: { padding: 24, paddingTop: 20, paddingBottom: 24 },
  label: { fontSize: 10, letterSpacing: 1.8, fontWeight: '700', color: colors.accentText, marginBottom: 10 },
  title: { fontSize: 32, lineHeight: 36, letterSpacing: -1, fontWeight: '800', color: colors.fg },
  description: { marginTop: 10, fontSize: 14, lineHeight: 21, color: colors.fgMuted },
});
