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
  Modal,
  TextInput,
  Dimensions,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { VoicePlayer } from '../messages/VoicePlayer';
import { ImageViewerModal } from '../../components/common/ImageViewerModal';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { useAuthStore } from '../../store/authStore';
import { darkTheme } from '../../theme/colors';
import { Conversation, User, Message } from '../../types';

const { width } = Dimensions.get('window');

type TabType = 'media' | 'files' | 'links' | 'voice' | 'pinned' | 'members';

const DISAPPEARING_OPTIONS: Array<'off' | '24h' | '7d' | '30d'> = ['off', '24h', '7d', '30d'];

export const GroupDetailsScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const conversationId = route.params?.conversationId;
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDisappearingModalOpen, setIsDisappearingModalOpen] = useState(false);
  const [selectedAddUserIds, setSelectedAddUserIds] = useState<string[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [viewerImageIndex, setViewerImageIndex] = useState<number | null>(null);

  const { data: conversation, isLoading } = useQuery({
    queryKey: queryKeys.messages.conversation(conversationId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/messages/conversation/${conversationId}`);
      return data as Conversation;
    },
    enabled: !!conversationId,
  });

  // Fetch Media, Files, Links, Voice notes
  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['conversationMedia', conversationId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/messages/conversation/${conversationId}/media`);
      return data as {
        media: Array<{ _id: string; url: string; fileType?: string; createdAt?: string; sender?: any }>;
        files: Array<{ _id: string; url: string; fileName: string; fileSize?: number; fileType?: string }>;
        links: Array<{ _id: string; url: string; createdAt?: string; sender?: any }>;
        voice: Array<{ _id: string; audio: { url: string; duration: number }; createdAt?: string }>;
      };
    },
    enabled: !!conversationId,
  });

  // Fetch Pinned Messages
  const { data: pinnedMessages = [] } = useQuery({
    queryKey: queryKeys.messages.pinned(conversationId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/messages/pinned/${conversationId}`);
      return (data.pinnedMessages || []) as Message[];
    },
    enabled: !!conversationId,
  });

  // Fetch contacts to add to group
  const { data: following = [] } = useQuery({
    queryKey: queryKeys.user.following(user?._id || ''),
    queryFn: async () => {
      const { data } = await apiClient.get(`/auth/users/${user?._id}/following`);
      return (data.following || []) as User[];
    },
    enabled: isAddModalOpen && !!user?._id,
  });

  const { data: followers = [] } = useQuery({
    queryKey: queryKeys.user.followers(user?._id || ''),
    queryFn: async () => {
      const { data } = await apiClient.get(`/auth/users/${user?._id}/followers`);
      return (data.followers || []) as User[];
    },
    enabled: isAddModalOpen && !!user?._id,
  });

  // Filter contacts
  const existingMemberIds = new Set((conversation?.members || []).map((m: any) => m._id || m));
  const candidateContactsMap = new Map<string, User>();
  [...following, ...followers].forEach((u) => {
    if (u && u._id && !existingMemberIds.has(u._id)) {
      candidateContactsMap.set(u._id, u);
    }
  });
  const candidateContacts = Array.from(candidateContactsMap.values()).filter((u) =>
    memberSearchTerm.trim()
      ? u.username?.toLowerCase().includes(memberSearchTerm.toLowerCase())
      : true
  );

  const isGroup = conversation?.isGroup || false;
  const adminId = (
    typeof conversation?.groupAdmin === 'object' && conversation?.groupAdmin !== null
      ? conversation.groupAdmin._id
      : conversation?.groupAdmin
  )?.toString();
  const currentUserId = user?._id ? user._id.toString() : '';
  const isAdmin = isGroup && adminId === currentUserId;
  const isAdminOnly = conversation?.messagingMode === 'ADMINS_ONLY';
  const disappearingDuration = conversation?.disappearingMessages?.duration || 'off';

  // Direct 1-on-1 other user & block status
  const otherUser = !isGroup
    ? conversation?.members?.find((m) => m._id !== user?._id)
    : null;

  const isBlocked = otherUser
    ? user?.blockedUsers?.some(
        (id: any) => id === otherUser._id || id?.toString?.() === otherUser._id
      )
    : false;

  // Mutations
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

  const updateDisappearingMutation = useMutation({
    mutationFn: async (duration: 'off' | '24h' | '7d' | '30d') => {
      await apiClient.put(`/messages/conversation/${conversationId}/disappearing`, {
        duration,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(conversationId) });
      setIsDisappearingModalOpen(false);
      Alert.alert('Success', 'Disappearing messages setting updated.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update disappearing messages');
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (uri: string) => {
      const ext = uri.split('.').pop() || 'jpg';
      const formData = new FormData();
      // @ts-ignore
      formData.append('avatar', {
        uri,
        type: `image/${ext}`,
        name: `group-${Date.now()}.${ext}`,
      });
      await apiClient.put(`/messages/group/${conversationId}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations });
    },
    onError: (err: any) => {
      Alert.alert('Avatar upload failed', err.response?.data?.message || 'Failed to upload group avatar');
    },
  });

  const addMembersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      await apiClient.post(`/messages/group/${conversationId}/members`, { userIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(conversationId) });
      setIsAddModalOpen(false);
      setSelectedAddUserIds([]);
    },
    onError: (err: any) => {
      Alert.alert('Add member failed', err.response?.data?.message || 'Failed to add members');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiClient.delete(`/messages/group/${conversationId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations });
    },
    onError: (err: any) => {
      Alert.alert('Remove failed', err.response?.data?.message || 'Failed to remove member');
    },
  });

  const blockToggleMutation = useMutation({
    mutationFn: async () => {
      if (!otherUser?._id) return;
      if (isBlocked) {
        await apiClient.post(`/auth/users/${otherUser._id}/unblock`);
      } else {
        await apiClient.post(`/auth/users/${otherUser._id}/block`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      if (user) {
        const updatedBlocked = isBlocked
          ? (user.blockedUsers || []).filter((id) => id !== otherUser?._id)
          : [...(user.blockedUsers || []), otherUser!._id];
        useAuthStore.setState({ user: { ...user, blockedUsers: updatedBlocked } });
      }
    },
    onError: (err: any) => {
      Alert.alert('Action failed', err.response?.data?.message || 'Could not update block status');
    },
  });

  const handlePickAvatar = async () => {
    if (!isAdmin) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      uploadAvatarMutation.mutate(result.assets[0].uri);
    }
  };

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

  const toggleSelectCandidate = (id: string) => {
    setSelectedAddUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allMediaUrls = (mediaData?.media || []).map((m) => m.url);

  const renderHeader = () => (
    <View style={styles.headerInfo}>
      <TouchableOpacity
        activeOpacity={isAdmin ? 0.8 : 1}
        onPress={handlePickAvatar}
        style={styles.avatarWrapper}
      >
        <Avatar
          uri={isGroup ? conversation?.groupAvatar : otherUser?.avatar}
          name={isGroup ? conversation?.groupName || 'Group' : otherUser?.username}
          size={84}
        />
        {isAdmin && (
          <View style={styles.cameraIconBadge}>
            <Ionicons name="camera" size={16} color="#ffffff" />
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.groupName}>
        {isGroup ? conversation?.groupName || 'Group Chat' : otherUser?.username || 'Chat'}
      </Text>
      <Text style={styles.memberCount}>
        {isGroup
          ? `${conversation?.members?.length || 0} members`
          : `@${otherUser?.username?.toLowerCase() || ''}`}
      </Text>

      {/* Disappearing Messages Setting */}
      <TouchableOpacity
        style={styles.actionRowBox}
        onPress={() => setIsDisappearingModalOpen(true)}
      >
        <View style={styles.actionRowIcon}>
          <Ionicons name="time-outline" size={20} color={darkTheme.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionRowTitle}>Disappearing Messages</Text>
          <Text style={styles.actionRowSubtitle}>
            {disappearingDuration === 'off' ? 'Off' : `Disappear after ${disappearingDuration}`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={darkTheme.fgMuted} />
      </TouchableOpacity>

      {/* Admin Mode Toggle (For Groups) */}
      {isAdmin && (
        <View style={styles.adminControlBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.adminControlTitle}>Admin-Only Messaging</Text>
            <Text style={styles.adminControlSub}>Only admins can send messages</Text>
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

      {/* Block/Unblock Button (For 1-on-1 Chats) */}
      {!isGroup && otherUser && (
        <TouchableOpacity
          style={[styles.actionRowBox, { marginTop: 12 }]}
          onPress={() => {
            Alert.alert(
              isBlocked ? 'Unblock User' : 'Block User',
              isBlocked
                ? `Unblock @${otherUser.username}?`
                : `Block @${otherUser.username}? They won't be able to message or view your profile.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: isBlocked ? 'Unblock' : 'Block',
                  style: isBlocked ? 'default' : 'destructive',
                  onPress: () => blockToggleMutation.mutate(),
                },
              ]
            );
          }}
        >
          <View style={[styles.actionRowIcon, { backgroundColor: isBlocked ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 69, 58, 0.15)' }]}>
            <Ionicons
              name={isBlocked ? 'checkmark-circle-outline' : 'ban-outline'}
              size={20}
              color={isBlocked ? darkTheme.success : darkTheme.error}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionRowTitle, { color: isBlocked ? darkTheme.success : darkTheme.error }]}>
              {isBlocked ? 'Unblock User' : 'Block User'}
            </Text>
            <Text style={styles.actionRowSubtitle}>
              {isBlocked ? 'Allow messages and interactions' : 'Prevent direct messages'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        {([
          ...(isGroup ? [{ key: 'members', label: 'Members', icon: 'people-outline' }] : []),
          { key: 'media', label: 'Media', icon: 'image-outline' },
          { key: 'files', label: 'Files', icon: 'document-text-outline' },
          { key: 'links', label: 'Links', icon: 'link-outline' },
          // { key: 'voice', label: 'Voice', icon: 'mic-outline' },
          // { key: 'pinned', label: 'Pinned', icon: 'pin-outline' },
        ] as const).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as TabType)}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? darkTheme.accent : darkTheme.fgMuted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title={isGroup ? 'Group Details' : 'Chat Info'} onBack={() => navigation.goBack()} />

      {isLoading && !conversation ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={darkTheme.accent} />
        </View>
      ) : (
        <FlatList
          data={[]}
          keyExtractor={(_, idx) => String(idx)}
          renderItem={() => null}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={
            <View style={{ paddingBottom: 40 }}>
              {/* MEMBERS TAB */}
              {activeTab === 'members' && (
                <View>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeading}>
                      MEMBERS ({conversation?.members?.length || 0})
                    </Text>
                    {isAdmin && (
                      <TouchableOpacity
                        style={styles.addMemberBtn}
                        onPress={() => setIsAddModalOpen(true)}
                      >
                        <Ionicons name="person-add-outline" size={16} color={darkTheme.accent} />
                        <Text style={styles.addMemberBtnText}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {(conversation?.members || []).map((m: any) => (
                    <View key={m._id} style={styles.memberRow}>
                      <Avatar uri={m.avatar} name={m.username} size={42} />
                      <View style={styles.memberTextContainer}>
                        <Text style={styles.memberUsername}>{m.username}</Text>
                        {adminId === m._id && (
                          <Text style={styles.adminBadge}>Group Admin</Text>
                        )}
                      </View>

                      {isAdmin && m._id !== user?._id && (
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(m)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="remove-circle-outline" size={22} color={darkTheme.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* MEDIA TAB */}
              {activeTab === 'media' && (
                <View style={styles.tabContent}>
                  {mediaLoading ? (
                    <ActivityIndicator size="small" color={darkTheme.accent} style={{ padding: 24 }} />
                  ) : !mediaData?.media || mediaData.media.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="image-outline" size={40} color={darkTheme.fgMuted} />
                      <Text style={styles.emptyText}>No shared media</Text>
                    </View>
                  ) : (
                    <View style={styles.mediaGrid}>
                      {mediaData.media.map((item, idx) => (
                        <TouchableOpacity
                          key={item._id || idx}
                          activeOpacity={0.85}
                          onPress={() => setViewerImageIndex(idx)}
                          style={styles.mediaGridItem}
                        >
                          <Image
                            source={{ uri: item.url }}
                            style={styles.mediaThumb}
                            contentFit="cover"
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* FILES TAB */}
              {activeTab === 'files' && (
                <View style={styles.tabContent}>
                  {mediaLoading ? (
                    <ActivityIndicator size="small" color={darkTheme.accent} style={{ padding: 24 }} />
                  ) : !mediaData?.files || mediaData.files.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="document-text-outline" size={40} color={darkTheme.fgMuted} />
                      <Text style={styles.emptyText}>No shared documents or files</Text>
                    </View>
                  ) : (
                    mediaData.files.map((file, idx) => (
                      <TouchableOpacity
                        key={file._id || idx}
                        style={styles.fileRow}
                        onPress={() => Linking.openURL(file.url)}
                      >
                        <View style={styles.fileIcon}>
                          <Ionicons name="document-outline" size={20} color={darkTheme.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {file.fileName || 'Attachment'}
                          </Text>
                          {file.fileSize ? (
                            <Text style={styles.fileSize}>
                              {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
                            </Text>
                          ) : null}
                        </View>
                        <Ionicons name="download-outline" size={18} color={darkTheme.fgMuted} />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* LINKS TAB */}
              {activeTab === 'links' && (
                <View style={styles.tabContent}>
                  {mediaLoading ? (
                    <ActivityIndicator size="small" color={darkTheme.accent} style={{ padding: 24 }} />
                  ) : !mediaData?.links || mediaData.links.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="link-outline" size={40} color={darkTheme.fgMuted} />
                      <Text style={styles.emptyText}>No links shared</Text>
                    </View>
                  ) : (
                    mediaData.links.map((link, idx) => (
                      <TouchableOpacity
                        key={link._id || idx}
                        style={styles.linkRow}
                        onPress={() => Linking.openURL(link.url)}
                      >
                        <Ionicons name="globe-outline" size={18} color={darkTheme.accent} />
                        <Text style={styles.linkUrl} numberOfLines={1}>
                          {link.url}
                        </Text>
                        <Ionicons name="open-outline" size={16} color={darkTheme.fgMuted} />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* VOICE NOTES TAB */}
              {activeTab === 'voice' && (
                <View style={styles.tabContent}>
                  {mediaLoading ? (
                    <ActivityIndicator size="small" color={darkTheme.accent} style={{ padding: 24 }} />
                  ) : !mediaData?.voice || mediaData.voice.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="mic-outline" size={40} color={darkTheme.fgMuted} />
                      <Text style={styles.emptyText}>No voice notes shared</Text>
                    </View>
                  ) : (
                    mediaData.voice.map((vn, idx) => (
                      <View key={vn._id || idx} style={styles.voiceRow}>
                        <VoicePlayer url={vn.audio.url} duration={vn.audio.duration} />
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* PINNED MESSAGES TAB */}
              {activeTab === 'pinned' && (
                <View style={styles.tabContent}>
                  {pinnedMessages.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="pin-outline" size={40} color={darkTheme.fgMuted} />
                      <Text style={styles.emptyText}>No pinned messages</Text>
                    </View>
                  ) : (
                    pinnedMessages.map((msg, idx) => (
                      <View key={msg._id || idx} style={styles.pinnedRow}>
                        <Avatar uri={msg.sender?.avatar} name={msg.sender?.username} size={32} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.pinnedSender}>{msg.sender?.username}</Text>
                          <Text style={styles.pinnedBody} numberOfLines={2}>
                            {msg.text || (msg.messageType === 'voice' ? '🎤 Voice note' : '📷 Attachment')}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Disappearing Messages Duration Picker Modal */}
      <Modal
        visible={isDisappearingModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDisappearingModalOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsDisappearingModalOpen(false)}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Disappearing Messages</Text>
            <Text style={styles.modalSub}>
              New messages in this chat will disappear for everyone after the chosen period.
            </Text>

            {DISAPPEARING_OPTIONS.map((dur) => (
              <TouchableOpacity
                key={dur}
                style={styles.disappearingOption}
                onPress={() => updateDisappearingMutation.mutate(dur)}
              >
                <Text style={styles.disappearingLabel}>
                  {dur === 'off' ? 'Off' : dur}
                </Text>
                {disappearingDuration === dur && (
                  <Ionicons name="checkmark" size={20} color={darkTheme.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image Lightbox Viewer */}
      <ImageViewerModal
        visible={viewerImageIndex !== null}
        images={allMediaUrls}
        initialIndex={viewerImageIndex || 0}
        onClose={() => setViewerImageIndex(null)}
      />

      {/* Add Members Modal */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Members</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={22} color={darkTheme.fg} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search followers / following..."
              placeholderTextColor={darkTheme.fgMuted}
              value={memberSearchTerm}
              onChangeText={setMemberSearchTerm}
            />

            <FlatList
              data={candidateContacts}
              keyExtractor={(item) => item._id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => {
                const isSelected = selectedAddUserIds.includes(item._id);
                return (
                  <TouchableOpacity
                    style={styles.candidateRow}
                    onPress={() => toggleSelectCandidate(item._id)}
                  >
                    <Avatar uri={item.avatar} name={item.username} size={38} />
                    <Text style={styles.candidateName}>@{item.username}</Text>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyCandidateText}>
                  No contacts available to add.
                </Text>
              }
            />

            <TouchableOpacity
              disabled={selectedAddUserIds.length === 0 || addMembersMutation.isPending}
              onPress={() => addMembersMutation.mutate(selectedAddUserIds)}
              style={[
                styles.confirmAddBtn,
                (selectedAddUserIds.length === 0 || addMembersMutation.isPending) && { opacity: 0.4 },
              ]}
            >
              {addMembersMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmAddBtnText}>
                  Add Selected ({selectedAddUserIds.length})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.border,
  },
  avatarWrapper: {
    position: 'relative',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: darkTheme.accent,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: darkTheme.bg,
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
  actionRowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: darkTheme.border,
    gap: 12,
    width: width - 32,
  },
  actionRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRowTitle: {
    color: darkTheme.fg,
    fontSize: 14,
    fontWeight: '700',
  },
  actionRowSubtitle: {
    color: darkTheme.fgMuted,
    fontSize: 12,
    marginTop: 2,
  },
  adminControlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: darkTheme.border,
    width: width - 32,
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
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 18,
    paddingHorizontal: 8,
    gap: 4,
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 4,
  },
  tabItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  tabText: {
    color: darkTheme.fgMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  tabTextActive: {
    color: darkTheme.accent,
    fontWeight: '700',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionHeading: {
    color: darkTheme.fgMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addMemberBtnText: {
    color: darkTheme.accent,
    fontSize: 13,
    fontWeight: '700',
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
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mediaGridItem: {
    width: (width - 32 - 12) / 3,
    height: (width - 32 - 12) / 3,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: darkTheme.surface,
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.border,
    gap: 12,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: darkTheme.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileName: {
    color: darkTheme.fg,
    fontSize: 14,
    fontWeight: '600',
  },
  fileSize: {
    color: darkTheme.fgMuted,
    fontSize: 12,
    marginTop: 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.border,
    gap: 10,
  },
  linkUrl: {
    flex: 1,
    color: darkTheme.accent,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  voiceRow: {
    paddingVertical: 6,
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.border,
  },
  pinnedSender: {
    color: darkTheme.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  pinnedBody: {
    color: darkTheme.fg,
    fontSize: 13,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: darkTheme.fgMuted,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: darkTheme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: darkTheme.fg,
    fontSize: 18,
    fontWeight: '700',
  },
  modalSub: {
    color: darkTheme.fgMuted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  disappearingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.border,
  },
  disappearingLabel: {
    color: darkTheme.fg,
    fontSize: 15,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: darkTheme.bg,
    borderWidth: 1,
    borderColor: darkTheme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: darkTheme.fg,
    fontSize: 14,
    marginBottom: 12,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.border,
    gap: 12,
  },
  candidateName: {
    flex: 1,
    color: darkTheme.fg,
    fontSize: 14,
    fontWeight: '600',
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
  emptyCandidateText: {
    color: darkTheme.fgMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  confirmAddBtn: {
    backgroundColor: darkTheme.accent,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmAddBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
