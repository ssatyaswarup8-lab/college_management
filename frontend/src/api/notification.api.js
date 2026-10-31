import apiClient from './client.js'

export const notificationApi = {
  async getAll(params = {}) {
    const response = await apiClient.get('/notifications', { params })
    return response.data
  },
  async markAsRead(notificationId) {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`)
    return response.data
  },
  async markAllAsRead(payload = {}) {
    const response = await apiClient.patch('/notifications/read-all', payload)
    return response.data
  },
}
