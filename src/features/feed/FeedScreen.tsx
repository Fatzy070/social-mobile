import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/common/Header';
import { PostCard } from '../../components/feed/PostCard';
import { useFeed, usePostMutations } from './useFeed';
import { useAuthStore } from '../../store/authStore';
import { darkTheme } from '../../theme/colors';
import { Post } from '../../types';

export const FeedScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);

  const { data, isLoading, isRefetching, refetch } = useFeed(page);
  const { likePost, unlikePost, bookmarkPost, repostPost } = usePostMutations();

  const posts = data?.posts || [];

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
      <Header
        title="Nexus"
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Bookmarks')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="bookmark-outline" size={22} color={darkTheme.fg} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('CreatePost')}
              style={styles.createBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        }
      />

      {isLoading && posts.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={darkTheme.accent} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="newspaper-outline" size={48} color={darkTheme.fgMuted} />
          <Text style={styles.emptyTitle}>No Posts Yet</Text>
          <Text style={styles.emptySubtitle}>Follow other users or create your first post!</Text>
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
  createBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: darkTheme.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
});
