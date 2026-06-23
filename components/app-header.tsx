import { View, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native'
import { Text } from '@/components/text'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/lib/auth'
import { useQueryClient } from '@tanstack/react-query'
import { COLORS } from '@/lib/constants'
import { RookMoneyLogo } from '@/lib/logo'

export function AppHeader({ bellBadge = 0 }: { bellBadge?: number }) {
  const router = useRouter()
  const user   = useAuthStore((s) => s.user)
  const qc     = useQueryClient()
  const meData = qc.getQueryData<any>(['me'])
  const initials = (user?.name ?? 'U')
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
  const profileImage = meData?.profileImage ?? user?.profileImage

  return (
    <View style={styles.container}>
      {/* Logo */}
      <TouchableOpacity onPress={() => router.push('/(tabs)' as any)}>
        <RookMoneyLogo width={130} />
      </TouchableOpacity>

      {/* Right icons */}
      <View style={styles.icons}>
        {/* Bell with badge — taps to notifications */}
        <TouchableOpacity style={styles.bellWrap} onPress={() => router.push('/notifications')} hitSlop={8}>
          <Feather name="bell" size={20} color={bellBadge > 0 ? COLORS.danger : COLORS.muted} />
          {bellBadge > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{bellBadge > 9 ? '9+' : String(bellBadge)}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={10}>
          <Feather name="settings" size={20} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.avatar}>
          {profileImage
            ? <Image source={{ uri: profileImage }} style={styles.avatarImg} />
            : <Text style={styles.avatarText}>{initials}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const PT = Platform.OS === 'android' ? 36 : 50

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: PT,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bellWrap: { position: 'relative' },
  bellBadge: {
    position: 'absolute', top: -5, right: -6,
    backgroundColor: COLORS.danger,
    borderRadius: 8, minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: COLORS.card,
  },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1b3060',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.warning,
  },
  avatarText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  avatarImg:  { width: 30, height: 30, borderRadius: 15 },
})
