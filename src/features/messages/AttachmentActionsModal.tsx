import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface AttachmentActionsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectImage: () => void;
  onSelectDocument: () => void;
  onOpenCamera: () => void;
  onOpenSchedule: () => void;
}

export const AttachmentActionsModal: React.FC<AttachmentActionsModalProps> = ({
  visible,
  onClose,
  onSelectImage,
  onSelectDocument,
  onOpenCamera,
  onOpenSchedule,
}) => {
  const { colors, styles } = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.backdrop}
      >
        <TouchableOpacity activeOpacity={1} style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Message Actions</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.fgMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {/* 1. Photos & Videos */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                console.log('[CHAT-MEDIA] Modal option clicked: Photos & Videos');
                onClose();
                setTimeout(() => {
                  onSelectImage();
                }, 150);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.accentMuted }]}>
                <Ionicons name="images" size={24} color={colors.accentText} />
              </View>
              <Text style={styles.actionLabel}>Photos & Videos</Text>
            </TouchableOpacity>

            {/* 2. Documents */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                console.log('[CHAT-MEDIA] Modal option clicked: Documents');
                onClose();
                setTimeout(() => {
                  onSelectDocument();
                }, 150);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="document-text" size={24} color={colors.success} />
              </View>
              <Text style={styles.actionLabel}>Document</Text>
            </TouchableOpacity>

            {/* 3. Take Photo / Camera */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                console.log('[CHAT-MEDIA] Modal option clicked: Take Photo');
                onClose();
                setTimeout(() => {
                  onOpenCamera();
                }, 150);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Ionicons name="camera" size={24} color="#38bdf8" />
              </View>
              <Text style={styles.actionLabel}>Take Photo</Text>
            </TouchableOpacity>

            {/* 4. Schedule Message */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                console.log('[CHAT-MEDIA] Modal option clicked: Schedule Message');
                onClose();
                setTimeout(() => {
                  onOpenSchedule();
                }, 150);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="time" size={24} color={colors.bookmark} />
              </View>
              <Text style={styles.actionLabel}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const createStyles = (colors: Theme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.fg,
  },
  closeBtn: {
    padding: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.bg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.fg,
  },
});
