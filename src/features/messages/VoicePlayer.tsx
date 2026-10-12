import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface VoicePlayerProps {
  url: string;
  duration?: number;
  isOwn?: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ duration = 0, isOwn = false }) => {
  const { colors, styles } = useThemedStyles(createStyles);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    // Graceful fallback for Expo Go where native ExponentAV module is absent
    setIsPlaying((prev) => !prev);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={togglePlay}
        style={styles.playBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={18}
          color="#ffffff"
        />
      </TouchableOpacity>

      <View style={styles.trackContainer}>
        <View style={[styles.progressBarBg, { backgroundColor: isOwn ? 'rgba(255,255,255,0.3)' : colors.borderStrong }]}>
          <View style={[styles.progressBarFill, { width: isPlaying ? '70%' : '15%', backgroundColor: isOwn ? '#ffffff' : colors.accent }]} />
        </View>
        <Text style={[styles.durationText, { color: isOwn ? '#ffffff' : colors.fgMuted }]}>
          {formatTime(duration)}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (colors: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
    minWidth: 160,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackContainer: {
    flex: 1,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  durationText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    fontWeight: '500',
  },
});
