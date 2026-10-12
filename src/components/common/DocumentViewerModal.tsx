import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Text,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';

interface DocumentViewerModalProps {
  visible: boolean;
  docUrl?: string | null;
  fileName?: string | null;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  visible,
  docUrl,
  fileName,
  onClose,
}) => {
  const { colors, styles } = useThemedStyles(createStyles);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  if (!visible || !docUrl) return null;

  // Derive display title
  const displayName =
    fileName ||
    decodeURIComponent(docUrl.split('/').pop()?.split('?')[0] || 'Document');

  // Check if file is PDF
  const isPdf = /\.pdf($|\?)/i.test(docUrl);

  // WebView source URL:
  // On iOS, native WebKit can directly render PDF files.
  // On Android, WebView does not natively render raw PDFs without an external renderer or Google Docs viewer.
  const webViewUri =
    Platform.OS === 'android' && isPdf
      ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(docUrl)}`
      : docUrl;

  const handleDownload = async () => {
    if (!docUrl) return;

    try {
      setDownloading(true);

      // Clean local filename
      const safeName = displayName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const localFileUri = `${targetDir}${Date.now()}_${safeName}`;

      console.log('[DOC-VIEWER] Downloading document from:', docUrl, 'to:', localFileUri);
      const downloadResult = await FileSystem.downloadAsync(docUrl, localFileUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download document: HTTP ${downloadResult.status}`);
      }

      // Check if sharing is available to save/open/share
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(downloadResult.uri, {
          dialogTitle: `Save or share ${displayName}`,
          mimeType: isPdf ? 'application/pdf' : undefined,
          UTI: isPdf ? 'com.adobe.pdf' : undefined,
        });
      } else {
        Alert.alert('Downloaded', 'Document downloaded successfully.');
      }
    } catch (err: any) {
      console.error('[DOC-VIEWER] Error downloading document:', err);
      Alert.alert('Download Error', err?.message || 'Could not download document. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#121214" />
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleDownload}
            style={styles.headerBtn}
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

        {/* Document Content View */}
        <View style={styles.content}>
          <WebView
            source={{ uri: webViewUri }}
            style={styles.webview}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.accentText} />
                <Text style={styles.loadingText}>Loading document preview...</Text>
              </View>
            )}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('[DOC-VIEWER] WebView error:', nativeEvent);
              setLoading(false);
            }}
            scalesPageToFit={true}
          />
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 14,
    paddingHorizontal: metrics.gutter,
    backgroundColor: '#121214',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#1c1c20',
  },
  webview: {
    flex: 1,
    backgroundColor: '#1c1c20',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0a0a0c',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.fgMuted,
    fontSize: 14,
  },
});
