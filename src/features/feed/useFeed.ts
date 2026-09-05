import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { Post } from '../../types';
import { useAuthStore } from '../../store/authStore';

export const useFeed = (page = 1, mode: 'discover' | 'following' = 'discover') => {
  return useQuery({
    queryKey: mode === 'following' ? [...queryKeys.posts.following, page] : [...queryKeys.posts.feed, page],
    queryFn: async () => {
      const url =
        mode === 'following'
          ? `/posts/feed?filter=following&page=${page}&limit=20`
          : `/posts/feed?page=${page}&limit=20`;
      const { data } = await apiClient.get(url);
      return {
        posts: (data.posts || []) as Post[],
        hasMore: !!data.hasMore,
        page: data.page || page,
      };
    },
    staleTime: 60 * 1000, // Keep cached feed fresh in memory for 1 minute before refetching in background
    gcTime: 10 * 60 * 1000,
  });
};

export const usePostMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currentUserId = user?._id || 'temp-user-id';

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      console.log(`[LIKE] 🚀 Sending API request: POST /posts/${postId}/like`);
      const { data } = await apiClient.post(`/posts/${postId}/like`);
      console.log(`[LIKE] ✅ Like successful for post ${postId}:`, data?.message || 'Liked');
      return { postId, ...data };
    },
    onMutate: async (postId: string) => {
      console.log(`[LIKE] 👍 Button pressed for post: ${postId}. Applying optimistic update (red heart + increment)...`);
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.detail(postId) });

      const previousPosts = queryClient.getQueriesData({ queryKey: ['posts'] });
      const previousSinglePost = queryClient.getQueryData(queryKeys.posts.detail(postId));

      // Optimistically update all posts query caches (feed, userPosts, bookmarked, etc.)
      queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old) return old;
        if (old.posts && Array.isArray(old.posts)) {
          return {
            ...old,
            posts: old.posts.map((p: any) => {
              if (p._id !== postId) return p;
              const alreadyLiked = p.likes?.some(
                (id: any) => id === currentUserId || id?._id === currentUserId || id === 'optimistic'
              );
              if (alreadyLiked) return p;
              return {
                ...p,
                likes: [...(p.likes || []), currentUserId],
                likesCount: (p.likesCount ?? p.likes?.length ?? 0) + 1,
              };
            }),
          };
        }
        if (Array.isArray(old)) {
          return old.map((p: any) => {
            if (p._id !== postId) return p;
            const alreadyLiked = p.likes?.some(
              (id: any) => id === currentUserId || id?._id === currentUserId || id === 'optimistic'
            );
            if (alreadyLiked) return p;
            return {
              ...p,
              likes: [...(p.likes || []), currentUserId],
              likesCount: (p.likesCount ?? p.likes?.length ?? 0) + 1,
            };
          });
        }
        return old;
      });

      // Optimistically update single post detail query
      queryClient.setQueryData(queryKeys.posts.detail(postId), (old: any) => {
        if (!old) return old;
        const alreadyLiked = old.likes?.some(
          (id: any) => id === currentUserId || id?._id === currentUserId || id === 'optimistic'
        );
        if (alreadyLiked) return old;
        return {
          ...old,
          likes: [...(old.likes || []), currentUserId],
          likesCount: (old.likesCount ?? old.likes?.length ?? 0) + 1,
        };
      });

      return { previousPosts, previousSinglePost };
    },
    onError: (err: any, postId, context) => {
      console.error(`[LIKE] ❌ Like mutation failed for post ${postId}:`, err.response?.data?.message || err.message);
      context?.previousPosts?.forEach(([key, data]: any) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousSinglePost) {
        queryClient.setQueryData(queryKeys.posts.detail(postId), context.previousSinglePost);
      }
    },
    onSettled: (_data, _err, postId) => {
      console.log(`[LIKE] 🔄 Like settled for post ${postId}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
    },
  });

  const unlikePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      console.log(`[UNLIKE] 🚀 Sending API request: POST /posts/${postId}/unlike`);
      const { data } = await apiClient.post(`/posts/${postId}/unlike`);
      console.log(`[UNLIKE] ✅ Unlike successful for post ${postId}:`, data?.message || 'Unliked');
      return { postId, ...data };
    },
    onMutate: async (postId: string) => {
      console.log(`[UNLIKE] 💔 Button pressed for post: ${postId}. Applying optimistic decrement...`);
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.detail(postId) });

      const previousPosts = queryClient.getQueriesData({ queryKey: ['posts'] });
      const previousSinglePost = queryClient.getQueryData(queryKeys.posts.detail(postId));

      queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old) return old;
        if (old.posts && Array.isArray(old.posts)) {
          return {
            ...old,
            posts: old.posts.map((p: any) => {
              if (p._id !== postId) return p;
              const filteredLikes = (p.likes || []).filter(
                (id: any) => id !== currentUserId && id?._id !== currentUserId && id !== 'optimistic'
              );
              return {
                ...p,
                likes: filteredLikes,
                likesCount: Math.max(0, (p.likesCount ?? p.likes?.length ?? 1) - 1),
              };
            }),
          };
        }
        if (Array.isArray(old)) {
          return old.map((p: any) => {
            if (p._id !== postId) return p;
            const filteredLikes = (p.likes || []).filter(
              (id: any) => id !== currentUserId && id?._id !== currentUserId && id !== 'optimistic'
            );
            return {
              ...p,
              likes: filteredLikes,
              likesCount: Math.max(0, (p.likesCount ?? p.likes?.length ?? 1) - 1),
            };
          });
        }
        return old;
      });

      queryClient.setQueryData(queryKeys.posts.detail(postId), (old: any) => {
        if (!old) return old;
        const filteredLikes = (old.likes || []).filter(
          (id: any) => id !== currentUserId && id?._id !== currentUserId && id !== 'optimistic'
        );
        return {
          ...old,
          likes: filteredLikes,
          likesCount: Math.max(0, (old.likesCount ?? old.likes?.length ?? 1) - 1),
        };
      });

      return { previousPosts, previousSinglePost };
    },
    onError: (err: any, postId, context) => {
      console.error(`[UNLIKE] ❌ Unlike mutation failed for post ${postId}:`, err.response?.data?.message || err.message);
      context?.previousPosts?.forEach(([key, data]: any) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousSinglePost) {
        queryClient.setQueryData(queryKeys.posts.detail(postId), context.previousSinglePost);
      }
    },
    onSettled: (_data, _err, postId) => {
      console.log(`[UNLIKE] 🔄 Unlike settled for post ${postId}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async (postId: string) => {
      console.log(`[BOOKMARK] 🚀 API request: POST /posts/${postId}/bookmark`);
      const { data } = await apiClient.post(`/posts/${postId}/bookmark`);
      console.log(`[BOOKMARK] ✅ Bookmark successful for post ${postId}:`, data?.message || 'Updated');
      return data;
    },
    onMutate: async (postId: string) => {
      console.log(`[BOOKMARK] 📌 Button pressed for post: ${postId}. Optimistically toggling bookmark state (zero reload)...`);
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      const previousPosts = queryClient.getQueriesData({ queryKey: ['posts'] });

      queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old) return old;
        const toggleBookmark = (p: any) => {
          const bookmarks = p.bookMark || [];
          const isBookmarked = bookmarks.some(
            (id: any) => id === currentUserId || id?._id === currentUserId
          );
          return {
            ...p,
            bookMark: isBookmarked
              ? bookmarks.filter((id: any) => id !== currentUserId && id?._id !== currentUserId)
              : [...bookmarks, currentUserId],
          };
        };

        if (old.posts && Array.isArray(old.posts)) {
          return {
            ...old,
            posts: old.posts.map((p: any) => (p._id === postId ? toggleBookmark(p) : p)),
          };
        }
        if (Array.isArray(old)) {
          return old.map((p: any) => (p._id === postId ? toggleBookmark(p) : p));
        }
        return old;
      });

      queryClient.setQueryData(queryKeys.posts.detail(postId), (old: any) => {
        if (!old) return old;
        const bookmarks = old.bookMark || [];
        const isBookmarked = bookmarks.some(
          (id: any) => id === currentUserId || id?._id === currentUserId
        );
        return {
          ...old,
          bookMark: isBookmarked
            ? bookmarks.filter((id: any) => id !== currentUserId && id?._id !== currentUserId)
            : [...bookmarks, currentUserId],
        };
      });

      return { previousPosts };
    },
    onError: (err: any, postId, context) => {
      const errMsg = err.response?.data?.message || err.message || 'Bookmark error';
      console.error(`[BOOKMARK] ❌ Mutation failed for post ${postId}:`, errMsg);
      context?.previousPosts?.forEach(([key, data]: any) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: (_data, _err, postId) => {
      console.log(`[BOOKMARK] 🔄 Bookmark settled for post ${postId}. Updating bookmark cache.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.bookmarked });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
    },
  });

  const repostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await apiClient.post(`/posts/${postId}/repost`);
      return data;
    },
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      const previousPosts = queryClient.getQueriesData({ queryKey: ['posts'] });

      queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old) return old;
        const toggleRepost = (p: any) => {
          const reposts = p.reposts || [];
          const isReposted = reposts.some(
            (id: any) => id === currentUserId || id?._id === currentUserId
          );
          return {
            ...p,
            reposts: isReposted
              ? reposts.filter((id: any) => id !== currentUserId && id?._id !== currentUserId)
              : [...reposts, currentUserId],
          };
        };

        if (old.posts && Array.isArray(old.posts)) {
          return {
            ...old,
            posts: old.posts.map((p: any) => (p._id === postId ? toggleRepost(p) : p)),
          };
        }
        if (Array.isArray(old)) {
          return old.map((p: any) => (p._id === postId ? toggleRepost(p) : p));
        }
        return old;
      });

      queryClient.setQueryData(queryKeys.posts.detail(postId), (old: any) => {
        if (!old) return old;
        const reposts = old.reposts || [];
        const isReposted = reposts.some(
          (id: any) => id === currentUserId || id?._id === currentUserId
        );
        return {
          ...old,
          reposts: isReposted
            ? reposts.filter((id: any) => id !== currentUserId && id?._id !== currentUserId)
            : [...reposts, currentUserId],
        };
      });

      return { previousPosts };
    },
    onError: (_err, _postId, context) => {
      context?.previousPosts?.forEach(([key, data]: any) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const pinPostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await apiClient.post(`/posts/${postId}/pin`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(currentUserId) });
    },
  });

  const unpinPostMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/posts/unpin');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(currentUserId) });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await apiClient.delete(`/posts/${postId}/delete`);
      return data;
    },
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      const previousPosts = queryClient.getQueriesData({ queryKey: ['posts'] });

      queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old) return old;
        if (old.posts && Array.isArray(old.posts)) {
          return {
            ...old,
            posts: old.posts.filter((p: any) => p._id !== postId),
          };
        }
        if (Array.isArray(old)) {
          return old.filter((p: any) => p._id !== postId);
        }
        return old;
      });

      return { previousPosts };
    },
    onError: (_err, _postId, context) => {
      context?.previousPosts?.forEach(([key, data]: any) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(currentUserId) });
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log('[CREATE-POST-MEDIA] Sending create post request to POST /posts/create');
      const { data } = await apiClient.post('/posts/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('[CREATE-POST-MEDIA] API response:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('[CREATE-POST-MEDIA] Post created successfully, invalidating feed cache');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(currentUserId) });
      }
    },
    onError: (err: any) => {
      console.error('[CREATE-POST-MEDIA] Error creating post:', err.response?.data?.message || err.message);
    },
  });

  return {
    createPost: createPostMutation.mutateAsync,
    isCreatingPost: createPostMutation.isPending,
    likePost: likePostMutation.mutate,
    unlikePost: unlikePostMutation.mutate,
    bookmarkPost: bookmarkMutation.mutate,
    repostPost: repostMutation.mutate,
    pinPost: pinPostMutation.mutate,
    unpinPost: unpinPostMutation.mutate,
    deletePost: deletePostMutation.mutate,
  };
};
