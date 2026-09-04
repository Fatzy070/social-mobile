import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { Post } from '../../types';
import { useAuthStore } from '../../store/authStore';

export const useFeed = (page = 1) => {
  return useQuery({
    queryKey: [...queryKeys.posts.feed, page],
    queryFn: async () => {
      const { data } = await apiClient.get(`/posts/feed?page=${page}&limit=20`);
      return {
        posts: (data.posts || []) as Post[],
        hasMore: !!data.hasMore,
        page: data.page || page,
      };
    },
  });
};

export const usePostMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currentUserId = user?._id || 'temp-user-id';

  // Helper to update a post across any post list or detail cache
  const updatePostInCaches = (postId: string, updater: (p: Post) => Post) => {
    // 1. Update all posts queries (feed, userPosts, bookmarked, etc.)
    queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
      if (!old) return old;
      if (old.posts && Array.isArray(old.posts)) {
        return {
          ...old,
          posts: old.posts.map((p: Post) => (p._id === postId ? updater(p) : p)),
        };
      }
      if (Array.isArray(old)) {
        return old.map((p: Post) => (p._id === postId ? updater(p) : p));
      }
      return old;
    });

    // 2. Update post detail query if present
    queryClient.setQueryData(queryKeys.posts.detail(postId), (old: any) => {
      if (!old) return old;
      return updater(old);
    });
  };

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await apiClient.post(`/posts/${postId}/like`);
      return data;
    },
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      // Optimistic update
      updatePostInCaches(postId, (p) => {
        const hasLiked = p.likes?.includes(currentUserId);
        if (hasLiked) return p;
        return {
          ...p,
          likes: [...(p.likes || []), currentUserId],
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const unlikePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await apiClient.post(`/posts/${postId}/unlike`);
      return data;
    },
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      // Optimistic update
      updatePostInCaches(postId, (p) => {
        return {
          ...p,
          likes: (p.likes || []).filter((id) => id !== currentUserId),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await apiClient.post(`/posts/${postId}/bookmark`);
      return data;
    },
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      // Optimistic update
      updatePostInCaches(postId, (p) => {
        const bookmarks = p.bookMark || [];
        const isBookmarked = bookmarks.includes(currentUserId);
        return {
          ...p,
          bookMark: isBookmarked
            ? bookmarks.filter((id) => id !== currentUserId)
            : [...bookmarks, currentUserId],
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.bookmarked });
    },
  });

  const repostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await apiClient.post(`/posts/${postId}/repost`);
      return data;
    },
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      // Optimistic update
      updatePostInCaches(postId, (p) => {
        const reposts = p.reposts || [];
        const isReposted = reposts.includes(currentUserId);
        return {
          ...p,
          reposts: isReposted
            ? reposts.filter((id) => id !== currentUserId)
            : [...reposts, currentUserId],
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  return {
    likePost: likePostMutation.mutate,
    unlikePost: unlikePostMutation.mutate,
    bookmarkPost: bookmarkMutation.mutate,
    repostPost: repostMutation.mutate,
  };
};
