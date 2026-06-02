import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { transactionsApi, categoriesApi, type Transaction } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const TYPE_FILTERS = [
  { label: 'Todos',    value: undefined  },
  { label: 'Despesas', value: 'EXPENSE'  },
  { label: 'Receitas', value: 'INCOME'   },
]

function TxItem({ item, onDelete }: { item: Transaction; onDelete: () => void }) {
  const isIncome = item.type === 'INCOME'
  return (
    <TouchableOpacity
      style={styles.item}
      onLongPress={() =>
        Alert.alert('Excluir transação', `Remover "${item.description ?? item.category.name}"?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: onDelete },
        ])
      }
      activeOpacity={0.8}
    >
      <View style={[styles.icon, { backgroundColor: isIncome ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)' }]}>
        <Text style={styles.emoji}>{item.category.icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.description ?? item.category.name}</Text>
        <Text style={styles.meta}>
          {format(new Date(item.date), "d MMM yyyy", { locale: ptBR })} · {item.category.name}
        </Text>
      </View>
      <Text style={[styles.amount, { color: isIncome ? COLORS.success : COLORS.danger }]}>
        {isIncome ? '+' : '-'}{fmt(item.amount)}
      </Text>
    </TouchableOpacity>
  )
}

export default function TransactionsScreen() {
  const router  = useRouter()
  const qc      = useQueryClient()
  const [typeFilter, setTypeFilter]   = useState<string | undefined>(undefined)
  const [catFilter, setCatFilter]     = useState<string | undefined>(undefined)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStr   = format(currentMonth, 'yyyy-MM')
  const monthLabel = format(currentMonth, "MMMM 'yy", { locale: ptBR })

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transactions', monthStr, typeFilter, catFilter],
    queryFn:  () =>
      transactionsApi.list({
        month:      monthStr,
        type:       typeFilter,
        categoryId: catFilter,
        limit:      200,
      }).then((r) => r.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const totalIncome  = data?.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) ?? 0
  const totalExpense = data?.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0) ?? 0

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transações</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-transaction')}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Month picker */}
      <View style={styles.monthPicker}>
        <TouchableOpacity onPress={() => setCurrentMonth((m) => subMonths(m, 1))}>
          <Feather name="chevron-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => setCurrentMonth((m) => addMonths(m, 1))}>
          <Feather name="chevron-right" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {!isLoading && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Receitas</Text>
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>{fmt(totalIncome)}</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Despesas</Text>
            <Text style={[styles.summaryValue, { color: COLORS.danger }]}>{fmt(totalExpense)}</Text>
          </View>
        </View>
      )}

      {/* Type Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}
      >
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.pill, typeFilter === f.value && styles.pillActive]}
            onPress={() => setTypeFilter(f.value)}
          >
            <Text style={[styles.pillText, typeFilter === f.value && styles.pillTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Category pills */}
        {(categories ?? []).slice(0, 8).map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.pill, catFilter === c.id && styles.pillActive]}
            onPress={() => setCatFilter(catFilter === c.id ? undefined : c.id)}
          >
            <Text style={styles.pillEmoji}>{c.icon}</Text>
            <Text style={[styles.pillText, catFilter === c.id && styles.pillTextActive]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TxItem item={item} onDelete={() => deleteMutation.mutate(item.id)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="repeat" size={36} color={COLORS.muted} />
              <Text style={styles.emptyText}>Nenhuma transação encontrada.</Text>
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
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8,
  },
  title:  { fontSize: 22, fontWeight: '700', color: COLORS.text },
  addBtn: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },

  monthPicker: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 20, paddingVertical: 8,
  },
  monthLabel: {
    fontSize: 15, fontWeight: '600', color: COLORS.text, textTransform: 'capitalize', minWidth: 100, textAlign: 'center',
  },

  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, marginHorizontal: 20, borderRadius: 14,
    padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  summaryItem:  { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 2 },
  summaryValue: { fontSize: 15, fontWeight: '700' },
  summarySep:   { width: 1, height: 32, backgroundColor: COLORS.border },

  filtersScroll: { maxHeight: 44 },
  filters: { gap: 8, paddingHorizontal: 20, paddingVertical: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  pillActive:     { backgroundColor: COLORS.brandDim, borderColor: COLORS.brand },
  pillText:       { fontSize: 13, color: COLORS.muted },
  pillTextActive: { color: COLORS.brand, fontWeight: '600' },
  pillEmoji:      { fontSize: 13 },

  list: { paddingHorizontal: 20, paddingBottom: 32 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  icon:   { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emoji:  { fontSize: 18 },
  info:   { flex: 1 },
  name:   { fontSize: 14, fontWeight: '500', color: COLORS.text },
  meta:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '600' },

  empty:     { paddingTop: 60, alignItems: 'center', gap: 8 },
  emptyText: { color: COLORS.muted, fontSize: 14 },
})
