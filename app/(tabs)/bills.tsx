import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addMonths, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { billsApi, recurringBillsApi, peopleApi, type Bill, type RecurringBill } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

type BillStatus = 'paid' | 'overdue' | 'urgent' | 'pending'

const STATUS_CONFIG: Record<BillStatus, { label: string; color: string }> = {
  paid:    { label: 'Pago',     color: COLORS.success },
  overdue: { label: 'Atrasado', color: COLORS.danger },
  urgent:  { label: 'Urgente',  color: COLORS.warning },
  pending: { label: 'Pendente', color: COLORS.muted },
}

function classifyBillStatus(dueDate: string, isPaid: boolean): BillStatus {
  if (isPaid) return 'paid'
  const days = differenceInCalendarDays(new Date(dueDate), new Date())
  if (days < 0) return 'overdue'
  if (days <= 3) return 'urgent'
  return 'pending'
}

interface InstallmentGroup {
  items:      Bill[]
  paidCount:  number
  total:      number
  nextDue:    Bill
  name:       string
  amount:     number
  groupId:    string
  grandTotal: number
}

function Badge({ label, color, dot }: { label: string; color: string; dot?: boolean }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      {dot && <View style={[styles.badgeDot, { backgroundColor: color }]} />}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  )
}

function RecurringRow({ item, onToggle, onEdit, onDelete }: {
  item: RecurringBill
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.row, item.isActive ? styles.rowRecurring : styles.rowPaused]}
      onLongPress={() =>
        Alert.alert('Opções', item.name, [
          { text: 'Editar', onPress: onEdit },
          { text: item.isActive ? 'Pausar' : 'Ativar', onPress: onToggle },
          { text: 'Excluir', style: 'destructive', onPress: onDelete },
        ])
      }
      activeOpacity={0.85}
    >
      <View style={[styles.rowIcon, { backgroundColor: (item.isActive ? COLORS.brand : COLORS.muted) + '22' }]}>
        <Feather name="refresh-cw" size={15} color={item.isActive ? COLORS.brand : COLORS.muted} />
      </View>
      <View style={styles.rowInfo}>
        <View style={styles.rowNameWrap}>
          <Text style={[styles.rowName, !item.isActive && { color: COLORS.muted }]} numberOfLines={1}>{item.name}</Text>
          {!item.isActive && <Badge label="Pausada" color={COLORS.muted} />}
        </View>
        <Text style={styles.rowSubtitle}>
          <Text style={styles.rowAmountNeg}>-{fmt(Number(item.amount))}/mês</Text>
          {` · dia ${item.dayOfMonth}`}
          {item.category ? ` · ${item.category.icon} ${item.category.name}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function PendingRow({ item, onPay, onEdit, onDelete }: {
  item: Bill
  onPay: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const status = classifyBillStatus(item.dueDate, item.isPaid)
  const cfg = STATUS_CONFIG[status]
  const rowStyle =
    status === 'overdue' ? styles.rowOverdue
    : status === 'urgent' ? styles.rowUrgent
    : styles.rowDefault

  return (
    <TouchableOpacity
      style={[styles.row, rowStyle]}
      onLongPress={() =>
        Alert.alert('Opções', item.name, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Editar', onPress: onEdit },
          { text: 'Excluir', style: 'destructive', onPress: onDelete },
        ])
      }
      activeOpacity={0.85}
    >
      <View style={[styles.rowIcon, { backgroundColor: cfg.color + '1a' }]}>
        {item.category?.icon
          ? <Text style={styles.rowEmoji}>{item.category.icon}</Text>
          : item.recurringBillId
            ? <Feather name="refresh-cw" size={14} color={COLORS.brand} />
            : <Feather name="file-text" size={14} color={COLORS.muted} />}
      </View>
      <View style={styles.rowInfo}>
        <View style={styles.rowNameWrap}>
          <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
          {!!item.installmentTotal && item.installmentTotal > 1 && (
            <Badge label={`${item.installmentCurrent}/${item.installmentTotal}`} color={COLORS.brand} />
          )}
          <Badge label={cfg.label} color={cfg.color} dot />
        </View>
        <Text style={styles.rowSubtitle}>
          {item.category?.name ?? 'Sem categoria'} · vence {format(new Date(item.dueDate), 'dd/MM/yyyy')}
          {item.recurringBillId ? ' · ↻ fixa' : ''}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowAmountText}>{fmt(Number(item.amount))}</Text>
        <TouchableOpacity style={styles.payBtn} onPress={onPay} hitSlop={6}>
          <Feather name="check" size={12} color={COLORS.success} />
          <Text style={styles.payBtnText}>Pagar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

function PaidRow({ item, onUnpay, onEdit, onDelete }: {
  item: Bill
  onUnpay: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.row, styles.rowPaid]}
      onLongPress={() =>
        Alert.alert('Opções', item.name, [
          { text: 'Editar', onPress: onEdit },
          { text: 'Estornar pagamento', onPress: onUnpay },
          { text: 'Excluir', style: 'destructive', onPress: onDelete },
        ])
      }
      activeOpacity={0.85}
    >
      <View style={[styles.rowIcon, { backgroundColor: COLORS.success + '1a' }]}>
        <Feather name="check" size={15} color={COLORS.success} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: COLORS.muted }]} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.rowSubtitle}>
          {item.category?.name ?? 'Sem categoria'} · {format(new Date(item.dueDate), 'dd/MM/yyyy')}
          {item.recurringBillId ? ' · ↻ fixa' : ''}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmountText, { color: COLORS.muted }]}>{fmt(Number(item.amount))}</Text>
        <Badge label="Pago" color={COLORS.success} />
      </View>
    </TouchableOpacity>
  )
}

function InstallmentGroupCard({ group, onPay }: {
  group: InstallmentGroup
  onPay: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const pct = Math.round((group.paidCount / group.total) * 100)

  return (
    <View style={styles.groupCard}>
      <TouchableOpacity style={styles.groupHeader} onPress={() => setOpen((v) => !v)} activeOpacity={0.8}>
        <View style={[styles.rowIcon, { backgroundColor: COLORS.brand + '22' }]}>
          <Feather name="layers" size={15} color={COLORS.brand} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>{group.name}</Text>
          <Text style={styles.rowSubtitle}>
            {fmt(group.amount)}/parcela · {group.total}x · {fmt(group.grandTotal)} total
          </Text>
        </View>
        <View style={styles.groupHeaderRight}>
          <Text style={styles.groupCountText}>{group.paidCount}/{group.total}</Text>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={styles.groupBody}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <View style={styles.groupProgressRow}>
            <Text style={styles.groupProgressText}>{pct}% pago</Text>
            <Text style={styles.groupProgressText}>Próxima: {format(new Date(group.nextDue.dueDate), 'dd/MM/yyyy')}</Text>
          </View>
          {group.items.map((inst) => {
            const s = classifyBillStatus(inst.dueDate, inst.isPaid)
            const cfg = STATUS_CONFIG[s]
            return (
              <View key={inst.id} style={[styles.instRow, inst.isPaid && styles.instRowPaid]}>
                <Text style={styles.instNumber}>{inst.installmentCurrent}ª</Text>
                <Text style={styles.instDate}>{format(new Date(inst.dueDate), 'dd/MM/yyyy')}</Text>
                <Text style={styles.instAmount}>{fmt(Number(inst.amount))}</Text>
                <Badge label={cfg.label} color={cfg.color} />
                {!inst.isPaid && (
                  <TouchableOpacity style={styles.instPayBtn} onPress={() => onPay(inst.id)} hitSlop={6}>
                    <Feather name="check" size={12} color={COLORS.success} />
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

export default function BillsScreen() {
  const router = useRouter()
  const qc     = useQueryClient()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bills'],
    queryFn:  () => billsApi.list().then((r) => r.data),
  })
  const { data: recurringBillsData, isLoading: recurringLoading } = useQuery({
    queryKey: ['recurringBills'],
    queryFn:  () => recurringBillsApi.list().then((r) => r.data),
  })
  const { data: peopleData, isLoading: peopleLoading } = useQuery({
    queryKey: ['people'],
    queryFn:  () => peopleApi.list().then((r) => r.data),
  })

  const payMutation = useMutation({
    mutationFn: (id: string) => billsApi.pay(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })
  const unpayMutation = useMutation({
    mutationFn: (id: string) => billsApi.unpay(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => billsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })
  const toggleRecurringMutation = useMutation({
    mutationFn: (item: RecurringBill) => recurringBillsApi.update(item.id, { isActive: !item.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurringBills'] }),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })
  const deleteRecurringMutation = useMutation({
    mutationFn: (id: string) => recurringBillsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurringBills'] })
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const now   = new Date()
  const bills = data ?? []

  const grouped: Map<string, Bill[]> = new Map()
  const regular: Bill[] = []
  for (const b of bills) {
    if (b.installmentGroupId) {
      const arr = grouped.get(b.installmentGroupId) ?? []
      arr.push(b)
      grouped.set(b.installmentGroupId, arr)
    } else {
      regular.push(b)
    }
  }

  const allGroups: InstallmentGroup[] = Array.from(grouped.entries()).map(([groupId, items]) => {
    const sorted     = [...items].sort((a, b) => (a.installmentCurrent ?? 0) - (b.installmentCurrent ?? 0))
    const paidCount  = items.filter((b) => b.isPaid).length
    const total      = items[0].installmentTotal ?? items.length
    const nextDue    = sorted.find((b) => !b.isPaid) ?? sorted[sorted.length - 1]
    const amount     = Number(items[0].amount)
    return { items: sorted, paidCount, total, nextDue, name: items[0].name, amount, groupId, grandTotal: total * amount }
  })
  const activeGroups = allGroups
    .filter((g) => g.paidCount < g.total)
    .sort((a, b) => new Date(a.nextDue.dueDate).getTime() - new Date(b.nextDue.dueDate).getTime())
  const completedGroups = allGroups
    .filter((g) => g.paidCount === g.total)
    .sort((a, b) => b.grandTotal - a.grandTotal)

  const pending = regular.filter((b) => !b.isPaid)
  const paid    = regular.filter((b) => b.isPaid)

  const totalPending = pending.reduce((s, b) => s + Number(b.amount), 0)
    + activeGroups.reduce((s, g) => s + Number(g.nextDue.amount), 0)
  const totalPaid = paid.reduce((s, b) => s + Number(b.amount), 0)
    + allGroups.reduce((s, g) => s + g.paidCount * g.amount, 0)

  const recurring        = recurringBillsData ?? []
  const activeRecurring  = recurring.filter((r) => r.isActive)
  const pausedRecurring  = recurring.filter((r) => !r.isActive)
  const monthlyFixed     = activeRecurring.reduce((s, r) => s + Number(r.amount), 0)

  const overdueList  = pending.filter((b) => classifyBillStatus(b.dueDate, false) === 'overdue')
  const overdueTotal = overdueList.reduce((s, b) => s + Number(b.amount), 0)

  const inSameMonth = (dateStr: string, ref: Date) => {
    const d = new Date(dateStr)
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
  }

  const pendingThisMonth = pending.filter((b) => inSameMonth(b.dueDate, now))
  const totalThisMonth = pendingThisMonth.reduce((s, b) => s + Number(b.amount), 0)
    + activeGroups
        .flatMap((g) => g.items)
        .filter((inst) => !inst.isPaid && inSameMonth(inst.dueDate, now))
        .reduce((s, inst) => s + Number(inst.amount), 0)

  const people     = peopleData ?? []
  const iOwePeople = people.filter((p) => (p.iOweThem ?? 0) > 0)
  const iOweTotal  = iOwePeople.reduce((s, p) => s + (p.iOweThem ?? 0), 0)

  const projection = Array.from({ length: 3 }, (_, i) => {
    const d   = addMonths(now, i)
    const label = format(d, 'MMM/yy', { locale: ptBR })

    const avulsoAmount = pending
      .filter((b) => !b.recurringBillId && inSameMonth(b.dueDate, d))
      .reduce((s, b) => s + Number(b.amount), 0)

    const installmentAmount = activeGroups
      .flatMap((g) => g.items)
      .filter((inst) => !inst.isPaid && inSameMonth(inst.dueDate, d))
      .reduce((s, inst) => s + Number(inst.amount), 0)

    const fixedAmount = i === 0
      ? pending.filter((b) => !!b.recurringBillId && inSameMonth(b.dueDate, d)).reduce((s, b) => s + Number(b.amount), 0)
      : monthlyFixed

    return {
      label,
      amount: fixedAmount + avulsoAmount + installmentAmount,
      isCurrent: i === 0,
      breakdown: { fixed: fixedAmount, avulso: avulsoAmount, installment: installmentAmount },
    }
  })

  const loading = isLoading || recurringLoading || peopleLoading
  const totalPendingCount = pending.length + activeGroups.length

  return (
    <View style={styles.screen}>
      {loading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 100 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.monthLabel}>{format(now, "MMMM 'de' yyyy", { locale: ptBR })}</Text>
              <Text style={styles.title}>Contas a pagar</Text>
              <Text style={styles.subtitle}>
                {totalPendingCount} pendente{totalPendingCount !== 1 ? 's' : ''} · {paid.length} paga{paid.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-bill')}>
              <Feather name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {bills.length === 0 && recurring.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="file-text" size={22} color={COLORS.muted2} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma conta cadastrada</Text>
              <Text style={styles.emptyText}>Adicione boletos, parcelas e contas fixas para nunca mais perder um vencimento.</Text>
            </View>
          ) : (
            <>
              {bills.length > 0 && (
                <>
                  {/* Summary cards */}
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Este mês</Text>
                      <Text style={styles.summaryValue} numberOfLines={1}>{fmt(totalThisMonth)}</Text>
                      <Text style={styles.summaryCount}>
                        {pendingThisMonth.length} conta{pendingThisMonth.length !== 1 ? 's' : ''} pendente{pendingThisMonth.length !== 1 ? 's' : ''}
                      </Text>

                      {overdueTotal > 0 && (
                        <View style={styles.summarySub}>
                          <Text style={styles.summarySubLabelDanger}>⚠️ Em atraso</Text>
                          <Text style={styles.summarySubValueDanger} numberOfLines={1}>{fmt(overdueTotal)}</Text>
                          <Text style={styles.summaryCount}>{overdueList.length} conta{overdueList.length !== 1 ? 's' : ''}</Text>
                        </View>
                      )}

                      {iOweTotal > 0 && (
                        <View style={styles.summarySub}>
                          <Text style={styles.summarySubLabel}>👥 Pessoas</Text>
                          <Text style={styles.summarySubValue} numberOfLines={1}>{fmt(iOweTotal)}</Text>
                          <Text style={styles.summaryCount}>{iOwePeople.length} pessoa{iOwePeople.length !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Pagas</Text>
                      <Text style={[styles.summaryValue, { color: COLORS.success }]} numberOfLines={1}>{fmt(totalPaid)}</Text>
                      <Text style={styles.summaryCount}>{paid.length} conta{paid.length !== 1 ? 's' : ''}</Text>
                    </View>
                  </View>

                  {overdueList.length > 0 && (
                    <View style={styles.overdueAlert}>
                      <Feather name="alert-circle" size={16} color={COLORS.danger} />
                      <Text style={styles.overdueAlertText}>
                        <Text style={{ fontWeight: '700' }}>
                          {overdueList.length} conta{overdueList.length !== 1 ? 's' : ''} em atraso
                        </Text>
                        {' '}— total de {fmt(overdueTotal)}. Quite o mais rápido possível para evitar juros.
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Projeção de gastos */}
              {(activeRecurring.length > 0 || pending.length > 0 || activeGroups.length > 0) && (
                <View style={styles.projectionCard}>
                  <View style={styles.projectionHeader}>
                    <Feather name="calendar" size={14} color={COLORS.brand} />
                    <Text style={styles.projectionTitle}>Projeção de gastos</Text>
                  </View>
                  <View style={styles.projectionRow}>
                    {projection.map((m) => (
                      <View key={m.label} style={[styles.projectionMonth, m.isCurrent && styles.projectionMonthCurrent]}>
                        <View style={styles.projectionMonthLabelRow}>
                          {m.isCurrent && <View style={styles.projectionDot} />}
                          <Text style={styles.projectionMonthLabel}>{m.label}</Text>
                        </View>
                        <Text style={styles.projectionTotal}>-{fmt(m.amount)}</Text>
                        {m.breakdown.fixed > 0 && <Text style={styles.projectionDetail}>🔁 {fmt(m.breakdown.fixed)} fixas</Text>}
                        {m.breakdown.avulso > 0 && <Text style={styles.projectionDetail}>💸 {fmt(m.breakdown.avulso)} avulso</Text>}
                        {m.breakdown.installment > 0 && <Text style={styles.projectionDetail}>📅 {fmt(m.breakdown.installment)} parcelas</Text>}
                      </View>
                    ))}
                  </View>
                  <Text style={styles.projectionFooter}>Fixas + avulsos agendados + parcelas vencendo em cada mês.</Text>
                </View>
              )}

              <View style={styles.divider} />

              {/* Contas Fixas */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: COLORS.brand }]} />
                  <Feather name="refresh-cw" size={14} color={COLORS.brand} />
                  <Text style={styles.sectionTitle}>Contas Fixas</Text>
                  {monthlyFixed > 0 && <Text style={styles.sectionTotal}>{fmt(monthlyFixed)}/mês</Text>}
                  <TouchableOpacity onPress={() => router.push('/new-recurring-bill')} hitSlop={8}>
                    <Feather name="plus-circle" size={18} color={COLORS.brand} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.infoBox, styles.infoBoxBrand]}>
                  <Text style={styles.infoBoxText}>
                    🔁 <Text style={styles.infoBoxStrong}>Fixas</Text> se repetem todo mês no dia configurado — cadastre uma vez e elas aparecem automaticamente.
                  </Text>
                </View>
                {recurring.length === 0 ? (
                  <View style={styles.emptySection}>
                    <Text style={styles.emptySectionText}>Nenhuma conta fixa</Text>
                  </View>
                ) : (
                  <>
                    {[...activeRecurring, ...pausedRecurring].map((r) => (
                      <RecurringRow
                        key={r.id}
                        item={r}
                        onToggle={() => toggleRecurringMutation.mutate(r)}
                        onEdit={() => router.push(`/edit-recurring-bill?id=${r.id}`)}
                        onDelete={() => deleteRecurringMutation.mutate(r.id)}
                      />
                    ))}
                  </>
                )}
              </View>

              {/* Pendentes */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: COLORS.muted }]} />
                  <Feather name="clock" size={14} color={COLORS.muted} />
                  <Text style={styles.sectionTitle}>Pendentes</Text>
                  {pending.length > 0 && <Text style={styles.sectionTotal}>{fmt(totalPending)}</Text>}
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.infoBoxText}>
                    💸 <Text style={styles.infoBoxStrong}>Pendentes</Text> são boletos avulsos e as parcelas geradas pelas contas fixas — marque como pago quando quitar.
                  </Text>
                </View>
                {pending.length === 0 ? (
                  <View style={styles.emptySection}>
                    <Text style={styles.emptySectionTextSuccess}>Nenhuma conta pendente 🎉</Text>
                  </View>
                ) : (
                  pending.map((bill) => (
                    <PendingRow
                      key={bill.id}
                      item={bill}
                      onPay={() => payMutation.mutate(bill.id)}
                      onEdit={() => router.push(`/edit-bill?id=${bill.id}`)}
                      onDelete={() => Alert.alert('Excluir conta', `Excluir "${bill.name}"?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(bill.id) },
                      ])}
                    />
                  ))
                )}
              </View>

              {/* Parceladas */}
              {activeGroups.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionBar, { backgroundColor: COLORS.brand }]} />
                      <Feather name="layers" size={14} color={COLORS.brand} />
                      <Text style={styles.sectionTitle}>Parceladas</Text>
                    </View>
                    {activeGroups.map((group) => (
                      <InstallmentGroupCard
                        key={group.groupId}
                        group={group}
                        onPay={(id) => payMutation.mutate(id)}
                      />
                    ))}
                  </View>
                </>
              )}

              {/* Pagas */}
              {paid.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionBar, { backgroundColor: COLORS.success }]} />
                      <Feather name="check" size={14} color={COLORS.success} />
                      <Text style={styles.sectionTitle}>Pagas</Text>
                    </View>
                    {paid.map((bill) => (
                      <PaidRow
                        key={bill.id}
                        item={bill}
                        onUnpay={() => unpayMutation.mutate(bill.id)}
                        onEdit={() => router.push(`/edit-bill?id=${bill.id}`)}
                        onDelete={() => Alert.alert('Excluir conta', `Excluir "${bill.name}"?`, [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(bill.id) },
                        ])}
                      />
                    ))}
                  </View>
                </>
              )}

              {/* Histórico de parcelamentos */}
              {completedGroups.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionBar, { backgroundColor: COLORS.muted }]} />
                      <Feather name="archive" size={14} color={COLORS.muted} />
                      <Text style={[styles.sectionTitle, { color: COLORS.muted }]}>Histórico de parcelamentos</Text>
                    </View>
                    {completedGroups.map((group) => (
                      <View key={group.groupId} style={[styles.row, styles.rowPaid]}>
                        <View style={[styles.rowIcon, { backgroundColor: COLORS.success + '1a' }]}>
                          <Feather name="check" size={15} color={COLORS.success} />
                        </View>
                        <View style={styles.rowInfo}>
                          <Text style={[styles.rowName, { color: COLORS.muted }]} numberOfLines={1}>{group.name}</Text>
                          <Text style={styles.rowSubtitle}>{group.total}x de {fmt(group.amount)} · quitado</Text>
                        </View>
                        <View style={styles.rowRight}>
                          <Text style={[styles.rowAmountText, { color: COLORS.muted }]}>{fmt(group.grandTotal)}</Text>
                          <Badge label={`${group.total}/${group.total}`} color={COLORS.success} />
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
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
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 12, alignItems: 'flex-start' },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 12, gap: 4,
  },
  summaryLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  summaryCount: { fontSize: 10, color: COLORS.muted2 },
  summarySub: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 2 },
  summarySubLabel:       { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  summarySubLabelDanger: { fontSize: 11, color: COLORS.danger, fontWeight: '600' },
  summarySubValue:       { fontSize: 14, fontWeight: '700', color: COLORS.text },
  summarySubValueDanger: { fontSize: 14, fontWeight: '700', color: COLORS.danger },

  overdueAlert: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 20, marginTop: 10, padding: 12, borderRadius: 12,
    backgroundColor: COLORS.danger + '14', borderWidth: 1, borderColor: COLORS.danger + '33',
  },
  overdueAlertText: { flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 17 },

  // Projeção de gastos
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
  projectionMonthCurrent: { borderColor: COLORS.brand + '4d', backgroundColor: COLORS.brand + '0d' },
  projectionMonthLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  projectionDot:        { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.brand },
  projectionMonthLabel: { fontSize: 10, color: COLORS.muted, textTransform: 'capitalize' },
  projectionTotal:      { fontSize: 12, fontWeight: '700', color: COLORS.danger, marginBottom: 2 },
  projectionDetail:     { fontSize: 9, color: COLORS.muted2 },
  projectionFooter:     { fontSize: 10, color: COLORS.muted2, marginTop: 8 },

  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20, marginVertical: 20 },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionBar:   { width: 3, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  sectionTotal: { fontSize: 11, color: COLORS.muted },

  infoBox: { borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 10, backgroundColor: COLORS.card2, borderColor: COLORS.border },
  infoBoxBrand: { backgroundColor: COLORS.brand + '0d', borderColor: COLORS.brand + '33' },
  infoBoxText:   { fontSize: 11, color: COLORS.muted, lineHeight: 16 },
  infoBoxStrong: { color: COLORS.text, fontWeight: '700' },

  emptySection: {
    alignItems: 'center', paddingVertical: 28, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  emptySectionText:        { fontSize: 12, color: COLORS.muted2 },
  emptySectionTextSuccess: { fontSize: 12, color: COLORS.success, fontWeight: '600' },

  // Rows
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8,
  },
  rowRecurring: { backgroundColor: COLORS.brand + '0d', borderColor: COLORS.brand + '26' },
  rowPaused:    { backgroundColor: COLORS.card, borderColor: COLORS.border, opacity: 0.5 },
  rowDefault:   { backgroundColor: COLORS.card, borderColor: COLORS.border },
  rowUrgent:    { backgroundColor: COLORS.warning + '0d', borderColor: COLORS.warning + '26' },
  rowOverdue:   { backgroundColor: COLORS.danger + '0d', borderColor: COLORS.danger + '26' },
  rowPaid:      { backgroundColor: COLORS.card, borderColor: COLORS.border, opacity: 0.5 },

  rowIcon:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowEmoji: { fontSize: 16 },
  rowInfo:  { flex: 1, minWidth: 0, gap: 2 },
  rowNameWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rowName:     { fontSize: 13, fontWeight: '600', color: COLORS.text, flexShrink: 1 },
  rowSubtitle: { fontSize: 11, color: COLORS.muted },
  rowAmountNeg: { color: COLORS.text, fontWeight: '600' },

  rowRight: { alignItems: 'flex-end', gap: 6 },
  rowAmountText: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeDot:  { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: '700' },

  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.success + '22', borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.success + '33',
    paddingHorizontal: 8, paddingVertical: 5,
  },
  payBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.success },

  // Parceladas
  groupCard: {
    backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 8, overflow: 'hidden',
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  groupHeaderRight: { alignItems: 'flex-end', gap: 4 },
  groupCountText: { fontSize: 12, fontWeight: '700', color: COLORS.brand },
  groupBody: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: COLORS.muted2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.brand, borderRadius: 3 },
  groupProgressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  groupProgressText: { fontSize: 10, color: COLORS.muted },
  instRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  instRowPaid: { opacity: 0.4 },
  instNumber: { fontSize: 11, fontWeight: '700', color: COLORS.muted, width: 28 },
  instDate:   { fontSize: 11, color: COLORS.text, flex: 1 },
  instAmount: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  instPayBtn: {
    width: 24, height: 24, borderRadius: 6, backgroundColor: COLORS.success + '22',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.success + '33',
  },
})
