import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '../api/notification.api.js'

export const notificationKeys = {
  all: ['notifications'],
  list: (params) => ['notifications', params],
}

export default function useNotifications(params = {}, options = {}) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationApi.getAll(params),
    enabled: options.enabled ?? true,
  })
}

export function useNotificationActions() {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: notificationKeys.all })

  return {
    markAsRead: useMutation({
      mutationFn: notificationApi.markAsRead,
      onSuccess: refresh,
    }),
    markAllAsRead: useMutation({
      mutationFn: notificationApi.markAllAsRead,
      onSuccess: refresh,
    }),
  }
}
