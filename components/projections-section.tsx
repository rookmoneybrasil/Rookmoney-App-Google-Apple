import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '@/components/text'
import { Feather } from '@expo/vector-icons'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import type { DashboardProjection, DashboardProjectionItem } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtCompact = (n: number) => {
  const sign = n < 0 ? '-' : ''
  const abs  = Math.abs(n)
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (abs >= 1_000)     return `${sign}R$ ${(abs / 1_000).toFixed(1).replace('.', ',')} mil`
  return fmt(n)
}

interface MonthData {
  month:             string
  label:             string
  income:            number
  expense:           number
  balance:           number
  cumulativeBalance: number
  incomeItems:  DashboardProjection['incomeItems']
  expenseItems: DashboardProjection['expenseItems']
}

// ── Item list ────────────────────────────────────────────────────────────
function ItemList({ items, color }: { items: DashboardProjectionItem[]; color: 'income' | 'expense' }) {
  if (items.length === 0) return null
  return (
    <View style={{ gap: 1 }}>
      {items.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <Text style={styles.itemIcon}>{item.icon ?? '•'}</Text>
          <Text style={styles.itemLabel} numberOfLines={1}>
            {item.label}
            {item.overdue ? ' ⚠️ atrasada' : ''}
          </Text>
          <Text style={[styles.itemAmount, { color: color === 'income' ? COLORS.success : COLORS.danger }]}>
            {color === 'income' ? '+' : '-'}{fmt(item.amount)}
          </Text>
        </View>
      ))}
    </View>
  )
}

function ItemGroup({ title, items, color }: { title: string; items: DashboardProjectionItem[]; color: 'income' | 'expense' }) {
  if (items.length === 0) return null
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.groupTitle}>{title}</Text>
      <ItemList items={items} color={color} />
    </View>
  )
}

// ── Detail panel ─────────────────────────────────────────────────────────
function DetailPanel({ proj }: { proj: MonthData }) {
  const isPositive = proj.cumulativeBalance >= 0
  const maxBar     = Math.max(proj.income, proj.expense, 1)
  const incPct     = Math.round((proj.income  / maxBar) * 100)
  const expPct     = Math.round((proj.expense / maxBar) * 100)

  const hasIncome  = proj.incomeItems.sources.length  > 0 || proj.incomeItems.people.length  > 0
  const hasExpense = proj.expenseItems.bills.length   > 0 || proj.expenseItems.people.length > 0

  return (
    <View style={styles.detailPanel}>
      {/* Header */}
      <View style={styles.detailHeader}>
        <Text style={styles.detailMonthLabel}>{proj.label} · Saldo acumulado</Text>
        <Text style={[styles.detailBalance, { color: isPositive ? COLORS.success : COLORS.danger }]}>
          {fmt(proj.cumulativeBalance)}
        </Text>
        <View style={styles.detailStatsCol}>
          <View style={styles.detailStat}>
            <Feather name="arrow-up-right" size={12} color={COLORS.success} />
            <Text style={styles.detailStatLabel}>Entra este mês:</Text>
            <Text style={[styles.detailStatValue, { color: COLORS.success }]}>+{fmt(proj.income)}</Text>
          </View>
          <View style={styles.detailStat}>
            <Feather name="arrow-down-right" size={12} color={COLORS.danger} />
            <Text style={styles.detailStatLabel}>Sai este mês:</Text>
            <Text style={[styles.detailStatValue, { color: COLORS.danger }]}>-{fmt(proj.expense)}</Text>
          </View>
          <View style={styles.detailStat}>
            <Text style={[styles.detailStatLabel, { marginLeft: 18 }]}>Resultado mensal:</Text>
            <Text style={[styles.detailStatValue, { color: proj.balance >= 0 ? COLORS.success : COLORS.danger }]}>
              {proj.balance >= 0 ? '+' : ''}{fmt(proj.balance)}
            </Text>
          </View>
        </View>
      </View>

      {/* Bars */}
      <View style={styles.detailBars}>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Receita</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${incPct}%` as `${number}%`, backgroundColor: COLORS.success + 'cc' }]} />
          </View>
          <Text style={[styles.barValue, { color: COLORS.success }]}>+{fmt(proj.income)}</Text>
        </View>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Despesa</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${expPct}%` as `${number}%`, backgroundColor: COLORS.danger + 'cc' }]} />
          </View>
          <Text style={[styles.barValue, { color: COLORS.danger }]}>-{fmt(proj.expense)}</Text>
        </View>
      </View>

      {/* Item breakdown */}
      <View style={styles.detailGroups}>
        <View>
          <View style={styles.groupHeader}>
            <Feather name="trending-up" size={11} color={COLORS.success} />
            <Text style={styles.groupHeaderText}>Receitas — {fmt(proj.income)}</Text>
          </View>
          {!hasIncome ? (
            <Text style={styles.emptyDetail}>Nenhuma receita projetada</Text>
          ) : (
            <>
              <ItemGroup title="Rendas recorrentes" items={proj.incomeItems.sources} color="income" />
              <ItemGroup title="A receber de pessoas" items={proj.incomeItems.people} color="income" />
            </>
          )}
        </View>

        <View style={styles.detailGroupsDivider} />

        <View>
          <View style={styles.groupHeader}>
            <Feather name="trending-down" size={11} color={COLORS.danger} />
            <Text style={styles.groupHeaderText}>Despesas — {fmt(proj.expense)}</Text>
          </View>
          {!hasExpense ? (
            <Text style={styles.emptyDetail}>Nenhuma despesa projetada</Text>
          ) : (
            <>
              <ItemGroup title="Contas e parcelas" items={proj.expenseItems.bills} color="expense" />
              <ItemGroup title="A pagar para pessoas" items={proj.expenseItems.people} color="expense" />
            </>
          )}
        </View>
      </View>
    </View>
  )
}

// ── Month chip ───────────────────────────────────────────────────────────
function MonthChip({
  proj, maxCumulative, minCumulative, selected, onPress,
}: {
  proj:          MonthData
  maxCumulative: number
  minCumulative: number
  selected:      boolean
  onPress:       () => void
}) {
  const isPositive = proj.cumulativeBalance >= 0
  const range       = Math.max(maxCumulative - minCumulative, 1)
  const normalized  = (proj.cumulativeBalance - minCumulative) / range
  const barH        = Math.round(4 + normalized * 68)

  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.chipBarWrap}>
        <View style={[styles.chipBar, { height: barH, backgroundColor: isPositive ? COLORS.brand : COLORS.danger + '99' }]} />
      </View>
      <Text style={styles.chipLabel}>{proj.label}</Text>
      <Text style={[styles.chipBalance, { color: isPositive ? COLORS.text : COLORS.danger }]}>
        {fmtCompact(proj.cumulativeBalance)}
      </Text>
      <Text style={[styles.chipDelta, { color: proj.balance >= 0 ? COLORS.success : COLORS.danger }]}>
        {proj.balance >= 0 ? '↑' : '↓'}{fmtCompact(Math.abs(proj.balance))}
      </Text>
    </TouchableOpacity>
  )
}

// ── Main section ─────────────────────────────────────────────────────────
interface Props {
  projections: DashboardProjection[]
}

export function ProjectionsSection({ projections }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const months: MonthData[] = projections.map((p) => ({
    month:             p.month,
    label:             format(new Date(p.month), "MMM. yy", { locale: ptBR }),
    income:            p.projectedIncome,
    expense:           p.projectedExpense,
    balance:           p.projectedIncome - p.projectedExpense,
    cumulativeBalance: p.projectedBalance,
    incomeItems:       p.incomeItems  ?? { sources: [], people: [] },
    expenseItems:      p.expenseItems ?? { bills: [], people: [] },
  }))

  const hasAny = months.some((m) => m.income > 0 || m.expense > 0)
  const cumulatives   = months.map((m) => m.cumulativeBalance)
  const maxCumulative = Math.max(...cumulatives, 0)
  const minCumulative = Math.min(...cumulatives, 0)

  const selectedProj = months.find((m) => m.month === selected) ?? null

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Feather name="zap" size={14} color={COLORS.brand} />
        <Text style={styles.headerTitle}>Projeção dos próximos meses</Text>
        <View style={styles.estimateBadge}>
          <Text style={styles.estimateText}>estimativa</Text>
        </View>
      </View>

      {!hasAny ? (
        <Text style={styles.emptyText}>
          Configure rendas recorrentes, contas e recorrências para ver projeções.
        </Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {months.map((m) => (
              <MonthChip
                key={m.month}
                proj={m}
                maxCumulative={maxCumulative}
                minCumulative={minCumulative}
                selected={selected === m.month}
                onPress={() => setSelected((v) => (v === m.month ? null : m.month))}
              />
            ))}
          </ScrollView>

          {selectedProj && <DetailPanel proj={selectedProj} />}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  estimateBadge: {
    backgroundColor: COLORS.card2, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  estimateText: { fontSize: 10, color: COLORS.muted },

  emptyText: { fontSize: 13, color: COLORS.muted, paddingVertical: 4 },

  chipsRow: { gap: 10, paddingBottom: 2 },
  chip: {
    alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card2,
    minWidth: 92,
  },
  chipSelected: { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim + '40' },
  chipBarWrap: { height: 76, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  chipBar:     { width: 24, borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
  chipLabel:   { fontSize: 11, color: COLORS.muted, fontWeight: '500', textTransform: 'capitalize' },
  chipBalance: { fontSize: 13, fontWeight: '700' },
  chipDelta:   { fontSize: 10.5, fontWeight: '600' },

  // Detail panel
  detailPanel: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  detailHeader: { marginBottom: 14 },
  detailMonthLabel: { fontSize: 11, color: COLORS.muted, textTransform: 'capitalize', marginBottom: 2 },
  detailBalance:    { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  detailStatsCol:   { gap: 4 },
  detailStat:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailStatLabel:  { fontSize: 11, color: COLORS.muted },
  detailStatValue:  { fontSize: 12, fontWeight: '700' },

  detailBars: { gap: 8, marginBottom: 14 },
  barRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel:   { fontSize: 11, color: COLORS.muted, width: 52 },
  barTrack:   { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.border, overflow: 'hidden' },
  barFill:    { height: 8, borderRadius: 4 },
  barValue:   { fontSize: 12, fontWeight: '700', width: 90, textAlign: 'right' },

  detailGroups: { gap: 4 },
  detailGroupsDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  groupHeaderText: {
    fontSize: 10.5, fontWeight: '700', color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  groupTitle: {
    fontSize: 10, color: '#475569', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 2,
  },
  emptyDetail: { fontSize: 11, color: '#475569', marginBottom: 4 },

  itemRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  itemIcon:   { fontSize: 13, width: 18, textAlign: 'center' },
  itemLabel:  { flex: 1, fontSize: 12, color: COLORS.text },
  itemAmount: { fontSize: 12, fontWeight: '700' },
})
