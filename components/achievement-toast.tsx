import { useEffect, useState, useCallback, useRef } from 'react'
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { achievementsApi } from '@/lib/api'
import { ACHIEVEMENT_TEXT } from '@/lib/achievements'
import { COLORS } from '@/lib/constants'

interface ToastItem {
  slug: string
  icon: string
  id:   number
}

let nextId = 0
let globalShowFn: ((items: { slug: string; icon: string }[]) => void) | null = null

export function triggerAchievementCheck(trigger: string, ctx?: Record<string, unknown>) {
  achievementsApi.check(trigger, ctx)
    .then(r => {
      const unlocked = r.data?.newlyUnlocked ?? []
      if (unlocked.length > 0 && globalShowFn) globalShowFn(unlocked)
    })
    .catch(() => {})
}

export function AchievementToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const router = useRouter()

  const show = useCallback((items: { slug: string; icon: string }[]) => {
    const newItems = items.map(u => ({ slug: u.slug, icon: u.icon, id: nextId++ }))
    setToasts(prev => [...prev, ...newItems])
    for (const item of newItems) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== item.id)), 6000)
    }
  }, [])

  useEffect(() => {
    globalShowFn = show
    return () => { globalShowFn = null }
  }, [show])

  // Check on mount (app open = dashboard trigger)
  useEffect(() => {
    triggerAchievementCheck('dashboard')
  }, [])

  if (toasts.length === 0) return null

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map(toast => (
        <AchievementToast
          key={toast.id}
          toast={toast}
          onPress={() => {
            setToasts(prev => prev.filter(t => t.id !== toast.id))
            router.push('/achievements' as any)
          }}
        />
      ))}
    </View>
  )
}

function AchievementToast({ toast, onPress }: { toast: ToastItem; onPress: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const meta = ACHIEVEMENT_TEXT[toast.slug]

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()
  }, [fadeAnim, slideAnim])

  return (
    <Animated.View style={[styles.toast, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity style={styles.toastInner} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.toastIcon}>{toast.icon}</Text>
        <View style={styles.toastText}>
          <Text style={styles.toastLabel}>CONQUISTA DESBLOQUEADA!</Text>
          <Text style={styles.toastName} numberOfLines={1}>{meta?.name ?? toast.slug}</Text>
        </View>
        <Text style={{ fontSize: 20 }}>🏆</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 50, left: 16, right: 16, zIndex: 9999,
    gap: 10,
  },
  toast: {
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  toastInner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  toastIcon:  { fontSize: 32 },
  toastText:  { flex: 1 },
  toastLabel: { fontSize: 9, fontWeight: '700', color: '#fbbf24', letterSpacing: 1.2 },
  toastName:  { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
})
