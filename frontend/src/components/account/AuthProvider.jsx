import { useEffect, useMemo, useState } from 'react'
import * as api from '@/lib/api'
import { AuthContext } from '@/hooks/useAuth'

// Asks GET /api/me once per visit whether this browser is logged in, then
// keeps the member in sync with every account action. A 401 on a
// login-required call means the session ended elsewhere (expired, or the
// password was changed in another browser): the member becomes logged out.
export default function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, error: null, ended: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api.getMe({ signal: controller.signal }).then(
      ({ user }) => {
        if (!controller.signal.aborted) setState({ status: 'ready', user, error: null, ended: null })
      },
      (error) => {
        if (!controller.signal.aborted) setState({ status: 'error', user: null, error, ended: null })
      },
    )
    return () => controller.abort()
  }, [attempt])

  const auth = useMemo(() => {
    const signedIn = (user) => setState({ status: 'ready', user, error: null, ended: null })
    const signedOut = (ended) => setState({ status: 'ready', user: null, error: null, ended })
    const loginRequired = async (call) => {
      try {
        return await call()
      } catch (error) {
        if (error.status === 401) signedOut('expired')
        throw error
      }
    }

    return {
      ...state,
      retry: () => {
        setState((s) => ({ ...s, status: 'loading', error: null }))
        setAttempt((n) => n + 1)
      },
      login: async (fields) => signedIn((await api.login(fields)).user),
      register: async (fields) => signedIn((await api.register(fields)).user),
      logout: async () => {
        await api.logout()
        signedOut('logout')
      },
      loginRequired,
      updateProfile: (fields) => loginRequired(async () => signedIn((await api.updateMe(fields)).user)),
      changePassword: (fields) => loginRequired(() => api.changePassword(fields)),
    }
  }, [state])

  return <AuthContext value={auth}>{children}</AuthContext>
}
