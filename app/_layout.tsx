import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Linking from 'expo-linking'
import { useAuthStore } from '@/lib/auth'
import { COLORS } from '@/lib/constants'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function AuthGate() {
  const { token, ready, hydrate, setAuth } = useAuthStore()
  const router   = useRouter()
  const segments = useSegments()

  // Handle Google OAuth deep link: rookmoney://auth/callback?token=...
  function handleURL(url: string) {
    try {
      const parsed = Linking.parse(url)
      if (parsed.path === 'auth/callback' && parsed.queryParams?.token) {
        const p = parsed.queryParams as Record<string, string>
        setAuth(p.token, {
          id:           p.id,
          name:         decodeURIComponent(p.name ?? ''),
          email:        p.email,
          plan:         p.plan ?? 'FREE',
          hasOnboarded: p.hasOnboarded === '1',
        })
      }
    } catch {
      // ignore malformed URLs
    }
  }

  useEffect(() => {
    hydrate()

    // App opened via deep link (from cold start)
    Linking.getInitialURL().then((url) => { if (url) handleURL(url) })

    // App was already open, URL arrives as an event
    const sub = Linking.addEventListener('url', ({ url }) => handleURL(url))
    return () => sub.remove()
  }, [])

  useEffect(() => {
    if (!ready) return
    const inAuth = segments[0] === '(auth)'

    if (!token && !inAuth) {
      router.replace('/(auth)/login')
    } else if (token && inAuth) {
      router.replace('/(tabs)')
    }
  }, [token, ready, segments])

  return null
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" backgroundColor={COLORS.bg} />
      <AuthGate />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />

        {/* Stack screens */}
        <Stack.Screen name="budget"     options={{ headerShown: false }} />
        <Stack.Screen name="income"     options={{ headerShown: false }} />
        <Stack.Screen name="recurring"  options={{ headerShown: false }} />
        <Stack.Screen name="reports"    options={{ headerShown: false }} />
        <Stack.Screen name="categories" options={{ headerShown: false }} />
        <Stack.Screen name="settings"   options={{ headerShown: false }} />

        {/* Modal screens */}
        <Stack.Screen name="new-transaction" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="new-goal"        options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="new-budget"      options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="new-bill"        options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="new-income"      options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="new-recurring"   options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="new-category"    options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  )
}
