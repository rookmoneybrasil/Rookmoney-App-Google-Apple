import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ThemeProvider, DarkTheme, type Theme } from '@react-navigation/native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Linking from 'expo-linking'
import * as SplashScreen from 'expo-splash-screen'
import {
  useFonts,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins'
import type * as NotificationsType from 'expo-notifications'
import Constants from 'expo-constants'
import { useAuthStore } from '@/lib/auth'
import { COLORS } from '@/lib/constants'
import { AnimatedSplash } from '@/components/animated-splash'
import { UpsellModal } from '@/components/upsell-modal'
import { loadHapticsPreference } from '@/lib/haptics'
import { pushTokenApi } from '@/lib/api'
import { AchievementToastProvider } from '@/components/achievement-toast'

SplashScreen.preventAutoHideAsync()
loadHapticsPreference()

// expo-notifications removed push support from Expo Go in SDK 53 — crash on import
const isExpoGo = Constants.appOwnership === 'expo'
const Notifications: typeof NotificationsType | null = isExpoGo
  ? null
  : (require('expo-notifications') as typeof NotificationsType)

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList:   true,
      shouldPlaySound:  true,
      shouldSetBadge:   false,
    }),
  })
}

async function registerPushToken() {
  if (!Notifications) return
  const perms = await Notifications.getPermissionsAsync() as { status: string }
  const granted    = perms.status === 'granted'
    ? true
    : ((await Notifications.requestPermissionsAsync()) as { status: string }).status === 'granted'
  if (!granted) return
  try {
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: '158da268-5531-48b4-a07f-a4e383f34a9d',
    })).data
    await pushTokenApi.register(token)
  } catch (e) {
    // silent — push token registration is best-effort
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.bg,
    card:       COLORS.card,
    border:     COLORS.border,
    primary:    COLORS.brand,
  },
}

function AuthGate() {
  const { token, ready, hydrate, setAuth } = useAuthStore()
  const router   = useRouter()
  const segments = useSegments()
  const navState = useRootNavigationState()

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

    // Navigate when user taps a push notification (not available in Expo Go)
    const notifSub = Notifications
      ? Notifications.addNotificationResponseReceivedListener((response) => {
          const screen = response.notification.request.content.data?.screen as string | undefined
          if (screen === 'bills')   router.push('/(tabs)/bills')
          if (screen === 'reports') router.push('/reports')
          if (screen === 'goals')   router.push('/(tabs)')
        })
      : null

    return () => { sub.remove(); notifSub?.remove() }
  }, [])

  useEffect(() => {
    if (!navState?.key) return  // navigator not mounted yet
    if (!ready) return
    // Treat both the (auth) group and the auth/callback route as "in auth"
    const inAuth       = segments[0] === '(auth)' || segments[0] === 'auth'
    const inOnboarding = segments[0] === 'onboarding'

    if (!token && !inAuth) {
      router.replace('/(auth)/login')
    } else if (token && inAuth) {
      registerPushToken()
      const u = useAuthStore.getState().user
      if (u && !u.hasOnboarded) {
        router.replace('/onboarding')
      } else {
        router.replace('/(tabs)')
      }
    } else if (token && !inAuth && !inOnboarding) {
      const u = useAuthStore.getState().user
      if (u && !u.hasOnboarded && (segments[0] as string) !== 'onboarding') {
        router.replace('/onboarding')
      }
    }
  }, [token, ready, segments, navState])

  return null
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  })
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" backgroundColor={COLORS.bg} />
        <AuthGate />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />

          {/* Onboarding */}
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />

          {/* Stack screens */}
          <Stack.Screen name="budget"        options={{ headerShown: false }} />
          <Stack.Screen name="transactions"  options={{ headerShown: false }} />
          <Stack.Screen name="recurring"     options={{ headerShown: false }} />
          <Stack.Screen name="reports"       options={{ headerShown: false }} />
          <Stack.Screen name="categories"    options={{ headerShown: false }} />
          <Stack.Screen name="settings"      options={{ headerShown: false }} />
          <Stack.Screen name="goals"         options={{ headerShown: false }} />
          <Stack.Screen name="calendar"      options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="projection"    options={{ headerShown: false }} />
          <Stack.Screen name="people"        options={{ headerShown: false }} />
          <Stack.Screen name="person-detail" options={{ headerShown: false }} />
          <Stack.Screen name="billing"       options={{ headerShown: false }} />
          <Stack.Screen name="achievements"  options={{ headerShown: false }} />
          <Stack.Screen name="changelog"     options={{ headerShown: false }} />
          <Stack.Screen name="ai-chat"       options={{ headerShown: false }} />

          {/* Google OAuth callback */}
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />

          {/* Edit screens */}
          <Stack.Screen name="edit-bill"           options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="edit-transaction"    options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="edit-income"         options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="edit-recurring"      options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="edit-recurring-bill" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="edit-category"       options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="feedback"            options={{ headerShown: false }} />

          {/* Modal screens */}
          <Stack.Screen name="new-transaction"   options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="new-goal"          options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="new-budget"        options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="new-bill"          options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="new-income"        options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="new-recurring"     options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="new-recurring-bill" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="new-category"      options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="new-person"        options={{ presentation: 'modal', headerShown: false }} />
        </Stack>

        <AchievementToastProvider />
        <UpsellModal />
        {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
