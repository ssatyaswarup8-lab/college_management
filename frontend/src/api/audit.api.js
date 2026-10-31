import apiClient from './client.js'

export const auditApi = {
  async getAll(params = {}) {
    const response = await apiClient.get('/admin/audit', { params })
    return response.data
  },
  async getById(auditEntryId) {
    const response = await apiClient.get(`/admin/audit/${auditEntryId}`)
    return response.data
  },
}
