import { ScreenIntro } from '../../components/common/ScreenIntro';
import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { PostCard } from '../../components/feed/PostCard';
import { SidebarDrawer } from '../../components/navigation/SidebarDrawer';
import { PostFeedSkeleton } from '../../components/common/Skeleton';
import { useFeed, usePostMutations } from './useFeed';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';
import { Post } from '../../types';

export const FeedScreen = () => {
  const { colors, styles } = useThemedStyles(createStyles);
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'discover' | 'following'>('discover');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Discover feed state & query
  const [discoverPage, setDiscoverPage] = useState(1);
  const {
    data: discoverData,
    isLoading: isDiscoverLoading,
    isRefetching: isDiscoverRefetching,
    refetch: refetchDiscover,
  } = useFeed(discoverPage, 'discover');

  // Following feed state & query
  const [followingPage, setFollowingPage] = useState(1);
  const {
    data: followingData,
    isLoading: isFollowingLoading,
    isRefetching: isFollowingRefetching,
    refetch: refetchFollowing,
  } = useFeed(followingPage, 'following');

  const { likePost, unlikePost, bookmarkPost, repostPost, pinPost, unpinPost, deletePost } =
    usePostMutations();

  // Active feed data based on selected tab
  const isDiscover = activeTab === 'discover';
  const currentData = isDiscover ? discoverData : followingData;
  const currentLoading = isDiscover ? isDiscoverLoading : isFollowingLoading;
  const currentRefetching = isDiscover ? isDiscoverRefetching : isFollowingRefetching;
  const currentRefetch = isDiscover ? refetchDiscover : refetchFollowing;
  const posts = currentData?.posts || [];

  const handleLikeToggle = (postId: string) => {
    const post = posts.find((p) => p._id === postId);
    if (!post) return;
    const isLiked = user
      ? post.likes?.some(
          (id: any) => id === user._id || id?._id === user._id || id === 'optimistic'
        )
      : false;
    if (isLiked) {
      unlikePost(postId);
    } else {
      likePost(postId);
    }
  };

  const pinnedPostId = user?.pinnedPost?._id || user?.pinnedPost;

  const renderPost = ({ item }: { item: Post }) => {
    const isItemPinned =
      !!pinnedPostId && (item._id === pinnedPostId || item._id === pinnedPostId.toString());
    return (
      <PostCard
        post={item}
        currentUserId={user?._id}
        isPinned={isItemPinned}
        onLike={handleLikeToggle}
        onBookmark={(id) => bookmarkPost(id)}
        onRepost={(id) => repostPost(id)}
        onQuote={(quoted) => navigation.navigate('CreatePost', { quotedPost: quoted })}
        onComment={(id) => navigation.navigate('PostDetail', { postId: id })}
        onPressPost={(id) => navigation.navigate('PostDetail', { postId: id })}
        onPressAuthor={(authorId) => navigation.navigate('UserProfile', { userId: authorId })}
        onPin={(id) => pinPost(id)}
        onUnpin={() => unpinPost()}
        onDelete={(id) => deletePost(id)}
      />
    );
  };

  const feedOpening = <>
    <ScreenIntro label="The everyday, together" title="Your world, in words." />
    <TouchableOpacity style={styles.composeInvitation} onPress={() => navigation.navigate('CreatePost')} accessibilityRole="button" accessibilityLabel="Write a post">
      <Avatar uri={user?.avatar} name={user?.username} size={34} />
      <Text style={styles.composePrompt}>Share a thought…</Text><Ionicons name="create-outline" size={21} color={colors.accentText} />
    </TouchableOpacity>
      {/* Discover | Following Segmented Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.7}
          onPress={() => setActiveTab('discover')}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name={isDiscover ? 'compass' : 'compass-outline'}
              size={18}
              color={isDiscover ? colors.fg : colors.fgMuted}
            />
            <Text style={[styles.tabText, isDiscover && styles.tabTextActive]}>
              Discover
            </Text>
          </View>
          {isDiscover && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.7}
          onPress={() => setActiveTab('following')}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name={!isDiscover ? 'people' : 'people-outline'}
              size={18}
              color={!isDiscover ? colors.fg : colors.fgMuted}
            />
            <Text style={[styles.tabText, !isDiscover && styles.tabTextActive]}>
              Following
            </Text>
          </View>
          {!isDiscover && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>

  </>;

  return (
    <View style={styles.container}>
      {/* Top Header: Left = Brand Logo trigger, Center = Nexus branding, Right = User Avatar */}
      <Header
        title="Nexus"
        showBrand={true}
        onBrandPress={() => setIsSidebarOpen(true)}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProfileTab')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="View your profile"
          >
            <Avatar uri={user?.avatar} name={user?.username || 'User'} size={36} />
          </TouchableOpacity>
        }
      />

      {/* Main Feed Content */}
      {currentLoading && posts.length === 0 ? (
        <View style={{ flex: 1 }}>{feedOpening}<PostFeedSkeleton count={4} /></View>
      ) : posts.length === 0 ? (
        <View style={{ flex: 1 }}>{feedOpening}<View style={styles.centerContainer}>
          <Ionicons
            name={isDiscover ? 'newspaper-outline' : 'people-outline'}
            size={52}
            color={colors.fgMuted}
          />
          <Text style={styles.emptyTitle}>
            {isDiscover ? 'No Posts Yet' : 'No Following Posts'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isDiscover
              ? 'Be the first to share an update with the community!'
              : user?.following?.length === 0
              ? "You aren't following anyone yet. Discover creators and follow them to see their posts here!"
              : "The people you follow haven't posted anything recently."}
          </Text>
          {!isDiscover && (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              activeOpacity={0.8}
              onPress={() => setActiveTab('discover')}
            >
              <Text style={styles.emptyActionBtnText}>Explore Discover Feed</Text>
            </TouchableOpacity>
          )}
        </View></View>
      ) : (
        <FlatList
          ListHeaderComponent={feedOpening}
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderPost}
          refreshControl={
            <RefreshControl
              refreshing={currentRefetching}
              onRefresh={currentRefetch}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}


      {/* Modern Sidebar Navigation Drawer */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </View>
  );
};

const createStyles = (colors: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  composeInvitation: { marginHorizontal: 20, marginBottom: 22, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  composePrompt: { flex: 1, fontSize: 15, color: colors.fgMuted },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderBottomWidth: 0,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  tabText: {
    color: colors.fgMuted,
    fontSize: metrics.body,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.fg,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.accent,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: colors.fg,
    fontSize: metrics.title,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySubtitle: {
    color: colors.fgMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyActionBtn: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  emptyActionBtnText: {
    color: colors.accentText,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 90, // Room for Floating Action Button
  },
});
