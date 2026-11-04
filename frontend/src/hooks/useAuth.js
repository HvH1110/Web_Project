import { createContext, use } from 'react'

// Filled in by <AuthProvider> (src/components/account/AuthProvider.jsx).
export const AuthContext = createContext(null)

// The logged-in member and the account actions:
// { status: 'loading' | 'ready' | 'error', user, error, ended: null | 'logout' | 'expired',
//   retry, login, register, logout, updateProfile, changePassword, loginRequired }.
// `loginRequired(call)` runs an API call and treats its 401 as the session ending.
// `user` is null when logged out, and while `status` is not 'ready'.
export function useAuth() {
  const auth = use(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>')
  return auth
}
