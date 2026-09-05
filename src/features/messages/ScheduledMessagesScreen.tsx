import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { useScheduledMessages, useDeleteScheduledMessage } from './useMessages';
import { darkTheme } from '../../theme/colors';
import { CardRowSkeleton } from '../../components/common/Skeleton';
import { ScheduledMessage } from '../../types';

export const ScheduledMessagesScreen = () => {
  const navigation = useNavigation<any>();
  const { data: scheduledMessages = [], isLoading, isRefetching, refetch } = useScheduledMessages();
  const deleteScheduledMutation = useDeleteScheduledMessage();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isInitialLoading = isLoading && scheduledMessages.length === 0;

  const handleDelete = (item: ScheduledMessage) => {
    Alert.alert(
      'Cancel Scheduled Message',
      'Are you sure you want to cancel and delete this scheduled message? It will not be sent.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel & Delete',
          style: 'destructive',
          onPress: () => {
            setDeletingId(item._id);
            deleteScheduledMutation.mutate(item._id, {
              onSettled: () => {
                setDeletingId(null);
              },
            });
          },
        },
      ]
    );
  };

  const handleOpenChat = (item: ScheduledMessage) => {
    const conv = item.conversationId;
    if (!conv || !conv._id) return;

    const isGroup = conv.isGroup;
    const otherUser = !isGroup && conv.members ? conv.members[0] : null;
    const title = isGroup ? conv.groupName || 'Group Chat' : otherUser?.username || 'Chat';

    navigation.navigate('Chat', {
      conversationId: conv._id,
      title,
    });
  };

  const renderItem = ({ item }: { item: ScheduledMessage }) => {
    const conv = item.conversationId;
    const isGroup = conv?.isGroup;
    const otherUser = !isGroup && conv?.members ? conv.members.find((m) => m._id !== item.sender) || conv.members[0] : null;

    const targetTitle = isGroup ? conv?.groupName || 'Group Chat' : otherUser?.username ? `@${otherUser.username}` : 'Direct Message';
    const targetAvatar = isGroup ? conv?.groupAvatar : otherUser?.avatar;

    const scheduledDate = item.scheduledFor ? new Date(item.scheduledFor) : null;
    const formattedDate = scheduledDate && !isNaN(scheduledDate.getTime())
      ? format(scheduledDate, 'MMM d, yyyy • h:mm a')
      : 'Scheduled';

    const isDeleting = deletingId === item._id || (deleteScheduledMutation.isPending && deleteScheduledMutation.variables === item._id);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.targetInfo}
            onPress={() => handleOpenChat(item)}
          >
            <Avatar uri={targetAvatar} name={targetTitle} size={36} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.targetName} numberOfLines={1}>
                {isGroup ? targetTitle : otherUser?.username || 'User'}
              </Text>
              <View style={styles.timeBadge}>
                <Ionicons name="time-outline" size={12} color={darkTheme.bookmark} />
                <Text style={styles.timeText}>{formattedDate}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            disabled={isDeleting}
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={darkTheme.error} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={darkTheme.error} />
            )}
          </TouchableOpacity>
        </View>

        {/* Message Content Bubble */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleOpenChat(item)}
          style={styles.messageBox}
        >
          <Text style={styles.messageText}>{item.text}</Text>
        </TouchableOpacity>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Pending</Text>
          </View>

          <TouchableOpacity
            style={styles.openChatBtn}
            onPress={() => handleOpenChat(item)}
          >
            <Text style={styles.openChatText}>Open Chat</Text>
            <Ionicons name="chevron-forward" size={14} color={darkTheme.accent} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Scheduled Messages"
        onBack={() => navigation.goBack()}
      />

      {isInitialLoading ? (
        <CardRowSkeleton count={3} />
      ) : scheduledMessages.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="time-outline" size={36} color={darkTheme.accent} />
          </View>
          <Text style={styles.emptyTitle}>No Scheduled Messages</Text>
          <Text style={styles.emptySubtitle}>
            You don't have any messages waiting to be sent.{'\n'}In any chat, tap the + button and select "Schedule" to create one.
          </Text>
        </View>
      ) : (
        <FlatList
          data={scheduledMessages}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: darkTheme.fg,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: darkTheme.fgMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: darkTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkTheme.border,
    padding: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetName: {
    color: darkTheme.fg,
    fontSize: 15,
    fontWeight: '700',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    color: darkTheme.bookmark,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  messageBox: {
    backgroundColor: darkTheme.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkTheme.border,
    padding: 12,
  },
  messageText: {
    color: darkTheme.fg,
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: darkTheme.bookmark,
  },
  statusText: {
    color: darkTheme.bookmark,
    fontSize: 11,
    fontWeight: '600',
  },
  openChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openChatText: {
    color: darkTheme.accent,
    fontSize: 12,
    fontWeight: '600',
  },
});
