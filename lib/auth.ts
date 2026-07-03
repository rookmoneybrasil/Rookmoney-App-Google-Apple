import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const TOKEN_KEY = 'rook_token'
const USER_KEY  = 'rook_user'

// expo-secure-store only works on native — fall back to localStorage on web
const storage = {
  async set(key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value)
    } else {
      await SecureStore.setItemAsync(key, value)
    }
  },
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key)
    }
    return SecureStore.getItemAsync(key)
  },
  async del(key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key)
    } else {
      await SecureStore.deleteItemAsync(key)
    }
  },
}

export interface AuthUser {
  id:           string
  name:         string
  email:        string
  plan:         string
  hasOnboarded: boolean
  profileImage?: string | null
}

interface AuthState {
  token:      string | null
  user:       AuthUser | null
  ready:      boolean
  setAuth:    (token: string, user: AuthUser) => void
  clearAuth:  () => void
  hydrate:    () => Promise<void>
  updateUser: (patch: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token:  null,
  user:   null,
  ready:  false,

  setAuth: (token, user) => {
    set({ token, user }) // in-memory first for instant UI
    storage.set(TOKEN_KEY, token).catch((e) => console.warn('[auth] token persist failed:', e))
    storage.set(USER_KEY, JSON.stringify(user)).catch((e) => console.warn('[auth] user persist failed:', e))
  },

  clearAuth: () => {
    storage.del(TOKEN_KEY)
    storage.del(USER_KEY)
    set({ token: null, user: null })
  },

  updateUser: (patch) => {
    set((s) => {
      if (!s.user) return s
      const updated = { ...s.user, ...patch }
      storage.set(USER_KEY, JSON.stringify(updated))
      return { user: updated }
    })
  },

  hydrate: async () => {
    // Read token and user INDEPENDENTLY. A failure reading or JSON-parsing the
    // (larger, profile-image-carrying) user must never wipe the token — otherwise
    // iOS logs the user out on every launch. The token is the source of truth for
    // auth; user data is re-fetched from /me anyway.
    let token: string | null = null
    let user: AuthUser | null = null
    try { token = await storage.get(TOKEN_KEY) } catch (e) { console.warn('[auth] token read failed:', e) }
    try {
      const userJson = await storage.get(USER_KEY)
      user = userJson ? (JSON.parse(userJson) as AuthUser) : null
    } catch (e) { console.warn('[auth] user read failed:', e) }
    set({ token, user, ready: true })
  },
}))
