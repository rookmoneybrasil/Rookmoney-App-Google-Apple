import { View, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions, Alert, Image } from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { useAuthStore } from '@/lib/auth'

type FeatherName = React.ComponentProps<typeof Feather>['name']

interface GridItem {
  label: string
  icon:  FeatherName
  route: string
  pro?:  boolean
}

const MAIN_ITEMS: GridItem[] = [
  { label: 'Extratos',     icon: 'list',         route: '/transactions' },
  { label: 'Metas',        icon: 'target',       route: '/goals'      },
  { label: 'Orçamento',    icon: 'pie-chart',    route: '/budget',    pro: true },
  { label: 'Calendário',   icon: 'calendar',     route: '/calendar'   },
  { label: 'Relatórios',   icon: 'bar-chart-2',  route: '/reports',   pro: true },
  { label: 'Importar',     icon: 'upload',       route: '/import',    pro: true },
  { label: 'Categorias',   icon: 'tag',          route: '/categories' },
  { label: 'Projeção',     icon: 'activity',     route: '/projection', pro: true },
]

const SECONDARY_ITEMS: GridItem[] = [
  { label: 'Planos',       icon: 'star',         route: '/billing'    },
  { label: 'Suporte',      icon: 'help-circle',  route: '/feedback'   },
  { label: 'Configurações',icon: 'settings',     route: '/settings'   },
]

const COLS  = 3
const GAP   = 10
const H_PAD = 20

function GridCard({ item, isPro, itemW }: { item: GridItem; isPro: boolean; itemW: number }) {
  const router  = useRouter()
  const locked  = item.pro && !isPro
  return (
    <TouchableOpacity
      style={[styles.card, { width: itemW }, locked && styles.cardLocked]}
      onPress={() => router.push(item.route as any)}
      activeOpacity={0.75}
    >
      {locked && (
        <View style={styles.lockBadge}>
          <Feather name="lock" size={9} color={COLORS.warning} />
        </View>
      )}
      <View style={styles.iconWrap}>
        <Feather name={item.icon} size={22} color={locked ? COLORS.muted : COLORS.brand} />
      </View>
      <Text style={[styles.cardLabel, locked && { color: COLORS.muted }]}>{item.label}</Text>
    </TouchableOpacity>
  )
}

export default function MoreScreen() {
  const router    = useRouter()
  const user      = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const { width: screenW } = useWindowDimensions()
  const itemW = Math.floor((screenW - H_PAD * 2 - GAP * (COLS - 1)) / COLS)

  const isPro     = user?.plan === 'PRO'
  const initials  = (user?.name ?? 'U')
    .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  function handleLogout() {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => {
        clearAuth()
        router.replace('/(auth)/login')
      }},
    ])
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mais</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
          <Feather name="settings" size={20} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* User card */}
      <TouchableOpacity style={styles.userCard} onPress={() => router.push('/settings')} activeOpacity={0.85}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{user?.name ?? '—'}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user?.email ?? '—'}</Text>
        </View>
        {isPro ? (
          <View style={styles.proBadge}>
            <Text style={styles.proText}>PRO</Text>
          </View>
        ) : (
          <View style={styles.freeBadge}>
            <Text style={styles.freeText}>Free</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Grid */}
      <View style={styles.grid}>
        {MAIN_ITEMS.map((item) => (
          <GridCard key={item.route} item={item} isPro={isPro} itemW={itemW} />
        ))}
      </View>

      {/* Rookinho AI banner */}
      <TouchableOpacity style={styles.aiCard} onPress={() => router.push('/ai-chat')} activeOpacity={0.85}>
        <Image source={require('../../assets/rookinho.png')} style={styles.aiImage} />
        <View style={styles.aiTextWrap}>
          <Text style={styles.aiTitle}>Organize suas contas com o Rookinho</Text>
          <Text style={styles.aiSubtitle}>Nosso agente de IA</Text>
        </View>
        <Feather name="chevron-right" size={20} color={COLORS.muted} />
      </TouchableOpacity>

      {/* Secondary items */}
      <View style={[styles.grid, styles.secondaryGrid]}>
        {SECONDARY_ITEMS.map((item) => (
          <GridCard key={item.route} item={item} isPro={isPro} itemW={itemW} />
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Feather name="log-out" size={16} color={COLORS.danger} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: H_PAD, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 20,
  },
  title:       { fontSize: 22, fontWeight: '700', color: COLORS.text },
  settingsBtn: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 20,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  userInfo:   { flex: 1 },
  userName:   { fontSize: 15, fontWeight: '600', color: COLORS.text },
  userEmail:  { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  proBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  proText:   { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
  freeBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  freeText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    marginBottom: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  cardLocked: { opacity: 0.6 },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.brand + '18',
    justifyContent: 'center', alignItems: 'center',
  },
  cardLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  lockBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 6, padding: 3,
  },

  aiCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.brandDim, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
    marginBottom: 28,
  },
  aiImage:    { width: 56, height: 56, resizeMode: 'contain' },
  aiTextWrap: { flex: 1 },
  aiTitle:    { fontSize: 13, fontWeight: '700', color: COLORS.text, lineHeight: 18 },
  aiSubtitle: { fontSize: 11, color: COLORS.brand, marginTop: 2, fontWeight: '600' },

  secondaryGrid: { marginBottom: 28 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.danger + '44',
    backgroundColor: COLORS.danger + '0D',
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: COLORS.danger },
})
