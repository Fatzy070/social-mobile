import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { VoiceRecorder } from './VoiceRecorder';
import { VoicePlayer } from './VoicePlayer';
import { ForwardModal } from './ForwardModal';
import { ImageViewerModal } from '../../components/common/ImageViewerModal';
import { DocumentViewerModal } from '../../components/common/DocumentViewerModal';
import { AttachmentActionsModal } from './AttachmentActionsModal';
import { ScheduleModal } from './ScheduleModal';
import { ChatMessageSkeleton } from '../../components/common/Skeleton';
import {
  useConversation,
  useMessages,
  useSendMessage,
  useMarkMessagesRead,
  useDeleteMessage,
  useEditMessage,
  useTogglePinMessage,
  usePinnedMessages,
  useForwardMessage,
} from './useMessages';
import { useAuthStore } from '../../store/authStore';
import { parseTextWithLinks } from '../../utils/urlHelper';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';
import { Message } from '../../types';

export const ChatScreen = () => {
  const { colors, styles } = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const conversationId = route.params?.conversationId;
  const passedTitle = route.params?.title;

  const [text, setText] = useState('');
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // In-app Media Lightbox state
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxVisible, setLightboxVisible] = useState(false);

  // In-app Document Viewer state
  const [selectedDoc, setSelectedDoc] = useState<{ url: string; fileName?: string } | null>(null);

  // Group @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  const { data: conversation } = useConversation(conversationId);
  const { data: messages = [], isLoading } = useMessages(conversationId);
  const { data: pinnedMessages = [] } = usePinnedMessages(conversationId);
  const sendMessageMutation = useSendMessage();
  const deleteMessageMutation = useDeleteMessage();
  const editMessageMutation = useEditMessage();
  const togglePinMutation = useTogglePinMessage();
  const forwardMessageMutation = useForwardMessage();
  const markReadMutation = useMarkMessagesRead();

  // Active top pinned message (latest pinned)
  const topPinnedMessage = pinnedMessages.length > 0 ? pinnedMessages[pinnedMessages.length - 1] : null;

  const scrollToMessage = (msgId: string) => {
    const index = messages.findIndex((m) => m._id === msgId);
    if (index !== -1 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      } catch {
        flatListRef.current.scrollToOffset({
          offset: index * 60,
          animated: true,
        });
      }
      setHighlightedMessageId(msgId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    }
  };

  // Only trigger markRead when there are unread messages from other users
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;

    const hasUnreadFromOthers = messages.some(
      (m) => m.sender?._id !== user?._id && m.status !== 'read'
    );

    if (hasUnreadFromOthers) {
      markReadMutation.mutate(conversationId);
    }
  }, [conversationId, messages.length]);

  const otherUser = conversation?.isGroup
    ? null
    : conversation?.members?.find((m) => m._id !== user?._id);

  const title = conversation?.isGroup
    ? conversation.groupName || 'Group'
    : otherUser?.username || passedTitle || 'Chat';

  const avatarUri = conversation?.isGroup
    ? conversation?.groupAvatar
    : otherUser?.avatar;

  const isGroup = conversation?.isGroup || false;
  const adminId = (
    typeof conversation?.groupAdmin === 'object' && conversation?.groupAdmin !== null
      ? conversation.groupAdmin._id
      : conversation?.groupAdmin
  )?.toString();
  const currentUserId = user?._id ? user._id.toString() : '';
  const isGroupAdmin = isGroup && adminId === currentUserId;

  // Check admin-only lock
  const isMessagingLocked =
    isGroup && conversation?.messagingMode === 'ADMINS_ONLY' && !isGroupAdmin;

  const handleHeaderPress = () => {
    if (isGroup) {
      navigation.navigate('GroupDetails', { conversationId });
    } else {
      navigation.navigate('ChatDetails', { conversationId });
    }
  };

  // Handle @mentions in group
  const handleTextChange = (val: string) => {
    setText(val);
    if (isGroup) {
      const lastWord = val.split(/\s+/).pop();
      if (lastWord && lastWord.startsWith('@')) {
        setMentionQuery(lastWord.slice(1).toLowerCase());
      } else {
        setMentionQuery(null);
      }
    }
  };

  const handleSelectMention = (member: any) => {
    const words = text.split(/\s+/);
    words.pop(); // remove partial @mention
    const newText = [...words, `@${member.username} `].join(' ');
    setText(newText);
    setMentionQuery(null);
  };

  const filteredMembers = isGroup && mentionQuery !== null
    ? (conversation?.members || []).filter(
        (m: any) =>
          m._id !== user?._id &&
          m.username?.toLowerCase().includes(mentionQuery)
      )
    : [];

  const handleSendText = () => {
    if (!text.trim()) return;

    if (editingMessage) {
      editMessageMutation.mutate({
        messageId: editingMessage._id,
        conversationId,
        text: text.trim(),
      });
      setEditingMessage(null);
      setText('');
      return;
    }

    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('text', text.trim());
    formData.append('messageType', 'text');

    if (replyToMessage) {
      formData.append('replyTo', replyToMessage._id);
    }

    sendMessageMutation.mutate(formData);
    setText('');
    setReplyToMessage(null);
    setMentionQuery(null);
  };

  const getMimeTypeFromUri = (uri: string, isVideo = false) => {
    const ext = uri.split('.').pop()?.toLowerCase() || '';
    if (isVideo) {
      if (ext === 'mov') return 'video/quicktime';
      if (ext === 'mp4') return 'video/mp4';
      return 'video/mp4';
    }
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'gif') return 'image/gif';
    return 'image/jpeg';
  };

  const handleSelectImage = async () => {
    console.log('[CHAT-MEDIA] handleSelectImage initiated');
    if (isMessagingLocked) {
      console.warn('[CHAT-MEDIA] Aborted: Group messaging locked to admins only');
      Alert.alert('Restricted', 'Only group admins can send messages in this group.');
      return;
    }

    try {
      console.log('[CHAT-MEDIA] Requesting media library permissions...');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[CHAT-MEDIA] Media library permission result:', permission.status, 'granted:', permission.granted);

      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Photo library permission is required to select photos and videos.');
        return;
      }

      console.log('[CHAT-MEDIA] Launching image library picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      console.log('[CHAT-MEDIA] Image picker result received - canceled:', result.canceled, 'assetsCount:', result.assets?.length || 0);

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video';
        const mimeType = asset.mimeType || getMimeTypeFromUri(asset.uri, isVideo);
        const ext = mimeType.split('/')[1] || (isVideo ? 'mp4' : 'jpg');
        const fileName = asset.fileName || `media-${Date.now()}.${ext}`;

        console.log('[CHAT-MEDIA] Selected asset details:', {
          uri: asset.uri,
          mimeType,
          fileName,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
          type: asset.type,
        });

        const formData = new FormData();
        formData.append('conversationId', conversationId);
        formData.append('messageType', 'media');
        if (replyToMessage) {
          formData.append('replyTo', replyToMessage._id);
        }

        // @ts-ignore React Native FormData file specification
        formData.append('media', {
          uri: asset.uri,
          type: mimeType,
          name: fileName,
        });

        console.log('[CHAT-MEDIA] Submitting media to sendMessage mutation...');
        sendMessageMutation.mutate(formData);
        setReplyToMessage(null);
      }
    } catch (err) {
      console.error('[CHAT-MEDIA] Exception in handleSelectImage:', err);
      Alert.alert('Error', 'An error occurred while opening the photo library.');
    }
  };

  const handleOpenCamera = async () => {
    console.log('[CHAT-MEDIA] handleOpenCamera initiated');
    if (isMessagingLocked) {
      console.warn('[CHAT-MEDIA] Aborted: Group messaging locked to admins only');
      Alert.alert('Restricted', 'Only group admins can send messages in this group.');
      return;
    }

    try {
      console.log('[CHAT-MEDIA] Requesting camera permissions...');
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      console.log('[CHAT-MEDIA] Camera permission result:', permission.status, 'granted:', permission.granted);

      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }

      console.log('[CHAT-MEDIA] Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
      });

      console.log('[CHAT-MEDIA] Camera result received - canceled:', result.canceled, 'assetsCount:', result.assets?.length || 0);

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video';
        const mimeType = asset.mimeType || getMimeTypeFromUri(asset.uri, isVideo);
        const ext = mimeType.split('/')[1] || (isVideo ? 'mp4' : 'jpg');
        const fileName = asset.fileName || `camera-${Date.now()}.${ext}`;

        console.log('[CHAT-MEDIA] Captured camera asset details:', {
          uri: asset.uri,
          mimeType,
          fileName,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
          type: asset.type,
        });

        const formData = new FormData();
        formData.append('conversationId', conversationId);
        formData.append('messageType', 'media');
        if (replyToMessage) {
          formData.append('replyTo', replyToMessage._id);
        }

        // @ts-ignore React Native FormData file specification
        formData.append('media', {
          uri: asset.uri,
          type: mimeType,
          name: fileName,
        });

        console.log('[CHAT-MEDIA] Submitting camera capture to sendMessage mutation...');
        sendMessageMutation.mutate(formData);
        setReplyToMessage(null);
      }
    } catch (err) {
      console.error('[CHAT-MEDIA] Exception in handleOpenCamera:', err);
      Alert.alert('Error', 'An error occurred while launching camera.');
    }
  };

  const handleSelectDocument = async () => {
    console.log('[CHAT-MEDIA] handleSelectDocument initiated');
    if (isMessagingLocked) {
      console.warn('[CHAT-MEDIA] Aborted: Group messaging locked to admins only');
      Alert.alert('Restricted', 'Only group admins can send messages in this group.');
      return;
    }

    try {
      console.log('[CHAT-MEDIA] Launching system document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      console.log('[CHAT-MEDIA] Document picker result received - canceled:', result.canceled);

      if (!result.canceled && result.assets && result.assets[0]) {
        const doc = result.assets[0];
        console.log('[CHAT-MEDIA] Selected document details:', {
          uri: doc.uri,
          mimeType: doc.mimeType,
          name: doc.name,
          size: doc.size,
        });

        const formData = new FormData();
        formData.append('conversationId', conversationId);
        formData.append('messageType', 'media');
        if (replyToMessage) {
          formData.append('replyTo', replyToMessage._id);
        }

        // @ts-ignore React Native FormData file specification
        formData.append('media', {
          uri: doc.uri,
          type: doc.mimeType || 'application/pdf',
          name: doc.name || `document-${Date.now()}`,
        });

        console.log('[CHAT-MEDIA] Submitting document to sendMessage mutation...');
        sendMessageMutation.mutate(formData);
        setReplyToMessage(null);
      }
    } catch (err) {
      console.error('[CHAT-MEDIA] Exception in handleSelectDocument:', err);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleVoiceSent = (audioData: {
    url: string;
    publicId: string;
    duration: number;
    mimeType: string;
    fileSize: number;
  }) => {
    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('messageType', 'voice');
    formData.append('audio', JSON.stringify(audioData));
    if (replyToMessage) {
      formData.append('replyTo', replyToMessage._id);
    }

    sendMessageMutation.mutate(formData);
    setIsRecordingMode(false);
    setReplyToMessage(null);
  };

  const openMessageActions = (msg: Message) => {
    setSelectedMessage(msg);
    setIsActionModalOpen(true);
  };

  const handleReplyAction = () => {
    setIsActionModalOpen(false);
    if (selectedMessage) {
      setReplyToMessage(selectedMessage);
    }
  };

  const handleCopyAction = async () => {
    setIsActionModalOpen(false);
    if (selectedMessage?.text) {
      await Clipboard.setStringAsync(selectedMessage.text);
      Alert.alert('Copied', 'Message copied to clipboard');
    }
  };

  const handleEditAction = () => {
    setIsActionModalOpen(false);
    if (selectedMessage) {
      setEditingMessage(selectedMessage);
      setText(selectedMessage.text || '');
    }
  };

  const handleForwardAction = () => {
    setIsActionModalOpen(false);
    setIsForwardModalOpen(true);
  };

  const handleConfirmForward = (targetConversationIds: string[]) => {
    if (!selectedMessage) return;
    forwardMessageMutation.mutate(
      {
        messageId: selectedMessage._id,
        targetConversationIds,
      },
      {
        onSuccess: () => {
          setIsForwardModalOpen(false);
          Alert.alert('Forwarded', 'Message forwarded successfully');
        },
        onError: (err: any) => {
          Alert.alert('Error', err.response?.data?.message || 'Failed to forward message');
        },
      }
    );
  };

  const handleTogglePinAction = () => {
    setIsActionModalOpen(false);
    if (selectedMessage) {
      togglePinMutation.mutate({
        messageId: selectedMessage._id,
        conversationId,
      });
    }
  };

  const handleDeleteAction = () => {
    setIsActionModalOpen(false);
    if (!selectedMessage) return;

    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMessageMutation.mutate({
            messageId: selectedMessage._id,
            conversationId,
          });
        },
      },
    ]);
  };

  const renderFormattedText = (messageText: string | undefined, isOwn: boolean) => {
    if (!messageText) return null;
    const parts = parseTextWithLinks(messageText);

    return (
      <Text style={[styles.messageText, isOwn ? styles.textOwn : styles.textOther]}>
        {parts.map((part, idx) => {
          if (part.isUrl && part.url) {
            return (
              <Text
                key={idx}
                style={[
                  styles.linkText,
                  isOwn ? styles.linkTextOwn : styles.linkTextOther,
                ]}
                onPress={() => Linking.openURL(part.url!)}
              >
                {part.text}
              </Text>
            );
          }
          return <Text key={idx}>{part.text}</Text>;
        })}
      </Text>
    );
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isOwn = item.sender?._id === user?._id;
    const isHighlighted = highlightedMessageId === item._id;

    return (
      <View
        style={[
          styles.messageRow,
          isOwn ? styles.messageRowOwn : styles.messageRowOther,
        ]}
      >
        {/* SENDER AVATAR VISIBLE FOR BOTH 1-ON-1 AND GROUP CHATS */}
        {!isOwn && (
          <Avatar uri={item.sender?.avatar} name={item.sender?.username} size={28} />
        )}

        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => openMessageActions(item)}
          style={[
            styles.bubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
            isHighlighted && styles.bubbleHighlighted,
          ]}
        >
          {!isOwn && conversation?.isGroup && (
            <Text style={styles.senderName}>{item.sender?.username}</Text>
          )}

          {/* Replied Message Header Preview */}
          {item.replyTo && (
            <View style={styles.replyPreviewInside}>
              <View style={styles.replyAccentLine} />
              <View style={{ flex: 1 }}>
                <Text style={styles.replySenderName}>
                  {item.replyTo.sender?.username || 'User'}
                </Text>
                <Text style={styles.replyContentText} numberOfLines={1}>
                  {item.replyTo.text || (item.replyTo.messageType === 'voice' ? '🎤 Voice message' : '📷 Photo')}
                </Text>
              </View>
            </View>
          )}

          {/* Pinned Indicator */}
          {item.isPinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={11} color={colors.accentText} />
              <Text style={styles.pinnedText}>Pinned</Text>
            </View>
          )}

          {item.messageType === 'voice' && item.audio?.url ? (
            <VoicePlayer isOwn={isOwn} url={item.audio.url} duration={item.audio.duration} />
          ) : item.messageType === 'media' && item.media && item.media.length > 0 ? (
            <View>
              {item.media.map((file, idx) => {
                const isDoc =
                  file.fileType === 'document' ||
                  (!file.fileType && !file.url.match(/\.(jpg|jpeg|png|webp|gif|mp4|mov)$/i));

                if (isDoc) {
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.8}
                      onPress={() => {
                        console.log('[CHAT-MEDIA] Opening document viewer for:', file.url, file.fileName);
                        setSelectedDoc({
                          url: file.url,
                          fileName: file.fileName,
                        });
                      }}
                      style={[
                        styles.docCard,
                        isOwn ? styles.docCardOwn : styles.docCardOther,
                      ]}
                    >
                      <View style={styles.docIconBox}>
                        <Ionicons name="document-text" size={20} color={isOwn ? '#ffffff' : colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.docName, isOwn ? styles.textOwn : styles.textOther]}
                          numberOfLines={1}
                        >
                          {file.fileName || 'Attached Document'}
                        </Text>
                        <Text style={[styles.docSub, { color: isOwn ? '#ffffff' : colors.fgMuted }]}>
                          {file.fileSize ? `${Math.round(file.fileSize / 1024)} KB • ` : ''}Tap to view
                        </Text>
                      </View>
                      <Ionicons
                        name="eye-outline"
                        size={18}
                        color={isOwn ? 'rgba(255,255,255,0.7)' : colors.fgMuted}
                      />
                    </TouchableOpacity>
                  );
                }

                // Image / Video preview
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.9}
                    onPress={() => {
                      console.log('[CHAT-MEDIA] Image clicked, opening full-screen lightbox:', file.url);
                      setLightboxImages([file.url]);
                      setLightboxVisible(true);
                    }}
                  >
                    <Image
                      source={{ uri: file.url }}
                      style={styles.mediaImage}
                      contentFit="cover"
                      transition={200}
                    />
                  </TouchableOpacity>
                );
              })}
              {item.text ? renderFormattedText(item.text, isOwn) : null}
            </View>
          ) : (
            renderFormattedText(item.text, isOwn)
          )}

          <View style={styles.timeRow}>
            {item.isEdited && (
              <Text style={[styles.timestamp, { marginRight: 4, fontStyle: 'italic', color: isOwn ? '#ffffff' : colors.fgMuted }]}>
                edited
              </Text>
            )}
            <Text style={[styles.timestamp, { color: isOwn ? '#ffffff' : colors.fgMuted }]}>
              {item.createdAt
                ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''}
            </Text>
            {isOwn && (
              <Ionicons
                name={item.status === 'read' ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.status === 'read' ? colors.accentHover : 'rgba(255,255,255,0.6)'}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={title}
        subtitle={
          conversation?.isGroup
            ? `${conversation.members?.length || 0} participants`
            : `@${otherUser?.username?.toLowerCase() || ''}`
        }
        avatar={avatarUri}
        onTitlePress={handleHeaderPress}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={handleHeaderPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.fg} />
          </TouchableOpacity>
        }
      />

      {/* Disappearing Messages Notice Banner */}
      {conversation?.disappearingMessages?.enabled && (
        <View style={styles.disappearingBanner}>
          <Ionicons name="time-outline" size={13} color="#fcd34d" />
          <Text style={styles.disappearingBannerText}>
            Disappearing messages is on: messages disappear after {conversation.disappearingMessages.duration}.
          </Text>
        </View>
      )}

      {/* 📌 WHATSAPP-STYLE PINNED MESSAGE BANNER AT TOP OF CHAT */}
      {topPinnedMessage && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.pinnedBannerContainer}
          onPress={() => scrollToMessage(topPinnedMessage._id)}
        >
          <View style={styles.pinnedAccentBar} />
          <Ionicons name="pin" size={16} color={colors.accentText} style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.pinnedBannerSender}>
                Pinned: {topPinnedMessage.sender?.username || 'User'}
              </Text>
              {pinnedMessages.length > 1 && (
                <Text style={styles.pinnedBannerCount}>
                  ({pinnedMessages.length} pinned)
                </Text>
              )}
            </View>
            <Text style={styles.pinnedBannerText} numberOfLines={1}>
              {topPinnedMessage.text || (topPinnedMessage.messageType === 'voice' ? '🎤 Voice note' : '📷 Attachment')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.fgMuted} />
        </TouchableOpacity>
      )}

      {isLoading && messages.length === 0 ? (
        <ChatMessageSkeleton />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, idx) => item._id || String(idx)}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            // Only auto-scroll to bottom if new messages arrived, preserving user reading position
            if (messages.length > prevMsgCountRef.current) {
              flatListRef.current?.scrollToEnd({ animated: prevMsgCountRef.current > 0 });
              prevMsgCountRef.current = messages.length;
            }
          }}
        />
      )}

      {/* Mention Suggestions Popup */}
      {filteredMembers.length > 0 && (
        <View style={styles.mentionBox}>
          {filteredMembers.map((m: any) => (
            <TouchableOpacity
              key={m._id}
              style={styles.mentionRow}
              onPress={() => handleSelectMention(m)}
            >
              <Avatar uri={m.avatar} name={m.username} size={28} />
              <Text style={styles.mentionName}>@{m.username}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Reply or Edit Banner */}
      {(replyToMessage || editingMessage) && (
        <View style={styles.stateBanner}>
          <Ionicons
            name={editingMessage ? 'pencil' : 'arrow-undo'}
            size={18}
            color={colors.accentText}
          />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.stateBannerTitle}>
              {editingMessage ? 'Editing message' : `Replying to ${replyToMessage?.sender?.username}`}
            </Text>
            <Text style={styles.stateBannerSubtitle} numberOfLines={1}>
              {editingMessage?.text || replyToMessage?.text || 'Attachment'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setReplyToMessage(null);
              setEditingMessage(null);
              setText('');
            }}
          >
            <Ionicons name="close" size={18} color={colors.fgMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Bar or Voice Recorder */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {isMessagingLocked ? (
          <View style={styles.lockedBar}>
            <Ionicons name="lock-closed" size={18} color={colors.fgMuted} />
            <Text style={styles.lockedText}>Only group admins can send messages</Text>
          </View>
        ) : isRecordingMode ? (
          <VoiceRecorder
            conversationId={conversationId}
            onVoiceSent={handleVoiceSent}
            onCancel={() => setIsRecordingMode(false)}
          />
        ) : (
          <View style={styles.inputRow}>
            <TouchableOpacity
              onPress={() => setIsAttachmentModalOpen(true)}
              style={styles.attachBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={24} color={colors.fgMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsRecordingMode(true)}
              style={styles.attachBtn}
            >
              <Ionicons name="mic-outline" size={22} color={colors.fgMuted} />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder={isGroup ? 'Type a message or @mention...' : 'Type a message...'}
              placeholderTextColor={colors.fgMuted}
              value={text}
              onChangeText={handleTextChange}
              multiline
            />

            <TouchableOpacity
              disabled={!text.trim() || sendMessageMutation.isPending}
              onPress={handleSendText}
              style={[
                styles.sendBtn,
                (!text.trim() || sendMessageMutation.isPending) && styles.sendBtnDisabled,
              ]}
            >
              {sendMessageMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name={editingMessage ? 'checkmark' : 'send'} size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Attachment Actions Modal */}
      <AttachmentActionsModal
        visible={isAttachmentModalOpen}
        onClose={() => setIsAttachmentModalOpen(false)}
        onSelectImage={handleSelectImage}
        onSelectDocument={handleSelectDocument}
        onOpenCamera={handleOpenCamera}
        onOpenSchedule={() => setIsScheduleModalOpen(true)}
      />

      {/* Schedule Message Modal */}
      <ScheduleModal
        visible={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        conversationId={conversationId}
        initialText={text}
      />

      {/* Forward Modal */}
      <ForwardModal
        visible={isForwardModalOpen}
        onClose={() => setIsForwardModalOpen(false)}
        message={selectedMessage}
        currentUserId={currentUserId}
        onConfirmForward={handleConfirmForward}
        isForwarding={forwardMessageMutation.isPending}
      />

      {/* Message Action Sheet Modal */}
      <Modal
        visible={isActionModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsActionModalOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsActionModalOpen(false)}
          style={styles.modalBackdrop}
        >
          <View style={[styles.actionModalSheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            <View style={styles.sheetHandle} />

            {/* Reply */}
            <TouchableOpacity style={styles.sheetAction} onPress={handleReplyAction}>
              <Ionicons name="arrow-undo-outline" size={20} color={colors.accentText} />
              <Text style={styles.sheetActionText}>Reply</Text>
            </TouchableOpacity>

            {/* Copy Text */}
            {selectedMessage?.text ? (
              <TouchableOpacity style={styles.sheetAction} onPress={handleCopyAction}>
                <Ionicons name="copy-outline" size={20} color={colors.fg} />
                <Text style={styles.sheetActionText}>Copy Text</Text>
              </TouchableOpacity>
            ) : null}

            {/* Forward Message */}
            <TouchableOpacity style={styles.sheetAction} onPress={handleForwardAction}>
              <Ionicons name="share-social-outline" size={20} color={colors.success} />
              <Text style={styles.sheetActionText}>Forward Message</Text>
            </TouchableOpacity>

            {/* Pin / Unpin */}
            <TouchableOpacity style={styles.sheetAction} onPress={handleTogglePinAction}>
              <Ionicons
                name={selectedMessage?.isPinned ? 'pin' : 'pin-outline'}
                size={20}
                color={selectedMessage?.isPinned ? colors.bookmark : colors.fg}
              />
              <Text style={styles.sheetActionText}>
                {selectedMessage?.isPinned ? 'Unpin Message' : 'Pin Message'}
              </Text>
            </TouchableOpacity>

            {/* Edit Message (Own text message only) */}
            {selectedMessage?.sender?._id === user?._id && selectedMessage?.messageType === 'text' && (
              <TouchableOpacity style={styles.sheetAction} onPress={handleEditAction}>
                <Ionicons name="pencil-outline" size={20} color="#38bdf8" />
                <Text style={styles.sheetActionText}>Edit Message</Text>
              </TouchableOpacity>
            )}

            {/* Delete Message (Own message only) */}
            {selectedMessage?.sender?._id === user?._id && (
              <TouchableOpacity
                style={[styles.sheetAction, { borderTopWidth: 1, borderTopColor: colors.border }]}
                onPress={handleDeleteAction}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
                <Text style={[styles.sheetActionText, { color: colors.error }]}>
                  Delete Message
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* In-App Image Lightbox Modal */}
      <ImageViewerModal
        visible={lightboxVisible}
        images={lightboxImages}
        initialIndex={0}
        onClose={() => setLightboxVisible(false)}
      />

      {/* In-App Document Viewer Modal */}
      <DocumentViewerModal
        visible={!!selectedDoc}
        docUrl={selectedDoc?.url}
        fileName={selectedDoc?.fileName}
        onClose={() => setSelectedDoc(null)}
      />
    </KeyboardAvoidingView>
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
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
    gap: 6,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '84%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 20,
  },
  bubbleHighlighted: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  bubbleOwn: {
    backgroundColor: colors.bubbleOwn,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.bubbleOther,
    borderBottomLeftRadius: 4,
  },
  disappearingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.25)',
  },
  disappearingBannerText: {
    color: '#fcd34d',
    fontSize: 11,
    fontWeight: '600',
  },
  pinnedBannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: metrics.gutter,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pinnedAccentBar: {
    width: 3,
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
    marginRight: 10,
  },
  pinnedBannerSender: {
    color: colors.accentText,
    fontSize: 12,
    fontWeight: '700',
  },
  pinnedBannerCount: {
    color: colors.fgMuted,
    fontSize: 11,
  },
  pinnedBannerText: {
    color: colors.fg,
    fontSize: 13,
    marginTop: 2,
  },
  senderName: {
    color: colors.accentText,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  replyPreviewInside: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  replyAccentLine: {
    width: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
    marginRight: 8,
  },
  replySenderName: {
    color: colors.accentText,
    fontSize: 11,
    fontWeight: '700',
  },
  replyContentText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  pinnedText: {
    color: colors.accentText,
    fontSize: 10,
    fontWeight: '700',
  },
  messageText: {
    fontSize: metrics.body,
    lineHeight: 24,
  },
  textOwn: {
    color: '#ffffff',
  },
  textOther: {
    color: colors.fg,
  },
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  linkTextOwn: {
    color: '#ffffff',
  },
  linkTextOther: {
    color: colors.accentText,
  },
  mediaImage: {
    width: 210,
    height: 180,
    borderRadius: 12,
    marginBottom: 4,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    gap: 10,
    minWidth: 200,
    maxWidth: 240,
    marginBottom: 4,
  },
  docCardOwn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  docCardOther: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docName: {
    fontSize: 13,
    fontWeight: '600',
  },
  docSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  mentionBox: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    maxHeight: 140,
    paddingHorizontal: 12,
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  mentionName: {
    color: colors.fg,
    fontSize: 13,
    fontWeight: '600',
  },
  stateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: metrics.gutter,
    paddingVertical: 8,
  },
  stateBannerTitle: {
    color: colors.accentText,
    fontSize: 12,
    fontWeight: '700',
  },
  stateBannerSubtitle: {
    color: colors.fgMuted,
    fontSize: 12,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  lockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  lockedText: {
    color: colors.fgMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachBtn: {
    padding: 10,
  },
  textInput: {
    flex: 1,
    color: colors.fg,
    fontSize: metrics.body,
    maxHeight: 90,
    paddingHorizontal: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  actionModalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 34,
    paddingHorizontal: metrics.gutter,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  sheetActionText: {
    color: colors.fg,
    fontSize: metrics.body,
    fontWeight: '600',
  },
});
