import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  StatusBar,
  Text,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';

interface ImageViewerModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [downloading, setDownloading] = useState(false);

  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, visible]);

  if (!visible || images.length === 0) return null;

  const currentImageUri = images[currentIndex];

  const handleDownload = async () => {
    if (!currentImageUri) return;

    try {
      setDownloading(true);

      // Determine clean filename and extension
      const urlWithoutQuery = currentImageUri.split('?')[0];
      const ext = urlWithoutQuery.split('.').pop() || 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext.toLowerCase()) ? ext : 'jpg';
      const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const localFileUri = `${targetDir}image_${Date.now()}.${safeExt}`;

      console.log('[IMAGE-VIEWER] Downloading image to local cache:', localFileUri);
      const downloadResult = await FileSystem.downloadAsync(currentImageUri, localFileUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download image: HTTP ${downloadResult.status}`);
      }

      // Try saving to user's photo/media library
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (permission.granted) {
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        Alert.alert('Saved', 'Photo saved to your library.');
      } else {
        // Fallback to native sharing sheet if permission is denied
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            dialogTitle: 'Save or share photo',
          });
        } else {
          Alert.alert('Notice', 'Photo library permission was denied.');
        }
      }
    } catch (err: any) {
      console.error('[IMAGE-VIEWER] Download failed:', err);
      // Try fallback to sharing if saveToLibrary failed
      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare && currentImageUri) {
          const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
          const localFallback = `${targetDir}share_${Date.now()}.jpg`;
          const res = await FileSystem.downloadAsync(currentImageUri, localFallback);
          await Sharing.shareAsync(res.uri);
          return;
        }
      } catch {}
      Alert.alert('Download Error', err?.message || 'Failed to save image.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.backdrop}>
        <View style={[styles.topBar, { top: insets.top + 12 }]}>
          <TouchableOpacity accessibilityLabel="Close image viewer"
              onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>

          <Text style={styles.counterText}>
            {currentIndex + 1} / {images.length}
          </Text>

          <TouchableOpacity
            accessibilityLabel="Save image"
              onPress={handleDownload}
            style={styles.iconButton}
            disabled={downloading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="download-outline" size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.imageWrapper, { width, height: height * 0.8 }]}>
          <Image
            source={{ uri: currentImageUri }}
            style={styles.fullImage}
            contentFit="contain"
            transition={200}
          />
        </View>

        {images.length > 1 && (
          <View style={[styles.navBar, { bottom: insets.bottom + 24 }]}>
            <TouchableOpacity
              disabled={currentIndex === 0}
              onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
            >
              <Ionicons name="chevron-back" size={24} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              disabled={currentIndex === images.length - 1}
              onPress={() => setCurrentIndex((prev) => Math.min(images.length - 1, prev + 1))}
              style={[styles.navBtn, currentIndex === images.length - 1 && styles.navBtnDisabled]}
            >
              <Ionicons name="chevron-forward" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',

    left: 16,
    right: 16,
    zIndex: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  iconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {

    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  navBar: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    gap: 40,
  },
  navBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    padding: 12,
    borderRadius: 30,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
});
