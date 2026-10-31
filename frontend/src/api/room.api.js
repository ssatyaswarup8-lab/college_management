import apiClient from './client.js'

export const roomApi = {
  async getAll(params = {}) {
    const response = await apiClient.get('/rooms', { params })
    const data = response.data?.data ?? {}
    return { ...response.data, data: { ...data, rooms: (data.rooms ?? []).map((room) => ({ ...room, id: room.sourceId ?? room.id, roomId: room.sourceId ?? room.roomId })) } }
  },
  async getAvailable(params = {}) {
    const response = await apiClient.get('/rooms/available', { params })
    return normalizeResults(response)
  },
  async find(payload) {
    const response = await apiClient.post('/rooms/find', payload)
    return normalizeResults(response)
  },
  async getUtilization(roomId, params = {}) {
    const response = await apiClient.get(`/rooms/${roomId}/utilization`, { params })
    return response.data
  },
}

function normalizeResults(response) {
  const data = response.data?.data ?? {}
  const rooms = (data.rooms ?? []).map((item) => {
    const { room, ...result } = item
    const value = room ?? item
    return { ...value, ...result, id: value.sourceId ?? value.id, roomId: value.sourceId ?? value.roomId }
  })
  return { ...response.data, data: { ...data, rooms } }
}
