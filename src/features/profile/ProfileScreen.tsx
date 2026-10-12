import { ProfileIdentity } from '../../components/profile/ProfileIdentity';
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../../components/common/Header';
import { PostCard } from '../../components/feed/PostCard';
import { ProfileHeaderSkeleton, PostFeedSkeleton } from '../../components/common/Skeleton';
import { useAuthStore } from '../../store/authStore';
import { usePostMutations } from '../feed/useFeed';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';
import { Post, User } from '../../types';

export const ProfileScreen = () => {
  const { colors, styles } = useThemedStyles(createStyles);
  const navigation = useNavigation<any>();
  const { user: authUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'reposts'>('posts');

  const { data: profileUser, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.user.profile(authUser?._id || ''),
    queryFn: async () => {
      const { data } = await apiClient.get(`/auth/users/${authUser?._id}/profile`);
      return data.user as User;
    },
    enabled: !!authUser?._id,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey:
      activeTab === 'posts'
        ? queryKeys.posts.userPosts(authUser?._id || '')
        : activeTab === 'replies'
        ? queryKeys.posts.userReplies(authUser?._id || '')
        : queryKeys.posts.userReposts(authUser?._id || ''),
    queryFn: async () => {
      const endpoint =
        activeTab === 'posts'
          ? `/posts/${authUser?._id}/posts`
          : activeTab === 'replies'
          ? `/posts/${authUser?._id}/replies`
          : `/posts/${authUser?._id}/reposts`;
      const { data } = await apiClient.get(endpoint);
      return (data.posts || []) as Post[];
    },
    enabled: !!authUser?._id,
  });

  const user = profileUser || authUser;

  const renderHeader = () => (
    <View style={styles.profileHeader}>
      <ProfileIdentity username={user?.username} avatar={user?.avatar} cover={user?.coverImage} bio={user?.bio}
        actions={<>        <TouchableOpacity
          onPress={() => navigation.navigate('EditProfile')}
          style={styles.editBtn}
        >
          <Text style={styles.editBtnText}>Edit profile</Text>
        </TouchableOpacity></>}
        relationships={<>        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('FollowList', {
                userId: user?._id,
                initialTab: 'following',
                username: user?.username,
              })
            }
          >
            <Text style={styles.statNumber}>{user?.following?.length || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('FollowList', {
                userId: user?._id,
                initialTab: 'followers',
                username: user?.username,
              })
            }
          >
            <Text style={styles.statNumber}>{user?.followers?.length || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
        </View></>}
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['posts', 'replies', 'reposts'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const { likePost, unlikePost, bookmarkPost, repostPost, pinPost, unpinPost, deletePost } = usePostMutations();

  const handleLikeToggle = (postId: string) => {
    const post = posts.find((p) => p._id === postId);
    if (!post) return;
    const isLiked = authUser
      ? post.likes?.some(
          (id: any) => id === authUser._id || id?._id === authUser._id || id === 'optimistic'
        )
      : false;
    if (isLiked) {
      unlikePost(postId);
    } else {
      likePost(postId);
    }
  };

  const pinnedPostId = user?.pinnedPost?._id || user?.pinnedPost;

  return (
    <View style={styles.container}>
      <Header
        title={user?.username || 'Profile'}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={22} color={colors.fg} />
          </TouchableOpacity>
        }
      />

      {profileLoading && !user ? (
        <View style={{ flex: 1 }}>
          <ProfileHeaderSkeleton />
          <PostFeedSkeleton count={3} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => {
            const isItemPinned = !!pinnedPostId && (item._id === pinnedPostId || item._id === pinnedPostId.toString());
            return (
              <PostCard
                post={item}
                currentUserId={authUser?._id}
                isPinned={isItemPinned}
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
            );
          }}
          ListEmptyComponent={
            postsLoading && posts.length === 0 ? (
              <PostFeedSkeleton count={2} />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No {activeTab} yet</Text>
              </View>
            )
          }
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
  profileHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 20,
    paddingHorizontal: metrics.gutter,
    paddingVertical: 13,
    flex: 1,
    alignItems: 'center',
  },
  editBtnText: {
    color: colors.fg,
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 14,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'column',
    gap: 5,
    flex: 1,
  },
  statNumber: {
    color: colors.fg,
    fontWeight: '700',
    fontSize: 24,
  },
  statLabel: {
    color: colors.fgMuted,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: colors.bg,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.accent,
  },
  tabText: {
    color: colors.fgMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.fg,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.fgMuted,
    fontSize: 14,
  },
});
