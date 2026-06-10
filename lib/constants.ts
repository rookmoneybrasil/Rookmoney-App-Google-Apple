import { Platform } from 'react-native'

// Web (expo start --web) → localhost:3000
// Native dev/teste → Railway direto (mesma API do web)
// Produção → rookmoney-api-production.up.railway.app
export const API_BASE_URL = __DEV__
  ? Platform.OS === 'web'
    ? 'http://localhost:3000'
    : 'https://rookmoney-api-production.up.railway.app'
  : 'https://rookmoney-api-production.up.railway.app'

export const COLORS = {
  bg:       '#080e1d',
  card:     '#0c1628',
  card2:    '#111e32',
  border:   'rgba(255,255,255,0.08)',
  brand:    '#3b82f6',
  brandDim: '#1e3a5f',
  success:  '#22c55e',
  danger:   '#ef4444',
  warning:  '#f59e0b',
  text:     '#f1f5f9',
  muted:    '#64748b',
  muted2:   '#334155',
} as const
