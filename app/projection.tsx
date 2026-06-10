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

export default function ProjectionScreen() {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then(r => r.data),
  })

  const isPro = me?.plan === 'PRO'

  const { data, isLoading } = useQuery({
    queryKey: ['projection'],
    queryFn:  () => projectionApi.get(6).then(r => r.data),
    enabled:  isPro,
  })

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
          <Text style={styles.subtitle}>Próximos 6 meses</Text>

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
  content:     { padding: 16 },
  subtitle:    { fontSize: 13, color: COLORS.muted, marginBottom: 16 },

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
