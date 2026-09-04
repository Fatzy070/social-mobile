import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { useAuthStore } from '../../store/authStore';
import { darkTheme } from '../../theme/colors';
import { Conversation } from '../../types';

export const GroupDetailsScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const conversationId = route.params?.conversationId;

  const { data: conversation, isLoading } = useQuery({
    queryKey: queryKeys.messages.conversation(conversationId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/messages/conversation/${conversationId}`);
      return data as Conversation;
    },
    enabled: !!conversationId,
  });

  const isAdmin = conversation?.groupAdmin === user?._id;
  const isAdminOnly = conversation?.messagingMode === 'ADMINS_ONLY';

  const updateModeMutation = useMutation({
    mutationFn: async (mode: 'ALL_MEMBERS' | 'ADMINS_ONLY') => {
      await apiClient.put(`/messages/group/${conversationId}/messaging-mode`, {
        messagingMode: mode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(conversationId) });
    },
    onError: (err: any) => {
      Alert.alert('Update failed', err.response?.data?.message || 'Failed to update group mode');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiClient.delete(`/messages/group/${conversationId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(conversationId) });
    },
    onError: (err: any) => {
      Alert.alert('Remove failed', err.response?.data?.message || 'Failed to remove member');
    },
  });

  const handleRemoveMember = (member: any) => {
    if (!isAdmin) return;
    Alert.alert('Remove Member', `Remove @${member.username} from group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeMemberMutation.mutate(member._id),
      },
    ]);
  };

  const renderHeader = () => (
    <View style={styles.headerInfo}>
      <Avatar
        uri={conversation?.groupAvatar}
        name={conversation?.groupName || 'Group'}
        size={84}
      />
      <Text style={styles.groupName}>{conversation?.groupName || 'Group Chat'}</Text>
      <Text style={styles.memberCount}>
        {conversation?.members?.length || 0} members
      </Text>

      {/* Admin Mode Toggle */}
      {isAdmin && (
        <View style={styles.adminControlBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.adminControlTitle}>Only Admins Can Send</Text>
            <Text style={styles.adminControlSub}>Non-admins can only read messages</Text>
          </View>
          <Switch
            value={isAdminOnly}
            onValueChange={(val) =>
              updateModeMutation.mutate(val ? 'ADMINS_ONLY' : 'ALL_MEMBERS')
            }
            trackColor={{ false: darkTheme.surface, true: darkTheme.accent }}
            thumbColor="#ffffff"
          />
        </View>
      )}

      <Text style={styles.membersSectionTitle}>Members</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Group Details" onBack={() => navigation.goBack()} />

      {isLoading && !conversation ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={darkTheme.accent} />
        </View>
      ) : (
        <FlatList
          data={conversation?.members || []}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <Avatar uri={item.avatar} name={item.username} size={42} />
              <View style={styles.memberTextContainer}>
                <Text style={styles.memberUsername}>{item.username}</Text>
                {conversation?.groupAdmin === item._id && (
                  <Text style={styles.adminBadge}>Group Admin</Text>
                )}
              </View>

              {isAdmin && item._id !== user?._id && (
                <TouchableOpacity
                  onPress={() => handleRemoveMember(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="remove-circle-outline" size={22} color={darkTheme.error} />
                </TouchableOpacity>
              )}
            </View>
          )}
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
  headerInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.border,
  },
  groupName: {
    color: darkTheme.fg,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  memberCount: {
    color: darkTheme.fgMuted,
    fontSize: 13,
    marginTop: 4,
  },
  adminControlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: darkTheme.border,
  },
  adminControlTitle: {
    color: darkTheme.fg,
    fontSize: 14,
    fontWeight: '700',
  },
  adminControlSub: {
    color: darkTheme.fgMuted,
    fontSize: 12,
    marginTop: 2,
  },
  membersSectionTitle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 24,
    color: darkTheme.fgMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.border,
    gap: 12,
  },
  memberTextContainer: {
    flex: 1,
  },
  memberUsername: {
    color: darkTheme.fg,
    fontSize: 15,
    fontWeight: '600',
  },
  adminBadge: {
    color: darkTheme.accent,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
