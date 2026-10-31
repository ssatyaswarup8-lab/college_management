import apiClient from './client.js'

function normalizeList(response) {
  const data = response.data?.data ?? {}
  const bookings = (data.bookings ?? []).map((booking) => ({ ...booking, id: booking.sourceId ?? String(booking._id ?? '') }))
  return { ...response.data, data: { ...data, bookings } }
}

export const bookingApi = {
  async getAll(params = {}) {
    const cleanParams = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null))
    const response = await apiClient.get('/bookings', { params: cleanParams })
    return normalizeList(response)
  },
  async getPending(params = {}) {
    const response = await apiClient.get('/bookings/pending', { params })
    return normalizeList(response)
  },
  async parseRequest(payload) {
    // Keep the client timeout slightly above the backend's maximum Gemini timeout.
    const response = await apiClient.post('/bookings/parse', payload, { timeout: 310_000 })
    return response.data
  },
  async create(payload) {
    const response = await apiClient.post('/bookings', payload)
    return response.data
  },
  async approve(bookingId, payload = {}) {
    const response = await apiClient.post(`/bookings/${bookingId}/approve`, payload)
    return response.data
  },
  async impact(bookingId, payload) {
    const response = await apiClient.post(`/bookings/${bookingId}/impact`, payload)
    return response.data
  },
  async reject(bookingId, payload) {
    const response = await apiClient.post(`/bookings/${bookingId}/reject`, payload)
    return response.data
  },
  async offerAlternative(bookingId, payload) {
    const response = await apiClient.post(`/bookings/${bookingId}/alternative`, payload)
    return response.data
  },
  async acceptAlternative(bookingId, payload = {}) {
    const response = await apiClient.post(`/bookings/${bookingId}/alternative/accept`, payload)
    return response.data
  },
  async declineAlternative(bookingId, payload) {
    const response = await apiClient.post(`/bookings/${bookingId}/alternative/decline`, payload)
    return response.data
  },
  async cancel(bookingId, payload = {}) {
    const response = await apiClient.post(`/bookings/${bookingId}/cancel`, payload)
    return response.data
  },
}
