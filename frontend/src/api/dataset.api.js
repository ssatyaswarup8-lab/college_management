import apiClient from './client.js'

function form(file) {
  const body = new FormData()
  body.append('file', file)
  return body
}

export const datasetApi = {
  async list() {
    const response = await apiClient.get('/admin/datasets')
    return response.data
  },
  async getActive() {
    const response = await apiClient.get('/admin/datasets')
    const datasets = response.data?.data?.datasets ?? []
    return { success: true, data: { dataset: datasets.find((dataset) => dataset.status === 'active') ?? null } }
  },
  async preview(file, onUploadProgress) {
    const response = await apiClient.post('/admin/datasets/preview', form(file), { onUploadProgress })
    return response.data
  },
  async import(file) {
    const response = await apiClient.post('/admin/datasets/import', form(file))
    return response.data
  },
  async getActivationImpact(datasetVersionId) {
    const response = await apiClient.get(`/admin/datasets/${datasetVersionId}/activation-impact`)
    return response.data
  },
  async activate(datasetVersionId) {
    const response = await apiClient.post(`/admin/datasets/${datasetVersionId}/activate`)
    return response.data
  },
}
