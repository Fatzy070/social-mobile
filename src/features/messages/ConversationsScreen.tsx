import { ScreenIntro } from '../../components/common/ScreenIntro';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { ConversationListSkeleton } from '../../components/common/Skeleton';
import { useConversations } from './useMessages';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';
import { Conversation } from '../../types';

export const ConversationsScreen = () => {
  const { colors, styles } = useThemedStyles(createStyles);
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { data, isLoading, isRefetching, refetch } = useConversations();

  const conversations = data?.conversations || [];
  const isInitialLoading = isLoading && conversations.length === 0;

  const renderItem = ({ item }: { item: Conversation }) => {
    // 1-on-1 vs Group
    const otherUser = item.isGroup
      ? null
      : item.members?.find((m) => m._id !== user?._id);

    const title = item.isGroup
      ? item.groupName || 'Group Chat'
      : otherUser?.username || 'User';

    const avatarUri = item.isGroup ? item.groupAvatar : otherUser?.avatar;

    const lastMsgText = item.lastMessage
      ? item.lastMessage.messageType === 'voice'
        ? '🎤 Voice note'
        : item.lastMessage.messageType === 'media'
        ? '📷 Photo/attachment'
        : item.lastMessage.text || 'Message'
      : 'No messages yet';

    const timeAgo = item.updatedAt
      ? formatDistanceToNow(new Date(item.updatedAt), { addSuffix: false })
      : '';

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() =>
          navigation.navigate('Chat', {
            conversationId: item._id,
            title,
          })
        }
        style={styles.convRow}
      >
        <Avatar uri={avatarUri} name={title} size={50} />

        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <Text style={styles.convTitle} numberOfLines={1}>
              {title}
            </Text>

          </View>

          <Text style={styles.convSnippet} numberOfLines={1}>
            {lastMsgText}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 8, maxWidth: 80 }}>
        {timeAgo ? <Text style={styles.convTime}>{timeAgo}</Text> : null}
        {(item.unreadCount || 0) > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Messages"
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ScheduledMessages')}
              style={styles.scheduledBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Scheduled Messages"
            >
              <Ionicons name="time-outline" size={20} color={colors.fg} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('NewChatModal')}
              style={styles.newChatBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="New Chat"
            >
              <Ionicons name="create-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        }
      />

      {isInitialLoading ? (
        <ConversationListSkeleton count={7} />
      ) : conversations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.fgMuted} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>Start a chat with someone you follow!</Text>
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={<ScreenIntro label="Messages" title="Keep talking." description="Your conversations, all together." />}
          data={conversations}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduledBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: metrics.gutter,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  convInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convTitle: {
    color: colors.fg,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  convTime: {
    color: colors.fgMuted,
    fontSize: 12,
  },
  convSnippet: {
    color: colors.fgMuted,
    fontSize: 14,
  },
  unreadBadge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
