import { ScreenIntro } from '../../components/common/ScreenIntro';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { PostCard } from '../../components/feed/PostCard';
import { UserListSkeleton, PostFeedSkeleton } from '../../components/common/Skeleton';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { usePostMutations } from './useFeed';
import { User, Post } from '../../types';

export const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const {
    likePost,
    unlikePost,
    bookmarkPost,
    repostPost,
    pinPost,
    unpinPost,
    deletePost,
  } = usePostMutations();

  // 350ms Debounce to prevent wasteful requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Suggested users query (when query is empty)
  const { data: suggestedUsers = [], isLoading: suggestedUsersLoading } = useQuery({
    queryKey: queryKeys.user.suggested,
    queryFn: async () => {
      const { data } = await apiClient.get('/auth/suggested/users');
      return (data.users || []) as User[];
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !debouncedQuery,
  });

  // Suggested discovery posts (when query is empty) - fetches 1-5 real posts from feed
  const { data: discoveryPosts = [], isLoading: discoveryPostsLoading } = useQuery({
    queryKey: queryKeys.posts.suggested,
    queryFn: async () => {
      const { data } = await apiClient.get('/posts/feed?page=1&limit=5');
      const allPosts = (data.posts || []) as Post[];
      return allPosts.slice(0, 5);
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !debouncedQuery,
  });

  // Search query (when query is non-empty)
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: queryKeys.user.search(debouncedQuery),
    queryFn: async () => {
      const { data } = await apiClient.get(`/auth/search?q=${encodeURIComponent(debouncedQuery)}`);
      return (data.users || []) as User[];
    },
    enabled: !!debouncedQuery,
  });

  const handleLikeToggle = (postId: string) => {
    const post = discoveryPosts.find((p) => p._id === postId);
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

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => navigation.navigate('UserProfile', { userId: item._id })}
      style={[
        styles.userRow,
        {
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Avatar uri={item.avatar} name={item.username} size={46} />
      <View style={styles.userInfo}>
        <Text style={[styles.username, { color: colors.fg }]}>{item.username}</Text>
        <Text style={[styles.handle, { color: colors.fgMuted }]}>@{item.username.toLowerCase()}</Text>
        {item.bio ? (
          <Text style={[styles.bio, { color: colors.fgMuted }]} numberOfLines={3}>
            {item.bio}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.fgMuted} />
    </TouchableOpacity>
  );

  const renderSuggestedUserHorizontal = (item: User) => (
    <TouchableOpacity
      key={item._id}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('UserProfile', { userId: item._id })}
      style={[
        styles.suggestedUserCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Avatar uri={item.avatar} name={item.username} size={50} />
      <Text style={[styles.cardUsername, { color: colors.fg }]} numberOfLines={1}>
        {item.username}
      </Text>
      <Text style={[styles.cardHandle, { color: colors.fgMuted }]} numberOfLines={1}>
        @{item.username.toLowerCase()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header title="Explore" />

      {/* Search Input Bar */}
      <View style={[styles.searchBarWrapper, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={18} color={colors.fgMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.fg }]}
            placeholder="Find people by name or bio"
            placeholderTextColor={colors.fgSubtle}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.fgMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Active Search Mode: Show results */}
      {debouncedQuery ? (
        <View style={{ flex: 1 }}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.sectionHeader, { color: colors.fgMuted }]}>
              Search results for "{debouncedQuery}"
            </Text>
            {!searchLoading && (
              <Text style={[styles.resultsCount, { color: colors.fgSubtle }]}>
                {searchResults.length} found
              </Text>
            )}
          </View>

          {searchLoading ? (
            <UserListSkeleton count={6} />
          ) : searchResults.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="search-outline" size={44} color={colors.fgMuted} />
              <Text style={[styles.emptyTitle, { color: colors.fg }]}>No accounts found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.fgMuted }]}>
                We couldn't find anyone matching "{debouncedQuery}". Try another term.
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item._id}
              renderItem={renderUserItem}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      ) : (
        /* Discovery Mode: Suggested Accounts + Discovery Content */
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.discoveryScrollContent}
        >
          <ScreenIntro label="A wider circle" title="Find your people." description="A familiar interest. A different perspective." />
          {/* People You May Know Horizontal Carousel */}
          {suggestedUsers.length > 0 && (
            <View style={styles.suggestedSection}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionTitleLeft}>
                  <Ionicons name="people" size={17} color={colors.accentText} />
                  <Text style={[styles.sectionTitleText, { color: colors.fg }]}>
                    Who to follow
                  </Text>
                </View>
                <Text style={[styles.sectionSubtitleText, { color: colors.fgSubtle }]}>
                  People you may know
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalUsersList}
              >
                {suggestedUsers.slice(0, 10).map(renderSuggestedUserHorizontal)}
              </ScrollView>
            </View>
          )}

          {/* Discovery Content (1-5 real posts) */}
          <View style={styles.discoverySection}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleLeft}>
                <Ionicons name="sparkles" size={17} color={colors.accentText} />
                <Text style={[styles.sectionTitleText, { color: colors.fg }]}>
                  Discover something new
                </Text>
              </View>
              <Text style={[styles.sectionSubtitleText, { color: colors.fgSubtle }]}>
                From the community
              </Text>
            </View>

            {discoveryPostsLoading && discoveryPosts.length === 0 ? (
              <PostFeedSkeleton count={2} />
            ) : discoveryPosts.length === 0 ? (
              <View style={[styles.emptyDiscoveryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="newspaper-outline" size={32} color={colors.fgMuted} />
                <Text style={[styles.emptyDiscoveryText, { color: colors.fgMuted }]}>
                  Check back soon for new recommended posts!
                </Text>
              </View>
            ) : (
              <View style={styles.postsWrapper}>
                {discoveryPosts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    currentUserId={user?._id}
                    onLike={handleLikeToggle}
                    onBookmark={(id) => bookmarkPost(id)}
                    onRepost={(id) => repostPost(id)}
                    onQuote={(quoted) => navigation.navigate('CreatePost', { quotedPost: quoted })}
                    onComment={(id) => navigation.navigate('PostDetail', { postId: id })}
                    onPressPost={(id) => navigation.navigate('PostDetail', { postId: id })}
                    onPressAuthor={(authorId) => navigation.navigate('UserProfile', { userId: authorId })}
                    onPin={(id) => pinPost(id)}
                    onUnpin={() => unpinPost()}
                    onDelete={(id) => deletePost(id)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '500',
    paddingTop: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  discoveryScrollContent: {
    paddingBottom: 36,
  },
  suggestedSection: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSubtitleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  horizontalUsersList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  suggestedUserCard: {
    width: 138,
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardUsername: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  cardHandle: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  discoverySection: {
    paddingTop: 16,
  },
  postsLoadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyDiscoveryCard: {
    marginHorizontal: 16,
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyDiscoveryText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  postsWrapper: {
    marginTop: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
  },
  handle: {
    fontSize: 13,
    marginTop: 1,
  },
  bio: {
    fontSize: 12,
    marginTop: 3,
  },
});
