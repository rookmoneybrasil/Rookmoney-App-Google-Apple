import { useState, useMemo } from 'react'
import { View, FlatList, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native'
import { Text, TextInput } from '@/components/text'
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

function TxItem({ item, onEdit, onDelete }: { item: Transaction; onEdit: () => void; onDelete: () => void }) {
  const isIncome = item.type === 'INCOME'
  return (
    <TouchableOpacity
      style={styles.item}
      onLongPress={() =>
        Alert.alert('Opções', item.description ?? item.category.name, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Editar', onPress: onEdit },
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
      <View style={styles.itemRight}>
        <Text style={[styles.amount, { color: isIncome ? COLORS.success : COLORS.danger }]}>
          {isIncome ? '+' : '-'}{fmt(item.amount)}
        </Text>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Feather name="edit-2" size={13} color={COLORS.muted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

export default function TransactionsScreen() {
  const router  = useRouter()
  const qc      = useQueryClient()
  const [typeFilter,    setTypeFilter]    = useState<string | undefined>(undefined)
  const [catFilter,     setCatFilter]     = useState<string | undefined>(undefined)
  const [currentMonth,  setCurrentMonth]  = useState<Date | null>(new Date())
  const [search,        setSearch]        = useState('')

  const monthStr   = currentMonth ? format(currentMonth, 'yyyy-MM') : undefined
  const monthLabel = currentMonth ? format(currentMonth, "MMMM 'yy", { locale: ptBR }) : 'Todos'

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transactions', monthStr, typeFilter, catFilter],
    queryFn:  () =>
      transactionsApi.list({
        month:      monthStr,
        type:       typeFilter,
        categoryId: catFilter,
        pageSize:   200,
      }).then((r) => r.data?.items ?? []),
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return data ?? []
    const q = search.toLowerCase()
    return (data ?? []).filter((t) =>
      (t.description ?? '').toLowerCase().includes(q) ||
      t.category.name.toLowerCase().includes(q),
    )
  }, [data, search])

  const hasActiveFilters = !!typeFilter || !!catFilter || !!search.trim()

  function clearFilters() {
    setTypeFilter(undefined)
    setCatFilter(undefined)
    setSearch('')
  }

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

  const totalIncome  = filtered.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Transações</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-transaction')}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={15} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por descrição ou categoria..."
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Feather name="x" size={15} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Month picker */}
      <View style={styles.monthPicker}>
        <TouchableOpacity onPress={() => setCurrentMonth((m) => m ? subMonths(m, 1) : new Date())}>
          <Feather name="chevron-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCurrentMonth(currentMonth ? null : new Date())}>
          <Text style={[styles.monthLabel, !currentMonth && { color: COLORS.brand }]}>{monthLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCurrentMonth((m) => m ? addMonths(m, 1) : new Date())}>
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

      {/* Type + Category Filter Pills */}
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

        {(categories ?? []).map((c) => (
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

        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearPill} onPress={clearFilters}>
            <Feather name="x" size={13} color={COLORS.danger} />
            <Text style={styles.clearPillText}>Limpar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Result count */}
      {!isLoading && hasActiveFilters && (
        <Text style={styles.resultCount}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</Text>
      )}

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TxItem
              item={item}
              onEdit={() => router.push(`/edit-transaction?id=${item.id}`)}
              onDelete={() => deleteMutation.mutate(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="repeat" size={36} color={COLORS.muted} />
              <Text style={styles.emptyText}>
                {hasActiveFilters ? 'Nenhum resultado para os filtros aplicados.' : 'Nenhuma transação encontrada.'}
              </Text>
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
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:  { fontSize: 20, fontWeight: '700', color: COLORS.text },
  addBtn: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },

  searchRow:   { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 0 },

  resultCount: { fontSize: 12, color: COLORS.muted, paddingHorizontal: 20, paddingBottom: 4 },

  clearPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.danger + '15', borderWidth: 1, borderColor: COLORS.danger + '40',
  },
  clearPillText: { fontSize: 13, color: COLORS.danger },

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

  list: { paddingHorizontal: 20, paddingBottom: 100 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  icon:      { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emoji:     { fontSize: 18 },
  info:      { flex: 1 },
  name:      { fontSize: 14, fontWeight: '500', color: COLORS.text },
  meta:      { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  amount:    { fontSize: 14, fontWeight: '600' },
  editBtn:   { width: 24, height: 24, borderRadius: 6, backgroundColor: COLORS.muted + '18', justifyContent: 'center', alignItems: 'center' },

  empty:     { paddingTop: 60, alignItems: 'center', gap: 8 },
  emptyText: { color: COLORS.muted, fontSize: 14 },
})
