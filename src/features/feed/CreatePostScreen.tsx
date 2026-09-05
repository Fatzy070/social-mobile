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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const [images, setImages] = useState<Array<{ uri: string; mimeType: string; fileName: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentVisibilityOption =
    VISIBILITY_OPTIONS.find((opt) => opt.id === visibility) || VISIBILITY_OPTIONS[0];

  const getMimeTypeFromUri = (uri: string) => {
    const ext = uri.split('.').pop()?.toLowerCase() || '';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'gif') return 'image/gif';
    return 'image/jpeg';
  };

  const pickImages = async () => {
    console.log('[CREATE-POST-MEDIA] Image button pressed');
    if (images.length >= 4) {
      Alert.alert('Limit reached', 'You can attach up to 4 images per post.');
      return;
    }

    try {
      console.log('[CREATE-POST-MEDIA] Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[CREATE-POST-MEDIA] Permission status:', status);

      if (status !== 'granted') {
        console.warn('[CREATE-POST-MEDIA] Media library permission denied');
        Alert.alert(
          'Permission required',
          'Photo library access is required to select photos for your post. Please enable it in Settings.'
        );
        return;
      }

      console.log('[CREATE-POST-MEDIA] Opening image library');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 4 - images.length,
        quality: 0.8,
      });

      console.log('[CREATE-POST-MEDIA] Image picker result canceled:', result.canceled);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('[CREATE-POST-MEDIA] Assets selected:', result.assets.length);

        const newImages = result.assets.map((asset, idx) => {
          const mimeType = asset.mimeType || getMimeTypeFromUri(asset.uri);
          const ext = mimeType.split('/')[1] || 'jpg';
          const fileName = asset.fileName || `post-image-${Date.now()}-${idx}.${ext}`;

          console.log(`[CREATE-POST-MEDIA] Asset URI: ${asset.uri}`);
          console.log(`[CREATE-POST-MEDIA] MIME type: ${mimeType}`);
          console.log(`[CREATE-POST-MEDIA] File name: ${fileName}`);

          return {
            uri: asset.uri,
            mimeType,
            fileName,
          };
        });

        setImages((prev) => [...prev, ...newImages].slice(0, 4));
      }
    } catch (err: any) {
      console.error('[CREATE-POST-MEDIA] Error opening image library:', err);
      Alert.alert('Error', 'An unexpected error occurred while opening the photo library.');
    }
  };

  const removeImage = (index: number) => {
    console.log('[CREATE-POST-MEDIA] Removing selected image at index:', index);
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
      console.log('[CREATE-POST-MEDIA] Preparing upload');
      const formData = new FormData();

      if (trimmed) {
        formData.append('content', trimmed);
      }

      formData.append('visibility', visibility);

      if (quotedPost) {
        formData.append('quotedPost', quotedPost._id);
      }

      images.forEach((img, idx) => {
        const ext = img.fileName.split('.').pop() || 'jpg';
        // @ts-ignore React Native FormData file shape
        formData.append('media', {
          uri: img.uri,
          type: img.mimeType || `image/${ext}`,
          name: img.fileName,
        });
      });

      console.log('[CREATE-POST-MEDIA] Sending create post request to POST /posts/create');
      const { data } = await apiClient.post('/posts/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('[CREATE-POST-MEDIA] API response:', data);
      console.log('[CREATE-POST-MEDIA] Post created successfully');

      // Invalidate feed and user profile caches silently without page or app reload
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      if (user?._id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(user._id) });
      }

      navigation.goBack();
    } catch (err: any) {
      console.error('[CREATE-POST-MEDIA] Error:', err.response?.data?.message || err.message || err);
      Alert.alert(
        'Post creation failed',
        err.response?.data?.message || err.message || 'Error creating post'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Image-only posts allowed: valid if trimmed text OR at least 1 image
  const isPostValid = content.trim().length > 0 || images.length > 0;

  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
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
        {/* Author + Visibility Pill + Quick Media Action */}
        <View style={styles.authorBar}>
          <Avatar uri={user?.avatar} name={user?.username} size={42} />
          <View style={styles.authorMeta}>
            <Text style={styles.authorName}>{user?.username}</Text>
            {/* <View style={styles.authorActionsRow}>
              <TouchableOpacity
                onPress={() => setIsVisibilityModalOpen(true)}
                style={styles.visibilityPill}
              >
                <Ionicons name={currentVisibilityOption.icon} size={13} color={darkTheme.accent} />
                <Text style={styles.visibilityPillText}>{currentVisibilityOption.label}</Text>
                <Ionicons name="chevron-down" size={12} color={darkTheme.accent} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={pickImages}
                disabled={images.length >= 4}
                style={[styles.topImageBtn, images.length >= 4 && styles.mediaActionBtnDisabled]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="image" size={15} color={darkTheme.accent} />
                <Text style={styles.topImageBtnText}>
                  {images.length > 0 ? `${images.length}/4` : 'Photo'}
                </Text>
              </TouchableOpacity>
            </View> */}
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
          <View style={styles.mediaPreviewContainer}>
            <View style={styles.mediaPreviewHeader}>
              <Text style={styles.mediaCountText}>
                {images.length} of 4 images selected
              </Text>
              {images.length < 4 && (
                <TouchableOpacity
                  onPress={pickImages}
                  style={styles.addMoreBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="add" size={16} color={darkTheme.accent} />
                  <Text style={styles.addMoreText}>Add more</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.mediaPreviewGrid}>
              {images.map((item, index) => (
                <View key={index} style={styles.imageThumbContainer}>
                  <Image source={{ uri: item.uri }} style={styles.imageThumb} contentFit="cover" />
                  <TouchableOpacity
                    onPress={() => removeImage(index)}
                    style={styles.removeBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={16} color="#ffffff" />
                  </TouchableOpacity>
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>{index + 1}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Media & Toolbar (docked right above keyboard when open) */}
      <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.toolbarLeft}>
          <TouchableOpacity
            onPress={pickImages}
            disabled={images.length >= 4}
            style={[styles.mediaActionBtn, images.length >= 4 && styles.mediaActionBtnDisabled]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.imageIconWrapper}>
              <Ionicons name="image" size={22} color={darkTheme.accent} />
            </View>
            <Text style={styles.mediaActionLabel}>
              {images.length > 0 ? `Photo (${images.length}/4)` : 'Add Photos'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setIsVisibilityModalOpen(true)}
          style={styles.visBtn}
        >
          <Ionicons name={currentVisibilityOption.icon} size={18} color={darkTheme.fgMuted} />
          <Text style={styles.visBtnText}>{currentVisibilityOption.label}</Text>
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
  authorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  topImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 3,
    gap: 5,
    alignSelf: 'flex-start',
  },
  topImageBtnText: {
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
  mediaPreviewContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  mediaPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mediaCountText: {
    color: darkTheme.fgMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addMoreText: {
    color: darkTheme.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  mediaPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
  orderBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  orderBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
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
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mediaActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  mediaActionBtnDisabled: {
    opacity: 0.4,
  },
  imageIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaActionLabel: {
    color: darkTheme.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  visBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  visBtnText: {
    color: darkTheme.fgMuted,
    fontSize: 13,
    fontWeight: '600',
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
