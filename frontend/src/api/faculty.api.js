import apiClient from './client.js'

export const facultyApi = {
  async listQualifications(params = {}) {
    const response = await apiClient.get('/admin/faculty/qualifications', { params })
    return response.data
  },
  async addQualification(payload) {
    const response = await apiClient.post('/admin/faculty/qualifications', payload)
    return response.data
  },
  async revokeQualification(qualificationId) {
    const response = await apiClient.delete(`/admin/faculty/qualifications/${qualificationId}`)
    return response.data
  },
  async getMySchedule(params = {}) {
    const response = await apiClient.get('/faculty/me/schedule', { params })
    return response.data
  },
  async getMyClasses(params = {}) {
    const response = await apiClient.get('/faculty/me/classes', { params })
    return response.data
  },
  async getAll(params = {}) {
    const response = await apiClient.get('/faculty/directory', { params })
    const faculty = response.data?.data?.faculty ?? []
    return { ...response.data, data: { faculty: faculty.map((member) => ({ ...member, id: member.sourceId ?? member.id, facultyId: member.sourceId ?? member.facultyId })) } }
  },
  async findSubstitutes(payload) {
    const response = await apiClient.post('/faculty/substitutes/find', { sessionId: payload.sessionId })
    const data = response.data?.data ?? {}
    const candidates = (data.candidates ?? []).map((candidate) => ({
      ...candidate,
      id: candidate.facultyId,
      available: candidate.eligible,
      qualificationMatch: candidate.eligibilityChecks?.qualification?.passed,
      currentLoad: candidate.eligibilityChecks?.dailyWorkload?.currentHours,
      reason: candidate.reasons?.join('; '),
    }))
    return { ...response.data, data: { ...data, candidates } }
  },
  async applySubstitute(payload) {
    const response = await apiClient.post('/admin/faculty/substitutes/apply', {
      sessionId: payload.sessionId,
      facultyId: payload.substituteFacultyId ?? payload.facultyId,
      reason: payload.reason,
    })
    return response.data
  },
  async restoreSubstitute(payload) {
    const response = await apiClient.post('/admin/faculty/substitutes/restore', payload)
    return response.data
  },
}
