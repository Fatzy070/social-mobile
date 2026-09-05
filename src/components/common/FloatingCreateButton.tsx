import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../../theme/colors';

interface FloatingCreateButtonProps {
  onPress: () => void;
  style?: any;
}

export const FloatingCreateButton: React.FC<FloatingCreateButtonProps> = ({
  onPress,
  style,
}) => {
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

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: darkTheme.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: darkTheme.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 90,
  },
});
