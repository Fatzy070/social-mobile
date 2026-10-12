import { ScreenIntro } from '../../components/common/ScreenIntro';
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../../components/common/Header';
import { PostCard } from '../../components/feed/PostCard';
import { PostFeedSkeleton } from '../../components/common/Skeleton';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { usePostMutations } from './useFeed';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';
import { Post } from '../../types';

export const BookmarksScreen = () => {
  const { colors, styles } = useThemedStyles(createStyles);
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { likePost, unlikePost, bookmarkPost, repostPost, pinPost, deletePost } = usePostMutations();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: queryKeys.posts.bookmarked,
    queryFn: async () => {
      const { data } = await apiClient.get('/posts/bookmarked');
      return (data.posts || []) as Post[];
    },
  });

  const posts = data || [];
  console.log('get bookmarked post' , posts)

  const handleLikeToggle = (postId: string) => {
    const post = posts.find((p) => p._id === postId);
    if (!post) return;
    const isLiked = user
      ? post.likes?.some(
          (id: any) => id === user._id || id?._id === user._id || id === 'optimistic'
        )
      : false;
    if (isLiked) {
      unlikePost(postId);
    } else {
      likePost(postId);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      currentUserId={user?._id}
      onLike={handleLikeToggle}
      onBookmark={(id) => bookmarkPost(id)}
      onRepost={(id) => repostPost(id)}
      onQuote={(quoted) => navigation.navigate('CreatePost', { quotedPost: quoted })}
      onComment={(id) => navigation.navigate('PostDetail', { postId: id })}
      onPressPost={(id) => navigation.navigate('PostDetail', { postId: id })}
      onPressAuthor={(authorId) => navigation.navigate('UserProfile', { userId: authorId })}
      onPin={(id) => pinPost(id)}
      onDelete={(id) => deletePost(id)}
    />
  );

  return (
    <View style={styles.container}>
      <Header title="Bookmarks" onBack={() => navigation.goBack()} />

      {isLoading && posts.length === 0 ? (
        <PostFeedSkeleton count={3} />
      ) : posts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="bookmark-outline" size={48} color={colors.fgMuted} />
          <Text style={styles.emptyTitle}>Save posts for later</Text>
          <Text style={styles.emptySubtitle}>
            When you bookmark posts, they will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={<ScreenIntro label="Saved posts" title="Worth keeping." description="The things you want to come back to." />}
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderPost}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: colors.fg,
    fontSize: metrics.title,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    color: colors.fgMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  listContent: {
    paddingBottom: 24,
  },
});
