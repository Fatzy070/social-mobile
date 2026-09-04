import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { darkTheme } from '../../theme/colors';
import { Post } from '../../types';

type VisibilityType = 'public' | 'followers' | 'private';

interface VisibilityOption {
  id: VisibilityType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    id: 'public',
    label: 'Public',
    description: 'Anyone on Nexus can see this post',
    icon: 'globe-outline',
  },
  {
    id: 'followers',
    label: 'Followers',
    description: 'Only your followers can see this post',
    icon: 'people-outline',
  },
  {
    id: 'private',
    label: 'Only Me',
    description: 'Only you can see this post',
    icon: 'lock-closed-outline',
  },
];

export const CreatePostScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [quotedPost, setQuotedPost] = useState<Post | undefined>(route.params?.quotedPost);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('public');
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentVisibilityOption =
    VISIBILITY_OPTIONS.find((opt) => opt.id === visibility) || VISIBILITY_OPTIONS[0];

  const pickImages = async () => {
    if (images.length >= 4) {
      Alert.alert('Limit reached', 'You can attach up to 4 images.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4 - images.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris].slice(0, 4));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed && images.length === 0) {
      Alert.alert('Empty post', 'Add some text or at least one image to post.');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();

      if (trimmed) {
        formData.append('content', trimmed);
      }

      formData.append('visibility', visibility);

      if (quotedPost) {
        formData.append('quotedPost', quotedPost._id);
      }

      images.forEach((uri, idx) => {
        const ext = uri.split('.').pop() || 'jpg';
        // @ts-ignore
        formData.append('media', {
          uri,
          type: `image/${ext}`,
          name: `upload-${Date.now()}-${idx}.${ext}`,
        });
      });

      await apiClient.post('/posts/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        'Post creation failed',
        err.response?.data?.message || err.message || 'Error creating post'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPostValid = content.trim().length > 0 || images.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={quotedPost ? 'Quote Post' : 'New Post'}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            disabled={!isPostValid || isSubmitting}
            onPress={handleSubmit}
            style={[styles.postButton, (!isPostValid || isSubmitting) && styles.postButtonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollArea} keyboardShouldPersistTaps="handled">
        {/* Author + Visibility Pill */}
        <View style={styles.authorBar}>
          <Avatar uri={user?.avatar} name={user?.username} size={42} />
          <View style={styles.authorMeta}>
            <Text style={styles.authorName}>{user?.username}</Text>
            <TouchableOpacity
              onPress={() => setIsVisibilityModalOpen(true)}
              style={styles.visibilityPill}
            >
              <Ionicons name={currentVisibilityOption.icon} size={13} color={darkTheme.accent} />
              <Text style={styles.visibilityPillText}>{currentVisibilityOption.label}</Text>
              <Ionicons name="chevron-down" size={12} color={darkTheme.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Text Input */}
        <TextInput
          style={styles.textInput}
          placeholder="What's happening?"
          placeholderTextColor={darkTheme.fgMuted}
          multiline
          value={content}
          onChangeText={setContent}
          autoFocus
        />

        {/* Quoted Post Preview */}
        {quotedPost && (
          <View style={styles.quotedPreview}>
            <View style={styles.quotedHeader}>
              <View style={styles.quotedAuthorSection}>
                <Avatar
                  uri={quotedPost.authorId?.avatar}
                  name={quotedPost.authorId?.username}
                  size={20}
                />
                <Text style={styles.quotedUsername}>{quotedPost.authorId?.username}</Text>
              </View>
              <TouchableOpacity onPress={() => setQuotedPost(undefined)}>
                <Ionicons name="close" size={16} color={darkTheme.fgMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.quotedText} numberOfLines={2}>
              {quotedPost.content}
            </Text>
          </View>
        )}

        {/* Selected Images Preview */}
        {images.length > 0 && (
          <View style={styles.mediaPreviewGrid}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageThumbContainer}>
                <Image source={{ uri }} style={styles.imageThumb} contentFit="cover" />
                <TouchableOpacity onPress={() => removeImage(index)} style={styles.removeBtn}>
                  <Ionicons name="close" size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Media & Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={pickImages} style={styles.toolBtn}>
          <Ionicons name="image-outline" size={22} color={darkTheme.accent} />
          <Text style={styles.toolBtnText}>Media ({images.length}/4)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsVisibilityModalOpen(true)}
          style={styles.toolBtn}
        >
          <Ionicons name={currentVisibilityOption.icon} size={20} color={darkTheme.fgMuted} />
          <Text style={styles.toolBtnTextSecondary}>{currentVisibilityOption.label}</Text>
        </TouchableOpacity>
      </View>

      {/* Visibility Modal Picker */}
      <Modal
        visible={isVisibilityModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisibilityModalOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsVisibilityModalOpen(false)}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Audience</Text>
              <TouchableOpacity onPress={() => setIsVisibilityModalOpen(false)}>
                <Ionicons name="close" size={22} color={darkTheme.fgMuted} />
              </TouchableOpacity>
            </View>

            {VISIBILITY_OPTIONS.map((opt) => {
              const isSelected = opt.id === visibility;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => {
                    setVisibility(opt.id);
                    setIsVisibilityModalOpen(false);
                  }}
                  style={[styles.visibilityOption, isSelected && styles.visibilityOptionSelected]}
                >
                  <View style={styles.optionIconBox}>
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={isSelected ? darkTheme.accent : darkTheme.fg}
                    />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text
                      style={[styles.optionLabel, isSelected && { color: darkTheme.accent }]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.optionDescription}>{opt.description}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={darkTheme.accent} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.bg,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  authorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  authorMeta: {
    justifyContent: 'center',
  },
  authorName: {
    color: darkTheme.fg,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  visibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    alignSelf: 'flex-start',
  },
  visibilityPillText: {
    color: darkTheme.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  textInput: {
    color: darkTheme.fg,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  postButton: {
    backgroundColor: darkTheme.accent,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonDisabled: {
    opacity: 0.4,
  },
  postButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  quotedPreview: {
    borderWidth: 1,
    borderColor: darkTheme.borderStrong,
    borderRadius: 12,
    padding: 12,
    backgroundColor: darkTheme.surface,
    marginTop: 12,
  },
  quotedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quotedAuthorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quotedUsername: {
    color: darkTheme.fg,
    fontSize: 13,
    fontWeight: '600',
  },
  quotedText: {
    color: darkTheme.fgMuted,
    fontSize: 13,
  },
  mediaPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  imageThumbContainer: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 3,
  },
  toolbar: {
    borderTopWidth: 1,
    borderTopColor: darkTheme.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolBtnText: {
    color: darkTheme.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  toolBtnTextSecondary: {
    color: darkTheme.fgMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    fontSize: 17,
    fontWeight: '700',
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: darkTheme.bg,
  },
  visibilityOptionSelected: {
    borderWidth: 1,
    borderColor: darkTheme.accent,
  },
  optionIconBox: {
    marginRight: 14,
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    color: darkTheme.fg,
    fontSize: 15,
    fontWeight: '700',
  },
  optionDescription: {
    color: darkTheme.fgMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
