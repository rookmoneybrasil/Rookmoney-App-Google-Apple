import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { reportsApi, type MonthReport } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const PERIOD_OPTIONS = [
  { label: '3M',  value: 3 },
  { label: '6M',  value: 6 },
  { label: '12M', value: 12 },
]

function BarChart({ data }: { data: MonthReport[] }) {
  const BAR_HEIGHT = 120
  const BAR_WIDTH  = 18
  const GAP        = 6
  const GROUP_GAP  = 24
  const CHART_HEIGHT = BAR_HEIGHT + 32 // bars + labels

  const maxVal = Math.max(...data.flatMap((m) => [m.totalIncome, m.totalExpense]), 1)

  const totalWidth = data.length * (BAR_WIDTH * 2 + GAP + GROUP_GAP)

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={totalWidth} height={CHART_HEIGHT}>
        {data.map((month, i) => {
          const x       = i * (BAR_WIDTH * 2 + GAP + GROUP_GAP)
          const incH    = (month.totalIncome  / maxVal) * BAR_HEIGHT
          const expH    = (month.totalExpense / maxVal) * BAR_HEIGHT
          const incY    = BAR_HEIGHT - incH
          const expY    = BAR_HEIGHT - expH
          const label   = format(new Date(month.month + '-01'), 'MMM', { locale: ptBR })

          return (
            <React.Fragment key={month.month}>
              {/* Income bar */}
              <Rect
                x={x}
                y={incY}
                width={BAR_WIDTH}
                height={incH}
                rx={4}
                fill={COLORS.success}
              />
              {/* Expense bar */}
              <Rect
                x={x + BAR_WIDTH + GAP}
                y={expY}
                width={BAR_WIDTH}
                height={expH}
                rx={4}
                fill={COLORS.danger}
              />
              {/* Month label */}
              <SvgText
                x={x + BAR_WIDTH + GAP / 2}
                y={CHART_HEIGHT - 4}
                fontSize="10"
                fill={COLORS.muted}
                textAnchor="middle"
              >
                {label}
              </SvgText>
            </React.Fragment>
          )
        })}
      </Svg>
    </ScrollView>
  )
}

export default function ReportsScreen() {
  const router  = useRouter()
  const [period, setPeriod] = useState(6)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reports', period],
    queryFn:  () => reportsApi.get(period).then((r) => r.data),
  })

  const latest = data?.[data.length - 1]

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Relatórios</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIOD_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.periodBtn, period === opt.value && styles.periodBtnActive]}
            onPress={() => setPeriod(opt.value)}
          >
            <Text style={[styles.periodText, period === opt.value && styles.periodTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
        >
          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendText}>Receita</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.legendText}>Despesa</Text>
            </View>
          </View>

          {/* Bar chart */}
          {data && data.length > 0 && (
            <View style={styles.chartCard}>
              <BarChart data={data} />
            </View>
          )}

          {/* Latest month summary */}
          {latest && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Mês atual ({format(new Date(latest.month + '-01'), "MMMM", { locale: ptBR })})
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Receita</Text>
                  <Text style={[styles.statValue, { color: COLORS.success }]}>{fmt(latest.totalIncome)}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Despesa</Text>
                  <Text style={[styles.statValue, { color: COLORS.danger }]}>{fmt(latest.totalExpense)}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Saldo</Text>
                  <Text style={[styles.statValue, { color: latest.balance >= 0 ? COLORS.success : COLORS.danger }]}>
                    {fmt(latest.balance)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Category breakdown */}
          {latest && latest.categoryBreakdown.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Despesas por categoria</Text>
              {latest.categoryBreakdown.map((cat) => (
                <View key={cat.name} style={styles.catRow}>
                  <View style={styles.catLeft}>
                    <Text style={styles.catEmoji}>{cat.icon}</Text>
                    <Text style={styles.catName}>{cat.name}</Text>
                  </View>
                  <View style={styles.catRight}>
                    <Text style={styles.catAmount}>{fmt(cat.total)}</Text>
                    <Text style={styles.catPct}>{cat.pct}%</Text>
                  </View>
                  <View style={styles.catBarBg}>
                    <View
                      style={[
                        styles.catBarFill,
                        { width: `${cat.pct}%`, backgroundColor: cat.color || COLORS.brand },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Monthly history */}
          {data && data.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Histórico mensal</Text>
              {[...data].reverse().map((m) => (
                <View key={m.month} style={styles.historyRow}>
                  <Text style={styles.historyMonth}>
                    {format(new Date(m.month + '-01'), "MMM 'yy", { locale: ptBR })}
                  </Text>
                  <Text style={[styles.historyVal, { color: COLORS.success }]}>{fmt(m.totalIncome)}</Text>
                  <Text style={[styles.historyVal, { color: COLORS.danger }]}>{fmt(m.totalExpense)}</Text>
                  <Text style={[styles.historyVal, { color: m.balance >= 0 ? COLORS.success : COLORS.danger }]}>
                    {fmt(m.balance)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:   { fontSize: 20, fontWeight: '700', color: COLORS.text },

  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  periodBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  periodBtnActive: { backgroundColor: COLORS.brandDim, borderColor: COLORS.brand },
  periodText:       { fontSize: 13, color: COLORS.muted },
  periodTextActive: { color: COLORS.brand, fontWeight: '700' },

  content: { paddingHorizontal: 20, paddingBottom: 40 },

  legend: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: COLORS.muted },

  chartCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 24,
  },

  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 12 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  statLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700' },

  catRow: { marginBottom: 12 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  catEmoji: { fontSize: 16 },
  catName:  { fontSize: 13, fontWeight: '500', color: COLORS.text, flex: 1 },
  catRight: { position: 'absolute', right: 0, top: 0, flexDirection: 'row', gap: 8, alignItems: 'center' },
  catAmount: { fontSize: 12, color: COLORS.text },
  catPct:    { fontSize: 12, color: COLORS.muted, minWidth: 34, textAlign: 'right' },
  catBarBg:  { height: 5, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' },
  catBarFill: { height: 5, borderRadius: 3 },

  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  historyMonth: { fontSize: 12, color: COLORS.muted, width: 48, textTransform: 'capitalize' },
  historyVal:   { fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' },
})
