import apiClient from './client.js'

function normalize(response) {
  const data = response.data?.data ?? {}
  const scenarios = (data.scenarios ?? []).map((scenario) => ({ ...scenario, id: String(scenario._id ?? scenario.id ?? '') }))
  return { ...response.data, data: { ...data, scenarios } }
}

export const scenarioApi = {
  async preview(payload) {
    const response = await apiClient.post('/scenarios/preview', payload)
    return response.data
  },
  async create(payload) {
    const response = await apiClient.post('/scenarios', payload)
    return response.data
  },
  async getAll(params = {}) {
    const response = await apiClient.get('/scenarios', { params })
    return normalize(response)
  },
  async simulate(scenarioId, payload = {}) {
    const response = await apiClient.post(`/scenarios/${scenarioId}/simulate`, payload)
    return response.data
  },
  async compare(scenarioId, params = {}) {
    const response = await apiClient.get(`/scenarios/${scenarioId}/compare`, { params })
    return response.data
  },
  async apply(scenarioId, payload = {}) {
    const response = await apiClient.post(`/scenarios/${scenarioId}/apply`, payload)
    return response.data
  },
}
