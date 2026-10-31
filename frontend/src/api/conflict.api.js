import apiClient from './client.js'

export const conflictApi = {
  async getAll(params = {}) {
    const response = await apiClient.get('/conflicts', { params })
    const data = response.data?.data ?? {}
    return { ...response.data, data: { ...data, conflicts: (data.conflicts ?? []).map((conflict) => ({ ...conflict, id: String(conflict._id ?? conflict.id ?? '') })) } }
  },
  async analyze(payload) {
    const response = await apiClient.post('/conflicts/analyze', payload)
    return response.data
  },
  async findSolutions(conflictId, payload = {}) {
    const response = await apiClient.post(`/conflicts/${conflictId}/solutions`, payload)
    return response.data
  },
  async applySolution(conflictId, payload) {
    const response = await apiClient.post(`/conflicts/${conflictId}/apply`, payload)
    return response.data
  },
}
