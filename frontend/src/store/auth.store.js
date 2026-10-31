const TOKEN_KEY = 'cit_access_token'
const USER_KEY = 'cit_current_user'
const AUTH_EVENT = 'cit-auth-change'
let cachedSnapshot

function readUser() {
  try {
    const value = localStorage.getItem(USER_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

function notifyAuthChange() {
  cachedSnapshot = readSnapshot()
  window.dispatchEvent(new Event(AUTH_EVENT))
}

function readSnapshot() {
  const storedUser = readUser()
  const isPreviewSession = storedUser?.uiPreview === true
  if (isPreviewSession) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }
  const user = isPreviewSession ? null : storedUser
  return {
    user,
    userId: user?.id ?? user?.userId ?? null,
    role: user?.role ?? null,
    isAuthenticated: Boolean(localStorage.getItem(TOKEN_KEY) && user),
  }
}

export function getAuthSnapshot() {
  if (!cachedSnapshot) cachedSnapshot = readSnapshot()
  return cachedSnapshot
}

export function subscribeToAuth(listener) {
  const handleStorage = () => {
    cachedSnapshot = readSnapshot()
    listener()
  }

  window.addEventListener(AUTH_EVENT, listener)
  window.addEventListener('storage', handleStorage)
  return () => {
    window.removeEventListener(AUTH_EVENT, listener)
    window.removeEventListener('storage', handleStorage)
  }
}

export function setAuthSession({ accessToken, user }) {
  if (!accessToken || !user) {
    throw new Error('A valid access token and user are required to start a session.')
  }

  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  notifyAuthChange()
}

export function updateAuthUser(user) {
  if (!user) return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  notifyAuthChange()
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  notifyAuthChange()
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY)
}
