import { useState, useRef, useCallback } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert, Modal, Pressable, Switch } from 'react-native'
import { Text } from '@/components/text'
import { PressableScale } from '@/components/pressable-scale'
import { AnimatedProgress } from '@/components/animated-progress'
import { SwipeableRow } from '@/components/swipeable-row'
import { triggerConfetti } from '@/components/confetti'
import { useRouter, useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addMonths, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { billsApi, recurringBillsApi, peopleApi, type Bill, type RecurringBill } from '@/lib/api'
import { hapticSuccess, hapticLight } from '@/lib/haptics'
import { ListSkeleton } from '@/components/skeleton'
import { FadeIn } from '@/components/animated-entry'

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
    <PressableScale
      style={[styles.row, item.isActive ? styles.rowRecurring : styles.rowPaused]}
      onLongPress={() =>
        Alert.alert('Opções', item.name, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Editar', onPress: onEdit },
          { text: item.isActive ? 'Pausar' : 'Ativar', onPress: onToggle },
          { text: 'Excluir', style: 'destructive', onPress: onDelete },
        ])
      }
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
      <TouchableOpacity
        onPress={() => Alert.alert('Opções', item.name, [
          { text: 'Editar', onPress: onEdit },
          { text: item.isActive ? 'Pausar' : 'Ativar', onPress: onToggle },
          { text: 'Excluir', style: 'destructive', onPress: onDelete },
          { text: 'Cancelar', style: 'cancel' },
        ])}
        hitSlop={8}
        style={{ padding: 4 }}
      >
        <Feather name="more-vertical" size={16} color={COLORS.muted} />
      </TouchableOpacity>
    </PressableScale>
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

  const showOptions = () =>
    Alert.alert('Opções', item.name, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Editar', onPress: onEdit },
      { text: 'Excluir', style: 'destructive', onPress: onDelete },
    ])

  return (
    <SwipeableRow
      leftAction={{ icon: 'check-circle', label: 'Pagar', color: '#fff', bg: '#16a34a', onPress: onPay }}
      rightAction={{ icon: 'trash-2', label: 'Excluir', color: '#fff', bg: '#dc2626', onPress: onDelete }}
    >
      <PressableScale
        style={[styles.row, rowStyle]}
        onLongPress={showOptions}
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
          <TouchableOpacity onPress={showOptions} hitSlop={8} style={{ padding: 4 }}>
            <Feather name="more-vertical" size={16} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.payBtn} onPress={onPay} hitSlop={6}>
            <Feather name="check" size={12} color={COLORS.success} />
            <Text style={styles.payBtnText}>Pagar</Text>
          </TouchableOpacity>
        </View>
      </PressableScale>
    </SwipeableRow>
  )
}

function PaidRow({ item, onUnpay, onEdit, onDelete }: {
  item: Bill
  onUnpay: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const showOptions = () =>
    Alert.alert('Opções', item.name, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Editar', onPress: onEdit },
      { text: 'Estornar pagamento', onPress: onUnpay },
      { text: 'Excluir', style: 'destructive', onPress: onDelete },
    ])

  return (
    <PressableScale
      style={[styles.row, styles.rowPaid]}
      onLongPress={showOptions}
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
      <TouchableOpacity onPress={showOptions} hitSlop={8} style={{ padding: 4 }}>
        <Feather name="more-vertical" size={16} color={COLORS.muted} />
      </TouchableOpacity>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmountText, { color: COLORS.muted }]}>{fmt(Number(item.amount))}</Text>
        <Badge label="Pago" color={COLORS.success} />
      </View>
    </PressableScale>
  )
}

function InstallmentGroupCard({ group, onPay, onDeleteGroup, onEdit }: {
  group: InstallmentGroup
  onPay: (id: string) => void
  onDeleteGroup: () => void
  onEdit: () => void
}) {
  const [open, setOpen] = useState(true)
  const pct = Math.round((group.paidCount / group.total) * 100)

  return (
    <View style={styles.groupCard}>
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={() => setOpen((v) => !v)}
        onLongPress={() =>
          Alert.alert('Opções', group.name, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Editar', onPress: onEdit },
            { text: 'Excluir tudo', style: 'destructive', onPress: onDeleteGroup },
          ])
        }
        activeOpacity={0.8}
      >
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
          <TouchableOpacity
            onPress={() => Alert.alert('Opções', group.name, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Editar', onPress: onEdit },
              { text: 'Excluir tudo', style: 'destructive', onPress: onDeleteGroup },
            ])}
            hitSlop={8}
            style={{ padding: 4 }}
          >
            <Feather name="more-vertical" size={16} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} hitSlop={8} style={styles.groupEditBtn}>
            <Feather name="edit-2" size={13} color={COLORS.brand} />
          </TouchableOpacity>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={styles.groupBody}>
          <AnimatedProgress value={pct} max={100} height={6} color={COLORS.brand} bgColor={COLORS.muted2} borderRadius={3} />
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

type ProjectionItem = {
  label: string
  amount: number
  isCurrent: boolean
  breakdown: { fixed: number; avulso: number; installment: number; overdue?: number }
  items: { fixed: Bill[]; fixedIsRec: boolean; avulso: Bill[]; installments: Bill[] }
}

function ProjectionModal({
  month,
  iOweTotal,
  onClose,
}: {
  month: ProjectionItem | null
  iOweTotal: number
  onClose: () => void
}) {
  if (!month) return null
  const { items, breakdown } = month
  const hasContent = breakdown.fixed > 0 || breakdown.avulso > 0 || breakdown.installment > 0 || (breakdown.overdue ?? 0) > 0
  const displayTotal = month.amount + iOweTotal

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>{month.label}</Text>
            <Text style={styles.modalSubtitle}>Detalhamento de gastos</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Feather name="x" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalTotalRow}>
          <Text style={styles.modalTotalLabel}>Total previsto</Text>
          <Text style={styles.modalTotalValue}>-{fmt(displayTotal)}</Text>
        </View>

        {!hasContent && (
          <Text style={styles.modalEmpty}>Nenhuma conta prevista para este mês.</Text>
        )}

        {(breakdown.overdue ?? 0) > 0 && (
          <View style={styles.modalSection}>
            <Text style={[styles.modalSectionTitle, { color: COLORS.danger }]}>⚠️ EM ATRASO</Text>
            <View style={styles.modalItem}>
              <Text style={styles.modalItemName} numberOfLines={1}>Contas em atraso</Text>
              <Text style={[styles.modalItemAmount, { color: COLORS.danger }]}>{fmt(breakdown.overdue!)}</Text>
            </View>
          </View>
        )}

        {breakdown.fixed > 0 && (
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>🔁 FIXAS</Text>
            {items.fixedIsRec ? (
              <View style={styles.modalItem}>
                <Text style={styles.modalItemName} numberOfLines={1}>Contas fixas mensais</Text>
                <Text style={[styles.modalItemAmount, { color: COLORS.danger }]}>{fmt(breakdown.fixed)}</Text>
              </View>
            ) : (
              items.fixed.map((b) => (
                <View key={b.id} style={styles.modalItem}>
                  <Text style={styles.modalItemName} numberOfLines={1}>{b.name}</Text>
                  <Text style={[styles.modalItemAmount, { color: COLORS.danger }]}>{fmt(Number(b.amount))}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {breakdown.avulso > 0 && (
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>💸 AVULSO</Text>
            {items.avulso.map((b) => (
              <View key={b.id} style={styles.modalItem}>
                <Text style={styles.modalItemName} numberOfLines={1}>{b.name}</Text>
                <Text style={[styles.modalItemAmount, { color: COLORS.muted }]}>{fmt(Number(b.amount))}</Text>
              </View>
            ))}
          </View>
        )}

        {breakdown.installment > 0 && (
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>📅 PARCELAS</Text>
            {items.installments.map((b) => (
              <View key={b.id} style={styles.modalItem}>
                <Text style={styles.modalItemName} numberOfLines={1}>
                  {b.name}{b.installmentCurrent != null && b.installmentTotal != null
                    ? ` (${b.installmentCurrent}/${b.installmentTotal})`
                    : ''}
                </Text>
                <Text style={[styles.modalItemAmount, { color: COLORS.brand }]}>{fmt(Number(b.amount))}</Text>
              </View>
            ))}
          </View>
        )}

        {iOweTotal > 0 && (
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>👥 PESSOAS</Text>
            <View style={styles.modalItem}>
              <Text style={styles.modalItemName} numberOfLines={1}>Total a pagar a pessoas</Text>
              <Text style={[styles.modalItemAmount, { color: '#a78bfa' }]}>{fmt(iOweTotal)}</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  )
}

export default function BillsScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const scrollRef = useRef<any>(null)
  const [projectionIdx, setProjectionIdx] = useState<number | null>(null)

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false })
  }, []))

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

  const refetchAll = async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ['bills'], type: 'active' }),
      qc.refetchQueries({ queryKey: ['recurringBills'], type: 'active' }),
      qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' }),
    ])
  }
  const payMutation = useMutation({
    mutationFn: (id: string) => billsApi.pay(id),
    onSuccess: async () => { hapticSuccess(); await refetchAll() },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })
  const unpayMutation = useMutation({
    mutationFn: (id: string) => billsApi.unpay(id),
    onSuccess: async () => { hapticLight(); await refetchAll() },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => billsApi.delete(id),
    onSuccess: async () => { hapticLight(); await refetchAll() },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })
  const toggleRecurringMutation = useMutation({
    mutationFn: (item: RecurringBill) => recurringBillsApi.update(item.id, { isActive: !item.isActive }),
    onSuccess: async () => { hapticLight(); await refetchAll() },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })
  const deleteRecurringMutation = useMutation({
    mutationFn: (id: string) => recurringBillsApi.delete(id),
    onSuccess: async () => { hapticLight(); await refetchAll() },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })
  const deleteGroupMutation = useMutation({
    mutationFn: (group: InstallmentGroup) =>
      Promise.all(group.items.map((inst) => billsApi.delete(inst.id))),
    onSuccess: async () => { hapticSuccess(); await refetchAll() },
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

  const allGroups: InstallmentGroup[] = Array.from(grouped.entries())
    .filter(([, items]) => items.length > 0)
    .map(([groupId, items]) => {
      const sorted     = [...items].sort((a, b) => (a.installmentCurrent ?? 0) - (b.installmentCurrent ?? 0))
      const paidCount  = items.filter((b) => b.isPaid).length
      const first      = items[0]
      const total      = first.installmentTotal ?? items.length
      const nextDue    = sorted.find((b) => !b.isPaid) ?? sorted[sorted.length - 1]
      const amount     = Number(first.amount)
      const grandTotal = items.reduce((s, b) => s + Number(b.amount), 0)
      return { items: sorted, paidCount, total, nextDue, name: first.name, amount, groupId, grandTotal }
    })
  const activeGroups = allGroups
    .filter((g) => g.paidCount < g.total)
    .sort((a, b) => new Date(a.nextDue.dueDate).getTime() - new Date(b.nextDue.dueDate).getTime())
  const completedGroups = allGroups
    .filter((g) => g.paidCount === g.total)
    .sort((a, b) => b.grandTotal - a.grandTotal)

  const pending = regular.filter((b) => !b.isPaid)
  // Current month paid bills
  const paid = regular.filter((b) => {
    if (!b.isPaid) return false
    const d = new Date(b.dueDate)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  // Past months paid bills (history)
  const paidHistory = regular.filter((b) => {
    if (!b.isPaid) return false
    const d = new Date(b.dueDate)
    return !(d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth())
  }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())

  const totalPending = pending.reduce((s, b) => s + Number(b.amount), 0)
    + activeGroups.reduce((s, g) => s + Number(g.nextDue.amount), 0)
  const totalPaid = paid.reduce((s, b) => s + Number(b.amount), 0)
    + allGroups.reduce((s, g) => s + g.items
        .filter(inst => inst.isPaid && (() => {
          const d = new Date(inst.dueDate)
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        })())
        .reduce((ss, inst) => ss + Number(inst.amount), 0), 0)

  const recurring        = recurringBillsData ?? []
  const activeRecurring  = recurring.filter((r) => r.isActive)
  const pausedRecurring  = recurring.filter((r) => !r.isActive)
  const monthlyFixed     = activeRecurring.reduce((s, r) => s + Number(r.amount), 0)

  const people     = peopleData ?? []
  const iOwePeople = people.filter((p) => (p.iOweThem ?? 0) > 0)
  const iOweTotal  = iOwePeople.reduce((s, p) => s + (p.iOweThem ?? 0), 0)

  const inSameMonth = (dateStr: string, ref: Date) => {
    const d = new Date(dateStr)
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
  }

  // Overdue = all bills past due date (any month). Includes overdue installments.
  const overdueList  = pending.filter((b) => classifyBillStatus(b.dueDate, false) === 'overdue')
  const overdueInstallments = activeGroups.flatMap((g) => g.items)
    .filter((inst) => !inst.isPaid && classifyBillStatus(inst.dueDate, false) === 'overdue')
  const overdueTotal = overdueList.reduce((s, b) => s + Number(b.amount), 0)
    + overdueInstallments.reduce((s, inst) => s + Number(inst.amount), 0)

  // Current month: non-overdue bills only (overdue ones are already in overdueTotal)
  const pendingThisMonth = pending.filter((b) =>
    inSameMonth(b.dueDate, now) && classifyBillStatus(b.dueDate, false) !== 'overdue'
  )
  const totalThisMonth = pendingThisMonth.reduce((s, b) => s + Number(b.amount), 0)
    + activeGroups
        .flatMap((g) => g.items)
        .filter((inst) => !inst.isPaid && inSameMonth(inst.dueDate, now) && classifyBillStatus(inst.dueDate, false) !== 'overdue')
        .reduce((s, inst) => s + Number(inst.amount), 0)

  const grandTotal = totalThisMonth + overdueTotal + iOweTotal

  const projection = Array.from({ length: 3 }, (_, i) => {
    const d     = addMonths(now, i)
    const label = format(d, 'MMM/yy', { locale: ptBR })

    const avulsoBills    = pending.filter((b) => !b.recurringBillId && inSameMonth(b.dueDate, d))
    const avulsoAmount   = avulsoBills.reduce((s, b) => s + Number(b.amount), 0)

    const installmentBills  = activeGroups.flatMap((g) => g.items).filter((inst) => !inst.isPaid && inSameMonth(inst.dueDate, d))
    const installmentAmount = installmentBills.reduce((s, inst) => s + Number(inst.amount), 0)

    const fixedBills  = i === 0 ? pending.filter((b) => !!b.recurringBillId && inSameMonth(b.dueDate, d)) : []
    const fixedAmount = i === 0 ? fixedBills.reduce((s, b) => s + Number(b.amount), 0) : monthlyFixed

    return {
      label,
      amount: fixedAmount + avulsoAmount + installmentAmount + (i === 0 ? overdueTotal : 0),
      isCurrent: i === 0,
      breakdown: { fixed: fixedAmount, avulso: avulsoAmount, installment: installmentAmount, overdue: i === 0 ? overdueTotal : 0 },
      items: { fixed: fixedBills, fixedIsRec: i > 0, avulso: avulsoBills, installments: installmentBills },
    }
  })

  const loading = isLoading || recurringLoading || peopleLoading
  const totalPendingCount = pending.length + activeGroups.length

  return (
    <View style={styles.screen}>
      {loading ? (
        <ListSkeleton rows={5} />
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
              <Text style={styles.title}>Contas a pagar</Text>
              <Text style={styles.subtitle}>
                {totalPendingCount} pendente{totalPendingCount !== 1 ? 's' : ''} · {paid.length} paga{paid.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-bill')}>
              <Feather name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          </FadeIn>

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
                  <FadeIn delay={80}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Total a pagar</Text>
                      <Text style={styles.summaryValue} numberOfLines={1}>{fmt(grandTotal)}</Text>

                      {totalThisMonth > 0 && (
                        <View style={styles.summarySub}>
                          <Text style={styles.summarySubLabel}>📅 Contas do mês</Text>
                          <Text style={styles.summarySubValue} numberOfLines={1}>{fmt(totalThisMonth)}</Text>
                          <Text style={styles.summaryCount}>{pendingThisMonth.length} conta{pendingThisMonth.length !== 1 ? 's' : ''}</Text>
                        </View>
                      )}

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
                      <Text style={styles.summaryLabel}>Pagas este mês</Text>
                      <Text style={[styles.summaryValue, { color: COLORS.success }]} numberOfLines={1}>{fmt(totalPaid)}</Text>
                      <Text style={styles.summaryCount}>{paid.length} conta{paid.length !== 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  </FadeIn>

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
                <FadeIn delay={160}>
                <View style={styles.projectionCard}>
                  <View style={styles.projectionHeader}>
                    <Feather name="calendar" size={14} color={COLORS.brand} />
                    <Text style={styles.projectionTitle}>Projeção de gastos</Text>
                  </View>
                  <View style={styles.projectionRow}>
                    {projection.map((m, idx) => {
                      const displayAmt = m.amount + iOweTotal
                      return (
                      <TouchableOpacity
                        key={m.label}
                        style={[styles.projectionMonth, m.isCurrent && styles.projectionMonthCurrent]}
                        onPress={() => setProjectionIdx(idx)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.projectionMonthLabelRow}>
                          {m.isCurrent && <View style={styles.projectionDot} />}
                          <Text style={styles.projectionMonthLabel}>{m.label}</Text>
                        </View>
                        <Text style={styles.projectionTotal}>-{fmt(displayAmt)}</Text>
                        {m.isCurrent && (m.breakdown.overdue ?? 0) > 0 && <Text style={[styles.projectionDetail, { color: COLORS.danger }]}>⚠️ {fmt(m.breakdown.overdue!)} atraso</Text>}
                        {m.breakdown.fixed > 0 && <Text style={styles.projectionDetail}>🔁 {fmt(m.breakdown.fixed)} fixas</Text>}
                        {m.breakdown.avulso > 0 && <Text style={styles.projectionDetail}>💸 {fmt(m.breakdown.avulso)} avulso</Text>}
                        {m.breakdown.installment > 0 && <Text style={styles.projectionDetail}>📅 {fmt(m.breakdown.installment)} parcelas</Text>}
                        {iOweTotal > 0 && <Text style={styles.projectionDetail}>👥 {fmt(iOweTotal)} pessoas</Text>}
                        <View style={styles.projectionTapHint}>
                          <Feather name="chevron-right" size={10} color={COLORS.muted2} />
                        </View>
                      </TouchableOpacity>
                      )
                    })}
                  </View>
                  <Text style={styles.projectionFooter}>Toque em um mês para ver o detalhamento.</Text>
                </View>
                </FadeIn>
              )}

              <View style={styles.divider} />

              {/* Contas Fixas */}
              <FadeIn delay={240}>
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
              </FadeIn>

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
                        onDeleteGroup={() => deleteGroupMutation.mutate(group)}
                        onEdit={() => router.push({
                          pathname: '/edit-installment-group',
                          params: {
                            groupId: group.groupId,
                            name: group.name,
                            amount: String(group.amount),
                            categoryId: group.items[0]?.category?.id ?? '',
                            notes: group.items[0]?.notes ?? '',
                            total: String(group.total),
                            paidCount: String(group.paidCount),
                          },
                        })}
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

              {/* Histórico de contas pagas */}
              {paidHistory.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionBar, { backgroundColor: COLORS.muted }]} />
                      <Feather name="archive" size={14} color={COLORS.muted} />
                      <Text style={[styles.sectionTitle, { color: COLORS.muted }]}>Histórico de contas pagas</Text>
                    </View>
                    {paidHistory.map((bill) => (
                      <PaidRow
                        key={bill.id}
                        item={bill}
                        onUnpay={() => unpayMutation.mutate(bill.id)}
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
      <ProjectionModal
        month={projectionIdx !== null ? projection[projectionIdx] ?? null : null}
        iOweTotal={iOweTotal}
        onClose={() => setProjectionIdx(null)}
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
  projectionTapHint:    { alignSelf: 'flex-end', marginTop: 2 },

  // Projection modal
  modalBackdrop:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 36, paddingHorizontal: 20,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle:    { fontSize: 17, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  modalSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  modalTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.danger + '10', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.danger + '28',
  },
  modalTotalLabel: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  modalTotalValue: { fontSize: 18, fontWeight: '800', color: COLORS.danger },
  modalEmpty:    { fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingVertical: 24 },
  modalSection:  { marginBottom: 14 },
  modalSectionTitle: {
    fontSize: 10, fontWeight: '700', color: COLORS.muted2, letterSpacing: 1,
    marginBottom: 8, textTransform: 'uppercase',
  },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalItemName:   { flex: 1, fontSize: 13, color: COLORS.text, marginRight: 12 },
  modalItemAmount: { fontSize: 13, fontWeight: '700' },

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
  groupHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupEditBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.brand + '15', justifyContent: 'center', alignItems: 'center' },
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
