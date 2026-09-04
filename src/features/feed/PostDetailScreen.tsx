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
import { PostCard } from '../../components/feed/PostCard';
import { Avatar } from '../../components/common/Avatar';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { useAuthStore } from '../../store/authStore';
import { usePostMutations } from './useFeed';
import { darkTheme } from '../../theme/colors';
import { Post, Comment } from '../../types';

export const PostDetailScreen = () => {
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

  const { likePost, unlikePost, bookmarkPost, repostPost } = usePostMutations();

  const handleLikeToggle = (targetPostId: string) => {
    if (!post) return;
    const isLiked = user ? post.likes.includes(user._id) : false;
    if (isLiked) {
      unlikePost(targetPostId);
    } else {
      likePost(targetPostId);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="Post" onBack={() => navigation.goBack()} />

      {postLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={darkTheme.accent} />
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
                onLike={handleLikeToggle}
                onBookmark={(id) => bookmarkPost(id)}
                onRepost={(id) => repostPost(id)}
                onQuote={(quoted) => navigation.navigate('CreatePost', { quotedPost: quoted })}
                onPressAuthor={(id) => navigation.navigate('UserProfile', { userId: id })}
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
      <View style={styles.inputContainer}>
        <Avatar uri={user?.avatar} name={user?.username} size={32} />
        <TextInput
          style={styles.input}
          placeholder="Post your reply"
          placeholderTextColor={darkTheme.fgMuted}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity
          disabled={!commentText.trim() || addCommentMutation.isPending}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: darkTheme.fgMuted,
    fontSize: 15,
  },
  commentsDivider: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.border,
  },
  repliesHeading: {
    color: darkTheme.fg,
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.border,
    gap: 12,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentAuthor: {
    color: darkTheme.fg,
    fontSize: 14,
    fontWeight: '700',
  },
  commentTime: {
    color: darkTheme.fgMuted,
    fontSize: 12,
  },
  commentText: {
    color: darkTheme.fg,
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: darkTheme.surface,
    borderTopWidth: 1,
    borderTopColor: darkTheme.border,
  },
  input: {
    flex: 1,
    color: darkTheme.fg,
    fontSize: 14,
    maxHeight: 80,
  },
  replyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: darkTheme.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyBtnDisabled: {
    opacity: 0.3,
  },
});
