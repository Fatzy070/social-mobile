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
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { VoiceRecorder } from './VoiceRecorder';
import { VoicePlayer } from './VoicePlayer';
import { useConversation, useMessages, useSendMessage, useMarkMessagesRead } from './useMessages';
import { useAuthStore } from '../../store/authStore';
import { darkTheme } from '../../theme/colors';
import { Message } from '../../types';

export const ChatScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const conversationId = route.params?.conversationId;
  const passedTitle = route.params?.title;

  const [text, setText] = useState('');
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data: conversation } = useConversation(conversationId);
  const { data: messages = [], isLoading } = useMessages(conversationId);
  const sendMessageMutation = useSendMessage();
  const markReadMutation = useMarkMessagesRead();

  useEffect(() => {
    if (conversationId) {
      markReadMutation.mutate(conversationId);
    }
  }, [conversationId, messages.length]);

  const otherUser = conversation?.isGroup
    ? null
    : conversation?.members?.find((m) => m._id !== user?._id);

  const title = conversation?.isGroup
    ? conversation.groupName || 'Group'
    : otherUser?.username || passedTitle || 'Chat';

  const handleSendText = () => {
    if (!text.trim()) return;

    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('text', text.trim());
    formData.append('messageType', 'text');

    sendMessageMutation.mutate(formData);
    setText('');
  };

  const handlePickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() || 'jpg';

      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('messageType', 'media');
      // @ts-ignore
      formData.append('media', {
        uri: asset.uri,
        type: `image/${ext}`,
        name: `chat-${Date.now()}.${ext}`,
      });

      sendMessageMutation.mutate(formData);
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

    sendMessageMutation.mutate(formData);
    setIsRecordingMode(false);
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isOwn = item.sender?._id === user?._id;

    return (
      <View
        style={[
          styles.messageRow,
          isOwn ? styles.messageRowOwn : styles.messageRowOther,
        ]}
      >
        {!isOwn && conversation?.isGroup && (
          <Avatar uri={item.sender?.avatar} name={item.sender?.username} size={28} />
        )}

        <View
          style={[
            styles.bubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
          ]}
        >
          {!isOwn && conversation?.isGroup && (
            <Text style={styles.senderName}>{item.sender?.username}</Text>
          )}

          {item.messageType === 'voice' && item.audio?.url ? (
            <VoicePlayer url={item.audio.url} duration={item.audio.duration} />
          ) : item.messageType === 'media' && item.media && item.media.length > 0 ? (
            <View>
              <Image
                source={{ uri: item.media[0].url }}
                style={styles.mediaImage}
                contentFit="cover"
              />
              {item.text ? <Text style={styles.messageText}>{item.text}</Text> : null}
            </View>
          ) : (
            <Text style={[styles.messageText, isOwn ? styles.textOwn : styles.textOther]}>
              {item.text}
            </Text>
          )}

          <View style={styles.timeRow}>
            <Text style={styles.timestamp}>
              {item.createdAt
                ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''}
            </Text>
            {isOwn && (
              <Ionicons
                name={item.status === 'read' ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.status === 'read' ? darkTheme.accentHover : 'rgba(255,255,255,0.6)'}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </View>
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
            ? `${conversation.members.length} participants`
            : `@${otherUser?.username?.toLowerCase() || ''}`
        }
        onBack={() => navigation.goBack()}
        rightAction={
          conversation?.isGroup ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('GroupDetails', { conversationId })}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="information-circle-outline" size={24} color={darkTheme.fg} />
            </TouchableOpacity>
          ) : null
        }
      />

      {isLoading && messages.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={darkTheme.accent} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, idx) => item._id || String(idx)}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Input Bar or Voice Recorder */}
      <View style={styles.bottomBar}>
        {isRecordingMode ? (
          <VoiceRecorder
            conversationId={conversationId}
            onVoiceSent={handleVoiceSent}
            onCancel={() => setIsRecordingMode(false)}
          />
        ) : (
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={handlePickMedia} style={styles.attachBtn}>
              <Ionicons name="image-outline" size={22} color={darkTheme.fgMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsRecordingMode(true)}
              style={styles.attachBtn}
            >
              <Ionicons name="mic-outline" size={22} color={darkTheme.fgMuted} />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder="Message..."
              placeholderTextColor={darkTheme.fgMuted}
              value={text}
              onChangeText={setText}
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
                <Ionicons name="send" size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
  messagesList: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
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
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 18,
  },
  bubbleOwn: {
    backgroundColor: darkTheme.bubbleOwn,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: darkTheme.bubbleOther,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    color: darkTheme.accent,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  textOwn: {
    color: '#ffffff',
  },
  textOther: {
    color: darkTheme.fg,
  },
  mediaImage: {
    width: 200,
    height: 180,
    borderRadius: 12,
    marginBottom: 4,
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
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: darkTheme.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: darkTheme.surfaceSubtle,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachBtn: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    color: darkTheme.fg,
    fontSize: 15,
    maxHeight: 90,
    paddingHorizontal: 10,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: darkTheme.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
});
