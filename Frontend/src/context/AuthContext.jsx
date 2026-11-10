import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { DEMO_ACCOUNT } from '../data/mockData.js'

/**
 * Mock authentication. Accounts live in the browser, including their passwords,
 * so this is for demonstration only. The real app replaces these functions with
 * calls to the JWT / Better Auth backend named in the SRS (FR-01).
 */

const ACCOUNTS_KEY = 'dokan:accounts'
const SESSION_KEY = 'dokan:session'
const ADMIN_ACCOUNT_VERSION_KEY = 'dokan:admin-account-version'
const LEGACY_DEMO_EMAIL = 'admin@dokan.example'

const AuthContext = createContext(null)

function read(storage, key, fallback) {
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private mode). The session then lasts until refresh.
  }
}

function strip({ password, ...publicFields }) {
  return publicFields
}

function loadAccounts() {
  const saved = read(localStorage, ACCOUNTS_KEY, [])
  const accounts = Array.isArray(saved) ? saved : []

  if (read(localStorage, ADMIN_ACCOUNT_VERSION_KEY, null) === 1) {
    return accounts.length ? accounts : [DEMO_ACCOUNT]
  }

  const existingAdminIndex = accounts.findIndex(
    (account) => [DEMO_ACCOUNT.email, LEGACY_DEMO_EMAIL].includes(account.email?.toLowerCase()),
  )
  const next = existingAdminIndex === -1
    ? [...accounts, DEMO_ACCOUNT]
    : accounts.map((account, index) => (index === existingAdminIndex ? { ...account, ...DEMO_ACCOUNT } : account))

  write(localStorage, ACCOUNTS_KEY, next)
  write(localStorage, ADMIN_ACCOUNT_VERSION_KEY, 1)
  return next
}

export function AuthProvider({ children }) {
  const [accounts, setAccounts] = useState(loadAccounts)
  const [user, setUser] = useState(() => read(localStorage, SESSION_KEY, null) || read(sessionStorage, SESSION_KEY, null))

  const startSession = useCallback((account, remember) => {
    const publicUser = strip(account)
    write(remember ? localStorage : sessionStorage, SESSION_KEY, publicUser)
    setUser(publicUser)
  }, [])

  const saveAccounts = useCallback((next) => {
    setAccounts(next)
    write(localStorage, ACCOUNTS_KEY, next)
  }, [])

  const login = useCallback(
    (email, password, remember) => {
      const account = accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
      if (!account || account.password !== password) return false
      startSession(account, remember)
      return true
    },
    [accounts, startSession],
  )

  const loginWithGoogle = useCallback(() => {
    startSession(accounts[0], true)
  }, [accounts, startSession])

  const register = useCallback(
    ({ name, email, password }) => {
      if (accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase())) return false
      const account = { name: name.trim(), email: email.trim(), password, role: 'Shop owner' }
      saveAccounts([...accounts, account])
      startSession(account, true)
      return true
    },
    [accounts, saveAccounts, startSession],
  )

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      // Nothing to clear if storage is unavailable.
    }
    setUser(null)
  }, [])

  const changePassword = useCallback(
    (current, next) => {
      const account = accounts.find((a) => a.email === user?.email)
      if (!account || account.password !== current) return false
      saveAccounts(accounts.map((a) => (a === account ? { ...a, password: next } : a)))
      return true
    },
    [accounts, saveAccounts, user],
  )

  const value = useMemo(
    () => ({ user, login, loginWithGoogle, register, logout, changePassword }),
    [user, login, loginWithGoogle, register, logout, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
