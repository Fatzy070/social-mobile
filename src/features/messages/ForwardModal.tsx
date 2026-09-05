import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/common/Avatar';
import { useConversations } from './useMessages';
import { darkTheme } from '../../theme/colors';
import { Conversation, Message } from '../../types';

interface ForwardModalProps {
  visible: boolean;
  onClose: () => void;
  message: Message | null;
  currentUserId: string;
  onConfirmForward: (targetConversationIds: string[]) => void;
  isForwarding: boolean;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  visible,
  onClose,
  message,
  currentUserId,
  onConfirmForward,
  isForwarding,
}) => {
  const [search, setSearch] = useState('');
  const [selectedConvIds, setSelectedConvIds] = useState<string[]>([]);
  const { data, isLoading } = useConversations();
  const conversations = data?.conversations || [];

  if (!visible || !message) return null;

  const filteredConversations = conversations.filter((c: Conversation) => {
    if (c.isGroup) {
      return c.groupName?.toLowerCase().includes(search.toLowerCase());
    }
    const otherUser = c.members?.find((m) => m._id !== currentUserId);
    return otherUser?.username?.toLowerCase().includes(search.toLowerCase());
  });

  const toggleSelect = (convId: string) => {
    setSelectedConvIds((prev) =>
      prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId]
    );
  };

  const handleSend = () => {
    if (selectedConvIds.length === 0) return;
    onConfirmForward(selectedConvIds);
    setSelectedConvIds([]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Forward Message</Text>
              <Text style={styles.subtitle}>Select chats to send to</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={darkTheme.fgMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={darkTheme.fgMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              placeholderTextColor={darkTheme.fgMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={darkTheme.accent} />
            </View>
          ) : (
            <FlatList
              data={filteredConversations}
              keyExtractor={(item) => item._id}
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = selectedConvIds.includes(item._id);
                const other = item.isGroup
                  ? null
                  : item.members?.find((m) => m._id !== currentUserId);
                const chatTitle = item.isGroup
                  ? item.groupName || 'Group Chat'
                  : other?.username || 'User';
                const avatarUri = item.isGroup ? item.groupAvatar : other?.avatar;

                return (
                  <TouchableOpacity
                    style={styles.convItem}
                    onPress={() => toggleSelect(item._id)}
                  >
                    <Avatar uri={avatarUri} name={chatTitle} size={38} />
                    <View style={styles.convInfo}>
                      <Text style={styles.convTitle} numberOfLines={1}>
                        {chatTitle}
                      </Text>
                      <Text style={styles.convSubtitle} numberOfLines={1}>
                        {item.isGroup ? `${item.members.length} members` : `@${other?.username}`}
                      </Text>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.centerContainer}>
                  <Text style={styles.emptyText}>No chats found</Text>
                </View>
              }
            />
          )}

          <TouchableOpacity
            disabled={selectedConvIds.length === 0 || isForwarding}
            onPress={handleSend}
            style={[
              styles.sendBtn,
              (selectedConvIds.length === 0 || isForwarding) && styles.sendBtnDisabled,
            ]}
          >
            {isForwarding ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <View style={styles.sendBtnContent}>
                <Ionicons name="send" size={16} color="#ffffff" />
                <Text style={styles.sendBtnText}>
                  Send to {selectedConvIds.length} {selectedConvIds.length === 1 ? 'chat' : 'chats'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: darkTheme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 32,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: darkTheme.border,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: darkTheme.borderStrong,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.border,
  },
  title: {
    color: darkTheme.fg,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: darkTheme.fgMuted,
    fontSize: 12,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: darkTheme.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: darkTheme.fg,
    fontSize: 14,
    padding: 0,
  },
  list: {
    maxHeight: 320,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.border,
  },
  convInfo: {
    flex: 1,
  },
  convTitle: {
    color: darkTheme.fg,
    fontSize: 14,
    fontWeight: '600',
  },
  convSubtitle: {
    color: darkTheme.fgMuted,
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: darkTheme.fgMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: darkTheme.accent,
    borderColor: darkTheme.accent,
  },
  centerContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: darkTheme.fgMuted,
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: darkTheme.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
