import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { useAuthStore } from '@/lib/auth'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function MenuItem({
  icon, label, value, onPress, danger,
}: {
  icon: IoniconsName; label: string; value?: string; onPress?: () => void; danger?: boolean
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? 'rgba(239,68,68,0.12)' : COLORS.brandDim }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.danger : COLORS.brand} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: COLORS.danger }]}>{label}</Text>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={COLORS.muted2} />
      </View>
    </TouchableOpacity>
  )
}

export default function SettingsScreen() {
  const user       = useAuthStore((s) => s.user)
  const clearAuth  = useAuthStore((s) => s.clearAuth)
  const router     = useRouter()

  function handleLogout() {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            clearAuth()
            router.replace('/(auth)/login')
          },
        },
      ]
    )
  }

  const initials = (user?.name ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        {user?.plan === 'PRO' && (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>⚡ PRO</Text>
          </View>
        )}
      </View>

      {/* Account section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CONTA</Text>
        <View style={styles.card}>
          <MenuItem icon="person-outline" label="Perfil" onPress={() => {}} />
          <View style={styles.divider} />
          <MenuItem icon="lock-closed-outline" label="Alterar senha" onPress={() => {}} />
          <View style={styles.divider} />
          <MenuItem
            icon="star-outline"
            label="Plano"
            value={user?.plan === 'PRO' ? 'PRO ⚡' : 'Free'}
            onPress={() => {}}
          />
        </View>
      </View>

      {/* App section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>APP</Text>
        <View style={styles.card}>
          <MenuItem icon="notifications-outline" label="Notificações" onPress={() => {}} />
          <View style={styles.divider} />
          <MenuItem icon="help-circle-outline" label="Ajuda" onPress={() => {}} />
          <View style={styles.divider} />
          <MenuItem icon="globe-outline" label="Abrir versão web" onPress={() => {}} />
        </View>
      </View>

      {/* Danger zone */}
      <View style={styles.section}>
        <View style={styles.card}>
          <MenuItem icon="log-out-outline" label="Sair da conta" onPress={handleLogout} danger />
        </View>
      </View>

      <Text style={styles.version}>Rook Money v1.0.0</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  avatarText:  { fontSize: 26, fontWeight: '700', color: '#fff' },
  userName:    { fontSize: 18, fontWeight: '700', color: COLORS.text },
  userEmail:   { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  proBadge:    {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  proBadgeText: { color: COLORS.warning, fontSize: 12, fontWeight: '700' },

  section:      { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { fontSize: 13, color: COLORS.muted },
  divider:   { height: 1, backgroundColor: COLORS.border, marginLeft: 62 },

  version: { textAlign: 'center', fontSize: 12, color: COLORS.muted2, marginTop: 12 },
})
