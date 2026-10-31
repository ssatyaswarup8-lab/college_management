import apiClient from './client.js'

function data(response) { return response.data?.data ?? {} }
function flat(session) {
  return {
    ...session,
    facultyId: session.faculty?.id ?? session.facultyId,
    facultyName: session.faculty?.name ?? session.facultyName,
    roomId: session.room?.id ?? session.roomId,
    roomName: session.room?.name ?? session.roomName,
    groups: (session.groups ?? []).map((group) => typeof group === 'string' ? group : ({ ...group, groupId: group.id })),
  }
}

export const scheduleApi = {
  async generate(options = {}) {
    const response = await apiClient.post('/admin/schedule/generate', options)
    return response.data
  },
  async getAll(params = {}) {
    const response = await apiClient.get('/admin/schedule/current', { params })
    const result = data(response)
    return { ...response.data, data: { ...result, sessions: (result.sessions ?? []).map(flat) } }
  },
  async getById(versionId) {
    const response = await apiClient.get(`/admin/schedule/versions/${versionId}`)
    return response.data
  },
  async getByGroup(_groupId, params = {}) {
    const response = await apiClient.get('/student/me/schedule', { params })
    const result = data(response)
    return { ...response.data, data: { ...result, sessions: (result.classes ?? []).map(flat) } }
  },
  async getByFaculty(_facultyId, params = {}) {
    const response = await apiClient.get('/faculty/me/schedule', { params })
    const result = data(response)
    return { ...response.data, data: { ...result, sessions: (result.classes ?? []).map(flat) } }
  },
  async getByRoom(roomId, params = {}) { return this.getAll({ ...params, roomId }) },
  async getVersions(params = {}) {
    const response = await apiClient.get('/admin/schedule/versions', { params })
    return response.data
  },
  async approveVersion(versionId) {
    const response = await apiClient.post(`/admin/schedule/versions/${versionId}/approve`)
    return response.data
  },
  async rejectVersion(versionId, reason) {
    const response = await apiClient.post(`/admin/schedule/versions/${versionId}/reject`, { reason })
    return response.data
  },
  async getStatistics() {
    const response = await apiClient.get('/admin/schedule/analytics')
    return response.data
  },
  async getConflicts(params = {}) {
    const response = await apiClient.get('/conflicts', { params })
    return response.data
  },
  async analyzeMove(payload) {
    const response = await apiClient.post('/admin/schedule/session/impact', payload)
    return response.data
  },
  async createSession(payload) {
    const response = await apiClient.post('/admin/schedule/session', payload)
    return response.data
  },
  async updateSession(sessionId, payload) {
    const proposalResponse = await apiClient.post('/admin/schedule/session', { sessionId, ...payload })
    const proposal = proposalResponse.data?.data
    if (!proposal?.versionId) throw new Error('The schedule service did not return a proposal version.')
    const response = await apiClient.post(`/admin/schedule/versions/${proposal.versionId}/apply`)
    return response.data
  },
  async export() {
    const response = await apiClient.get('/admin/schedule/export/preview')
    return new Blob([JSON.stringify(response.data?.data, null, 2)], { type: 'application/json' })
  },
}
