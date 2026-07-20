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
import { EmptyState } from '@/components/empty-state'
import { InfoSheet } from '@/components/info-sheet'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

function transactionInfoProps(t: Transaction) {
  const isIncome = t.type === 'INCOME'
  return {
    typeLabel:   'Transação',
    title:       t.description ?? t.category.name,
    amount:      `${isIncome ? '+' : '-'}${fmt(Number(t.amount))}`,
    amountColor: isIncome ? COLORS.success : COLORS.danger,
    badge:       { label: isIncome ? 'Receita' : 'Despesa', color: isIncome ? COLORS.success : COLORS.danger },
    rows: [
      { label: 'Tipo',        value: isIncome ? 'Receita' : 'Despesa' },
      { label: 'Data',        value: format(new Date(t.date), 'dd/MM/yyyy', { locale: ptBR }) },
      { label: 'Categoria',   value: `${t.category.icon} ${t.category.name}` },
      { label: 'Conta',       value: t.account ? `${t.account.icon} ${t.account.name}` : '' },
      { label: 'Descrição',   value: t.description ?? '' },
    ],
  }
}

const TYPE_FILTERS = [
  { label: 'Todos',    value: undefined  },
  { label: 'Despesas', value: 'EXPENSE'  },
  { label: 'Receitas', value: 'INCOME'   },
]

function TxItem({ item, onEdit, onDelete }: { item: Transaction; onEdit: () => void; onDelete: () => void }) {
  const isIncome = item.type === 'INCOME'
  const [infoOpen, setInfoOpen] = useState(false)

  const showOptions = () =>
    Alert.alert('Opções', item.description ?? item.category.name, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Editar', onPress: onEdit },
      { text: 'Excluir', style: 'destructive', onPress: onDelete },
    ])

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => setInfoOpen(true)}
      onLongPress={showOptions}
      activeOpacity={0.8}
    >
      <InfoSheet visible={infoOpen} onClose={() => setInfoOpen(false)} {...transactionInfoProps(item)} />
      <View style={[styles.icon, { backgroundColor: isIncome ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)' }]}>
        <Text style={styles.emoji}>{item.category.icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.description ?? item.category.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {format(new Date(item.date), "d MMM yyyy", { locale: ptBR })} · {item.category.name}
          {item.account ? ` · ${item.account.icon} ${item.account.name}` : ''}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={[styles.amount, { color: isIncome ? COLORS.success : COLORS.danger }]}>
          {isIncome ? '+' : '-'}{fmt(Number(item.amount))}
        </Text>
        <TouchableOpacity onPress={showOptions} hitSlop={8} style={{ padding: 4 }}>
          <Feather name="more-vertical" size={16} color={COLORS.muted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const PAGE_SIZE = 30

export default function TransactionsScreen() {
  const router  = useRouter()
  const qc      = useQueryClient()
  const [typeFilter,    setTypeFilter]    = useState<string | undefined>(undefined)
  const [catFilter,     setCatFilter]     = useState<string | undefined>(undefined)
  const [currentMonth,  setCurrentMonth]  = useState<Date | null>(new Date())
  const [search,        setSearch]        = useState('')
  const [allItems,      setAllItems]      = useState<Transaction[]>([])
  const [page,          setPage]          = useState(1)
  const [totalCount,    setTotalCount]    = useState(0)
  const [totalPages,    setTotalPages]    = useState(1)
  const [loadingMore,   setLoadingMore]   = useState(false)

  const monthStr   = currentMonth ? format(currentMonth, 'yyyy-MM') : undefined
  const monthLabel = currentMonth ? format(currentMonth, 'MMMM yyyy', { locale: ptBR }) : 'Todos'

  const { isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transactions', monthStr, typeFilter, catFilter],
    queryFn:  () =>
      transactionsApi.list({
        month:      monthStr,
        type:       typeFilter,
        categoryId: catFilter,
        pageSize:   PAGE_SIZE,
        page:       1,
      }).then((r) => {
        const d = r.data
        setAllItems(d?.items ?? [])
        setTotalCount(d?.total ?? 0)
        setTotalPages(d?.totalPages ?? 1)
        setPage(1)
        return d
      }),
  })

  async function loadMore() {
    if (loadingMore || page >= totalPages) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const r = await transactionsApi.list({
        month:      monthStr,
        type:       typeFilter,
        categoryId: catFilter,
        pageSize:   PAGE_SIZE,
        page:       nextPage,
      })
      const d = r.data
      setAllItems(prev => [...prev, ...(d?.items ?? [])])
      setTotalCount(d?.total ?? totalCount)
      setTotalPages(d?.totalPages ?? totalPages)
      setPage(nextPage)
    } finally {
      setLoadingMore(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return allItems
    const q = search.toLowerCase()
    return allItems.filter((t) =>
      (t.description ?? '').toLowerCase().includes(q) ||
      t.category.name.toLowerCase().includes(q),
    )
  }, [allItems, search])

  const hasActiveFilters = !!typeFilter || !!catFilter || !!search.trim()
  const hasMore = page < totalPages

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
    // Optimistic: this screen renders from the local `allItems` list, so remove
    // the row instantly and restore it if the request fails.
    onMutate: (id: string) => {
      const prev = allItems
      setAllItems((list) => list.filter((t) => t.id !== id))
      return { prev }
    },
    onError: (e: Error, _id, ctx?: { prev?: Transaction[] }) => {
      if (ctx?.prev) setAllItems(ctx.prev)
      Alert.alert('Erro', e.message)
    },
    onSettled: () => {
      qc.refetchQueries({ queryKey: ['transactions'] })
      qc.refetchQueries({ queryKey: ['dashboard'] })
    },
  })

  const totalIncome  = filtered.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = filtered.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Transações</Text>
        <View style={{ width: 38 }} />
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
          onEndReached={() => { if (hasMore && !loadingMore) loadMore() }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            <View style={styles.listFooter}>
              {totalCount > 0 && (
                <Text style={styles.footerCount}>
                  Mostrando {allItems.length} de {totalCount} transações
                </Text>
              )}
              {hasMore && (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
                  {loadingMore ? (
                    <ActivityIndicator size="small" color={COLORS.brand} />
                  ) : (
                    <Text style={styles.loadMoreText}>Carregar mais</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              mood="confused"
              title="Nenhuma transação encontrada"
              subtitle={hasActiveFilters ? 'Nenhum resultado para os filtros aplicados.' : 'Suas movimentações aparecerão aqui'}
            />
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

  listFooter:   { paddingVertical: 16, alignItems: 'center', gap: 10 },
  footerCount:  { fontSize: 12, color: COLORS.muted },
  loadMoreBtn:  {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.brand + '18', borderWidth: 1, borderColor: COLORS.brand + '40',
  },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: COLORS.brand },
})
