import { useState, useMemo, useRef, useCallback } from 'react'
import { View, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { PressableScale } from '@/components/pressable-scale'
import { useRouter, useFocusEffect } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { ListSkeleton } from '@/components/skeleton'
import { peopleApi, meApi, type Person } from '@/lib/api'
import { ProGate } from '@/components/pro-gate'
import { PersonAvatar } from '@/components/people/avatar'
import { PersonSheet } from '@/components/people/person-sheet'
import { FadeIn } from '@/components/animated-entry'
import { EmptyState } from '@/components/empty-state'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

type Filter = 'all' | 'they_owe' | 'i_owe' | 'settled'
type Sort   = 'name' | 'balance_desc' | 'balance_asc'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',      label: 'Todos' },
  { value: 'they_owe', label: 'Me devem' },
  { value: 'i_owe',    label: 'Eu devo' },
  { value: 'settled',  label: 'Quitados' },
]

const SORTS: { value: Sort; label: string }[] = [
  { value: 'name',         label: 'A–Z' },
  { value: 'balance_desc', label: 'Maior saldo' },
  { value: 'balance_asc',  label: 'Menor saldo' },
]

function PersonRow({ person, onPress, onLongPress }: {
  person: Person
  onPress: () => void
  onLongPress: () => void
}) {
  return (
    <PressableScale style={styles.row} onPress={onPress} onLongPress={onLongPress}>
      <PersonAvatar name={person.name} color={person.color} size="md" />

      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{person.name}</Text>
        <Text style={person.openEntriesCount === 0 ? styles.rowSubtitleMuted : styles.rowSubtitle} numberOfLines={1}>
          {person.openEntriesCount === 0
            ? 'Clique para adicionar lançamentos'
            : `${person.openEntriesCount} lançamento${person.openEntriesCount !== 1 ? 's' : ''} pendente${person.openEntriesCount !== 1 ? 's' : ''}`}
        </Text>
      </View>

      <TouchableOpacity onPress={onLongPress} hitSlop={8} style={{ padding: 4 }}>
        <Feather name="more-vertical" size={16} color={COLORS.muted} />
      </TouchableOpacity>

      <View style={styles.rowRight}>
        <View style={styles.rowAmounts}>
          <View style={styles.rowAmountLine}>
            <Text style={styles.rowAmountLabel}>te deve</Text>
            <Text style={[styles.rowAmountValue, { color: person.theyOweMe > 0 ? COLORS.success : COLORS.muted2 }]} numberOfLines={1}>
              {fmt(person.theyOweMe)}
            </Text>
          </View>
          <View style={styles.rowAmountLine}>
            <Text style={styles.rowAmountLabel}>vc deve</Text>
            <Text style={[styles.rowAmountValue, { color: person.iOweThem > 0 ? COLORS.danger : COLORS.muted2 }]} numberOfLines={1}>
              {fmt(person.iOweThem)}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={16} color={COLORS.muted} />
      </View>
    </PressableScale>
  )
}

export default function PeopleTab() {
  const router = useRouter()
  const qc     = useQueryClient()
  const scrollRef = useRef<any>(null)

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollToOffset?.({ offset: 0, animated: false })
  }, []))

  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState<Filter>('all')
  const [sort, setSort]               = useState<Sort>('name')
  const [sheetOpen, setSheetOpen]     = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then(r => r.data),
  })

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['people'],
    queryFn:  () => peopleApi.list().then(r => r.data),
  })

  const refetchAll = async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ['people'], type: 'active' }),
      qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' }),
    ])
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => peopleApi.delete(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['people'] })
      const prev = qc.getQueryData<{ id: string }[]>(['people'])
      if (prev) qc.setQueryData(['people'], prev.filter((p) => p.id !== id))
      return { prev }
    },
    onError: (e: Error, _id, ctx?: { prev?: { id: string }[] }) => {
      if (ctx?.prev) qc.setQueryData(['people'], ctx.prev)
      Alert.alert('Erro', e.message)
    },
    onSettled: () => refetchAll(),
  })

  const allPeople = useMemo(() => data ?? [], [data])

  const totalTheyOwe = allPeople.reduce((s, p) => s + (p.balance > 0 ? p.balance : 0), 0)
  const totalIOwe    = allPeople.reduce((s, p) => s + (p.balance < 0 ? -p.balance : 0), 0)
  const netBalance   = totalTheyOwe - totalIOwe

  const people = useMemo(() => {
    const term = search.toLowerCase().trim()
    let list = allPeople.filter(p => {
      if (term && !p.name.toLowerCase().includes(term)) return false
      if (filter === 'they_owe') return p.balance > 0
      if (filter === 'i_owe')    return p.balance < 0
      if (filter === 'settled')  return p.balance === 0
      return true
    })
    if (sort === 'balance_desc')   list = [...list].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    else if (sort === 'balance_asc') list = [...list].sort((a, b) => Math.abs(a.balance) - Math.abs(b.balance))
    else                            list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    return list
  }, [allPeople, search, filter, sort])

  const isPro   = me?.plan === 'PRO' || me?.plan === 'PRO_PLUS'
  const atLimit = !isPro && allPeople.length >= (me?.limits?.people ?? 2)

  function openCreate() {
    setEditingPerson(null)
    setSheetOpen(true)
  }

  function cycleSort() {
    const idx = SORTS.findIndex(s => s.value === sort)
    setSort(SORTS[(idx + 1) % SORTS.length].value)
  }

  if (me && !isPro && me.limits.people === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.monthLabel}>{format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}</Text>
            <Text style={styles.title}>Pessoas</Text>
          </View>
        </View>
        <ProGate
          feature="Pessoas"
          description="Controle quem te deve e o que você deve para amigos e familiares."
        />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : (
        <FlatList
          ref={scrollRef}
          data={people}
          keyExtractor={p => p.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListHeaderComponent={
            <>
              <FadeIn delay={0}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.monthLabel}>{format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}</Text>
                  <Text style={styles.title}>Pessoas</Text>
                  <Text style={styles.subtitle}>Controle quem te deve e a quem você deve</Text>
                </View>
                {!atLimit ? (
                  <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
                    <Feather name="plus" size={22} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => router.push('/billing')} hitSlop={12}>
                    <View style={styles.limitBadge}>
                      <Feather name="lock" size={12} color={COLORS.warning} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
              </FadeIn>

              {allPeople.length > 0 && (
                <>
                  <FadeIn delay={80}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                      <View style={[styles.summaryIcon, { backgroundColor: COLORS.success + '1a' }]}>
                        <Feather name="trending-up" size={14} color={COLORS.success} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.summaryLabel}>Te devem</Text>
                        <Text style={[styles.summaryValue, { color: COLORS.success }]} numberOfLines={1}>{fmt(totalTheyOwe)}</Text>
                      </View>
                    </View>
                    <View style={styles.summaryCard}>
                      <View style={[styles.summaryIcon, { backgroundColor: COLORS.danger + '1a' }]}>
                        <Feather name="trending-down" size={14} color={COLORS.danger} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.summaryLabel}>Você deve</Text>
                        <Text style={[styles.summaryValue, { color: COLORS.danger }]} numberOfLines={1}>{fmt(totalIOwe)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.summaryRow, { marginTop: 8 }]}>
                    <View style={styles.summaryCard}>
                      <View style={[styles.summaryIcon, { backgroundColor: (netBalance >= 0 ? COLORS.brand : COLORS.danger) + '1a' }]}>
                        <Feather name="check-circle" size={14} color={netBalance >= 0 ? COLORS.brand : COLORS.danger} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.summaryLabel}>Saldo líquido</Text>
                        <Text style={[styles.summaryValue, { color: netBalance >= 0 ? COLORS.brand : COLORS.danger }]} numberOfLines={1}>
                          {fmt(Math.abs(netBalance))}
                        </Text>
                      </View>
                    </View>
                  </View>
                  </FadeIn>

                  {/* Busca */}
                  <FadeIn delay={160}>
                  <View style={styles.searchBox}>
                    <Feather name="search" size={14} color={COLORS.muted} />
                    <TextInput
                      style={styles.searchInput}
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Buscar pessoa..."
                      placeholderTextColor={COLORS.muted}
                    />
                  </View>

                  {/* Filtros + ordenação */}
                  <View style={styles.filterRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                      {FILTERS.map(f => (
                        <TouchableOpacity
                          key={f.value}
                          style={[styles.filterPill, filter === f.value && styles.filterPillActive]}
                          onPress={() => setFilter(f.value)}
                        >
                          <Text style={[styles.filterPillText, filter === f.value && styles.filterPillTextActive]}>{f.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity style={styles.sortBtn} onPress={cycleSort}>
                      <Feather name="sliders" size={12} color={COLORS.muted} />
                      <Text style={styles.sortBtnText}>{SORTS.find(s => s.value === sort)?.label}</Text>
                    </TouchableOpacity>
                  </View>
                  </FadeIn>
                </>
              )}
            </>
          }
          renderItem={({ item }) => (
            <PersonRow
              person={item}
              onPress={() => router.push({ pathname: '/person-detail', params: { id: item.id } })}
              onLongPress={() => Alert.alert('Opções', item.name, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Editar', onPress: () => { setEditingPerson(item); setSheetOpen(true) } },
                {
                  text: 'Excluir', style: 'destructive', onPress: () => {
                    Alert.alert(
                      'Excluir pessoa',
                      `Remover ${item.name} e todas as pendências?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                      ]
                    )
                  }
                },
              ])}
            />
          )}
          ListEmptyComponent={
            allPeople.length === 0 ? (
              <View style={styles.empty}>
                <EmptyState
                  mood="confused"
                  title="Nenhuma pessoa cadastrada"
                  subtitle="Adicione pessoas para controlar empréstimos e dívidas"
                />
                <TouchableOpacity style={styles.emptyBtn} onPress={openCreate}>
                  <Text style={styles.emptyBtnText}>Adicionar pessoa</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.emptyFiltered}>Nenhuma pessoa encontrada para este filtro.</Text>
            )
          }
          ListFooterComponent={
            allPeople.length > 0
              ? <Text style={styles.footerText}>{people.length} de {allPeople.length} pessoa{allPeople.length !== 1 ? 's' : ''}</Text>
              : null
          }
        />
      )}

      {atLimit && (
        <View style={styles.limitBanner}>
          <Feather name="info" size={14} color={COLORS.warning} />
          <Text style={styles.limitBannerText}>
            Limite de {me?.limits?.people} pessoas no plano Free.{' '}
            <Text style={styles.limitBannerLink} onPress={() => router.push('/billing')}>Fazer upgrade</Text>
          </Text>
        </View>
      )}

      <PersonSheet visible={sheetOpen} person={editingPerson} onClose={() => setSheetOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8,
  },
  monthLabel: { fontSize: 12, fontWeight: '800', color: COLORS.brand, textTransform: 'capitalize', marginBottom: 4 },
  title:    { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  addBtn: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  limitBadge: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Summary cards
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 12 },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  summaryIcon: {
    width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center',
  },
  summaryLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  summaryValue: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 2 },

  // Busca
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 12, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },

  // Filtros + ordenação
  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginTop: 10, marginBottom: 14,
  },
  filterPill: {
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
  },
  filterPillActive:     { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  filterPillText:       { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  filterPillTextActive: { color: '#fff' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8, flexShrink: 0,
  },
  sortBtnText: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },

  list: { padding: 16, paddingTop: 8, paddingBottom: 100 },

  // Person row
  row: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
  },
  rowInfo:        { flex: 1, minWidth: 0 },
  rowName:        { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rowSubtitle:    { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  rowSubtitleMuted: { fontSize: 12, color: COLORS.muted2, marginTop: 2 },

  rowRight: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minWidth: 118,
  },
  rowAmounts:     { flex: 1, gap: 3 },
  rowAmountLine:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  rowAmountLabel: { fontSize: 9, color: COLORS.muted2 },
  rowAmountValue: { fontSize: 12, fontWeight: '700' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  emptyDesc:  { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 20, backgroundColor: COLORS.brand, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  emptyFiltered: { fontSize: 13, color: COLORS.muted2, textAlign: 'center', paddingVertical: 32 },

  footerText: { fontSize: 11, color: COLORS.muted2, textAlign: 'center', marginTop: 12 },

  limitBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
  },
  limitBannerText: { flex: 1, fontSize: 13, color: COLORS.warning },
  limitBannerLink: { fontWeight: '700', textDecorationLine: 'underline' },
})
