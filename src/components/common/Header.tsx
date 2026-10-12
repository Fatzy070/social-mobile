import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from './Avatar';

interface HeaderProps {
  title: string;
  subtitle?: string;
  avatar?: string;
  onBack?: () => void;
  onTitlePress?: () => void;
  rightAction?: React.ReactNode;
  showBrand?: boolean;
  onBrandPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  avatar,
  onBack,
  onTitlePress,
  rightAction,
  showBrand,
  onBrandPress,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isBrandHeader = showBrand ?? (!onBack && title === 'Nexus');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingTop: insets.top + 8,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Left Section: Back Button or Interactive Brand/Menu Logo */}
        {onBack ? (
          <TouchableOpacity
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={onBack}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.fg} />
          </TouchableOpacity>
        ) : onBrandPress ? (
          <TouchableOpacity
            activeOpacity={0.75}
            accessibilityLabel="Open navigation"
            onPress={onBrandPress}
            disabled={!onBrandPress}
            style={styles.brandTrigger}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="menu-outline" size={24} color={colors.fg} />
          </TouchableOpacity>
        ) : null}

        {/* Center Section */}
        {isBrandHeader ? (
          <TouchableOpacity
            activeOpacity={onBrandPress ? 0.75 : 1}
            accessibilityLabel="Open navigation"
            onPress={onBrandPress}
            disabled={!onBrandPress}
            style={styles.brandTitleContainer}
          >
            <Text style={[styles.brandTitle, { color: colors.fg }]}>Nexus</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={onTitlePress ? 0.7 : 1}
            onPress={onTitlePress}
            disabled={!onTitlePress}
            style={styles.headerPressable}
          >
            {avatar !== undefined && (
              <View style={styles.avatarContainer}>
                <Avatar uri={avatar} name={title} size={36} />
              </View>
            )}

            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: colors.fg }]} numberOfLines={1}>
                {title}
              </Text>
              {subtitle && (
                <Text style={[styles.subtitle, { color: colors.fgMuted }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Right Action Container */}
        <View style={styles.rightActionContainer}>{rightAction}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 0,
    paddingBottom: 10,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  backButton: {
    padding: 10,
    marginRight: 8,
    borderRadius: 20,
  },
  brandTrigger: {
    padding: 2,
    marginRight: 8,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0,
    shadowRadius: 5,
    elevation: 0,
  },
  logoText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  brandTitleContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  headerPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 10,
  },
  rightActionContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
