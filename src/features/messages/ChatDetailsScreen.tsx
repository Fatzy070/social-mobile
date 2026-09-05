import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  ScrollView,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { VoicePlayer } from './VoicePlayer';
import { ImageViewerModal } from '../../components/common/ImageViewerModal';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { useAuthStore } from '../../store/authStore';
import { darkTheme } from '../../theme/colors';
import { Skeleton, SkeletonAvatar } from '../../components/common/Skeleton';
import { Conversation, Message, User } from '../../types';

const { width } = Dimensions.get('window');

type TabType = 'media' | 'files' | 'links' | 'voice' | 'pinned';
const DISAPPEARING_OPTIONS: Array<'off' | '24h' | '7d' | '30d'> = ['off', '24h', '7d', '30d'];

export const ChatDetailsScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  const conversationId = route.params?.conversationId;
  const [activeTab, setActiveTab] = useState<TabType>('media');
  const [viewerImageIndex, setViewerImageIndex] = useState<number | null>(null);
  const [isDisappearingModalOpen, setIsDisappearingModalOpen] = useState(false);

  // Fetch Conversation info
  const { data: conversation, isLoading: convLoading } = useQuery({
    queryKey: queryKeys.messages.conversation(conversationId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/messages/conversation/${conversationId}`);
      return data as Conversation;
    },
    enabled: !!conversationId,
  });

  // Fetch Media, Files, Links, Voice
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

  // 1-on-1 counterpart
  const otherUser = conversation?.members?.find((m) => m._id !== currentUser?._id);

  // Check if otherUser is blocked
  const isBlocked = otherUser
    ? (currentUser?.blockedUsers || []).some(
        (id: any) => id === otherUser._id || id?.toString?.() === otherUser._id
      )
    : false;

  // Block / Unblock Mutation
  const blockMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (isBlocked) {
        const { data } = await apiClient.post(`/auth/${targetUserId}/unblock`);
        return data;
      } else {
        const { data } = await apiClient.post(`/auth/${targetUserId}/block`);
        return data;
      }
    },
    onSuccess: () => {
      Alert.alert(
        'Success',
        isBlocked
          ? `Unblocked @${otherUser?.username}`
          : `Blocked @${otherUser?.username}`
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(otherUser?._id || '') });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Action failed');
    },
  });

  // Update Disappearing Messages
  const disappearingMutation = useMutation({
    mutationFn: async (duration: 'off' | '24h' | '7d' | '30d') => {
      const { data } = await apiClient.put(`/messages/conversation/${conversationId}/disappearing`, {
        duration,
      });
      return data;
    },
    onSuccess: (data, duration) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(conversationId) });
      Alert.alert(
        'Updated',
        duration === 'off'
          ? 'Disappearing messages turned off'
          : `Messages will disappear after ${duration}`
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update setting');
    },
  });

  const handleBlockPress = () => {
    if (!otherUser?._id) return;
    Alert.alert(
      isBlocked ? 'Unblock User' : 'Block User',
      isBlocked
        ? `Are you sure you want to unblock @${otherUser.username}?`
        : `Are you sure you want to block @${otherUser.username}? They won't be able to message you or see your profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBlocked ? 'Unblock' : 'Block',
          style: isBlocked ? 'default' : 'destructive',
          onPress: () => blockMutation.mutate(otherUser._id),
        },
      ]
    );
  };

  const mediaList = mediaData?.media || [];
  const fileList = mediaData?.files || [];
  const linkList = mediaData?.links || [];
  const voiceList = mediaData?.voice || [];
  const currentDuration = conversation?.disappearingMessages?.duration || 'off';

  return (
    <View style={styles.container}>
      <Header title="Details" onBack={() => navigation.goBack()} />

      {convLoading && !conversation ? (
        <View style={{ padding: 20, alignItems: 'center', gap: 16 }}>
          <Skeleton width={84} height={84} circle />
          <Skeleton width={140} height={20} />
          <Skeleton width={90} height={14} />
          <View style={{ width: '100%', marginTop: 24, gap: 14 }}>
            <Skeleton width="100%" height={56} borderRadius={14} />
            <Skeleton width="100%" height={56} borderRadius={14} />
            <Skeleton width="100%" height={160} borderRadius={14} />
          </View>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* User Profile Card */}
          <View style={styles.profileSection}>
            <Avatar uri={otherUser?.avatar} name={otherUser?.username} size={84} />
            <Text style={styles.userName}>{otherUser?.username || 'User'}</Text>
            <Text style={styles.userHandle}>@{otherUser?.username?.toLowerCase() || ''}</Text>

            {otherUser?._id && (
              <TouchableOpacity
                style={styles.viewProfileBtn}
                onPress={() => navigation.navigate('UserProfile', { userId: otherUser._id })}
              >
                <Text style={styles.viewProfileText}>View Public Profile</Text>
                <Ionicons name="open-outline" size={14} color={darkTheme.fg} />
              </TouchableOpacity>
            )}
          </View>

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
                {currentDuration === 'off' ? 'Off' : `Disappear after ${currentDuration}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={darkTheme.fgMuted} />
          </TouchableOpacity>

          {/* Tab Navigation for Shared Assets */}
          <View style={styles.tabBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
              <TouchableOpacity
                onPress={() => setActiveTab('media')}
                style={[styles.tabItem, activeTab === 'media' && styles.tabItemActive]}
              >
                <Ionicons
                  name="images-outline"
                  size={14}
                  color={activeTab === 'media' ? darkTheme.accent : darkTheme.fgMuted}
                />
                <Text style={[styles.tabLabel, activeTab === 'media' && styles.tabLabelActive]}>
                  Media ({mediaList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('files')}
                style={[styles.tabItem, activeTab === 'files' && styles.tabItemActive]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={14}
                  color={activeTab === 'files' ? darkTheme.accent : darkTheme.fgMuted}
                />
                <Text style={[styles.tabLabel, activeTab === 'files' && styles.tabLabelActive]}>
                  Files ({fileList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('links')}
                style={[styles.tabItem, activeTab === 'links' && styles.tabItemActive]}
              >
                <Ionicons
                  name="link-outline"
                  size={14}
                  color={activeTab === 'links' ? darkTheme.accent : darkTheme.fgMuted}
                />
                <Text style={[styles.tabLabel, activeTab === 'links' && styles.tabLabelActive]}>
                  Links ({linkList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('voice')}
                style={[styles.tabItem, activeTab === 'voice' && styles.tabItemActive]}
              >
                <Ionicons
                  name="mic-outline"
                  size={14}
                  color={activeTab === 'voice' ? darkTheme.accent : darkTheme.fgMuted}
                />
                <Text style={[styles.tabLabel, activeTab === 'voice' && styles.tabLabelActive]}>
                  Voice ({voiceList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('pinned')}
                style={[styles.tabItem, activeTab === 'pinned' && styles.tabItemActive]}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={14}
                  color={activeTab === 'pinned' ? darkTheme.accent : darkTheme.fgMuted}
                />
                <Text style={[styles.tabLabel, activeTab === 'pinned' && styles.tabLabelActive]}>
                  Pinned ({pinnedMessages.length})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Tab Content Display */}
          <View style={styles.tabContentArea}>
            {mediaLoading ? (
              <ActivityIndicator size="small" color={darkTheme.accent} style={{ marginVertical: 20 }} />
            ) : activeTab === 'media' ? (
              mediaList.length === 0 ? (
                <Text style={styles.emptyTabNote}>No photos or videos shared yet</Text>
              ) : (
                <View style={styles.mediaGrid}>
                  {mediaList.map((m, idx) => (
                    <TouchableOpacity
                      key={m._id || idx}
                      onPress={() => setViewerImageIndex(idx)}
                      style={styles.mediaThumbContainer}
                    >
                      <Image source={{ uri: m.url }} style={styles.mediaThumb} contentFit="cover" />
                    </TouchableOpacity>
                  ))}
                </View>
              )
            ) : activeTab === 'files' ? (
              fileList.length === 0 ? (
                <Text style={styles.emptyTabNote}>No documents shared in this conversation</Text>
              ) : (
                fileList.map((f, idx) => (
                  <TouchableOpacity
                    key={f._id || idx}
                    onPress={() => Linking.openURL(f.url)}
                    style={styles.fileItem}
                  >
                    <Ionicons name="document-outline" size={24} color={darkTheme.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {f.fileName || 'Attachment'}
                      </Text>
                      {f.fileSize ? (
                        <Text style={styles.fileSize}>{(f.fileSize / 1024).toFixed(1)} KB</Text>
                      ) : null}
                    </View>
                    <Ionicons name="download-outline" size={20} color={darkTheme.fgMuted} />
                  </TouchableOpacity>
                ))
              )
            ) : activeTab === 'links' ? (
              linkList.length === 0 ? (
                <Text style={styles.emptyTabNote}>No links shared in this conversation</Text>
              ) : (
                linkList.map((l, idx) => (
                  <TouchableOpacity
                    key={l._id || idx}
                    onPress={() => Linking.openURL(l.url)}
                    style={styles.linkItem}
                  >
                    <Ionicons name="globe-outline" size={20} color={darkTheme.accent} />
                    <Text style={styles.linkText} numberOfLines={1}>
                      {l.url}
                    </Text>
                    <Ionicons name="open-outline" size={16} color={darkTheme.fgMuted} />
                  </TouchableOpacity>
                ))
              )
            ) : activeTab === 'voice' ? (
              voiceList.length === 0 ? (
                <Text style={styles.emptyTabNote}>No voice notes shared yet</Text>
              ) : (
                voiceList.map((v, idx) => (
                  <View key={v._id || idx} style={styles.voiceItem}>
                    <VoicePlayer url={v.audio.url} duration={v.audio.duration} />
                  </View>
                ))
              )
            ) : (
              pinnedMessages.length === 0 ? (
                <Text style={styles.emptyTabNote}>No pinned messages in this chat</Text>
              ) : (
                pinnedMessages.map((p) => (
                  <View key={p._id} style={styles.pinnedItem}>
                    <View style={styles.pinnedHeader}>
                      <Ionicons name="bookmark" size={14} color={darkTheme.bookmark} />
                      <Text style={styles.pinnedSender}>{p.sender?.username || 'User'}</Text>
                      <Text style={styles.pinnedDate}>
                        {p.createdAt ? format(new Date(p.createdAt), 'MMM d, h:mm a') : ''}
                      </Text>
                    </View>
                    <Text style={styles.pinnedContent} numberOfLines={3}>
                      {p.text || (p.messageType === 'voice' ? '🎤 Voice Message' : '📷 Photo')}
                    </Text>
                  </View>
                ))
              )
            )}
          </View>

          {/* Block / Unblock Button Action */}
          {otherUser?._id && (
            <View style={styles.actionSection}>
              <TouchableOpacity
                onPress={handleBlockPress}
                disabled={blockMutation.isPending}
                style={[
                  styles.blockBtn,
                  isBlocked ? styles.unblockBtn : styles.dangerBlockBtn,
                ]}
              >
                {blockMutation.isPending ? (
                  <ActivityIndicator size="small" color={isBlocked ? darkTheme.fg : darkTheme.error} />
                ) : (
                  <>
                    <Ionicons
                      name="ban-outline"
                      size={18}
                      color={isBlocked ? darkTheme.fg : darkTheme.error}
                    />
                    <Text style={[styles.blockBtnText, isBlocked && { color: darkTheme.fg }]}>
                      {isBlocked ? `Unblock @${otherUser.username}` : `Block @${otherUser.username}`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <ImageViewerModal
        visible={viewerImageIndex !== null}
        images={mediaList.map((m) => m.url)}
        initialIndex={viewerImageIndex || 0}
        onClose={() => setViewerImageIndex(null)}
      />

      {/* Disappearing Messages Duration Picker Modal (Exact match with GroupDetailsScreen) */}
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
                onPress={() => {
                  disappearingMutation.mutate(dur);
                  setIsDisappearingModalOpen(false);
                }}
              >
                <Text style={styles.disappearingLabel}>
                  {dur === 'off' ? 'Off' : dur}
                </Text>
                {currentDuration === dur && (
                  <Ionicons name="checkmark" size={20} color={darkTheme.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
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
  scrollContent: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.border,
    backgroundColor: 'rgba(28, 28, 32, 0.4)',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.fg,
    marginTop: 12,
  },
  userHandle: {
    fontSize: 13,
    color: darkTheme.fgMuted,
    marginTop: 2,
  },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewProfileText: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.fg,
  },
  actionRowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: darkTheme.border,
    gap: 12,
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
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.border,
  },
  tabScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: darkTheme.accent,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.fgMuted,
  },
  tabLabelActive: {
    color: darkTheme.accent,
    fontWeight: '700',
  },
  tabContentArea: {
    padding: 16,
    minHeight: 180,
  },
  emptyTabNote: {
    textAlign: 'center',
    color: darkTheme.fgMuted,
    fontSize: 13,
    paddingVertical: 24,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaThumbContainer: {
    width: (width - 48) / 3,
    height: (width - 48) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: darkTheme.surface,
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: darkTheme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: darkTheme.border,
    marginBottom: 8,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: darkTheme.fg,
  },
  fileSize: {
    fontSize: 11,
    color: darkTheme.fgMuted,
    marginTop: 2,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: darkTheme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: darkTheme.border,
    marginBottom: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: darkTheme.accent,
  },
  voiceItem: {
    marginBottom: 10,
  },
  pinnedItem: {
    padding: 12,
    backgroundColor: darkTheme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: darkTheme.border,
    marginBottom: 8,
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pinnedSender: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.fg,
  },
  pinnedDate: {
    fontSize: 10,
    color: darkTheme.fgMuted,
    marginLeft: 'auto',
  },
  pinnedContent: {
    fontSize: 12,
    color: darkTheme.fg,
  },
  actionSection: {
    padding: 16,
    marginBottom: 24,
  },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  dangerBlockBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  unblockBtn: {
    backgroundColor: darkTheme.surface,
    borderColor: darkTheme.border,
  },
  blockBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: darkTheme.error,
  },
});
