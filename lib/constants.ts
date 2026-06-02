import { Platform } from 'react-native'

// Web (expo start --web) → localhost:3000
// Native device na rede local  → IP da máquina
// Produção → rookmoney.com.br
export const API_BASE_URL = __DEV__
  ? Platform.OS === 'web'
    ? 'http://localhost:3000'
    : 'http://192.168.0.11:3000'
  : 'https://rookmoney.com.br'

export const COLORS = {
  bg:       '#020f21',
  card:     '#0c1625',
  card2:    '#111d30',
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
