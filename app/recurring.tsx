import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { recurringApi, type Recurring } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const FREQ_LABEL: Record<string, string> = {
  WEEKLY:  'Semanal',
  MONTHLY: 'Mensal',
  YEARLY:  'Anual',
}

function RecurringItem({
  item,
  onToggle,
  onDelete,
}: {
  item: Recurring
  onToggle: () => void
  onDelete: () => void
}) {
  const isIncome = item.type === 'INCOME'

  return (
    <TouchableOpacity
      style={[styles.item, !item.isActive && styles.itemInactive]}
      onLongPress={() =>
        Alert.alert('Opções', item.name, [
          { text: 'Cancelar', style: 'cancel' },
          { text: item.isActive ? 'Desativar' : 'Ativar', onPress: onToggle },
          { text: 'Excluir', style: 'destructive', onPress: onDelete },
        ])
      }
      activeOpacity={0.8}
    >
      <View style={[styles.icon, { backgroundColor: isIncome ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }]}>
        <Text style={styles.emoji}>{item.category.icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.category.name} · {FREQ_LABEL[item.frequency] ?? item.frequency}
          {item.dayOfMonth ? ` · Dia ${item.dayOfMonth}` : ''}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: isIncome ? COLORS.success : COLORS.danger }]}>
          {isIncome ? '+' : '-'}{fmt(item.amount)}
        </Text>
        <View style={[styles.typeBadge, { backgroundColor: isIncome ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)' }]}>
          <Text style={[styles.typeText, { color: isIncome ? COLORS.success : COLORS.danger }]}>
            {isIncome ? 'Receita' : 'Despesa'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function RecurringScreen() {
  const router = useRouter()
  const qc     = useQueryClient()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['recurring'],
    queryFn:  () => recurringApi.list().then((r) => r.data),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      recurringApi.toggle(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recurringApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const active   = data?.filter((r) => r.isActive) ?? []
  const inactive = data?.filter((r) => !r.isActive) ?? []

  const sections: { title: string; data: Recurring[] }[] = []
  if (active.length > 0)   sections.push({ title: 'ATIVAS', data: active })
  if (inactive.length > 0) sections.push({ title: 'INATIVAS', data: inactive })

  const allItems = sections.flatMap((s) => [
    { type: 'header', key: s.title, title: s.title } as const,
    ...s.data.map((item) => ({ type: 'item', key: item.id, item } as const)),
  ])

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Recorrências</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-recurring')}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(i) => i.key}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.sectionLabel}>{item.title}</Text>
            }
            return (
              <RecurringItem
                item={item.item}
                onToggle={() => toggleMutation.mutate({ id: item.item.id, isActive: !item.item.isActive })}
                onDelete={() => deleteMutation.mutate(item.item.id)}
              />
            )
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="refresh-cw" size={40} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>Nenhuma recorrência</Text>
              <Text style={styles.emptyText}>Configure transações recorrentes</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:  { fontSize: 20, fontWeight: '700', color: COLORS.text },
  addBtn: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },

  list: { paddingHorizontal: 20, paddingBottom: 32 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.muted,
    letterSpacing: 1, marginBottom: 8, marginTop: 16,
  },

  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  itemInactive: { opacity: 0.5 },
  icon:   { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emoji:  { fontSize: 20 },
  info:   { flex: 1 },
  name:   { fontSize: 14, fontWeight: '600', color: COLORS.text },
  meta:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  right:  { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '700' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText:  { fontSize: 11, fontWeight: '600' },

  empty:      { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  emptyText:  { fontSize: 13, color: COLORS.muted },
})
