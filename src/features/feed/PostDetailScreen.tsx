import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { PostCard } from '../../components/feed/PostCard';
import { PostCardSkeleton, Skeleton, SkeletonAvatar } from '../../components/common/Skeleton';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';
import { usePostMutations } from './useFeed';
import { Post, Comment } from '../../types';

export const PostDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors, styles } = useThemedStyles(createStyles);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const postId = route.params?.postId;
  const [commentText, setCommentText] = useState('');

  // Fetch Post Detail
  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/posts/${postId}/detail`);
      return data.post as Post;
    },
    enabled: !!postId,
  });

  // Fetch Comments
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: queryKeys.posts.comments(postId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/comments/${postId}/comments`);
      return (data.comments || []) as Comment[];
    },
    enabled: !!postId,
  });

  // Add Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await apiClient.post(`/comments/${postId}/create`, { content });
      return data.comment as Comment;
    },
    onSuccess: (newComment) => {
      setCommentText('');
      queryClient.setQueryData(queryKeys.posts.comments(postId), (old: Comment[] = []) => [
        newComment,
        ...old,
      ]);
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
    },
  });

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate(commentText.trim());
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const timeAgo = item.createdAt
      ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
      : '';

    return (
      <View style={styles.commentRow}>
        <Avatar uri={item.authorId.avatar} name={item.authorId.username} size={36} />
        <View style={styles.commentBody}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{item.authorId.username}</Text>
            <Text style={styles.commentTime}>{timeAgo}</Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  const { likePost, unlikePost, bookmarkPost, repostPost, pinPost, unpinPost, deletePost } = usePostMutations();

  const handleLikeToggle = (targetPostId: string) => {
    if (!post) return;
    const isLiked = user
      ? post.likes?.some(
          (id: any) => id === user._id || id?._id === user._id || id === 'optimistic'
        )
      : false;
    if (isLiked) {
      unlikePost(targetPostId);
    } else {
      likePost(targetPostId);
    }
  };

  const handleDeletePost = (id: string) => {
    deletePost(id);
    navigation.goBack();
  };

  const isPostPinned = !!user?.pinnedPost && (post?._id === (user.pinnedPost?._id || user.pinnedPost));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="Conversation" onBack={() => navigation.goBack()} />

      {postLoading && !post ? (
        <View style={{ flex: 1 }}>
          <PostCardSkeleton />
          <View style={{ padding: 16, gap: 16 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <SkeletonAvatar size={36} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width={120} height={13} />
                <Skeleton width="80%" height={12} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <SkeletonAvatar size={36} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width={100} height={13} />
                <Skeleton width="60%" height={12} />
              </View>
            </View>
          </View>
        </View>
      ) : !post ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Post not found or unavailable.</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={
            <View>
              <PostCard
                post={post}
                currentUserId={user?._id}
                isPinned={isPostPinned}
                onLike={handleLikeToggle}
                onBookmark={(id) => bookmarkPost(id)}
                onRepost={(id) => repostPost(id)}
                onQuote={(quoted) => navigation.navigate('CreatePost', { quotedPost: quoted })}
                onPressAuthor={(id) => navigation.navigate('UserProfile', { userId: id })}
                onPin={(id) => pinPost(id)}
                onUnpin={() => unpinPost()}
                onDelete={handleDeletePost}
              />
              <View style={styles.commentsDivider}>
                <Text style={styles.repliesHeading}>Replies ({comments.length})</Text>
              </View>
            </View>
          }
          renderItem={renderComment}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Comment Input */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Avatar uri={user?.avatar} name={user?.username} size={32} />
        <TextInput
          style={styles.input}
          accessibilityLabel="Write a reply"
          placeholder="Add to the conversation"
          placeholderTextColor={colors.fgMuted}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity
          disabled={!commentText.trim() || addCommentMutation.isPending}
          accessibilityLabel="Send reply"
          onPress={handleSendComment}
          style={[
            styles.replyBtn,
            (!commentText.trim() || addCommentMutation.isPending) && styles.replyBtnDisabled,
          ]}
        >
          {addCommentMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="arrow-up" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.fgMuted,
    fontSize: metrics.body,
  },
  commentsDivider: {
    paddingHorizontal: metrics.gutter,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  repliesHeading: {
    color: colors.fg,
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: metrics.gutter,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  commentBody: {
    flex: 1,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  commentAuthor: {
    color: colors.fg,
    fontSize: 14,
    fontWeight: '700',
  },
  commentTime: {
    color: colors.fgMuted,
    fontSize: 12,
  },
  commentText: {
    color: colors.fg,
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: metrics.gutter,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.fg,
    fontSize: 14,
    maxHeight: 80,
  },
  replyBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyBtnDisabled: {
    opacity: 0.3,
  },
});
