import axios from 'axios'
import { clearAuthSession, getAccessToken, getAuthSnapshot, setAuthSession } from '../store/auth.store.js'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    Accept: 'application/json',
  },
  timeout: 20_000,
  withCredentials: true,
})

let refreshPromise

function isAuthEndpoint(url = '') {
  return /\/auth\/(login|refresh|logout)$/.test(url)
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {}, {
      withCredentials: true,
      headers: { Accept: 'application/json' },
    }).then((response) => {
      const payload = response.data?.data
      if (!payload?.accessToken || !payload?.user) throw new Error('Refresh response did not include an access token and user.')
      setAuthSession({ accessToken: payload.accessToken, user: payload.user })
      return payload.accessToken
    }).catch((error) => {
      clearAuthSession()
      throw error
    }).finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

apiClient.interceptors.request.use(async (config) => {
  let accessToken = getAccessToken()

  // Recover a session whose short-lived access token is missing but whose refresh cookie is still valid.
  if (!accessToken && !isAuthEndpoint(config.url)) accessToken = await refreshAccessToken()

  if (accessToken) {
    config.headers.set ? config.headers.set('Authorization', `Bearer ${accessToken}`) : (config.headers.Authorization = `Bearer ${accessToken}`)
  }

  return config
})

apiClient.interceptors.response.use((response) => response, async (error) => {
  const request = error.config
  if (error.response?.status !== 401 || !request || request._authRetry || isAuthEndpoint(request.url)) {
    return Promise.reject(error)
  }
  request._authRetry = true
  try {
    const token = await refreshAccessToken()
    request.headers.set ? request.headers.set('Authorization', `Bearer ${token}`) : (request.headers.Authorization = `Bearer ${token}`)
    return apiClient(request)
  } catch (refreshError) {
    clearAuthSession()
    return Promise.reject(refreshError)
  }
})

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const responseData = error?.response?.data
  const message = responseData?.message

  if (typeof message === 'string' && message.trim()) {
    return message
  }

  if (error?.response?.status === 401) {
    return 'Your session has expired. Please sign in again.'
  }

  if (!error?.response) {
    return 'Unable to connect to the server. Check your connection and try again.'
  }

  return fallback
}

export default apiClient
