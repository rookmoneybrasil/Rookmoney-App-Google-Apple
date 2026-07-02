import { useState, useEffect, useRef, useCallback } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { PressableScale } from '@/components/pressable-scale'
import { useRouter, useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { ListSkeleton } from '@/components/skeleton'
import { incomeSourcesApi, transactionsApi, categoriesApi, type IncomeSource, type IncomeHistoryEntry, type Category } from '@/lib/api'
import { FadeIn } from '@/components/animated-entry'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const TYPE_CONFIG: Record<string, { label: string; icon: string; variant: 'brand' | 'default' }> = {
  EMPLOYMENT: { label: 'CLT / PJ',  icon: '💼', variant: 'brand'   },
  FREELANCE:  { label: 'Freelance', icon: '🧑‍💻', variant: 'default' },
  RENTAL:     { label: 'Aluguel',   icon: '🏠', variant: 'default' },
  OTHER:      { label: 'Outro',     icon: '💡', variant: 'default' },
}

function receivedDateLabel(source: IncomeSource): string {
  if (!source.lastAutoPayMonth) return '—'
  const [y, m] = source.lastAutoPayMonth.split('-').map(Number)
  if (source.isRecurring && source.dayOfMonth) {
    return format(new Date(y, m - 1, source.dayOfMonth), "dd 'de' MMM", { locale: ptBR })
  }
  return format(new Date(y, m - 1, 1), 'MMM yyyy', { locale: ptBR })
}

function getNthBusinessDay(n: number, ref = new Date()): Date {
  const year  = ref.getFullYear()
  const month = ref.getMonth()
  let count = 0, day = 1
  while (count < n) {
    const dow = new Date(year, month, day).getDay()
    if (dow !== 0 && dow !== 6) count++
    if (count < n) day++
  }
  return new Date(year, month, day)
}

function Badge({ label, color, dot }: { label: string; color: string; dot?: boolean }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      {dot && <View style={[styles.badgeDot, { backgroundColor: color }]} />}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  )
}

function RecurringRow({ source, currentMonth, now, onEdit, onDelete }: {
  source: IncomeSource
  currentMonth: string
  now: Date
  onEdit: () => void
  onDelete: () => void
}) {
  const cfg       = TYPE_CONFIG[source.type] ?? TYPE_CONFIG.OTHER
  const received  = source.lastAutoPayMonth === currentMonth
  const isFuture  = !!source.startDate && new Date(source.startDate) > now
  const startLabel = isFuture ? format(new Date(source.startDate!), "MMMM 'de' yyyy", { locale: ptBR }) : null

  const showOptions = () =>
    Alert.alert('Opções', source.name, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Editar', onPress: onEdit },
      { text: 'Excluir', style: 'destructive', onPress: onDelete },
    ])

  return (
    <PressableScale
      style={[
        styles.row,
        received  ? styles.rowReceived
        : isFuture ? styles.rowFuture
        : styles.rowSuccess,
      ]}
      onLongPress={showOptions}
    >
      <View style={[styles.rowIcon, { backgroundColor: COLORS.success + (received ? '26' : '1a') }]}>
        <Text style={styles.rowEmoji}>{cfg.icon}</Text>
      </View>
      <View style={styles.rowInfo}>
        <View style={styles.rowNameWrap}>
          <Text style={styles.rowName} numberOfLines={1}>{source.name}</Text>
          {isFuture  && <Badge label={`Começa em ${startLabel}`} color={COLORS.muted} dot />}
          {!isFuture && received  && <Badge label="Recebido" color={COLORS.success} dot />}
          {!isFuture && !received && <Badge label="A receber" color={COLORS.warning} dot />}
        </View>
        <Text style={styles.rowSubtitle}>
          <Text style={styles.rowAmount}>+{fmt(source.amount)}/mês</Text>
          {source.dayOfMonth ? ` · dia ${source.dayOfMonth}` : ''}
          {received ? ` · ${receivedDateLabel(source)}` : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={showOptions} hitSlop={8} style={{ padding: 4 }}>
        <Feather name="more-vertical" size={16} color={COLORS.muted} />
      </TouchableOpacity>
    </PressableScale>
  )
}

function EventualRow({ source, onReceive, onEdit, onDelete }: {
  source: IncomeSource
  onReceive: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const cfg = TYPE_CONFIG[source.type] ?? TYPE_CONFIG.OTHER

  const showOptions = () =>
    Alert.alert('Opções', source.name, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Editar', onPress: onEdit },
      { text: 'Excluir', style: 'destructive', onPress: onDelete },
    ])

  return (
    <PressableScale
      style={[styles.row, styles.rowWarning]}
      onLongPress={showOptions}
    >
      <View style={[styles.rowIcon, { backgroundColor: COLORS.warning + '1a' }]}>
        <Text style={styles.rowEmoji}>{cfg.icon}</Text>
      </View>
      <View style={styles.rowInfo}>
        <View style={styles.rowNameWrap}>
          <Text style={styles.rowName} numberOfLines={1}>{source.name}</Text>
          <Badge label={cfg.label} color={cfg.variant === 'brand' ? COLORS.brand : COLORS.muted} />
        </View>
        <Text style={styles.rowSubtitle}>
          <Text style={styles.rowAmount}>+{fmt(source.amount)}</Text>
          {source.notes ? ` · ${source.notes}` : ' · Pontual'}
        </Text>
      </View>
      <TouchableOpacity onPress={showOptions} hitSlop={8} style={{ padding: 4 }}>
        <Feather name="more-vertical" size={16} color={COLORS.muted} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.receiveBtn} onPress={onReceive}>
        <Feather name="arrow-down-circle" size={13} color={COLORS.success} />
        <Text style={styles.receiveBtnText}>Recebi</Text>
      </TouchableOpacity>
    </PressableScale>
  )
}

type DateOpt = 'today' | 'bu1' | 'bu5' | 'bu10' | 'custom'

function ReceiptModal({ visible, source, categories, onClose, onConfirm, loading }: {
  visible: boolean
  source: IncomeSource | null
  categories: Category[]
  onClose: () => void
  onConfirm: (amount: number, date: string, categoryId: string) => void
  loading: boolean
}) {
  const [amount,     setAmount]     = useState('')
  const [dateOpt,    setDateOpt]    = useState<DateOpt>('today')
  const [customDate, setCustomDate] = useState('')
  const [categoryId, setCategoryId] = useState('')

  useEffect(() => {
    if (source) {
      setAmount(String(source.amount))
      setDateOpt('today')
      setCustomDate(format(new Date(), 'yyyy-MM-dd'))
      setCategoryId('')
    }
  }, [source])

  if (!source) return null

  const today = new Date()
  const dateOptions: { id: DateOpt; label: string; sub: string }[] = [
    { id: 'today', label: 'Hoje',         sub: format(today, 'dd/MM') },
    { id: 'bu1',   label: '1º dia útil',  sub: format(getNthBusinessDay(1), 'dd/MM') },
    { id: 'bu5',   label: '5º dia útil',  sub: format(getNthBusinessDay(5), 'dd/MM') },
    { id: 'bu10',  label: '10º dia útil', sub: format(getNthBusinessDay(10), 'dd/MM') },
  ]

  const resolvedDate =
    dateOpt === 'today' ? format(today, 'yyyy-MM-dd')
    : dateOpt === 'bu1'  ? format(getNthBusinessDay(1), 'yyyy-MM-dd')
    : dateOpt === 'bu5'  ? format(getNthBusinessDay(5), 'yyyy-MM-dd')
    : dateOpt === 'bu10' ? format(getNthBusinessDay(10), 'yyyy-MM-dd')
    : customDate

  function handleConfirm() {
    const amt = parseFloat(amount.replace(',', '.'))
    if (!amt || amt <= 0) { Alert.alert('Erro', 'Informe um valor válido.'); return }
    if (!categoryId)      { Alert.alert('Erro', 'Selecione uma categoria.'); return }
    if (!resolvedDate.match(/^\d{4}-\d{2}-\d{2}$/)) { Alert.alert('Erro', 'Data inválida (use AAAA-MM-DD).'); return }
    onConfirm(amt, resolvedDate, categoryId)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Feather name="arrow-down-circle" size={18} color={COLORS.success} />
              <Text style={styles.modalTitle}>Registrar recebimento</Text>
            </View>

            <View style={styles.modalSourceBox}>
              <Feather name="arrow-down-circle" size={14} color={COLORS.success} />
              <Text style={styles.modalSourceName}>{source.name}</Text>
            </View>

            <Text style={styles.label}>Valor (R$)</Text>
            <TextInput
              style={styles.modalInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={COLORS.muted}
            />

            <Text style={styles.label}>Data do recebimento</Text>
            <View style={{ gap: 10, marginBottom: 4 }}>
              {dateOptions.map((opt) => (
                <TouchableOpacity key={opt.id} style={styles.dateOption} onPress={() => setDateOpt(opt.id)} activeOpacity={0.8}>
                  <View style={[styles.radio, dateOpt === opt.id && styles.radioActive]}>
                    {dateOpt === opt.id && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.dateOptionLabel}>{opt.label}</Text>
                  <Text style={styles.dateOptionSub}>{opt.sub}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.dateOption} onPress={() => setDateOpt('custom')} activeOpacity={0.8}>
                <View style={[styles.radio, dateOpt === 'custom' && styles.radioActive]}>
                  {dateOpt === 'custom' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.dateOptionLabel}>Outra data</Text>
              </TouchableOpacity>
              {dateOpt === 'custom' && (
                <TextInput
                  style={[styles.modalInput, { marginTop: 0 }]}
                  value={customDate}
                  onChangeText={setCustomDate}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              )}
            </View>

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.cats}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.cat, categoryId === cat.id && styles.catActive]}
                  onPress={() => setCategoryId(cat.id)}
                >
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  <Text style={[styles.catName, categoryId === cat.id && styles.catNameActive]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, (!categoryId || loading) && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={!categoryId || loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmBtnText}>Confirmar</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function SourceHistoryRow({ source, entries }: { source: IncomeSource; entries: IncomeHistoryEntry[] }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const yearMonth     = format(new Date(), 'yyyy-MM')
  const canRevert     = !source.isRecurring && source.lastAutoPayMonth === yearMonth
  const hasVariation  = entries.length > 1 && entries.some((e) => e.amount !== entries[0].amount)
  const latest        = entries[0]

  const refetchAll = async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ['income-sources'], type: 'active' }),
      qc.refetchQueries({ queryKey: ['income-history'], type: 'active' }),
      qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' }),
    ])
  }

  const revertMutation = useMutation({
    mutationFn: () => incomeSourcesApi.revert(source.id),
    onSuccess: async () => { await refetchAll() },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const deleteTxMutation = useMutation({
    mutationFn: (txId: string) => transactionsApi.delete(txId),
    onSuccess: async () => { await refetchAll() },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  function confirmDeleteEntry(txId: string) {
    Alert.alert('Excluir recebimento', 'Este registro será removido do histórico e do dashboard.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteTxMutation.mutate(txId) },
    ])
  }

  return (
    <View>
      <TouchableOpacity style={styles.historyRow} onPress={() => setOpen((v) => !v)} activeOpacity={0.8}>
        <View style={styles.historyInfo}>
          <View style={styles.historyNameRow}>
            <Text style={styles.historyName} numberOfLines={1}>{source.name}</Text>
            {hasVariation && <Text style={styles.variationBadge}>variação</Text>}
          </View>
          <Text style={styles.historyCount}>
            {entries.length} pagamento{entries.length !== 1 ? 's' : ''} registrado{entries.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.historyRight}>
          {latest && <Text style={styles.historyAmount}>{fmt(latest.amount)}</Text>}
          {canRevert && (
            <TouchableOpacity
              style={styles.revertBtn}
              onPress={() => revertMutation.mutate()}
              disabled={revertMutation.isPending}
            >
              <Feather name="rotate-ccw" size={12} color={COLORS.muted} />
              <Text style={styles.revertBtnText}>Desfazer</Text>
            </TouchableOpacity>
          )}
          <Feather name={open ? 'chevron-down' : 'chevron-right'} size={16} color={COLORS.muted} />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={styles.historyEntries}>
          {entries.map((entry, i) => {
            const prev    = entries[i + 1]
            const changed = !!prev && entry.amount !== prev.amount
            return (
              <View key={entry.id} style={styles.historyEntryRow}>
                <Text style={styles.historyEntryDate}>
                  {format(new Date(entry.date), "dd 'de' MMM yyyy", { locale: ptBR })}
                </Text>
                <View style={styles.historyEntryCat}>
                  {entry.category ? (
                    <Text
                      style={[
                        styles.historyCatBadge,
                        {
                          color:           entry.category.color,
                          borderColor:     entry.category.color + '40',
                          backgroundColor: entry.category.color + '18',
                        },
                      ]}
                    >
                      {entry.category.icon} {entry.category.name}
                    </Text>
                  ) : (
                    <Text style={styles.historyNoCat}>Sem categoria</Text>
                  )}
                </View>
                <View style={styles.historyEntryRight}>
                  {changed && <Text style={styles.historyEraBadge}>era {fmt(prev!.amount)}</Text>}
                  <Text style={styles.historyEntryAmount}>{fmt(entry.amount)}</Text>
                  <TouchableOpacity
                    onPress={() => confirmDeleteEntry(entry.id)}
                    disabled={deleteTxMutation.isPending}
                    hitSlop={8}
                  >
                    <Feather name="trash-2" size={13} color={COLORS.muted2} />
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

function IncomeHistorySection({ sources, history }: { sources: IncomeSource[]; history: Record<string, IncomeHistoryEntry[]> }) {
  const [open, setOpen] = useState(false)

  const withHistory = sources.filter((s) => (history[s.name]?.length ?? 0) > 0)
  if (withHistory.length === 0) return null

  return (
    <View style={styles.historySection}>
      <TouchableOpacity onPress={() => setOpen((v) => !v)} style={styles.historyToggle} activeOpacity={0.8}>
        <Feather name="clock" size={13} color={COLORS.muted} />
        <Text style={styles.historyToggleText}>Histórico de recebimentos</Text>
        <Feather name={open ? 'chevron-down' : 'chevron-right'} size={14} color={COLORS.muted} />
      </TouchableOpacity>

      {open && (
        <View style={styles.historyCard}>
          {withHistory.map((source, i) => (
            <View key={source.id}>
              <SourceHistoryRow source={source} entries={history[source.name] ?? []} />
              {i < withHistory.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export default function IncomeScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const scrollRef = useRef<any>(null)

  const [receiptSource, setReceiptSource] = useState<IncomeSource | null>(null)

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false })
  }, []))

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['income-sources'],
    queryFn:  () => incomeSourcesApi.list().then((r) => r.data),
  })

  const { data: history } = useQuery({
    queryKey: ['income-history'],
    queryFn:  () => incomeSourcesApi.history().then((r) => r.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then((r) => r.data),
  })

  const refetchAll = async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ['income-sources'], type: 'active' }),
      qc.refetchQueries({ queryKey: ['income-history'], type: 'active' }),
      qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' }),
    ])
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => incomeSourcesApi.delete(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['income-sources'] })
      const prev = qc.getQueryData<{ id: string }[]>(['income-sources'])
      if (prev) qc.setQueryData(['income-sources'], prev.filter((s) => s.id !== id))
      return { prev }
    },
    onError: (e: Error, _id, ctx?: { prev?: { id: string }[] }) => {
      if (ctx?.prev) qc.setQueryData(['income-sources'], ctx.prev)
      Alert.alert('Erro', e.message)
    },
    onSettled: () => refetchAll(),
  })

  const receiveMutation = useMutation({
    mutationFn: async ({ source, amount, date, categoryId }: { source: IncomeSource; amount: number; date: string; categoryId: string }) => {
      await transactionsApi.create({ amount, type: 'INCOME', description: source.name, date, categoryId })
      await incomeSourcesApi.update(source.id, { lastAutoPayMonth: format(new Date(), 'yyyy-MM') })
    },
    onSuccess: async () => {
      await refetchAll()
      setReceiptSource(null)
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const now          = new Date()
  const currentMonth = format(now, 'yyyy-MM')
  const sources      = data ?? []

  const recurring       = sources.filter((s) =>  s.isRecurring)
  const nonRecurring    = sources.filter((s) => !s.isRecurring)
  const eventualPending = nonRecurring.filter((s) => s.lastAutoPayMonth === null)

  const totalRecorrente = recurring.reduce((s, r) => s + Number(r.amount), 0)
  const totalEventual   = nonRecurring.reduce((s, r) => s + Number(r.amount), 0)
  const totalGeral      = totalRecorrente + totalEventual

  const projection = Array.from({ length: 3 }, (_, i) => {
    const d   = addMonths(now, i)
    const yr  = d.getFullYear()
    const mo  = d.getMonth()
    const label = format(d, 'MMM/yy', { locale: ptBR })

    const recAmount = recurring
      .filter((s) => {
        if (!s.startDate) return true
        const sd = new Date(s.startDate)
        return sd.getFullYear() < yr || (sd.getFullYear() === yr && sd.getMonth() <= mo)
      })
      .reduce((s, r) => s + Number(r.amount), 0)

    const evAmount = i === 0
      ? nonRecurring.filter((s) => s.lastAutoPayMonth === null).reduce((s, r) => s + Number(r.amount), 0)
      : 0

    return { label, recAmount, evAmount, total: recAmount + evAmount, isCurrent: i === 0 }
  })

  return (
    <View style={styles.screen}>
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
        >
          {/* Header */}
          <FadeIn delay={0}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.monthLabel}>{format(now, "MMMM 'de' yyyy", { locale: ptBR })}</Text>
              <Text style={styles.title}>Rendas</Text>
              <Text style={styles.subtitle}>
                {sources.length} fonte{sources.length !== 1 ? 's' : ''} cadastrada{sources.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-income')}>
              <Feather name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          </FadeIn>

          {sources.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="briefcase" size={22} color={COLORS.muted2} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma fonte cadastrada</Text>
              <Text style={styles.emptyText}>Adicione seu emprego, freelas ou outros rendimentos.</Text>
            </View>
          ) : (
            <>
              {/* Summary cards */}
              <FadeIn delay={80}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryLabelRow}>
                    <Feather name="refresh-cw" size={11} color={COLORS.muted} />
                    <Text style={styles.summaryLabel}>Recorrente</Text>
                  </View>
                  <Text style={styles.summaryValue} numberOfLines={1}>{fmt(totalRecorrente)}</Text>
                  <Text style={styles.summaryCount}>{recurring.length} fonte{recurring.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryLabelRow}>
                    <Feather name="zap" size={11} color={COLORS.muted} />
                    <Text style={styles.summaryLabel}>Eventual</Text>
                  </View>
                  <Text style={styles.summaryValue} numberOfLines={1}>{fmt(totalEventual)}</Text>
                  <Text style={styles.summaryCount}>{nonRecurring.length} fonte{nonRecurring.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={[styles.summaryCard, styles.summaryCardElevated]}>
                  <View style={styles.summaryLabelRow}>
                    <Feather name="dollar-sign" size={11} color={COLORS.muted} />
                    <Text style={styles.summaryLabel}>Total</Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: COLORS.success }]} numberOfLines={1}>{fmt(totalGeral)}</Text>
                  <Text style={styles.summaryCount}>{sources.length} fontes</Text>
                </View>
              </View>
              </FadeIn>

              {/* Projeção de receitas */}
              <FadeIn delay={160}>
              <View style={styles.projectionCard}>
                <View style={styles.projectionHeader}>
                  <Feather name="calendar" size={14} color={COLORS.success} />
                  <Text style={styles.projectionTitle}>Projeção de receitas</Text>
                </View>
                <View style={styles.projectionRow}>
                  {projection.map((m) => (
                    <View key={m.label} style={[styles.projectionMonth, m.isCurrent && styles.projectionMonthCurrent]}>
                      <View style={styles.projectionMonthLabelRow}>
                        {m.isCurrent && <View style={styles.projectionDot} />}
                        <Text style={styles.projectionMonthLabel}>{m.label}</Text>
                      </View>
                      <Text style={styles.projectionTotal}>+{fmt(m.total)}</Text>
                      {m.recAmount > 0 && <Text style={styles.projectionDetail}>🔁 {fmt(m.recAmount)} fixas</Text>}
                      {m.evAmount > 0  && <Text style={styles.projectionDetail}>⚡ {fmt(m.evAmount)} eventuais</Text>}
                    </View>
                  ))}
                </View>
                <Text style={styles.projectionFooter}>Recorrentes confirmadas + eventuais pendentes deste mês.</Text>
              </View>
              </FadeIn>

              <View style={styles.divider} />

              {/* Recorrentes */}
              <FadeIn delay={240}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: COLORS.success }]} />
                  <Feather name="refresh-cw" size={14} color={COLORS.success} />
                  <Text style={styles.sectionTitle}>Recorrentes</Text>
                  {totalRecorrente > 0 && <Text style={styles.sectionTotal}>{fmt(totalRecorrente)}/mês</Text>}
                </View>
                <View style={[styles.infoBox, styles.infoBoxSuccess]}>
                  <Text style={styles.infoBoxText}>
                    💰 <Text style={styles.infoBoxStrong}>Recorrentes</Text> são lançadas automaticamente no dia configurado — aparece{' '}
                    <Text style={styles.infoBoxStrong}>A receber</Text> até o dia chegar.
                  </Text>
                </View>
                {recurring.length === 0 ? (
                  <View style={styles.emptySection}>
                    <Text style={styles.emptySectionText}>Nenhuma renda recorrente</Text>
                  </View>
                ) : (
                  recurring.map((source) => (
                    <RecurringRow
                      key={source.id}
                      source={source}
                      currentMonth={currentMonth}
                      now={now}
                      onEdit={() => router.push(`/edit-income?id=${source.id}`)}
                      onDelete={() => deleteMutation.mutate(source.id)}
                    />
                  ))
                )}
              </View>
              </FadeIn>

              {/* Eventuais */}
              <FadeIn delay={320}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: COLORS.warning }]} />
                  <Feather name="zap" size={14} color={COLORS.warning} />
                  <Text style={styles.sectionTitle}>Eventuais</Text>
                  {totalEventual > 0 && <Text style={styles.sectionTotal}>{fmt(totalEventual)}</Text>}
                </View>
                <View style={[styles.infoBox, styles.infoBoxWarning]}>
                  <Text style={styles.infoBoxText}>
                    ⚡ <Text style={styles.infoBoxStrong}>Eventuais</Text> ficam aguardando até você clicar em{' '}
                    <Text style={styles.infoBoxStrong}>Recebi</Text> — gera a transação na data informada.
                  </Text>
                </View>
                {eventualPending.length === 0 ? (
                  <View style={styles.emptySection}>
                    <Text style={styles.emptySectionText}>Nenhuma renda eventual pendente</Text>
                  </View>
                ) : (
                  eventualPending.map((source) => (
                    <EventualRow
                      key={source.id}
                      source={source}
                      onReceive={() => setReceiptSource(source)}
                      onEdit={() => router.push(`/edit-income?id=${source.id}`)}
                      onDelete={() => deleteMutation.mutate(source.id)}
                    />
                  ))
                )}
              </View>
              </FadeIn>

              <View style={styles.divider} />
            </>
          )}

          {data && history && <IncomeHistorySection sources={data} history={history} />}
        </ScrollView>
      )}

      <ReceiptModal
        visible={!!receiptSource}
        source={receiptSource}
        categories={categories ?? []}
        onClose={() => setReceiptSource(null)}
        onConfirm={(amount, date, categoryId) => receiveMutation.mutate({ source: receiptSource!, amount, date, categoryId })}
        loading={receiveMutation.isPending}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 100 },

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

  // Empty state
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 8 },
  emptyIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.card2,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  emptyText:  { fontSize: 12, color: COLORS.muted2, textAlign: 'center' },

  // Summary cards
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 12 },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 10, gap: 4,
  },
  summaryCardElevated: { backgroundColor: COLORS.card2, borderColor: COLORS.success + '33' },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryLabel:    { fontSize: 10, color: COLORS.muted },
  summaryValue:    { fontSize: 14, fontWeight: '700', color: COLORS.text },
  summaryCount:    { fontSize: 10, color: COLORS.muted2 },

  // Projeção de receitas
  projectionCard: {
    marginHorizontal: 20, marginTop: 16, backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  projectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  projectionTitle:  { fontSize: 13, fontWeight: '700', color: COLORS.text },
  projectionRow:    { flexDirection: 'row', gap: 8 },
  projectionMonth: {
    flex: 1, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.card2, padding: 8, gap: 3,
  },
  projectionMonthCurrent: { borderColor: COLORS.success + '4d', backgroundColor: COLORS.success + '0d' },
  projectionMonthLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  projectionDot:        { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.success },
  projectionMonthLabel: { fontSize: 10, color: COLORS.muted, textTransform: 'capitalize' },
  projectionTotal:      { fontSize: 12, fontWeight: '700', color: COLORS.success, marginBottom: 2 },
  projectionDetail:     { fontSize: 9, color: COLORS.muted2 },
  projectionFooter:     { fontSize: 10, color: COLORS.muted2, marginTop: 8 },

  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20, marginVertical: 20 },

  // Sections (Recorrentes / Eventuais)
  section: { paddingHorizontal: 20, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionBar:   { width: 3, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  sectionTotal: { fontSize: 11, color: COLORS.muted },

  infoBox: { borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 10 },
  infoBoxSuccess: { backgroundColor: COLORS.success + '0d', borderColor: COLORS.success + '33' },
  infoBoxWarning: { backgroundColor: COLORS.warning + '0d', borderColor: COLORS.warning + '33' },
  infoBoxText:   { fontSize: 11, color: COLORS.muted, lineHeight: 16 },
  infoBoxStrong: { color: COLORS.text, fontWeight: '700' },

  emptySection: {
    alignItems: 'center', paddingVertical: 28, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  emptySectionText: { fontSize: 12, color: COLORS.muted2 },

  // Income rows
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8,
  },
  rowSuccess:  { backgroundColor: COLORS.success + '0d', borderColor: COLORS.success + '26' },
  rowReceived: { backgroundColor: COLORS.success + '0d', borderColor: COLORS.success + '26', opacity: 0.7 },
  rowFuture:   { backgroundColor: COLORS.card, borderColor: COLORS.border, opacity: 0.5 },
  rowWarning:  { backgroundColor: COLORS.warning + '0d', borderColor: COLORS.warning + '26' },

  rowIcon:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowEmoji: { fontSize: 16 },
  rowInfo:  { flex: 1, minWidth: 0, gap: 2 },
  rowNameWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rowName:     { fontSize: 13, fontWeight: '600', color: COLORS.text, flexShrink: 1 },
  rowSubtitle: { fontSize: 11, color: COLORS.muted },
  rowAmount:   { color: COLORS.success, fontWeight: '600' },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeDot:  { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: '700' },

  receiveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.success + '22', borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.success + '33',
    paddingHorizontal: 8, paddingVertical: 6,
  },
  receiveBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.success },

  // Histórico de recebimentos
  historySection: { marginTop: 4, paddingHorizontal: 20 },
  historyToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  historyToggleText: {
    fontSize: 11, fontWeight: '700', color: COLORS.muted,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  historyCard: {
    backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },

  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  historyInfo: { flex: 1, minWidth: 0 },
  historyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyName: { fontSize: 14, fontWeight: '600', color: COLORS.text, flexShrink: 1 },
  variationBadge: {
    fontSize: 10, color: COLORS.warning, backgroundColor: COLORS.warning + '1a',
    borderWidth: 1, borderColor: COLORS.warning + '33',
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1,
  },
  historyCount: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyAmount: { fontSize: 14, fontWeight: '700', color: COLORS.success },
  revertBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: COLORS.muted + '18',
  },
  revertBtnText: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },

  historyEntries: { backgroundColor: COLORS.card2 },
  historyEntryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  historyEntryDate: { fontSize: 12, color: COLORS.text, width: 84 },
  historyEntryCat:  { flex: 1, minWidth: 0 },
  historyCatBadge: {
    fontSize: 11, borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start',
  },
  historyNoCat: { fontSize: 11, color: COLORS.muted },
  historyEntryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyEraBadge: {
    fontSize: 10, color: COLORS.warning, backgroundColor: COLORS.warning + '1a',
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1,
  },
  historyEntryAmount: { fontSize: 13, fontWeight: '700', color: COLORS.success },

  // Receipt modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '85%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  modalTitle:  { fontSize: 17, fontWeight: '700', color: COLORS.text },
  modalSourceBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, marginBottom: 16,
  },
  modalSourceName: { fontSize: 13, color: COLORS.text },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 8, marginTop: 4 },
  modalInput: {
    backgroundColor: COLORS.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
  },

  dateOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  radio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.muted2,
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: COLORS.brand },
  radioDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.brand },
  dateOptionLabel: { fontSize: 13, color: COLORS.text, flex: 1 },
  dateOptionSub:   { fontSize: 11, color: COLORS.muted2 },

  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 16 },
  cat: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
  },
  catActive:     { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  catIcon:       { fontSize: 16 },
  catName:       { fontSize: 12, color: COLORS.muted, maxWidth: 70 },
  catNameActive: { color: COLORS.brand },

  confirmBtn: {
    backgroundColor: COLORS.success, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
