import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { notificationsApi, type AppNotification } from '@/lib/api'

const TYPE_ICON: Record<AppNotification['type'], keyof typeof Feather.glyphMap> = {
  bill:     'file-text',
  goal:     'target',
  budget:   'pie-chart',
  person:   'users',
  income:   'trending-up',
  rookinho: 'message-circle',
}

const TYPE_COLOR: Record<AppNotification['type'], string> = {
  bill:     COLORS.warning,
  goal:     COLORS.brand,
  budget:   COLORS.danger,
  person:   '#a78bfa',
  income:   COLORS.success,
  rookinho: '#f59e0b',
}

const URGENCY_DOT: Record<AppNotification['urgency'], string> = {
  high:   COLORS.danger,
  medium: COLORS.warning,
  low:    COLORS.muted,
}

const GROUP_LABELS: Record<AppNotification['urgency'], string> = {
  high:   '🔴 Urgente',
  medium: '🟡 Atenção',
  low:    '🔵 Informativo',
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const color = TYPE_COLOR[item.type]
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: color + '22' }]}>
        <Feather name={TYPE_ICON[item.type]} size={15} color={color} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.rowMessage} numberOfLines={2}>{item.message}</Text>
      </View>
      <View style={[styles.urgencyDot, { backgroundColor: URGENCY_DOT[item.urgency] }]} />
      <Feather name="chevron-right" size={16} color={COLORS.muted} />
    </TouchableOpacity>
  )
}

export default function NotificationsScreen() {
  const router = useRouter()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationsApi.list().then((r) => r.data),
  })

  const groups = (['high', 'medium', 'low'] as const)
    .map((urgency) => ({ urgency, items: (data ?? []).filter((n) => n.urgency === urgency) }))
    .filter((g) => g.items.length > 0)

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
        >
          {groups.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="check-circle" size={28} color={COLORS.success} />
              </View>
              <Text style={styles.emptyTitle}>Tudo em dia!</Text>
              <Text style={styles.emptyText}>Nenhuma notificação no momento.</Text>
            </View>
          ) : (
            groups.map(({ urgency, items }) => (
              <View key={urgency} style={styles.section}>
                <Text style={styles.sectionLabel}>{GROUP_LABELS[urgency]}</Text>
                <View style={styles.card}>
                  {items.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      onPress={() => router.push(item.href as any)}
                    />
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  content: { paddingHorizontal: 20, paddingBottom: 40 },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.muted,
    marginBottom: 10, letterSpacing: 0.5,
  },

  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowInfo: { flex: 1 },
  rowTitle:   { fontSize: 14, fontWeight: '600', color: COLORS.text },
  rowMessage: { fontSize: 12, color: COLORS.muted, marginTop: 2, lineHeight: 16 },
  urgencyDot: { width: 8, height: 8, borderRadius: 4 },

  empty:      { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.success + '18',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  emptyText:  { fontSize: 13, color: COLORS.muted },
})
