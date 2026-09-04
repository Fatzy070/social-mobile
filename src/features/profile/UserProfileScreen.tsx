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
import { Image } from 'expo-image';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { PostCard } from '../../components/feed/PostCard';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { darkTheme } from '../../theme/colors';
import { Post, User } from '../../types';

export const UserProfileScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user: authUser } = useAuthStore();
  const queryClient = useQueryClient();

  const userId = route.params?.userId;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
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
      <View style={styles.coverWrapper}>
        {user?.coverImage ? (
          <Image source={{ uri: user.coverImage }} style={styles.coverImage} contentFit="cover" />
        ) : (
          <View style={styles.coverPlaceholder} />
        )}
      </View>

      <View style={styles.avatarRow}>
        <View style={styles.avatarWrapper}>
          <Avatar uri={user?.avatar} name={user?.username} size={80} />
        </View>

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
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.usernameText}>{user?.username}</Text>
        <Text style={styles.handleText}>@{user?.username?.toLowerCase()}</Text>

        {user?.bio ? <Text style={styles.bioText}>{user.bio}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.following?.length || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.followers?.length || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>
      </View>

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

  return (
    <View style={styles.container}>
      <Header title={user?.username || 'Profile'} onBack={() => navigation.goBack()} />

      {userLoading && !user ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={darkTheme.accent} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUserId={authUser?._id}
              onPressPost={(id) => navigation.navigate('PostDetail', { postId: id })}
            />
          )}
          ListEmptyComponent={
            postsLoading ? (
              <ActivityIndicator size="small" color={darkTheme.accent} style={{ marginVertical: 32 }} />
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
  profileHeader: {
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.border,
  },
  coverWrapper: {
    width: '100%',
    height: 120,
    backgroundColor: darkTheme.surface,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginTop: -40,
  },
  avatarWrapper: {
    padding: 3,
    backgroundColor: darkTheme.bg,
    borderRadius: 45,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  messageBtn: {
    borderWidth: 1,
    borderColor: darkTheme.borderStrong,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  messageBtnText: {
    color: darkTheme.fg,
    fontSize: 13,
    fontWeight: '600',
  },
  followBtn: {
    backgroundColor: darkTheme.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: darkTheme.borderStrong,
  },
  followBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  followingBtnText: {
    color: darkTheme.fg,
  },
  infoSection: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  usernameText: {
    color: darkTheme.fg,
    fontSize: 20,
    fontWeight: '800',
  },
  handleText: {
    color: darkTheme.fgMuted,
    fontSize: 13,
    marginTop: 2,
  },
  bioText: {
    color: darkTheme.fg,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 14,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    gap: 5,
  },
  statNumber: {
    color: darkTheme.fg,
    fontWeight: '700',
    fontSize: 14,
  },
  statLabel: {
    color: darkTheme.fgMuted,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: darkTheme.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: darkTheme.accent,
  },
  tabText: {
    color: darkTheme.fgMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: darkTheme.fg,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: darkTheme.fgMuted,
    fontSize: 14,
  },
});
