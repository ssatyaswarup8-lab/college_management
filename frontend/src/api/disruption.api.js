import apiClient from './client.js'

export const disruptionApi = {
  async analyze(payload) {
    const response = await apiClient.post('/admin/disruptions/analyze', payload)
    return response.data
  },
  async repair(payload) {
    const response = await apiClient.post('/admin/disruptions/repair', payload)
    return response.data
  },
  async getById(disruptionId) {
    const response = await apiClient.get(`/admin/disruptions/${disruptionId}`)
    return response.data
  },
  async apply(disruptionId, payload = {}) {
    const response = await apiClient.post(`/admin/disruptions/${disruptionId}/apply`, payload)
    return response.data
  },
}
