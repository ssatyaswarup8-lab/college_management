import apiClient from './client.js'

export const studentApi = {
  async getMySchedule(params = {}) {
    const response = await apiClient.get('/student/me/schedule', { params })
    return response.data
  },
  async getMyExams(params = {}) {
    const response = await apiClient.get('/student/me/exams', { params })
    const data = response.data?.data ?? {}
    return { ...response.data, data: { ...data, exams: (data.exams ?? []).map((exam) => ({ ...exam, id: exam.sourceId ?? exam.examId ?? exam.id, examId: exam.sourceId ?? exam.examId, day: exam.scheduledDay ?? exam.day, session: exam.examSession ?? exam.session })) } }
  },
  async getMyEvents(params = {}) {
    const response = await apiClient.get('/student/me/events', { params })
    return response.data
  },
  async getNextClass(params = {}) {
    const response = await apiClient.get('/student/me/next-class', { params })
    return response.data
  },
}
