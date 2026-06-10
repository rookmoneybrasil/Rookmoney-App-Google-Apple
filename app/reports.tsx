import React, { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Share } from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import Svg, { Rect, Text as SvgText, Circle, Polyline, Line } from 'react-native-svg'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { reportsApi, meApi, type MonthlyReport, type CategoryTrend, type ReportsData } from '@/lib/api'
import { API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/lib/auth'
import { ProGate } from '@/components/pro-gate'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const PERIOD_OPTIONS = [
  { label: '3M',  value: 3 },
  { label: '6M',  value: 6 },
  { label: '12M', value: 12 },
]

// ── Bar chart (income vs expense) ──────────────────────────────────────────

function BarChart({ data }: { data: MonthlyReport[] }) {
  const BAR_H   = 110
  const BAR_W   = 16
  const GAP     = 5
  const GRP_GAP = 20
  const TOTAL_H = BAR_H + 28

  const maxVal = Math.max(...data.flatMap((m) => [m.totalIncome, m.totalExpense]), 1)
  const totalW = data.length * (BAR_W * 2 + GAP + GRP_GAP)

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={totalW} height={TOTAL_H}>
        {data.map((month, i) => {
          const x    = i * (BAR_W * 2 + GAP + GRP_GAP)
          const incH = (month.totalIncome  / maxVal) * BAR_H
          const expH = (month.totalExpense / maxVal) * BAR_H
          const label = format(new Date(month.monthKey + '-01'), 'MMM', { locale: ptBR })

          return (
            <React.Fragment key={month.monthKey}>
              <Rect x={x}            y={BAR_H - incH} width={BAR_W} height={Math.max(incH, 2)} rx={4} fill={COLORS.success} />
              <Rect x={x + BAR_W + GAP} y={BAR_H - expH} width={BAR_W} height={Math.max(expH, 2)} rx={4} fill={COLORS.danger} />
              <SvgText x={x + BAR_W + GAP / 2} y={TOTAL_H - 4} fontSize="9" fill={COLORS.muted} textAnchor="middle">
                {label}
              </SvgText>
            </React.Fragment>
          )
        })}
      </Svg>
    </ScrollView>
  )
}

// ── Balance line chart ─────────────────────────────────────────────────────

function BalanceLine({ data }: { data: MonthlyReport[] }) {
  const W = 320
  const H = 80
  const PAD_X = 12
  const PAD_Y = 12

  const balances  = data.map((m) => m.balance)
  const minB      = Math.min(...balances)
  const maxB      = Math.max(...balances, 1)
  const range     = maxB - minB || 1

  const points = data.map((m, i) => {
    const x = PAD_X + (i / Math.max(data.length - 1, 1)) * (W - PAD_X * 2)
    const y = PAD_Y + (1 - (m.balance - minB) / range) * (H - PAD_Y * 2)
    return `${x},${y}`
  }).join(' ')

  const zeroY = minB < 0
    ? PAD_Y + (1 - (0 - minB) / range) * (H - PAD_Y * 2)
    : null

  const lastBalance = data[data.length - 1]?.balance ?? 0

  return (
    <View>
      <Svg width={W} height={H}>
        {/* Zero line */}
        {zeroY !== null && (
          <Line x1={PAD_X} y1={zeroY} x2={W - PAD_X} y2={zeroY}
            stroke={COLORS.border} strokeWidth={1} strokeDasharray="4 3" />
        )}
        {/* Balance polyline */}
        <Polyline
          points={points}
          fill="none"
          stroke={lastBalance >= 0 ? COLORS.success : COLORS.danger}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots */}
        {data.map((m, i) => {
          const x = PAD_X + (i / Math.max(data.length - 1, 1)) * (W - PAD_X * 2)
          const y = PAD_Y + (1 - (m.balance - minB) / range) * (H - PAD_Y * 2)
          return (
            <Circle key={m.monthKey} cx={x} cy={y} r={3}
              fill={m.balance >= 0 ? COLORS.success : COLORS.danger} />
          )
        })}
      </Svg>
      <View style={styles.lineLabels}>
        <Text style={styles.lineLabelVal}>{fmt(Math.min(...balances))}</Text>
        <Text style={[styles.lineLabelCurrent, { color: lastBalance >= 0 ? COLORS.success : COLORS.danger }]}>
          {fmt(lastBalance)}
        </Text>
        <Text style={styles.lineLabelVal}>{fmt(Math.max(...balances))}</Text>
      </View>
    </View>
  )
}

// ── Donut chart ────────────────────────────────────────────────────────────

function DonutChart({ data }: { data: CategoryTrend[] }) {
  const SIZE  = 140
  const CX    = SIZE / 2
  const CY    = SIZE / 2
  const R     = 52
  const STR   = 18
  const CIRC  = 2 * Math.PI * R

  const top   = data.slice(0, 6)
  let usedPct = 0

  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle cx={CX} cy={CY} r={R} fill="none" stroke={COLORS.border} strokeWidth={STR} />
      {top.map((cat) => {
        const dash   = (cat.pct / 100) * CIRC
        const offset = CIRC / 4 - (usedPct / 100) * CIRC
        usedPct += cat.pct
        return (
          <Circle
            key={cat.categoryId}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={cat.color || COLORS.brand}
            strokeWidth={STR - 1}
            strokeDasharray={`${dash} ${CIRC - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="butt"
          />
        )
      })}
    </Svg>
  )
}

// ── Insights ───────────────────────────────────────────────────────────────

function Insights({ data }: { data: ReportsData }) {
  const { monthly, period, categoryTrend } = data
  if (monthly.length < 2) return null

  const latest = monthly[monthly.length - 1]
  const prev   = monthly[monthly.length - 2]

  const expDiff = latest.totalExpense - prev.totalExpense
  const topCat  = categoryTrend[0]

  return (
    <View style={styles.insightsGrid}>
      <View style={styles.insightCard}>
        <Text style={styles.insightEmoji}>💰</Text>
        <Text style={styles.insightValue}>{latest.savingsRate}%</Text>
        <Text style={styles.insightLabel}>Taxa de poupança</Text>
      </View>
      <View style={styles.insightCard}>
        <Text style={styles.insightEmoji}>{expDiff > 0 ? '📈' : '📉'}</Text>
        <Text style={[styles.insightValue, { color: expDiff > 0 ? COLORS.danger : COLORS.success }]}>
          {expDiff > 0 ? '+' : ''}{fmt(expDiff)}
        </Text>
        <Text style={styles.insightLabel}>vs mês anterior</Text>
      </View>
      {period.bestMonth && (
        <View style={styles.insightCard}>
          <Text style={styles.insightEmoji}>🏆</Text>
          <Text style={styles.insightValue} numberOfLines={1}>{period.bestMonth}</Text>
          <Text style={styles.insightLabel}>Melhor mês</Text>
        </View>
      )}
      {topCat && (
        <View style={styles.insightCard}>
          <Text style={styles.insightEmoji}>{topCat.icon}</Text>
          <Text style={styles.insightValue} numberOfLines={1}>{topCat.pct}%</Text>
          <Text style={styles.insightLabel} numberOfLines={1}>{topCat.name}</Text>
        </View>
      )}
    </View>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const router  = useRouter()
  const token   = useAuthStore((s) => s.token)
  const [period, setPeriod]   = useState(6)
  const [exporting, setExporting] = useState(false)

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then(r => r.data),
  })

  const isPro = me?.plan === 'PRO'

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reports', period],
    queryFn:  () => reportsApi.get(period).then((r) => r.data),
    enabled:  isPro,
  })

  const latest = data?.monthly[data.monthly.length - 1]

  async function handleExport() {
    if (!token) return
    setExporting(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/v1/export`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      await Share.share({
        message: JSON.stringify(json.data, null, 2),
        title:   'Rook Money — exportação de dados',
      })
    } catch {
      // share sheet dismissed or error — ignore
    } finally {
      setExporting(false)
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Relatórios</Text>
        <TouchableOpacity onPress={handleExport} style={styles.exportBtn} disabled={exporting}>
          <Feather name={exporting ? 'loader' : 'download'} size={18} color={COLORS.brand} />
        </TouchableOpacity>
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

      {me && !isPro ? (
        <ProGate
          feature="Relatórios"
          description="Visualize gráficos detalhados de receitas, despesas e categorias por período."
        />
      ) : isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
        >
          {/* Latest month stats */}
          {latest && (
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
          )}

          {/* Insights */}
          {data && data.monthly.length >= 2 && <Insights data={data} />}

          {/* Balance trend */}
          {data && data.monthly.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tendência de saldo</Text>
              <View style={styles.chartCard}>
                <BalanceLine data={data.monthly} />
              </View>
            </View>
          )}

          {/* Income vs Expense bar chart */}
          {data && data.monthly.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Receitas × Despesas</Text>
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
              <View style={styles.chartCard}>
                <BarChart data={data.monthly} />
              </View>
            </View>
          )}

          {/* Category donut + list */}
          {data && data.categoryTrend.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Despesas por categoria</Text>
              <View style={styles.catSection}>
                <DonutChart data={data.categoryTrend} />
                <View style={styles.catList}>
                  {data.categoryTrend.slice(0, 6).map((cat) => (
                    <View key={cat.categoryId} style={styles.catItem}>
                      <View style={[styles.catDot, { backgroundColor: cat.color || COLORS.brand }]} />
                      <Text style={styles.catEmoji}>{cat.icon}</Text>
                      <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                      <Text style={styles.catPct}>{cat.pct}%</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Category bars */}
              {data.categoryTrend.map((cat) => (
                <View key={cat.categoryId} style={styles.catBar}>
                  <View style={styles.catBarHeader}>
                    <View style={styles.catBarLeft}>
                      <Text style={styles.catBarEmoji}>{cat.icon}</Text>
                      <Text style={styles.catBarName}>{cat.name}</Text>
                    </View>
                    <Text style={styles.catBarAmount}>{fmt(cat.total)}</Text>
                  </View>
                  <View style={styles.catBarTrack}>
                    <View style={[styles.catBarFill, { width: `${cat.pct}%`, backgroundColor: cat.color || COLORS.brand }]} />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Monthly history */}
          {data && data.monthly.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Histórico mensal</Text>
              <View style={styles.historyCard}>
                <View style={[styles.historyRow, styles.historyHeader]}>
                  <Text style={[styles.historyMonth, { color: COLORS.muted2 }]}>Mês</Text>
                  <Text style={[styles.historyVal, { color: COLORS.muted2 }]}>Receita</Text>
                  <Text style={[styles.historyVal, { color: COLORS.muted2 }]}>Despesa</Text>
                  <Text style={[styles.historyVal, { color: COLORS.muted2 }]}>Saldo</Text>
                </View>
                {[...data.monthly].reverse().map((m, i) => (
                  <View key={m.monthKey} style={[styles.historyRow, i % 2 === 0 && styles.historyRowAlt]}>
                    <Text style={styles.historyMonth}>
                      {format(new Date(m.monthKey + '-01'), "MMM 'yy", { locale: ptBR })}
                    </Text>
                    <Text style={[styles.historyVal, { color: COLORS.success }]}>{fmt(m.totalIncome)}</Text>
                    <Text style={[styles.historyVal, { color: COLORS.danger }]}>{fmt(m.totalExpense)}</Text>
                    <Text style={[styles.historyVal, { color: m.balance >= 0 ? COLORS.success : COLORS.danger }]}>
                      {fmt(m.balance)}
                    </Text>
                  </View>
                ))}
              </View>
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
  backBtn:   { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  exportBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:     { fontSize: 20, fontWeight: '700', color: COLORS.text },

  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  periodBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  periodBtnActive:  { backgroundColor: COLORS.brandDim, borderColor: COLORS.brand },
  periodText:       { fontSize: 13, color: COLORS.muted },
  periodTextActive: { color: COLORS.brand, fontWeight: '700' },

  content: { paddingHorizontal: 20, paddingBottom: 40 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  statLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: '700' },

  // Insights
  insightsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  insightCard: {
    flex: 1, minWidth: '44%', backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 4,
  },
  insightEmoji: { fontSize: 22 },
  insightValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  insightLabel: { fontSize: 11, color: COLORS.muted, textAlign: 'center' },

  section:      { marginBottom: 28 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 12 },

  chartCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },

  // Balance line labels
  lineLabels:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  lineLabelVal:     { fontSize: 10, color: COLORS.muted },
  lineLabelCurrent: { fontSize: 12, fontWeight: '700' },

  legend: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: COLORS.muted },

  // Category donut section
  catSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  catList:    { flex: 1, gap: 6 },
  catItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catDot:     { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  catEmoji:   { fontSize: 14 },
  catName:    { flex: 1, fontSize: 12, color: COLORS.text },
  catPct:     { fontSize: 12, color: COLORS.muted, fontWeight: '600', minWidth: 30, textAlign: 'right' },

  // Category bars
  catBar:       { marginBottom: 12 },
  catBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  catBarLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBarEmoji:  { fontSize: 15 },
  catBarName:   { fontSize: 13, fontWeight: '500', color: COLORS.text },
  catBarAmount: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  catBarTrack:  { height: 5, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' },
  catBarFill:   { height: 5, borderRadius: 3 },

  // History table
  historyCard: {
    backgroundColor: COLORS.card, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  historyRowAlt:   { backgroundColor: COLORS.card2 },
  historyHeader:   { borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 8 },
  historyMonth:    { fontSize: 12, color: COLORS.muted, width: 48, textTransform: 'capitalize' },
  historyVal:      { fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' },
})
