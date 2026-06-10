import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useAuthStore } from '@/lib/auth'
import { COLORS } from '@/lib/constants'

export default function AuthCallback() {
  const params = useLocalSearchParams<{
    token: string
    id: string
    name: string
    email: string
    plan: string
    hasOnboarded: string
  }>()
  const { setAuth } = useAuthStore()

  useEffect(() => {
    if (!params.token) return
    setAuth(params.token, {
      id:           params.id,
      name:         decodeURIComponent(params.name ?? ''),
      email:        params.email,
      plan:         params.plan ?? 'FREE',
      hasOnboarded: params.hasOnboarded === '1',
    })
    // Navigation is handled by AuthGate in _layout.tsx once token is set
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
      <ActivityIndicator size="large" color="#6C63FF" />
    </View>
  )
}
