import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';
import { useAuthStore } from '../../store/authStore';
import { UserListSkeleton } from '../../components/common/Skeleton';
import { User } from '../../types';

interface FollowListRouteParams {
  userId: string;
  initialTab?: 'followers' | 'following';
  username?: string;
}

export const FollowListScreen = () => {
  const { colors, styles } = useThemedStyles(createStyles);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { user: authUser, updateUser } = useAuthStore();

  const { userId, initialTab = 'followers', username } = (route.params || {}) as FollowListRouteParams;
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);

  // Fetch target user profile if username wasn't passed or for latest user info
  const { data: profileUser } = useQuery({
    queryKey: queryKeys.user.profile(userId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/auth/users/${userId}/profile`);
      return data.user as User;
    },
    enabled: !!userId,
  });

  const displayName = username || profileUser?.username || 'User';

  // Fetch followers
  const {
    data: followers = [],
    isLoading: loadingFollowers,
    isRefetching: refetchingFollowers,
    refetch: refetchFollowers,
  } = useQuery({
    queryKey: queryKeys.user.followers(userId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/auth/users/${userId}/followers`);
      return (data.followers || []) as User[];
    },
    enabled: !!userId,
  });

  // Fetch following
  const {
    data: following = [],
    isLoading: loadingFollowing,
    isRefetching: refetchingFollowing,
    refetch: refetchFollowing,
  } = useQuery({
    queryKey: queryKeys.user.following(userId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/auth/users/${userId}/following`);
      return (data.following || []) as User[];
    },
    enabled: !!userId,
  });

  const isLoading = activeTab === 'followers' ? loadingFollowers : loadingFollowing;
  const isRefetching = activeTab === 'followers' ? refetchingFollowers : refetchingFollowing;
  const users = activeTab === 'followers' ? followers : following;

  const onRefresh = () => {
    if (activeTab === 'followers') {
      refetchFollowers();
    } else {
      refetchFollowing();
    }
  };

  // Follow / Unfollow mutation with optimistic cache updates
  const followMutation = useMutation({
    mutationFn: async ({ targetUserId, currentlyFollowing }: { targetUserId: string; currentlyFollowing: boolean }) => {
      if (currentlyFollowing) {
        await apiClient.post(`/auth/users/${targetUserId}/unfollow`);
      } else {
        await apiClient.post(`/auth/users/${targetUserId}/follow`);
      }
      return { targetUserId, currentlyFollowing };
    },
    onMutate: async ({ targetUserId, currentlyFollowing }) => {
      // Optimistic update for authUser
      if (authUser) {
        const currentFollowing = authUser.following || [];
        const nextFollowing = currentlyFollowing
          ? currentFollowing.filter((id) => id !== targetUserId)
          : [...currentFollowing, targetUserId];
        updateUser({ following: nextFollowing });
      }

      // Optimistic update for target user profile if cached
      queryClient.setQueryData(queryKeys.user.profile(targetUserId), (oldUser: User | undefined) => {
        if (!oldUser || !authUser) return oldUser;
        const oldFollowers = oldUser.followers || [];
        const nextFollowers = currentlyFollowing
          ? oldFollowers.filter((id) => id !== authUser._id)
          : [...oldFollowers, authUser._id];
        return { ...oldUser, followers: nextFollowers };
      });
    },
    onSuccess: (_, { targetUserId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(targetUserId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(authUser?._id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.followers(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.following(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.followers(targetUserId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.following(targetUserId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.suggested });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.following });
    },
  });

  const isUserFollowed = (targetUserId: string, targetUser?: User) => {
    if (!authUser) return false;
    if (authUser.following?.includes(targetUserId)) return true;
    if (targetUser?.followers?.includes(authUser._id)) return true;
    return false;
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelf = authUser && item._id === authUser._id;
    const isFollowed = isUserFollowed(item._id, item);
    const isPendingThisUser =
      followMutation.isPending && followMutation.variables?.targetUserId === item._id;

    return (
      <TouchableOpacity
        style={styles.userRow}
        activeOpacity={0.7}
        onPress={() => {
          if (isSelf) {
            navigation.navigate('MainTabs', { screen: 'ProfileTab' });
          } else {
            navigation.navigate('UserProfile', { userId: item._id });
          }
        }}
      >
        <Avatar uri={item.avatar} name={item.username} size={46} />

        <View style={styles.userInfo}>
          <Text style={styles.username} numberOfLines={1}>
            {item.username}
          </Text>
          <Text style={styles.handle} numberOfLines={1}>
            @{item.username?.toLowerCase()}
          </Text>
          {item.bio ? (
            <Text style={styles.bio} numberOfLines={1}>
              {item.bio}
            </Text>
          ) : null}
        </View>

        {!isSelf && authUser && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              isFollowed ? styles.followingButton : styles.followButton,
            ]}
            disabled={isPendingThisUser}
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              followMutation.mutate({
                targetUserId: item._id,
                currentlyFollowing: isFollowed,
              });
            }}
          >
            {isPendingThisUser ? (
              <ActivityIndicator
                size="small"
                color={isFollowed ? colors.fg : '#ffffff'}
              />
            ) : (
              <Text
                style={[
                  styles.actionButtonText,
                  isFollowed ? styles.followingButtonText : styles.followButtonText,
                ]}
              >
                {isFollowed ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title={displayName}
        subtitle={`@${displayName.toLowerCase()}`}
        onBack={() => navigation.goBack()}
      />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'followers' && styles.tabButtonActive]}
          onPress={() => setActiveTab('followers')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'followers' && styles.tabTextActive,
            ]}
          >
            Followers
          </Text>
          {activeTab === 'followers' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'following' && styles.tabButtonActive]}
          onPress={() => setActiveTab('following')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'following' && styles.tabTextActive,
            ]}
          >
            Following
          </Text>
          {activeTab === 'following' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading && users.length === 0 ? (
        <UserListSkeleton count={7} />
      ) : users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name={activeTab === 'followers' ? 'people-outline' : 'person-add-outline'}
              size={36}
              color={colors.fgMuted}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'followers'
              ? 'No followers yet'
              : 'Not following anyone yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'followers'
              ? `${displayName} doesn't have any followers yet.`
              : `${displayName} isn't following anyone yet.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderUserItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonActive: {},
  tabText: {
    color: colors.fgMuted,
    fontSize: metrics.body,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.fg,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: 60,
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  listContent: {
    paddingBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: metrics.gutter,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
    justifyContent: 'center',
  },
  username: {
    color: colors.fg,
    fontSize: metrics.body,
    fontWeight: '700',
  },
  handle: {
    color: colors.fgMuted,
    fontSize: 13,
    marginTop: 1,
  },
  bio: {
    color: colors.fgMuted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  actionButton: {
    paddingHorizontal: metrics.gutter,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButton: {
    backgroundColor: colors.accent,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  followButtonText: {
    color: '#ffffff',
  },
  followingButtonText: {
    color: colors.fg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: colors.fg,
    fontSize: metrics.title,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.fgMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
