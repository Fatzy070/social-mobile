import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Dimensions, Share } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '../../types';
import { darkTheme } from '../../theme/colors';
import { Avatar } from '../common/Avatar';
import { parseTextWithLinks } from '../../utils/urlHelper';
import { ImageViewerModal } from '../common/ImageViewerModal';

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onLike?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onQuote?: (post: Post) => void;
  onComment?: (postId: string) => void;
  onShare?: (post: Post) => void;
  onPressPost?: (postId: string) => void;
  onPressAuthor?: (authorId: string) => void;
}

const { width } = Dimensions.get('window');

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onLike,
  onBookmark,
  onRepost,
  onQuote,
  onComment,
  onShare,
  onPressPost,
  onPressAuthor,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  const isLiked = currentUserId ? post.likes.includes(currentUserId) : false;
  const isBookmarked = currentUserId ? post.bookMark.includes(currentUserId) : false;
  const isReposted = currentUserId ? post.reposts.includes(currentUserId) : false;

  const timeAgo = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
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
            contentFit="cover"
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

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPressPost?.(post._id)}
        style={styles.cardPressable}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => onPressAuthor?.(post.authorId._id)}
            style={styles.authorSection}
          >
            <Avatar uri={post.authorId.avatar} name={post.authorId.username} size={42} />
            <View style={styles.authorTextContainer}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.authorId.username}
              </Text>
              <Text style={styles.handleText} numberOfLines={1}>
                @{post.authorId.username.toLowerCase()} · {timeAgo}
              </Text>
            </View>
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

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={() => onComment?.(post._id)}
          style={styles.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chatbubble-outline" size={18} color={darkTheme.fgMuted} />
          <Text style={styles.actionText}>{post.commentCount || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onRepost?.(post._id)}
          style={styles.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="repeat-outline"
            size={20}
            color={isReposted ? darkTheme.success : darkTheme.fgMuted}
          />
          <Text
            style={[
              styles.actionText,
              isReposted && { color: darkTheme.success, fontWeight: '700' },
            ]}
          >
            {post.reposts.length || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onLike?.(post._id)}
          style={styles.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={19}
            color={isLiked ? darkTheme.like : darkTheme.fgMuted}
          />
          <Text
            style={[
              styles.actionText,
              isLiked && { color: darkTheme.like, fontWeight: '700' },
            ]}
          >
            {post.likes.length || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onBookmark?.(post._id)}
          style={styles.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isBookmarked ? darkTheme.bookmark : darkTheme.fgMuted}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          style={styles.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="share-social-outline" size={18} color={darkTheme.fgMuted} />
        </TouchableOpacity>

        {onQuote && (
          <TouchableOpacity
            onPress={() => onQuote(post)}
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={18} color={darkTheme.fgMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ImageViewerModal
        visible={activeImageIndex !== null}
        images={mediaUrls}
        initialIndex={activeImageIndex || 0}
        onClose={() => setActiveImageIndex(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: darkTheme.bg,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.border,
    paddingTop: 12,
    paddingBottom: 8,
  },
  cardPressable: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    color: darkTheme.fg,
    fontSize: 15,
    fontWeight: '700',
  },
  handleText: {
    color: darkTheme.fgMuted,
    fontSize: 12,
    marginTop: 2,
  },
  contentText: {
    color: darkTheme.fg,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  linkText: {
    color: darkTheme.accent,
    textDecorationLine: 'underline',
  },
  singleImageContainer: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: darkTheme.surface,
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
    width: (width - 32 - 6) / 2,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: darkTheme.surface,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  quotedContainer: {
    borderWidth: 1,
    borderColor: darkTheme.borderStrong,
    borderRadius: 12,
    padding: 10,
    backgroundColor: darkTheme.surface,
    marginBottom: 10,
  },
  quotedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  quotedAuthorName: {
    color: darkTheme.fg,
    fontSize: 13,
    fontWeight: '600',
  },
  quotedContent: {
    color: darkTheme.fgMuted,
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
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  actionText: {
    color: darkTheme.fgMuted,
    fontSize: 12,
    fontWeight: '500',
  },
});
