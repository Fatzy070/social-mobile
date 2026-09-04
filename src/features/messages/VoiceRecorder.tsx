import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../../theme/colors';

interface VoiceRecorderProps {
  conversationId: string;
  onVoiceSent: (audioPayload: { url: string; publicId: string; duration: number; mimeType: string; fileSize: number }) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [durationSecs, setDurationSecs] = useState(0);
  const timerRef = React.useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = () => {
    setIsRecording(true);
    setDurationSecs(0);
    timerRef.current = setInterval(() => {
      setDurationSecs((prev) => prev + 1);
    }, 1000);
  };

  const stopAndUpload = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    Alert.alert(
      'Expo Go Voice Recording',
      'Audio recording in Expo Go requires a custom development build (npx expo run:ios/android). Text and image messaging are fully functional.'
    );
    onCancel();
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    onCancel();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={cancelRecording} style={styles.cancelBtn}>
        <Ionicons name="trash-outline" size={20} color={darkTheme.error} />
      </TouchableOpacity>

      <View style={styles.recordStatus}>
        <View style={[styles.pulseDot, isRecording && styles.pulseDotActive]} />
        <Text style={styles.timerText}>
          {isRecording ? formatTimer(durationSecs) : 'Tap mic to record voice note'}
        </Text>
      </View>

      {!isRecording ? (
        <TouchableOpacity onPress={startRecording} style={styles.micBtn}>
          <Ionicons name="mic" size={22} color="#ffffff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={stopAndUpload} style={styles.sendBtn}>
          <Ionicons name="send" size={20} color="#ffffff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: darkTheme.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: darkTheme.border,
  },
  cancelBtn: {
    padding: 6,
  },
  recordStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: darkTheme.fgMuted,
  },
  pulseDotActive: {
    backgroundColor: darkTheme.error,
  },
  timerText: {
    color: darkTheme.fg,
    fontSize: 14,
    fontWeight: '600',
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: darkTheme.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: darkTheme.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
