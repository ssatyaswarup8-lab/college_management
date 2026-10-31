import apiClient from './client.js'

async function scheduleAnalytics() {
  const response = await apiClient.get('/admin/schedule/analytics')
  return response.data?.data ?? {}
}
async function roomAnalytics(params = {}) {
  const response = await apiClient.get('/rooms/utilization', { params })
  return response.data?.data ?? {}
}

function isScheduleUnavailable(error) {
  return error?.response?.status === 409
    && ['SCHEDULE_NOT_FOUND', 'DATASET_NOT_FOUND'].includes(error?.response?.data?.error?.code)
}

export const analyticsApi = {
  async getOverview() {
    const [scheduleResult, roomsResult, bookingsResult] = await Promise.allSettled([
      scheduleAnalytics(), roomAnalytics(), apiClient.get('/bookings/pending'),
    ])
    const scheduleUnavailable = scheduleResult.status === 'rejected' && isScheduleUnavailable(scheduleResult.reason)
    if (scheduleResult.status === 'rejected' && !scheduleUnavailable) throw scheduleResult.reason
    if (roomsResult.status === 'rejected') throw roomsResult.reason
    if (bookingsResult.status === 'rejected') throw bookingsResult.reason
    const schedule = scheduleResult.status === 'fulfilled' ? scheduleResult.value : {}
    const rooms = roomsResult.value
    const bookingsResponse = bookingsResult.value
    const pending = bookingsResponse.data?.data?.bookings ?? []
    return { success: true, data: {
      sessionsScheduled: schedule.summary?.sessionsScheduled ?? 0,
      hardViolations: null,
      softPenalty: null,
      roomUtilization: rooms.averageUtilizationPercent,
      pendingBookings: pending.length,
      scheduleVersionId: schedule.scheduleVersion?.id,
      activeConflicts: null,
      scheduleUnavailable,
    } }
  },
  async getRooms() {
    const data = await roomAnalytics()
    return { success: true, data: { rooms: data.rooms ?? [] } }
  },
  async getFaculty() {
    try {
      const data = await scheduleAnalytics()
      return { success: true, data: { faculty: data.facultyDailyLoads ?? [], scheduleUnavailable: false } }
    } catch (error) {
      if (!isScheduleUnavailable(error)) throw error
      return { success: true, data: { faculty: [], scheduleUnavailable: true } }
    }
  },
  async getSchedule() { return { success: true, data: await scheduleAnalytics() } },
  async getUtilization() {
    const data = await roomAnalytics()
    return { success: true, data: { rooms: data.rooms ?? [] } }
  },
  async getWastedCapacity() {
    const data = await roomAnalytics()
    return { success: true, data: { rooms: data.underutilizedRooms ?? [] } }
  },
}
