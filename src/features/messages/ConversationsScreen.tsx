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
import { useConversations } from './useMessages';
import { useAuthStore } from '../../store/authStore';
import { darkTheme } from '../../theme/colors';
import { Conversation } from '../../types';

export const ConversationsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { data, isLoading, isRefetching, refetch } = useConversations();

  const conversations = data?.conversations || [];

  const renderItem = ({ item }: { item: Conversation }) => {
    // 1-on-1 vs Group
    const otherUser = item.isGroup
      ? null
      : item.members.find((m) => m._id !== user?._id);

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
            {timeAgo ? <Text style={styles.convTime}>{timeAgo}</Text> : null}
          </View>

          <Text style={styles.convSnippet} numberOfLines={1}>
            {lastMsgText}
          </Text>
        </View>

        {(item.unreadCount || 0) > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Messages"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('NewChatModal')}
            style={styles.newChatBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={darkTheme.accent} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color={darkTheme.fgMuted} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>Start a chat with someone you follow!</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={darkTheme.accent}
              colors={[darkTheme.accent]}
            />
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
  newChatBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: darkTheme.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.border,
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
    color: darkTheme.fg,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  convTime: {
    color: darkTheme.fgMuted,
    fontSize: 12,
  },
  convSnippet: {
    color: darkTheme.fgMuted,
    fontSize: 13,
  },
  unreadBadge: {
    backgroundColor: darkTheme.accent,
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
