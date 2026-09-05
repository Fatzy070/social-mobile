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
import { FloatingCreateButton } from '../../components/common/FloatingCreateButton';
import { PostFeedSkeleton } from '../../components/common/Skeleton';
import { useFeed, usePostMutations } from './useFeed';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { darkTheme } from '../../theme/colors';
import { Post } from '../../types';

export const FeedScreen = () => {
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
              color={isDiscover ? darkTheme.fg : darkTheme.fgMuted}
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
              color={!isDiscover ? darkTheme.fg : darkTheme.fgMuted}
            />
            <Text style={[styles.tabText, !isDiscover && styles.tabTextActive]}>
              Following
            </Text>
          </View>
          {!isDiscover && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Main Feed Content */}
      {currentLoading && posts.length === 0 ? (
        <PostFeedSkeleton count={4} />
      ) : posts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name={isDiscover ? 'newspaper-outline' : 'people-outline'}
            size={52}
            color={darkTheme.fgMuted}
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
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderPost}
          refreshControl={
            <RefreshControl
              refreshing={currentRefetching}
              onRefresh={currentRefetch}
              tintColor={darkTheme.accent}
              colors={[darkTheme.accent]}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button (FAB) for Create Post */}
      <FloatingCreateButton onPress={() => navigation.navigate('CreatePost')} />

      {/* Modern Sidebar Navigation Drawer */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.bg,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: darkTheme.bg,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.border,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  tabText: {
    color: darkTheme.fgMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: darkTheme.fg,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 48,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: darkTheme.accent,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: darkTheme.fg,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySubtitle: {
    color: darkTheme.fgMuted,
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
    backgroundColor: darkTheme.accentMuted,
    borderWidth: 1,
    borderColor: darkTheme.accent,
  },
  emptyActionBtnText: {
    color: darkTheme.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 90, // Room for Floating Action Button
  },
});
