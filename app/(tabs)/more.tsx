import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { useAuthStore } from '@/lib/auth'

type FeatherName = React.ComponentProps<typeof Feather>['name']

function MenuItem({
  icon, label, onPress, danger,
}: {
  icon: FeatherName
  label: string
  onPress: () => void
  danger?: boolean
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? 'rgba(239,68,68,0.12)' : COLORS.brandDim }]}>
        <Feather name={icon} size={17} color={danger ? COLORS.danger : COLORS.brand} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: COLORS.danger }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={COLORS.muted2} />
    </TouchableOpacity>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title.toUpperCase()}</Text>
      <View style={styles.card}>
        {children}
      </View>
    </View>
  )
}

function Divider() {
  return <View style={styles.divider} />
}

export default function MoreScreen() {
  const router    = useRouter()
  const user      = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const initials = (user?.name ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* User card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
        {user?.plan === 'PRO' ? (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>⚡ PRO</Text>
          </View>
        ) : (
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>FREE</Text>
          </View>
        )}
      </View>

      {/* Finanças */}
      <Section title="Finanças">
        <MenuItem icon="pie-chart"     label="Orçamento"     onPress={() => router.push('/budget')} />
        <Divider />
        <MenuItem icon="briefcase"     label="Rendas"        onPress={() => router.push('/income')} />
        <Divider />
        <MenuItem icon="refresh-cw"    label="Recorrências"  onPress={() => router.push('/recurring')} />
      </Section>

      {/* Análises */}
      <Section title="Análises">
        <MenuItem icon="bar-chart-2"   label="Relatórios"    onPress={() => router.push('/reports')} />
        <Divider />
        <MenuItem icon="tag"           label="Categorias"    onPress={() => router.push('/categories')} />
      </Section>

      {/* Conta */}
      <Section title="Conta">
        <MenuItem icon="settings"      label="Configurações" onPress={() => router.push('/settings')} />
      </Section>

      {/* Logout */}
      <View style={styles.section}>
        <View style={styles.card}>
          <MenuItem icon="log-out" label="Sair da conta" onPress={handleLogout} danger />
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 28,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText:  { fontSize: 20, fontWeight: '700', color: '#fff' },
  userInfo:    { flex: 1 },
  userName:    { fontSize: 16, fontWeight: '700', color: COLORS.text },
  userEmail:   { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  proBadge:    {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  proBadgeText: { color: COLORS.warning, fontSize: 11, fontWeight: '700' },
  freeBadge:    {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
  },
  freeBadgeText: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },

  section:      { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },
  divider:   { height: 1, backgroundColor: COLORS.border, marginLeft: 62 },
})
