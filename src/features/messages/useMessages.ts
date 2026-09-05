import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { Conversation, Message, ScheduledMessage } from '../../types';

export const useConversations = () => {
  const queryClient = useQueryClient();
  const cached = queryClient.getQueryData(queryKeys.messages.conversations);

  return useQuery({
    queryKey: queryKeys.messages.conversations,
    queryFn: async () => {
      if (cached) {
        console.log('[CHAT-CACHE] Conversation list: background refetch');
      } else {
        console.log('[CHAT-CACHE] Conversation list: initial fetch');
      }
      const { data } = await apiClient.get('/messages/conversations');
      console.log('[CHAT-CACHE] Conversation list: cache updated');
      return {
        conversations: (data.conversations || []) as Conversation[],
        totalUnreadCount: data.totalUnreadCount || 0,
      };
    },
    staleTime: 1000 * 30, // 30 seconds stale-while-revalidate
    gcTime: 1000 * 60 * 30, // Retain in memory for 30 minutes
    refetchInterval: 5000,
    refetchOnMount: true,
  });
};

export const useConversation = (conversationId: string) => {
  const queryClient = useQueryClient();
  const cached = queryClient.getQueryData(queryKeys.messages.conversation(conversationId));

  return useQuery({
    queryKey: queryKeys.messages.conversation(conversationId),
    queryFn: async () => {
      if (cached) {
        console.log(`[CHAT-CACHE] Conversation ${conversationId}: background refetch`);
      } else {
        console.log(`[CHAT-CACHE] Conversation ${conversationId}: initial fetch`);
      }
      const { data } = await apiClient.get(`/messages/conversation/${conversationId}`);
      console.log(`[CHAT-CACHE] Conversation ${conversationId}: cache updated`);
      return data as Conversation;
    },
    enabled: !!conversationId,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 30,
    refetchInterval: 5000,
    refetchOnMount: true,
  });
};

export const useMessages = (conversationId: string) => {
  const queryClient = useQueryClient();
  const cached = queryClient.getQueryData<Message[]>(queryKeys.messages.messages(conversationId));

  return useQuery({
    queryKey: queryKeys.messages.messages(conversationId),
    queryFn: async () => {
      if (cached && cached.length > 0) {
        console.log(`[CHAT-CACHE] Chat ${conversationId}: cache hit (${cached.length} messages) - background refetch`);
      } else {
        console.log(`[CHAT-CACHE] Chat ${conversationId}: initial fetch`);
      }
      const { data } = await apiClient.get(`/messages/${conversationId}`);
      const freshMessages = (data.messages || []) as Message[];
      console.log(`[CHAT-CACHE] Chat ${conversationId}: cache updated (${freshMessages.length} messages)`);
      return freshMessages;
    },
    enabled: !!conversationId,
    staleTime: 1000 * 20, // 20 seconds staleTime
    gcTime: 1000 * 60 * 30, // 30 minutes garbage collection retention
    refetchInterval: 4000,
    refetchOnMount: true,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      console.log('[CHAT-MEDIA] API request dispatched to POST /messages/send');
      const { data } = await apiClient.post('/messages/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('[CHAT-MEDIA] API response received successfully for message:', data?.message?._id);
      return data.message as Message;
    },
    onSuccess: (newMessage, variables) => {
      // Extract conversationId either directly from newMessage or from FormData parts
      // @ts-ignore
      const partConvId = variables?._parts?.find((p: any) => p[0] === 'conversationId')?.[1];
      const conversationId = newMessage?.conversationId || partConvId;

      if (conversationId) {
        console.log('[CHAT-MEDIA] Updating query cache for conversationId:', conversationId);
        queryClient.setQueryData(
          queryKeys.messages.messages(conversationId),
          (old: Message[] = []) => {
            // Avoid duplicate message entry
            if (old.some((m) => m._id === newMessage._id)) return old;
            return [...old, newMessage];
          }
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations });
      }
    },
    onError: (error: any) => {
      console.error('[CHAT-MEDIA] API request failed:', error.response?.status, error.response?.data || error.message);
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      const { data } = await apiClient.delete(`/messages/${messageId}`);
      return { data, messageId, conversationId };
    },
    onSuccess: ({ messageId, conversationId }) => {
      queryClient.setQueryData(
        queryKeys.messages.messages(conversationId),
        (old: Message[] = []) => old.filter((m) => m._id !== messageId)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.pinned(conversationId) });
    },
  });
};

export const useEditMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId,
      text,
      mentions,
    }: {
      messageId: string;
      conversationId: string;
      text: string;
      mentions?: string[];
    }) => {
      const { data } = await apiClient.put(`/messages/${messageId}`, { text, mentions });
      return { updatedMessage: data.message as Message, conversationId };
    },
    onSuccess: ({ updatedMessage, conversationId }) => {
      queryClient.setQueryData(
        queryKeys.messages.messages(conversationId),
        (old: Message[] = []) =>
          old.map((m) => (m._id === updatedMessage._id ? updatedMessage : m))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.pinned(conversationId) });
    },
  });
};

export const useTogglePinMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId,
    }: {
      messageId: string;
      conversationId: string;
    }) => {
      const { data } = await apiClient.put(`/messages/pin/${messageId}`);
      return { data, messageId, conversationId };
    },
    onSuccess: ({ data, messageId, conversationId }) => {
      queryClient.setQueryData(
        queryKeys.messages.messages(conversationId),
        (old: Message[] = []) =>
          old.map((m) => (m._id === messageId ? { ...m, isPinned: data.isPinned } : m))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.pinned(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(conversationId) });
    },
  });
};

export const usePinnedMessages = (conversationId: string) => {
  return useQuery({
    queryKey: queryKeys.messages.pinned(conversationId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/messages/pinned/${conversationId}`);
      return (data.pinnedMessages || []) as Message[];
    },
    enabled: !!conversationId,
  });
};

export const useForwardMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      targetConversationIds,
    }: {
      messageId: string;
      targetConversationIds: string[];
    }) => {
      const { data } = await apiClient.post('/messages/forward', {
        messageId,
        targetConversationIds,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations });
    },
  });
};

export const useMarkMessagesRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data } = await apiClient.post(`/messages/read/${conversationId}`);
      return data;
    },
    onSuccess: (_data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations });
    },
  });
};

export const useAudioSignature = () => {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/messages/audio/upload-signature');
      return data as {
        signature: string;
        timestamp: number;
        apiKey: string;
        cloudName: string;
        folder: string;
        resourceType: string;
      };
    },
  });
};

export const useScheduledMessages = () => {
  const queryClient = useQueryClient();
  const cached = queryClient.getQueryData(queryKeys.messages.scheduled);

  return useQuery({
    queryKey: queryKeys.messages.scheduled,
    queryFn: async () => {
      if (cached) {
        console.log('[CHAT-CACHE] Scheduled messages: background refetch');
      } else {
        console.log('[CHAT-CACHE] Scheduled messages: initial fetch');
      }
      const { data } = await apiClient.get('/messages/scheduled/all');
      console.log('[CHAT-CACHE] Scheduled messages: cache updated');
      return (data.scheduledMessages || []) as ScheduledMessage[];
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: true,
  });
};

export const useCreateScheduledMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      text,
      scheduledFor,
    }: {
      conversationId: string;
      text: string;
      scheduledFor: string;
    }) => {
      console.log(`[SCHEDULE] 🚀 Sending API request: POST /messages/scheduled`);
      console.log(`[SCHEDULE] 📦 Payload:`, { conversationId, text, scheduledFor });
      const { data } = await apiClient.post('/messages/scheduled', {
        conversationId,
        text,
        scheduledFor,
      });
      console.log(`[SCHEDULE] ✅ Message scheduled successfully:`, data);
      return data;
    },
    onSuccess: (data) => {
      if (data?.scheduledMessage) {
        queryClient.setQueryData(
          queryKeys.messages.scheduled,
          (old: ScheduledMessage[] = []) => [...old, data.scheduledMessage]
        );
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.scheduled });
    },
    onError: (err: any) => {
      console.error(`[SCHEDULE] ❌ Failed to schedule message:`, err.response?.data?.message || err.message);
    },
  });
};

export const useDeleteScheduledMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log(`[SCHEDULE] 🗑️ Deleting scheduled message:`, id);
      const { data } = await apiClient.delete(`/messages/scheduled/${id}`);
      return { data, id };
    },
    onMutate: async (id: string) => {
      // Optimistic update: cancel ongoing queries and immediately remove from cache
      await queryClient.cancelQueries({ queryKey: queryKeys.messages.scheduled });
      const previousScheduled = queryClient.getQueryData<ScheduledMessage[]>(queryKeys.messages.scheduled);

      queryClient.setQueryData<ScheduledMessage[]>(
        queryKeys.messages.scheduled,
        (old = []) => old.filter((item) => item._id !== id)
      );

      return { previousScheduled };
    },
    onError: (_err, _id, context) => {
      if (context?.previousScheduled) {
        queryClient.setQueryData(queryKeys.messages.scheduled, context.previousScheduled);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.scheduled });
    },
  });
};
