import { ProfileIdentity } from '../../components/profile/ProfileIdentity';
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/common/Header';
import { PostCard } from '../../components/feed/PostCard';
import { useAuthStore } from '../../store/authStore';
import { usePostMutations } from '../feed/useFeed';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';
import { ProfileHeaderSkeleton, PostFeedSkeleton } from '../../components/common/Skeleton';
import { Post, User } from '../../types';

export const UserProfileScreen = () => {
  const { colors, styles } = useThemedStyles(createStyles);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user: authUser } = useAuthStore();
  const queryClient = useQueryClient();

  const userId = route.params?.userId;
  const isOwnProfile = !userId || (authUser && (userId === authUser._id || userId === (authUser as any).id));
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'reposts'>('posts');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: queryKeys.user.profile(userId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/auth/users/${userId}/profile`);
      return data.user as User;
    },
    enabled: !!userId,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey:
      activeTab === 'posts'
        ? queryKeys.posts.userPosts(userId)
        : activeTab === 'replies'
        ? queryKeys.posts.userReplies(userId)
        : queryKeys.posts.userReposts(userId),
    queryFn: async () => {
      const endpoint =
        activeTab === 'posts'
          ? `/posts/${userId}/posts`
          : activeTab === 'replies'
          ? `/posts/${userId}/replies`
          : `/posts/${userId}/reposts`;
      const { data } = await apiClient.get(endpoint);
      return (data.posts || []) as Post[];
    },
    enabled: !!userId,
  });

  const isFollowing = authUser && user?.followers?.includes(authUser._id);

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await apiClient.post(`/auth/users/${userId}/unfollow`);
      } else {
        await apiClient.post(`/auth/users/${userId}/follow`);
      }
    },
    onMutate: async () => {
      if (authUser) {
        const currentFollowing = authUser.following || [];
        const nextFollowing = isFollowing
          ? currentFollowing.filter((id) => id !== userId)
          : [...currentFollowing, userId];
        useAuthStore.getState().updateUser({ following: nextFollowing });
      }

      queryClient.setQueryData(queryKeys.user.profile(userId), (oldUser: User | undefined) => {
        if (!oldUser || !authUser) return oldUser;
        const oldFollowers = oldUser.followers || [];
        const nextFollowers = isFollowing
          ? oldFollowers.filter((id) => id !== authUser._id)
          : [...oldFollowers, authUser._id];
        return { ...oldUser, followers: nextFollowers };
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(authUser?._id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.followers(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.following(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.followers(authUser?._id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.following(authUser?._id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.suggested });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.following });
    },
  });

  const handleMessagePress = async () => {
    try {
      const { data } = await apiClient.post(`/messages/conversation/${userId}`);
      navigation.navigate('Chat', {
        conversationId: data.conversation?._id || data._id,
        title: user?.username,
      });
    } catch (err: any) {
      Alert.alert(
        'Cannot message user',
        err.response?.data?.message || 'Direct messages to this user are restricted.'
      );
    }
  };

  const renderHeader = () => (
    <View style={styles.profileHeader}>
      <ProfileIdentity username={user?.username} avatar={user?.avatar} cover={user?.coverImage} bio={user?.bio}
        actions={<>        {isOwnProfile ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.editBtn}
          >
            <Text style={styles.editBtnText}>Edit profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={handleMessagePress} style={styles.messageBtn}>
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => followMutation.mutate()}
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
        )}</>}
        relationships={<>        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('FollowList', {
                userId,
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
                userId,
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
  const pinnedPostId = user?.pinnedPost?._id || user?.pinnedPost;

  const handleLikeToggle = (postId: string) => {
    const post = posts.find((p) => p._id === postId);
    if (!post) return;
    const isLiked = authUser ? post.likes.includes(authUser._id) : false;
    if (isLiked) {
      unlikePost(postId);
    } else {
      likePost(postId);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={user?.username || 'Profile'}
        onBack={() => navigation.goBack()}
        rightAction={
          isOwnProfile ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={22} color={colors.fg} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {userLoading && !user ? (
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
                onPressAuthor={(authorId) => {
                  if (authorId !== userId) {
                    navigation.navigate('UserProfile', { userId: authorId });
                  }
                }}
                onPin={isOwnProfile ? (id) => pinPost(id) : undefined}
                onUnpin={isOwnProfile ? () => unpinPost() : undefined}
                onDelete={isOwnProfile ? (id) => deletePost(id) : undefined}
              />
            );
          }}
          ListEmptyComponent={
            postsLoading ? (
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
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  messageBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flex: 1,
    alignItems: 'center',
  },
  messageBtnText: {
    color: colors.fg,
    fontSize: 13,
    fontWeight: '600',
  },
  followBtn: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: metrics.gutter,
    paddingVertical: 13,
    flex: 1,
    alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  followBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  followingBtnText: {
    color: colors.fg,
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
