import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { projectionApi, meApi, type ProjectionMonth } from '@/lib/api'
import { ProGate } from '@/components/pro-gate'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

function MonthCard({ month, expanded, onToggle }: {
  month: ProjectionMonth
  expanded: boolean
  onToggle: () => void
}) {
  const balanceColor = month.balance >= 0 ? COLORS.success : COLORS.danger
  const cumulColor   = month.cumulativeBalance >= 0 ? COLORS.success : COLORS.danger

  return (
    <View style={[styles.monthCard, expanded && styles.monthCardExpanded]}>
      <TouchableOpacity style={styles.monthHeader} onPress={onToggle} activeOpacity={0.8}>
        <View style={styles.monthLeft}>
          <Text style={styles.monthLabel}>{month.label}</Text>
          {month.isActual && (
            <View style={styles.actualBadge}>
              <Text style={styles.actualBadgeText}>Real</Text>
            </View>
          )}
        </View>
        <View style={styles.monthRight}>
          <Text style={[styles.monthBalance, { color: balanceColor }]}>
            {month.balance >= 0 ? '+' : ''}{fmt(month.balance)}
          </Text>
          <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
        </View>
      </TouchableOpacity>

      <View style={styles.monthStats}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.statLabel}>Entradas</Text>
          <Text style={[styles.statVal, { color: COLORS.success }]}>{fmt(month.totalIncome)}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: COLORS.danger }]} />
          <Text style={styles.statLabel}>Saídas</Text>
          <Text style={[styles.statVal, { color: COLORS.danger }]}>{fmt(month.totalExpense)}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: cumulColor }]} />
          <Text style={styles.statLabel}>Acumulado</Text>
          <Text style={[styles.statVal, { color: cumulColor }]}>{fmt(month.cumulativeBalance)}</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.details}>
          {month.incomeItems.length > 0 && (
            <ItemGroup title="Entradas" items={month.incomeItems} color={COLORS.success} />
          )}
          {month.expenseItems.length > 0 && (
            <ItemGroup title="Saídas" items={month.expenseItems} color={COLORS.danger} />
          )}
        </View>
      )}
    </View>
  )
}

function ItemGroup({ title, items, color }: {
  title: string
  items: { id: string; label: string; amount: number; actual?: boolean; overdue?: boolean }[]
  color: string
}) {
  return (
    <View style={styles.itemGroup}>
      <Text style={[styles.itemGroupTitle, { color }]}>{title}</Text>
      {items.map(item => (
        <View key={item.id} style={styles.itemRow}>
          <Text style={styles.itemLabel} numberOfLines={1}>
            {item.label}
            {item.overdue ? ' ⚠️' : ''}
            {item.actual ? ' ·' : ''}
          </Text>
          <View style={styles.itemRight}>
            {item.actual && <Text style={styles.actualTag}>real</Text>}
            {!item.actual && <Text style={styles.projTag}>prev</Text>}
            <Text style={[styles.itemAmount, { color }]}>{fmt(item.amount)}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

const MONTH_OPTIONS = [
  { label: '3M', value: 3 },
  { label: '6M', value: 6 },
  { label: '12M', value: 12 },
]

export default function ProjectionScreen() {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [months,   setMonths]   = useState(6)

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then(r => r.data),
  })

  const isPro = me?.plan === 'PRO'

  const { data, isLoading } = useQuery({
    queryKey: ['projection', months],
    queryFn:  () => projectionApi.get(months).then(r => r.data),
    enabled:  isPro,
  })

  const periodSummary = data ? {
    totalIncome:  data.reduce((s, m) => s + m.totalIncome,  0),
    totalExpense: data.reduce((s, m) => s + m.totalExpense, 0),
    finalBalance: data[data.length - 1]?.cumulativeBalance ?? 0,
  } : null

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Projeção Financeira</Text>
        <View style={{ width: 22 }} />
      </View>

      {me && !isPro ? (
        <ProGate
          feature="Projeção Financeira"
          description="Veja para onde seu dinheiro vai nos próximos meses com base nas suas rendas, contas e recorrências."
        />
      ) : isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* Month selector */}
          <View style={styles.monthSelector}>
            {MONTH_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.monthOpt, months === opt.value && styles.monthOptActive]}
                onPress={() => setMonths(opt.value)}
              >
                <Text style={[styles.monthOptText, months === opt.value && styles.monthOptTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.subtitle}>Próximos {months} meses</Text>

          {/* Cumulative balance bar */}
          {data && data.length > 0 && (
            <CumulativeChart months={data} />
          )}

          {data?.map(month => (
            <MonthCard
              key={month.month}
              month={month}
              expanded={expanded === month.month}
              onToggle={() => setExpanded(expanded === month.month ? null : month.month)}
            />
          ))}

          {/* Period summary */}
          {periodSummary && (
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>RESUMO DO PERÍODO</Text>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderColor: COLORS.success + '40' }]}>
                  <Text style={styles.summaryCardLabel}>Total Entradas</Text>
                  <Text style={[styles.summaryCardValue, { color: COLORS.success }]}>
                    +{fmt(periodSummary.totalIncome)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { borderColor: COLORS.danger + '40' }]}>
                  <Text style={styles.summaryCardLabel}>Total Saídas</Text>
                  <Text style={[styles.summaryCardValue, { color: COLORS.danger }]}>
                    -{fmt(periodSummary.totalExpense)}
                  </Text>
                </View>
              </View>
              <View style={[styles.summaryCardFull, {
                borderColor: (periodSummary.finalBalance >= 0 ? COLORS.success : COLORS.danger) + '40',
              }]}>
                <Text style={styles.summaryCardLabel}>Saldo Acumulado Final</Text>
                <Text style={[styles.summaryCardValue, {
                  color: periodSummary.finalBalance >= 0 ? COLORS.success : COLORS.danger,
                  fontSize: 18,
                }]}>
                  {periodSummary.finalBalance >= 0 ? '+' : ''}{fmt(periodSummary.finalBalance)}
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  )
}

function CumulativeChart({ months }: { months: ProjectionMonth[] }) {
  const max = Math.max(...months.map(m => Math.abs(m.cumulativeBalance)), 1)

  return (
    <View style={styles.chart}>
      <Text style={styles.chartTitle}>Saldo acumulado</Text>
      <View style={styles.chartBars}>
        {months.map(m => {
          const pct     = Math.abs(m.cumulativeBalance) / max
          const positive = m.cumulativeBalance >= 0
          return (
            <View key={m.month} style={styles.chartBar}>
              <View style={styles.barContainer}>
                <View style={[
                  styles.bar,
                  {
                    height: Math.max(pct * 80, 4),
                    backgroundColor: positive ? COLORS.success : COLORS.danger,
                  },
                ]} />
              </View>
              <Text style={styles.barLabel}>{m.label.slice(0, 3)}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content:  { padding: 16 },

  monthSelector: {
    flexDirection: 'row', backgroundColor: COLORS.card,
    borderRadius: 12, padding: 4, gap: 4,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  monthOpt: {
    flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center',
  },
  monthOptActive:   { backgroundColor: COLORS.brand },
  monthOptText:     { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  monthOptTextActive: { color: '#fff' },

  subtitle: { fontSize: 13, color: COLORS.muted, marginBottom: 16 },

  summary: { marginTop: 8 },
  summaryTitle: {
    fontSize: 10, fontWeight: '700', color: COLORS.muted2,
    letterSpacing: 1, marginBottom: 10,
  },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14,
    padding: 14, borderWidth: 1,
  },
  summaryCardFull: {
    backgroundColor: COLORS.card, borderRadius: 14,
    padding: 14, borderWidth: 1, alignItems: 'center',
  },
  summaryCardLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 6 },
  summaryCardValue: { fontSize: 15, fontWeight: '800' },

  chart: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 16,
  },
  chartTitle: { fontSize: 13, fontWeight: '600', color: COLORS.muted, marginBottom: 12 },
  chartBars:  { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 96 },
  chartBar:   { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barContainer: { height: 80, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar:          { width: '80%', borderRadius: 4, minHeight: 4 },
  barLabel:     { fontSize: 10, color: COLORS.muted, marginTop: 4, textTransform: 'capitalize' },

  monthCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, overflow: 'hidden',
  },
  monthCardExpanded: { borderColor: COLORS.brand },
  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  monthLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthLabel:  { fontSize: 15, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  monthRight:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthBalance: { fontSize: 16, fontWeight: '700' },

  actualBadge: {
    backgroundColor: COLORS.brandDim, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  actualBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.brand },

  monthStats: {
    flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 14, gap: 0,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDot:  { width: 6, height: 6, borderRadius: 3, marginBottom: 4 },
  statLabel: { fontSize: 10, color: COLORS.muted, marginBottom: 2 },
  statVal:   { fontSize: 12, fontWeight: '700' },

  details: {
    borderTopWidth: 1, borderTopColor: COLORS.border, padding: 16, gap: 12,
  },
  itemGroup: {},
  itemGroupTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  itemLabel:  { flex: 1, fontSize: 13, color: COLORS.text },
  itemRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actualTag:  { fontSize: 10, color: COLORS.brand, backgroundColor: COLORS.brandDim, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  projTag:    { fontSize: 10, color: COLORS.muted, backgroundColor: COLORS.card2, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  itemAmount: { fontSize: 13, fontWeight: '700' },
})
