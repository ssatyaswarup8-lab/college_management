import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { scheduleApi } from '../api/schedule.api.js'

export const scheduleKeys = {
  all: ['schedule'],
  list: (params) => ['schedule', 'list', params],
  detail: (scheduleVersionId) => ['schedule', 'detail', scheduleVersionId],
  group: (groupId, params) => ['schedule', 'group', groupId, params],
  faculty: (facultyId, params) => ['schedule', 'faculty', facultyId, params],
  room: (roomId, params) => ['schedule', 'room', roomId, params],
  conflicts: (params) => ['schedule', 'conflicts', params],
  statistics: (params) => ['schedule', 'statistics', params],
}

export function useSchedule(params = {}, options = {}) {
  return useQuery({
    queryKey: scheduleKeys.list(params),
    queryFn: () => scheduleApi.getAll(params),
    enabled: options.enabled ?? true,
  })
}

export function useScheduleByGroup(groupId, params = {}, options = {}) {
  return useQuery({
    queryKey: scheduleKeys.group(groupId, params),
    queryFn: () => scheduleApi.getByGroup(groupId, params),
    enabled: Boolean(groupId) && (options.enabled ?? true),
  })
}

export function useScheduleByFaculty(facultyId, params = {}, options = {}) {
  return useQuery({
    queryKey: scheduleKeys.faculty(facultyId, params),
    queryFn: () => scheduleApi.getByFaculty(facultyId, params),
    enabled: Boolean(facultyId) && (options.enabled ?? true),
  })
}

export function useScheduleByRoom(roomId, params = {}, options = {}) {
  return useQuery({
    queryKey: scheduleKeys.room(roomId, params),
    queryFn: () => scheduleApi.getByRoom(roomId, params),
    enabled: Boolean(roomId) && (options.enabled ?? true),
  })
}

export function useScheduleConflicts(params = {}, options = {}) {
  return useQuery({
    queryKey: scheduleKeys.conflicts(params),
    queryFn: () => scheduleApi.getConflicts(params),
    enabled: options.enabled ?? true,
  })
}

export function useScheduleActions() {
  const queryClient = useQueryClient()
  const refreshSchedule = () => queryClient.invalidateQueries({ queryKey: scheduleKeys.all })

  const generate = useMutation({ mutationFn: scheduleApi.generate, onSuccess: refreshSchedule })
  const moveSession = useMutation({
    mutationFn: ({ sessionId, ...payload }) => scheduleApi.updateSession(sessionId, payload),
    onSuccess: refreshSchedule,
  })
  return { generate, moveSession }
}
