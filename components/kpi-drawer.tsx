import { View, Modal, TouchableOpacity, StyleSheet, Pressable, ScrollView } from 'react-native'
import { Text } from '@/components/text'
import { Feather } from '@expo/vector-icons'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import type { DashboardData, Transaction } from '@/lib/api'

export type KpiType = 'receivable' | 'income' | 'bills' | 'balance' | null

interface Props {
  type:    KpiType
  data:    DashboardData | undefined
  onClose: () => void
}

// Web tokens not present in mobile COLORS — kept literal for parity with the dashboard
const C = {
  cyan400:  '#22d3ee',
  danger:   '#f43f5e',
  warning:  '#f97316',
  brand400: '#60a5fa',
  brand300: '#93c5fd',
  brand800: '#0d2460',
  brand700: '#1a3d8f',
  purple400: '#c084fc',
  purple300: '#d8b4fe',
  slate300: '#cbd5e1',
  slate500: '#64748b',
  ink600:   '#162641',
} as const

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
const fmtDate = (date: string) => {
  const d = new Date(date)
  const local = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return format(local, 'dd/MM/yyyy', { locale: ptBR })
}
const classifyBill = (dueDate: string) => {
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'overdue'
  if (days <= 3) return 'urgent'
  return 'pending'
}

// ── Root ──────────────────────────────────────────────────────────────────────
export function KpiDrawer({ type, data, onClose }: Props) {
  return (
    <Modal visible={!!type} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.drawer}>
        <View style={styles.handle} />
        {type === 'receivable' && <ReceivableContent data={data} onClose={onClose} />}
        {type === 'income'     && <IncomeContent     data={data} onClose={onClose} />}
        {type === 'bills'      && <BillsContent      data={data} onClose={onClose} />}
        {type === 'balance'    && <BalanceContent    data={data} onClose={onClose} />}
      </View>
    </Modal>
  )
}

type Block = { label: string; icon: string; color: string; bg: string; border: string; total: number; count: number }

// ── A Receber ──────────────────────────────────────────────────────────────────
function ReceivableContent({ data, onClose }: { data?: DashboardData; onClose: () => void }) {
  const sources   = data?.pendingIncomeSources ?? []
  const peopleRec = data?.upcomingPeopleReceivable ?? []

  const fixedSrc  = sources.filter((s) => s.isRecurring)
  const oneOffSrc = sources.filter((s) => !s.isRecurring)

  const peopleMap = peopleRec.reduce<Record<string, number>>((acc, up) => {
    acc[up.person.name] = (acc[up.person.name] ?? 0) + Number(up.amount)
    return acc
  }, {})
  const peopleEntries = Object.entries(peopleMap)

  const sumOf = (arr: { amount: number }[]) => arr.reduce((s, x) => s + Number(x.amount), 0)

  const blocks: Block[] = [
    { label: 'FIXO · RECORRENTE', icon: 'repeat',         color: C.cyan400,    bg: C.cyan400 + '1a',    border: C.cyan400 + '33',    total: sumOf(fixedSrc),  count: fixedSrc.length },
    { label: 'AVULSO',            icon: 'arrow-up-right', color: C.slate300,   bg: C.ink600,            border: COLORS.border,        total: sumOf(oneOffSrc), count: oneOffSrc.length },
    { label: 'PESSOAS',           icon: 'users',          color: C.purple400,  bg: C.purple400 + '1a', border: C.purple400 + '33',   total: peopleEntries.reduce((s, [, v]) => s + v, 0), count: peopleEntries.length },
  ].filter((b) => b.count > 0)

  const hasAnything = sources.length > 0 || peopleEntries.length > 0

  return (
    <>
      <DrawerHeader title="A Receber" icon="arrow-down-circle" color={C.cyan400} onClose={onClose} />
      {!hasAnything ? (
        <Text style={styles.emptyMsg}>Nada a receber no momento.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <SummaryRow blocks={blocks} />

          {fixedSrc.length > 0 && (
            <>
              <GroupHeader icon="repeat" label="FIXO · RECORRENTE" color={C.cyan400} />
              {fixedSrc.map((s) => (
                <ItemRow key={s.id} title={s.name} sub={`dia ${s.dayOfMonth ?? 1}`} amount={`+${fmt(Number(s.amount))}`} amountColor={C.cyan400} />
              ))}
            </>
          )}

          {oneOffSrc.length > 0 && (
            <>
              <GroupHeader icon="arrow-up-right" label="AVULSO" color={C.slate500} />
              {oneOffSrc.map((s) => (
                <ItemRow key={s.id} title={s.name} sub="Eventual · pendente" amount={`+${fmt(Number(s.amount))}`} amountColor={C.cyan400} />
              ))}
            </>
          )}

          {peopleEntries.length > 0 && (
            <>
              <GroupHeader icon="users" label="PESSOAS QUE TE DEVEM" color={C.purple400} />
              {peopleEntries.map(([name, total]) => (
                <ItemRow key={name} title={name} amount={`+${fmt(total)}`} amountColor={COLORS.success} />
              ))}
            </>
          )}
          <View style={{ height: 8 }} />
        </ScrollView>
      )}
    </>
  )
}

// ── Receitas ──────────────────────────────────────────────────────────────────
function IncomeContent({ data, onClose }: { data?: DashboardData; onClose: () => void }) {
  const txs    = data?.monthIncomeTransactions ?? []
  const fixed  = txs.filter((t) => t.isRecurringIncome)
  const oneOff = txs.filter((t) => !t.isRecurringIncome)
  const people = data?.monthPeopleReceived ?? []

  const sumOf = (arr: { amount: number }[]) => arr.reduce((s, x) => s + Number(x.amount), 0)

  const blocks: Block[] = [
    { label: 'FIXO · RECORRENTE', icon: 'repeat',         color: COLORS.success, bg: COLORS.success + '1a', border: COLORS.success + '33', total: sumOf(fixed),  count: fixed.length },
    { label: 'AVULSO',            icon: 'arrow-up-right', color: C.slate300,     bg: C.ink600,               border: COLORS.border,          total: sumOf(oneOff), count: oneOff.length },
    { label: 'PESSOAS',           icon: 'users',          color: C.purple400,    bg: C.purple400 + '1a',    border: C.purple400 + '33',     total: sumOf(people), count: people.length },
  ].filter((b) => b.count > 0)

  const hasAnything = txs.length > 0 || people.length > 0

  return (
    <>
      <DrawerHeader title="Receitas do mês" icon="trending-up" color={COLORS.success} onClose={onClose} />
      {!hasAnything ? (
        <Text style={styles.emptyMsg}>Nenhuma receita registrada este mês.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <SummaryRow blocks={blocks} />

          {fixed.length > 0 && (
            <>
              <GroupHeader icon="repeat" label="FIXO · RECORRENTE" color={COLORS.success} />
              {fixed.map((tx) => <TxRow key={tx.id} tx={tx} />)}
            </>
          )}

          {oneOff.length > 0 && (
            <>
              <GroupHeader icon="arrow-up-right" label="AVULSO" color={C.slate500} />
              {oneOff.map((tx) => <TxRow key={tx.id} tx={tx} />)}
            </>
          )}

          {people.length > 0 && (
            <>
              <GroupHeader icon="users" label="RECEBIDO DE PESSOAS" color={C.purple400} />
              {people.map((entry) => (
                <ItemRow key={entry.id} title={entry.person.name} sub={`${entry.description} · ${fmtDate(entry.date)}`} amount={`+${fmt(Number(entry.amount))}`} amountColor={COLORS.success} />
              ))}
            </>
          )}
          <View style={{ height: 8 }} />
        </ScrollView>
      )}
    </>
  )
}

function TxRow({ tx }: { tx: Transaction & { isRecurringIncome: boolean } }) {
  return (
    <View style={styles.itemRow}>
      <View style={[styles.txIcon, { backgroundColor: tx.category.color + '22' }]}>
        <Text style={styles.txIconText}>{tx.category.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle} numberOfLines={1}>{tx.description ?? tx.category.name}</Text>
        <Text style={styles.itemSub}>{tx.category.name} · {fmtDate(tx.date)}</Text>
      </View>
      <Text style={[styles.itemAmount, { color: COLORS.success }]}>+{fmt(Number(tx.amount))}</Text>
    </View>
  )
}

// ── A Pagar ───────────────────────────────────────────────────────────────────
function BillsContent({ data, onClose }: { data?: DashboardData; onClose: () => void }) {
  const unpaid      = (data?.upcomingBills ?? []).filter((b) => !b.isPaid)
  const overdue     = unpaid.filter((b) => classifyBill(b.dueDate) === 'overdue')
  const installment = unpaid.filter((b) => !!b.installmentGroupId && classifyBill(b.dueDate) !== 'overdue')
  const recAvulso   = unpaid.filter((b) => !b.installmentGroupId && classifyBill(b.dueDate) !== 'overdue')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  const peopleRec = data?.upcomingPersonPayables ?? []
  const peopleMap = peopleRec.reduce<Record<string, number>>((acc, up) => {
    acc[up.person.name] = (acc[up.person.name] ?? 0) + Number(up.amount)
    return acc
  }, {})
  const peopleEntries = Object.entries(peopleMap)

  const sumOf = (arr: { amount: number }[]) => arr.reduce((s, b) => s + Number(b.amount), 0)

  const blocks: Block[] = [
    { label: 'EM ATRASO',  icon: 'alert-triangle', color: C.danger,    bg: C.danger + '1a',    border: C.danger + '33',    total: sumOf(overdue),     count: overdue.length },
    { label: 'PARCELADAS', icon: 'layers',         color: C.brand400,  bg: C.brand400 + '1a',  border: C.brand400 + '33',  total: sumOf(installment), count: installment.length },
    { label: 'CONTAS',     icon: 'repeat',         color: C.slate300,  bg: C.ink600,           border: COLORS.border,       total: sumOf(recAvulso),   count: recAvulso.length },
    { label: 'PESSOAS',    icon: 'users',          color: C.purple400, bg: C.purple400 + '1a', border: C.purple400 + '33',  total: peopleEntries.reduce((s, [, v]) => s + v, 0), count: peopleEntries.length },
  ].filter((b) => b.count > 0)

  const hasAnything = unpaid.length > 0 || peopleEntries.length > 0

  return (
    <>
      <DrawerHeader title="A Pagar" icon="trending-down" color={C.danger} onClose={onClose} />
      {!hasAnything ? (
        <Text style={styles.emptyMsg}>Nenhuma conta pendente. Tudo em dia! 🎉</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <SummaryRow blocks={blocks} />

          {overdue.length > 0 && (
            <>
              <GroupHeader icon="alert-triangle" label="EM ATRASO" color={C.danger} />
              {overdue.map((b) => (
                <View key={b.id} style={[styles.itemRow, { backgroundColor: C.danger + '14', borderColor: C.danger + '33', borderWidth: 1 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{b.name}</Text>
                    <Text style={[styles.itemSub, { color: C.danger }]}>{fmtDate(b.dueDate)}</Text>
                  </View>
                  <Text style={[styles.itemAmount, { color: C.danger }]}>{fmt(Number(b.amount))}</Text>
                </View>
              ))}
            </>
          )}

          {installment.length > 0 && (
            <>
              <GroupHeader icon="layers" label="PARCELADAS" color={C.brand400} />
              {installment.map((b) => (
                <View key={b.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {b.name}{b.installmentCurrent && b.installmentTotal ? `  ${b.installmentCurrent}/${b.installmentTotal}` : ''}
                    </Text>
                    <Text style={styles.itemSub}>{fmtDate(b.dueDate)}</Text>
                  </View>
                  <Text style={[styles.itemAmount, { color: C.slate300 }]}>{fmt(Number(b.amount))}</Text>
                </View>
              ))}
            </>
          )}

          {recAvulso.length > 0 && (
            <>
              <GroupHeader icon="repeat" label="CONTAS" color={C.slate500} />
              {recAvulso.map((b) => {
                const urgent = classifyBill(b.dueDate) === 'urgent'
                return (
                  <View key={b.id} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{b.name}</Text>
                      <Text style={[styles.itemSub, urgent && { color: C.warning }]}>
                        {b.recurringBillId ? '🔁 fixa · ' : ''}{fmtDate(b.dueDate)}
                      </Text>
                    </View>
                    <Text style={[styles.itemAmount, { color: urgent ? C.warning : C.slate300 }]}>{fmt(Number(b.amount))}</Text>
                  </View>
                )
              })}
            </>
          )}

          {peopleEntries.length > 0 && (
            <>
              <GroupHeader icon="users" label="PESSOAS" color={C.purple400} />
              {peopleEntries.map(([name, total]) => (
                <View key={name} style={[styles.itemRow, { backgroundColor: C.purple400 + '14', borderColor: C.purple400 + '26', borderWidth: 1 }]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{name[0]?.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.itemTitle, { flex: 1 }]} numberOfLines={1}>{name}</Text>
                  <Text style={[styles.itemAmount, { color: C.purple300 }]}>{fmt(total)}</Text>
                </View>
              ))}
            </>
          )}
          <View style={{ height: 8 }} />
        </ScrollView>
      )}
    </>
  )
}

// ── Saldo ─────────────────────────────────────────────────────────────────────
function BalanceContent({ data, onClose }: { data?: DashboardData; onClose: () => void }) {
  const balance = data?.monthBalance ?? 0
  const income  = data?.monthIncome  ?? 0
  const expense = data?.monthExpense ?? 0
  const savings = income > 0 ? Math.round(((income - expense) / income) * 100) : 0
  const isPos   = balance >= 0
  const monthLabel = format(new Date(), 'MMMM yyyy', { locale: ptBR })

  return (
    <>
      <DrawerHeader title={`Saldo — ${monthLabel}`} icon="calendar" color={COLORS.brand} onClose={onClose} />
      <View style={styles.balanceRows}>
        <View style={[styles.balanceRow, { backgroundColor: COLORS.success + '14', borderColor: COLORS.success + '33' }]}>
          <View style={styles.balanceRowLeft}>
            <Feather name="trending-up" size={16} color={COLORS.success} />
            <Text style={styles.balanceRowLabel}>Receitas</Text>
          </View>
          <Text style={[styles.balanceRowValue, { color: COLORS.success }]}>+{fmt(income)}</Text>
        </View>

        <View style={[styles.balanceRow, { backgroundColor: C.danger + '14', borderColor: C.danger + '33' }]}>
          <View style={styles.balanceRowLeft}>
            <Feather name="trending-down" size={16} color={C.danger} />
            <Text style={styles.balanceRowLabel}>Já pago</Text>
          </View>
          <Text style={[styles.balanceRowValue, { color: C.danger }]}>-{fmt(expense)}</Text>
        </View>

        <View style={[styles.balanceRow, isPos
          ? { backgroundColor: C.brand800 + '66', borderColor: C.brand700 + '4d' }
          : { backgroundColor: C.danger + '14', borderColor: C.danger + '33' }]}
        >
          <View style={styles.balanceRowLeft}>
            <Feather name="arrow-up-right" size={16} color={isPos ? C.brand400 : C.danger} />
            <Text style={styles.balanceRowLabel}>Saldo líquido</Text>
          </View>
          <Text style={[styles.balanceRowValue, { color: isPos ? C.brand300 : C.danger }]}>
            {isPos ? '+' : ''}{fmt(balance)}
          </Text>
        </View>
      </View>

      {income > 0 && (
        <Text style={styles.savingsText}>
          Taxa de economia: <Text style={{ color: savings >= 20 ? COLORS.success : C.warning, fontWeight: '700' }}>{savings}%</Text>
        </Text>
      )}
    </>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────
function DrawerHeader({ title, icon, color, onClose }: {
  title: string; icon: string; color: string; onClose: () => void
}) {
  return (
    <View style={styles.hdr}>
      <View style={styles.hdrLeft}>
        <Feather name={icon as never} size={16} color={color} />
        <Text style={styles.hdrTitle}>{title}</Text>
      </View>
      <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.hdrClose}>
        <Feather name="x" size={16} color={COLORS.muted} />
      </TouchableOpacity>
    </View>
  )
}

function SummaryRow({ blocks }: { blocks: Block[] }) {
  if (blocks.length === 0) return null
  return (
    <View style={styles.summaryRow}>
      {blocks.map((b) => (
        <View key={b.label} style={[styles.summaryCard, { backgroundColor: b.bg, borderColor: b.border }]}>
          <View style={styles.summaryCardTop}>
            <Feather name={b.icon as never} size={11} color={b.color} />
            <Text style={[styles.summaryCardLabel, { color: b.color }]}>{b.label}</Text>
          </View>
          <Text style={[styles.summaryCardValue, { color: b.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{fmt(b.total)}</Text>
          <Text style={styles.summaryCardCount}>{b.count} {b.count === 1 ? 'item' : 'itens'}</Text>
        </View>
      ))}
    </View>
  )
}

function GroupHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={styles.groupHeader}>
      <Feather name={icon as never} size={11} color={color} />
      <Text style={[styles.groupHeaderText, { color }]}>{label}</Text>
    </View>
  )
}

function ItemRow({ title, sub, amount, amountColor }: { title: string; sub?: string; amount: string; amountColor: string }) {
  return (
    <View style={styles.itemRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={styles.itemSub}>{sub}</Text> : null}
      </View>
      <Text style={[styles.itemAmount, { color: amountColor }]}>{amount}</Text>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  drawer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.border,
    maxHeight: '82%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 20,
  },

  // Header
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 14, marginBottom: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  hdrLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hdrTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  hdrClose: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  // Summary cards row
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  summaryCard: {
    flexGrow: 1, flexBasis: '30%', borderRadius: 12, borderWidth: 1,
    padding: 10, gap: 2,
  },
  summaryCardTop:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  summaryCardLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  summaryCardValue: { fontSize: 14, fontWeight: '800' },
  summaryCardCount: { fontSize: 10, color: COLORS.muted },

  // Group header
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 10, paddingBottom: 6,
  },
  groupHeaderText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },

  // Item / transaction row
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card2,
    borderRadius: 12, padding: 12, marginBottom: 6,
  },
  itemTitle:  { fontSize: 13, fontWeight: '600', color: COLORS.text },
  itemSub:    { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  itemAmount: { fontSize: 13, fontWeight: '700' },

  txIcon:     { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  txIconText: { fontSize: 14 },

  avatar:     { width: 32, height: 32, borderRadius: 16, backgroundColor: C.purple400 + '33', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: C.purple300 },

  // Saldo rows
  balanceRows: { gap: 8, marginBottom: 4 },
  balanceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  balanceRowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceRowLabel: { fontSize: 13, color: COLORS.text },
  balanceRowValue: { fontSize: 13, fontWeight: '700' },
  savingsText: { fontSize: 11, color: COLORS.muted, textAlign: 'center', paddingTop: 10 },

  emptyMsg: { fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingVertical: 32 },
})
