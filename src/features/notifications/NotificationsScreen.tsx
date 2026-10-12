import { ScreenIntro } from '../../components/common/ScreenIntro';
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { NotificationListSkeleton } from '../../components/common/Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';
import { NotificationItem } from '../../types';

export const NotificationsScreen = () => {
  const { colors, styles } = useThemedStyles(createStyles);
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: async () => {
      const { data } = await apiClient.get('/notification/all');
      return {
        notifications: (data.notifications || []) as NotificationItem[],
        unreadCount: data.unreadCount || 0,
      };
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notification/read/all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  const notifications = data?.notifications || [];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Ionicons name="heart" size={18} color={colors.like} />;
      case 'comment':
        return <Ionicons name="chatbubble" size={18} color={colors.accentText} />;
      case 'follow':
        return <Ionicons name="person-add" size={18} color={colors.success} />;
      case 'bookmark':
        return <Ionicons name="bookmark" size={18} color={colors.bookmark} />;
      case 'repost':
        return <Ionicons name="repeat" size={18} color={colors.success} />;
      case 'quote':
        return <Ionicons name="create" size={18} color={colors.accentHover} />;
      case 'mention':
        return <Ionicons name="at" size={18} color={colors.accentText} />;
      default:
        return <Ionicons name="notifications" size={18} color={colors.accentText} />;
    }
  };

  const getNotificationText = (item: NotificationItem) => {
    const name = item.sender?.username || 'Someone';
    switch (item.type) {
      case 'like':
        return `${name} liked your post`;
      case 'comment':
        return `${name} commented on your post`;
      case 'follow':
        return `${name} started following you`;
      case 'bookmark':
        return `${name} bookmarked your post`;
      case 'repost':
        return `${name} reposted your post`;
      case 'quote':
        return `${name} quoted your post`;
      case 'mention':
        return `${name} mentioned you`;
      default:
        return `${name} interacted with your account`;
    }
  };

  const handleNotificationPress = (item: NotificationItem) => {
    if (item.post) {
      const postId = typeof item.post === 'object' ? item.post._id : item.post;
      navigation.navigate('PostDetail', { postId });
    } else if (item.conversationId) {
      navigation.navigate('Chat', { conversationId: item.conversationId });
    } else if (item.sender?._id) {
      navigation.navigate('UserProfile', { userId: item.sender._id });
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const timeAgo = item.createdAt
      ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
      : '';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleNotificationPress(item)}
        style={[styles.notifRow, !item.isRead && styles.notifUnread]}
      >
        <View style={{ position: 'relative' }}>
          <Avatar uri={item.sender?.avatar} name={item.sender?.username} size={48} />
          <View style={{ position: 'absolute', right: -5, bottom: -5, padding: 3, borderRadius: 12, backgroundColor: colors.surface }}>{getNotificationIcon(item.type)}</View>
        </View>

        <View style={styles.notifContent}>
          <Text style={styles.notifMessage}>{getNotificationText(item)}</Text>
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Activity"
        rightAction={
          notifications.some((n) => !n.isRead) ? (
            <TouchableOpacity
              onPress={() => markAllMutation.mutate()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {isLoading && notifications.length === 0 ? (
        <NotificationListSkeleton count={7} />
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="notifications-outline" size={48} color={colors.fgMuted} />
          <Text style={styles.emptyTitle}>All Caught Up</Text>
          <Text style={styles.emptySubtitle}>No notifications to show right now.</Text>
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={<ScreenIntro label="Your connections" title="Around you." description="The replies, mentions, and moments you’re part of." />}
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
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
  markAllText: {
    color: colors.accentText,
    fontSize: 14,
    fontWeight: '600',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: metrics.gutter,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  notifUnread: {
    backgroundColor: colors.accentMuted,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    color: colors.fg,
    fontSize: 14,
    lineHeight: 22,
  },
  timeText: {
    color: colors.fgMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
