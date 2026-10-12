import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';
import { Post } from '../../types';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
  isReposted: boolean;
  onRepostToggle: () => void;
  onQuotePress?: (post: Post) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onClose,
  post,
  isReposted,
  onRepostToggle,
  onQuotePress,
}) => {
  const { colors, styles } = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const shareUrl = `https://nexus-social.app/post/${post._id}`;
      await Share.share({
        message: shareUrl,
        url: shareUrl,
        title: `Post by @${post.authorId?.username}`,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onClose();
    } catch {
      Alert.alert('Error', 'Unable to share post link');
    }
  };

  const handleRepostClick = () => {
    onRepostToggle();
    onClose();
  };

  const handleQuoteClick = () => {
    onClose();
    if (onQuotePress) {
      onQuotePress(post);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.modalBackdrop}
      >
        <TouchableOpacity activeOpacity={1} style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Share Post</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={colors.fgMuted} />
            </TouchableOpacity>
          </View>

          {/* Instant Repost */}
          <TouchableOpacity
            style={[styles.sheetItem, isReposted && styles.sheetItemActive]}
            onPress={handleRepostClick}
          >
            <View
              style={[
                styles.iconCircle,
                isReposted ? styles.iconCircleActive : styles.iconCircleDefault,
              ]}
            >
              <Ionicons
                name="repeat-outline"
                size={20}
                color={isReposted ? colors.success : colors.fgMuted}
              />
            </View>
            <View style={styles.itemTextContainer}>
              <Text
                style={[
                  styles.itemTitle,
                  isReposted && { color: colors.success, fontWeight: '700' },
                ]}
              >
                {isReposted ? 'Undo Repost' : 'Repost'}
              </Text>
              <Text style={styles.itemSubtitle}>
                {isReposted
                  ? 'Remove this post from your profile'
                  : 'Instantly share this post with your followers'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Quote Post */}
          <TouchableOpacity style={styles.sheetItem} onPress={handleQuoteClick}>
            <View style={[styles.iconCircle, styles.iconCircleDefault]}>
              <Ionicons name="create-outline" size={20} color={colors.fgMuted} />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>Quote Post</Text>
              <Text style={styles.itemSubtitle}>
                Add your own thoughts before sharing
              </Text>
            </View>
          </TouchableOpacity>

          {/* Native Share / Copy Link */}
          <TouchableOpacity style={styles.sheetItem} onPress={handleCopyLink}>
            <View style={[styles.iconCircle, styles.iconCircleDefault]}>
              <Ionicons
                name={copied ? 'checkmark' : 'share-social-outline'}
                size={20}
                color={copied ? colors.success : colors.fgMuted}
              />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>
                {copied ? 'Link Shared!' : 'Share / Copy Link'}
              </Text>
              <Text style={styles.itemSubtitle}>Share link to other apps or contacts</Text>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const createStyles = (colors: Theme) => StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: metrics.gutter,
    paddingTop: 10,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  sheetTitle: {
    color: colors.fg,
    fontSize: 16,
    fontWeight: '700',
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: metrics.radius,
    gap: 12,
  },
  sheetItemActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleDefault: {
    backgroundColor: colors.bg,
  },
  iconCircleActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    color: colors.fg,
    fontSize: 14,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: colors.fgMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
