import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface FloatingCreateButtonProps {
  onPress: () => void;
  style?: any;
}

export const FloatingCreateButton: React.FC<FloatingCreateButtonProps> = ({
  onPress,
  style,
}) => {
  const { colors, styles } = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.fab, style]}
      accessibilityRole="button"
      accessibilityLabel="Create Post"
    >
      <Ionicons name="create" size={26} color="#ffffff" />
    </TouchableOpacity>
  );
};

const createStyles = (colors: Theme) => StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 90,
  },
});
