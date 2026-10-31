import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { roomApi } from '../api/room.api.js'

export const roomKeys = {
  all: ['rooms'],
  list: (params) => ['rooms', 'list', params],
  available: (params) => ['rooms', 'available', params],
  utilization: (roomId, params) => ['rooms', 'utilization', roomId, params],
}

export function useRooms(params = {}, options = {}) {
  return useQuery({
    queryKey: roomKeys.list(params),
    queryFn: () => roomApi.getAll(params),
    enabled: options.enabled ?? true,
  })
}

export function useAvailableRooms(params = {}, options = {}) {
  return useQuery({
    queryKey: roomKeys.available(params),
    queryFn: () => roomApi.getAvailable(params),
    enabled: options.enabled ?? true,
  })
}

export function useRoomUtilization(roomId, params = {}, options = {}) {
  return useQuery({
    queryKey: roomKeys.utilization(roomId, params),
    queryFn: () => roomApi.getUtilization(roomId, params),
    enabled: Boolean(roomId) && (options.enabled ?? true),
  })
}

export function useFindRoom() {
  return useMutation({ mutationFn: roomApi.find })
}

export function useRefreshRooms() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: roomKeys.all })
}
