import apiClient from './client.js'

function normalize(response) {
  const data = response.data?.data ?? {}
  const exams = (data.exams ?? []).map((exam) => ({
    ...exam,
    id: exam.sourceId ?? exam.examId ?? exam.id,
    examId: exam.sourceId ?? exam.examId,
    day: exam.scheduledDay ?? exam.day,
    session: exam.examSession ?? exam.session,
  }))
  return { ...response.data, data: { ...data, exams } }
}

export const examApi = {
  async generate(payload = {}) {
    const response = await apiClient.post('/admin/exams/generate', payload)
    return response.data
  },
  async getAll(params = {}) {
    const response = await apiClient.get('/exams', { params })
    return normalize(response)
  },
  async getById(examId) {
    const response = await apiClient.get(`/exams/${examId}`)
    return response.data
  },
  async getByGroup(groupId, params = {}) {
    const response = await apiClient.get(`/exams/student/${groupId}`, { params })
    return normalize(response)
  },
}
