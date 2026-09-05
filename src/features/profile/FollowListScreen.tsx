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
import { darkTheme } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { UserListSkeleton } from '../../components/common/Skeleton';
import { User } from '../../types';

interface FollowListRouteParams {
  userId: string;
  initialTab?: 'followers' | 'following';
  username?: string;
}

export const FollowListScreen = () => {
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
                color={isFollowed ? darkTheme.fg : '#ffffff'}
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
              color={darkTheme.fgMuted}
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
              tintColor={darkTheme.accent}
              colors={[darkTheme.accent]}
            />
          }
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.border,
    backgroundColor: darkTheme.bg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonActive: {},
  tabText: {
    color: darkTheme.fgMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: darkTheme.fg,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: 60,
    backgroundColor: darkTheme.accent,
    borderRadius: 3,
  },
  listContent: {
    paddingBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.border,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
    justifyContent: 'center',
  },
  username: {
    color: darkTheme.fg,
    fontSize: 15,
    fontWeight: '700',
  },
  handle: {
    color: darkTheme.fgMuted,
    fontSize: 13,
    marginTop: 1,
  },
  bio: {
    color: darkTheme.fgMuted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButton: {
    backgroundColor: darkTheme.accent,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: darkTheme.border,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  followButtonText: {
    color: '#ffffff',
  },
  followingButtonText: {
    color: darkTheme.fg,
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
    backgroundColor: darkTheme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: darkTheme.fg,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: darkTheme.fgMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
