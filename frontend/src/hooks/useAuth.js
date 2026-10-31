import { useCallback, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth.api.js'
import {
  clearAuthSession,
  getAuthSnapshot,
  setAuthSession,
  subscribeToAuth,
  updateAuthUser,
} from '../store/auth.store.js'

function unwrapData(response) {
  const payload = response?.data ?? response
  return payload?.data ?? payload
}

function getToken(payload) {
  return payload?.accessToken ?? payload?.access_token ?? payload?.token
}

function getUser(payload) {
  return payload?.user ?? payload?.data?.user ?? payload?.data ?? null
}

export function getDashboardPath(role) {
  const rolePaths = {
    ADMIN: '/admin',
    DEPARTMENT_COORDINATOR: '/coordinator',
    FACULTY: '/faculty',
    CLUB_REPRESENTATIVE: '/club',
    STUDENT: '/student',
  }

  return rolePaths[role] ?? '/login'
}

export default function useAuth() {
  const navigate = useNavigate()
  const auth = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, getAuthSnapshot)

  const login = useCallback(async (credentials) => {
    const response = await authApi.login(credentials)
    const payload = unwrapData(response)
    let user = getUser(payload)
    const accessToken = getToken(payload)

    if (!accessToken) {
      throw new Error('The sign-in response did not include an access token.')
    }

    if (!user) {
      const currentUserResponse = await authApi.getCurrentUser()
      user = getUser(unwrapData(currentUserResponse))
    }

    if (!user?.role) {
      throw new Error('The current user response did not include a role.')
    }

    setAuthSession({ accessToken, user })
    navigate(getDashboardPath(user.role), { replace: true })
    return user
  }, [navigate])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearAuthSession()
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const refresh = useCallback(async () => {
    const response = await authApi.refresh()
    const payload = unwrapData(response)
    const accessToken = getToken(payload)
    const user = getUser(payload)

    if (accessToken) {
      const current = getAuthSnapshot().user
      setAuthSession({ accessToken, user: user ?? current })
    } else if (user) {
      updateAuthUser(user)
    }

    return payload
  }, [])

  const hasRole = useCallback((...roles) => roles.includes(auth.role), [auth.role])

  return { ...auth, login, logout, refresh, hasRole }
}


