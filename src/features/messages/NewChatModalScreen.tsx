import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { darkTheme } from '../../theme/colors';
import { queryKeys } from '../../query/queryKeys';
import { User } from '../../types';

export const NewChatModalScreen = () => {
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // 1. Fetch search results when user types
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: queryKeys.user.search(searchTerm),
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      const { data } = await apiClient.get(`/auth/search?q=${encodeURIComponent(searchTerm.trim())}`);
      return (data.users || []) as User[];
    },
    enabled: searchTerm.trim().length > 0,
  });

  // 2. Fetch following + followers for quick list
  const { data: following = [] } = useQuery({
    queryKey: queryKeys.user.following(currentUser?._id || ''),
    queryFn: async () => {
      const { data } = await apiClient.get(`/auth/users/${currentUser?._id}/following`);
      return (data.following || []) as User[];
    },
    enabled: !!currentUser?._id,
  });

  const { data: followers = [] } = useQuery({
    queryKey: queryKeys.user.followers(currentUser?._id || ''),
    queryFn: async () => {
      const { data } = await apiClient.get(`/auth/users/${currentUser?._id}/followers`);
      return (data.followers || []) as User[];
    },
    enabled: !!currentUser?._id,
  });

  // Merge contacts
  const contactsMap = new Map<string, User>();
  [...following, ...followers].forEach((u) => {
    if (u && u._id && u._id !== currentUser?._id) {
      contactsMap.set(u._id, u);
    }
  });
  const contacts = Array.from(contactsMap.values());

  const displayedUsers = searchTerm.trim() ? searchResults : contacts;

  // Direct chat mutation
  const createChatMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data } = await apiClient.post(`/messages/conversation/${targetUserId}`);
      return data;
    },
    onSuccess: (data, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations });
      const convId = data.conversation?._id || data._id;
      const targetUser = displayedUsers.find((u) => u._id === targetUserId);
      navigation.replace('Chat', {
        conversationId: convId,
        title: targetUser?.username || 'Chat',
      });
    },
    onError: (err: any) => {
      Alert.alert(
        'Could not start chat',
        err.response?.data?.message || 'Unable to start conversation.'
      );
    },
  });

  // Group creation mutation
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/messages/group', {
        groupName: groupName.trim(),
        memberIds: selectedUserIds,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations });
      const convId = data.conversation?._id || data._id;
      navigation.replace('Chat', {
        conversationId: convId,
        title: groupName.trim(),
      });
    },
    onError: (err: any) => {
      Alert.alert('Group creation failed', err.response?.data?.message || 'Failed to create group');
    },
  });

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      Alert.alert('Group name required', 'Please enter a name for the group chat.');
      return;
    }
    if (selectedUserIds.length < 1) {
      Alert.alert('Members required', 'Please select at least 1 member to create a group.');
      return;
    }
    createGroupMutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={mode === 'direct' ? 'New Message' : 'Create Group'}
        onBack={() => navigation.goBack()}
        rightAction={
          mode === 'group' ? (
            <TouchableOpacity
              onPress={handleCreateGroup}
              disabled={createGroupMutation.isPending || !groupName.trim() || selectedUserIds.length === 0}
              style={[
                styles.headerActionBtn,
                (!groupName.trim() || selectedUserIds.length === 0) && { opacity: 0.4 },
              ]}
            >
              {createGroupMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.headerActionText}>Create</Text>
              )}
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Mode Switcher */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          onPress={() => setMode('direct')}
          style={[styles.modeTab, mode === 'direct' && styles.modeTabActive]}
        >
          <Ionicons
            name="person"
            size={16}
            color={mode === 'direct' ? darkTheme.accent : darkTheme.fgMuted}
          />
          <Text style={[styles.modeTabText, mode === 'direct' && styles.modeTabTextActive]}>
            Direct Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode('group')}
          style={[styles.modeTab, mode === 'group' && styles.modeTabActive]}
        >
          <Ionicons
            name="people"
            size={16}
            color={mode === 'group' ? darkTheme.accent : darkTheme.fgMuted}
          />
          <Text style={[styles.modeTabText, mode === 'group' && styles.modeTabTextActive]}>
            Group Chat
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'group' && (
        <View style={styles.groupInputContainer}>
          <TextInput
            style={styles.groupInput}
            placeholder="Group Name (e.g. Friends, Project...)"
            placeholderTextColor={darkTheme.fgMuted}
            value={groupName}
            onChangeText={setGroupName}
          />
          <Text style={styles.selectedCountText}>
            {selectedUserIds.length} members selected
          </Text>
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={darkTheme.fgMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people by username..."
          placeholderTextColor={darkTheme.fgMuted}
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize="none"
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={18} color={darkTheme.fgMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* User List */}
      {isSearching ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={darkTheme.accent} />
        </View>
      ) : displayedUsers.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="people-outline" size={40} color={darkTheme.fgMuted} />
          <Text style={styles.emptyText}>
            {searchTerm.trim() ? 'No users found matching query.' : 'No followers or following found.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedUsers}
          keyExtractor={(item) => item._id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = selectedUserIds.includes(item._id);

            return (
              <TouchableOpacity
                style={styles.userRow}
                onPress={() => {
                  if (mode === 'group') {
                    toggleSelectUser(item._id);
                  } else {
                    createChatMutation.mutate(item._id);
                  }
                }}
              >
                <Avatar uri={item.avatar} name={item.username} size={44} />
                <View style={styles.userRowInfo}>
                  <Text style={styles.userName}>{item.username}</Text>
                  <Text style={styles.userHandle}>@{item.username?.toLowerCase()}</Text>
                </View>

                {mode === 'group' ? (
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={darkTheme.fgMuted} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.bg,
  },
  headerActionBtn: {
    backgroundColor: darkTheme.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modeRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.border,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modeTabActive: {
    borderBottomColor: darkTheme.accent,
  },
  modeTabText: {
    color: darkTheme.fgMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: darkTheme.fg,
    fontWeight: '700',
  },
  groupInputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  groupInput: {
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: darkTheme.fg,
    fontSize: 14,
  },
  selectedCountText: {
    color: darkTheme.accent,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.surface,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkTheme.border,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: darkTheme.fg,
    fontSize: 14,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: darkTheme.fgMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.border,
  },
  userRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: darkTheme.fg,
    fontSize: 15,
    fontWeight: '700',
  },
  userHandle: {
    color: darkTheme.fgMuted,
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: darkTheme.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: darkTheme.accent,
    borderColor: darkTheme.accent,
  },
});
