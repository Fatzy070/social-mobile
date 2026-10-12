import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Share,
  Alert,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '../../types';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';
import { Avatar } from '../common/Avatar';
import { parseTextWithLinks } from '../../utils/urlHelper';
import { ImageViewerModal } from '../common/ImageViewerModal';
import { ShareModal } from './ShareModal';

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  isPinned?: boolean;
  onLike?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onQuote?: (post: Post) => void;
  onComment?: (postId: string) => void;
  onShare?: (post: Post) => void;
  onPin?: (postId: string) => void;
  onUnpin?: () => void;
  onDelete?: (postId: string) => void;
  onPressPost?: (postId: string) => void;
  onPressAuthor?: (authorId: string) => void;
}


export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  isPinned = false,
  onLike,
  onBookmark,
  onRepost,
  onQuote,
  onComment,
  onShare,
  onPin,
  onUnpin,
  onDelete,
  onPressPost,
  onPressAuthor,
}) => {
  const { colors, styles } = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const authorId = post.authorId?._id || (post.authorId as unknown as string);
  const isOwnPost = currentUserId && authorId === currentUserId;

  const isLiked = currentUserId
    ? post.likes?.some(
        (like: any) =>
          like === currentUserId ||
          like?._id === currentUserId ||
          like?.toString?.() === currentUserId ||
          like === 'optimistic'
      )
    : false;

  const isBookmarked = currentUserId
    ? post.bookMark?.some(
        (bm: any) =>
          bm === currentUserId ||
          bm?._id === currentUserId ||
          bm?.toString?.() === currentUserId
      )
    : false;

  const isReposted = currentUserId
    ? post.reposts?.some(
        (rep: any) =>
          rep === currentUserId ||
          rep?._id === currentUserId ||
          rep?.toString?.() === currentUserId
      )
    : false;

  const timeAgo = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: false })
    : '';

  const mediaUrls = (post.media || []).map((m) => m.url).filter(Boolean);

  const renderContent = (content?: string) => {
    if (!content) return null;
    const parts = parseTextWithLinks(content);

    return (
      <Text style={styles.contentText}>
        {parts.map((part, idx) => {
          if (part.isUrl && part.url) {
            return (
              <Text
                key={idx}
                style={styles.linkText}
                onPress={() => Linking.openURL(part.url!)}
              >
                {part.text}
              </Text>
            );
          }
          return <Text key={idx}>{part.text}</Text>;
        })}
      </Text>
    );
  };

  const renderMedia = () => {
    if (!post.media || post.media.length === 0) return null;

    if (post.media.length === 1) {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setActiveImageIndex(0)}
          style={styles.singleImageContainer}
        >
          <Image
            source={{ uri: post.media[0].url }}
            style={styles.singleImage}
            contentFit="contain"
            transition={200}
          />
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.gridContainer}>
        {post.media.slice(0, 4).map((item, idx) => (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.9}
            onPress={() => setActiveImageIndex(idx)}
            style={styles.gridItem}
          >
            <Image
              source={{ uri: item.url }}
              style={styles.gridImage}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const handleShare = async () => {
    if (onShare) {
      onShare(post);
      return;
    }
    try {
      const shareMessage = post.content
        ? `${post.content}\n\nShared via Nexus Social`
        : `Check out this post by @${post.authorId?.username} on Nexus Social`;
      await Share.share({
        message: shareMessage,
      });
    } catch {}
  };

  const handleDeletePress = () => {
    setIsMenuOpen(false);
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete?.(post._id),
      },
    ]);
  };

  const handlePinPress = () => {
    setIsMenuOpen(false);
    if (isPinned) {
      onUnpin?.();
    } else {
      onPin?.(post._id);
    }
  };

  return (
    <View style={styles.container}>
      {/* Pinned Post Indicator Banner */}
      {isPinned && (
        <View style={styles.pinnedBanner}>
          <Ionicons name="pin" size={13} color={colors.accentText} />
          <Text style={styles.pinnedBannerText}>Pinned Post</Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPressPost?.(post._id)}
        style={styles.cardPressable}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => onPressAuthor?.(authorId)}
            style={styles.authorSection}
          >
            <Avatar uri={post.authorId?.avatar} name={post.authorId?.username} size={42} />
            <View style={styles.authorTextContainer}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.authorId?.username}
              </Text>
              <Text style={styles.handleText} numberOfLines={1}>
                @{post.authorId?.username?.toLowerCase()}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.timestamp}>{timeAgo}</Text>
          <TouchableOpacity
            accessibilityLabel="Post options"
            accessibilityRole="button"
            onPress={() => setIsMenuOpen(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.menuTrigger}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.fgMuted} />
          </TouchableOpacity>
        </View>

        {renderContent(post.content)}
        {renderMedia()}

        {/* Embedded Quoted Post Card */}
        {post.quotedPost && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onPressPost?.(post.quotedPost!._id)}
            style={styles.quotedContainer}
          >
            <View style={styles.quotedHeader}>
              <Avatar
                uri={post.quotedPost.authorId?.avatar}
                name={post.quotedPost.authorId?.username}
                size={22}
              />
              <Text style={styles.quotedAuthorName}>
                {post.quotedPost.authorId?.username}
              </Text>
            </View>
            {post.quotedPost.content ? (
              <Text style={styles.quotedContent} numberOfLines={3}>
                {post.quotedPost.content}
              </Text>
            ) : null}
            {post.quotedPost.media && post.quotedPost.media.length > 0 ? (
              <Image
                source={{ uri: post.quotedPost.media[0].url }}
                style={styles.quotedImagePreview}
                contentFit="cover"
              />
            ) : null}
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Action Bar: STRICT PARITY WITH WEB - EXACTLY 4 ACTIONS */}
      <View style={styles.actionBar}>
        {/* 1. Comment */}
        <TouchableOpacity
          accessibilityLabel="Reply to post"
          onPress={() => onComment?.(post._id)}
          style={styles.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.fgMuted} />
          <Text style={styles.actionText}>{post.commentCount || 0}</Text>
        </TouchableOpacity>

        {/* 2. Repost / Share (Opens Share & Quote Modal) */}
        <TouchableOpacity
          accessibilityLabel="Share or repost"
          onPress={() => setIsShareModalOpen(true)}
          style={styles.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="repeat-outline"
            size={20}
            color={isReposted ? colors.success : colors.fgMuted}
          />
          <Text
            style={[
              styles.actionText,
              isReposted && { color: colors.success, fontWeight: '700' },
            ]}
          >
            {(post.reposts?.length || 0) + (post.quoteCount || 0)}
          </Text>
        </TouchableOpacity>

        {/* 3. Like */}
        <TouchableOpacity
          accessibilityLabel={isLiked ? "Unlike post" : "Like post"}
          accessibilityState={{ selected: isLiked }}
          onPress={() => onLike?.(post._id)}
          style={styles.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={19}
            color={isLiked ? colors.like : colors.fgMuted}
          />
          <Text
            style={[
              styles.actionText,
              isLiked && { color: colors.like, fontWeight: '700' },
            ]}
          >
            {post.likesCount ?? post.likes?.length ?? 0}
          </Text>
        </TouchableOpacity>

        {/* 4. Bookmark */}
        <TouchableOpacity
          accessibilityLabel={isBookmarked ? "Remove bookmark" : "Bookmark post"}
          onPress={() => onBookmark?.(post._id)}
          style={styles.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isBookmarked ? colors.bookmark : colors.fgMuted}
          />
        </TouchableOpacity>
      </View>

      <ImageViewerModal
        visible={activeImageIndex !== null}
        images={mediaUrls}
        initialIndex={activeImageIndex || 0}
        onClose={() => setActiveImageIndex(null)}
      />

      {/* Share & Quote Modal */}
      <ShareModal
        visible={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        post={post}
        isReposted={isReposted}
        onRepostToggle={() => onRepost?.(post._id)}
        onQuotePress={onQuote}
      />

      {/* Post Action Menu Modal - STRICT MATCH WITH WEB PostCard dropdown */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsMenuOpen(false)}
          style={styles.modalBackdrop}
        >
          <View style={[styles.menuSheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            <View style={styles.sheetHandle} />

            {isOwnPost ? (
              <>
                {(onPin || onUnpin) && (
                  <TouchableOpacity style={styles.menuAction} onPress={handlePinPress}>
                    <Ionicons
                      name={isPinned ? 'pin' : 'pin-outline'}
                      size={20}
                      color={isPinned ? colors.accent : colors.fg}
                    />
                    <Text style={styles.menuActionText}>
                      {isPinned ? 'Unpin from profile' : 'Pin to your profile'}
                    </Text>
                  </TouchableOpacity>
                )}

                {onDelete && (
                  <TouchableOpacity
                    style={[
                      styles.menuAction,
                      (onPin || onUnpin) && { borderTopWidth: 1, borderTopColor: colors.border },
                    ]}
                    onPress={handleDeletePress}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                    <Text style={[styles.menuActionText, { color: colors.error }]}>
                      Delete post
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity
                style={styles.menuAction}
                onPress={() => {
                  setIsMenuOpen(false);
                  Alert.alert('Report Post', 'Thank you for reporting. Our moderation team will review this post.');
                }}
              >
                <Ionicons name="flag-outline" size={20} color={colors.fgMuted} />
                <Text style={styles.menuActionText}>Report post</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const createStyles = (colors: Theme) => StyleSheet.create({
  timestamp: { fontSize: 10, color: colors.fgMuted, maxWidth: 66, marginLeft: 8 },
  container: {
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 24,
    paddingBottom: 12,
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: metrics.gutter,
    marginBottom: 8,
  },
  pinnedBannerText: {
    color: colors.accentText,
    fontSize: 12,
    fontWeight: '700',
  },
  cardPressable: {
    paddingHorizontal: metrics.gutter,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    color: colors.fg,
    fontSize: metrics.body,
    fontWeight: '700',
  },
  handleText: {
    color: colors.fgMuted,
    fontSize: 12,
    marginTop: 2,
  },
  menuTrigger: {
    padding: 6,
  },
  contentText: {
    color: colors.fg,
    fontSize: metrics.body,
    lineHeight: metrics.bodyLine,
    marginBottom: 10,
  },
  linkText: {
    color: colors.accentText,
    textDecorationLine: 'underline',
  },
  singleImageContainer: {
    width: '100%',
    aspectRatio: 1.25,
    borderRadius: metrics.radius,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  singleImage: {
    width: '100%',
    height: '100%',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  gridItem: {
    width: '48.5%',
    flexGrow: 1,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  quotedContainer: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  quotedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  quotedAuthorName: {
    color: colors.fg,
    fontSize: 13,
    fontWeight: '600',
  },
  quotedContent: {
    color: colors.fgMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  quotedImagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  actionText: {
    color: colors.fgMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 34,
    paddingHorizontal: metrics.gutter,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 14,
  },
  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  menuActionText: {
    color: colors.fg,
    fontSize: metrics.body,
    fontWeight: '600',
  },
});
