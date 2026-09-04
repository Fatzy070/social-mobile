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
import { usePostMutations } from './useFeed';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { darkTheme } from '../../theme/colors';
import { Post } from '../../types';

export const BookmarksScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { likePost, unlikePost, bookmarkPost, repostPost } = usePostMutations();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: queryKeys.posts.bookmarked,
    queryFn: async () => {
      const { data } = await apiClient.get('/posts/bookmarked');
      return (data.posts || []) as Post[];
    },
  });

  const posts = data || [];

  const handleLikeToggle = (postId: string) => {
    const post = posts.find((p) => p._id === postId);
    if (!post) return;
    const isLiked = user ? post.likes.includes(user._id) : false;
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
    />
  );

  return (
    <View style={styles.container}>
      <Header title="Bookmarks" onBack={() => navigation.goBack()} />

      {isLoading && posts.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={darkTheme.accent} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="bookmark-outline" size={48} color={darkTheme.fgMuted} />
          <Text style={styles.emptyTitle}>Save posts for later</Text>
          <Text style={styles.emptySubtitle}>
            When you bookmark posts, they will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderPost}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={darkTheme.accent}
              colors={[darkTheme.accent]}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: darkTheme.fg,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    color: darkTheme.fgMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  listContent: {
    paddingBottom: 24,
  },
});
