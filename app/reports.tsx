import React, { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Share, Alert } from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import Svg, { Rect, Text as SvgText, Circle, Polyline, Line } from 'react-native-svg'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import {
  reportsApi, meApi,
  type MonthlyReport, type PeriodReport, type CategoryTrend,
  type TopExpense, type SpendingDay, type IncomeSourceReport,
} from '@/lib/api'
import { ProGate } from '@/components/pro-gate'
import { FadeIn } from '@/components/animated-entry'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const PERIOD_OPTIONS = [
  { label: '3M',  value: 3 },
  { label: '6M',  value: 6 },
  { label: '12M', value: 12 },
]

function savingsRateInfo(rate: number) {
  if (rate >= 20) return { color: COLORS.success, message: 'Excelente 🎉' }
  if (rate >= 10) return { color: COLORS.warning, message: 'Bom 👍' }
  if (rate >= 0)  return { color: COLORS.warning, message: 'Atenção ⚠️' }
  return { color: COLORS.danger, message: 'Gastos acima da renda 🚨' }
}

function buildPDF(monthly: MonthlyReport[], period: PeriodReport, label: string): string {
  const rows = monthly.map((m) => `
    <tr>
      <td>${capitalize(m.monthFull)}</td>
      <td style="color:#22c55e">R$ ${m.totalIncome.toFixed(2).replace('.', ',')}</td>
      <td style="color:#ef4444">R$ ${m.totalExpense.toFixed(2).replace('.', ',')}</td>
      <td style="color:${m.balance >= 0 ? '#22c55e' : '#ef4444'}">${m.balance >= 0 ? '+' : ''}R$ ${m.balance.toFixed(2).replace('.', ',')}</td>
      <td style="color:${m.savingsRate >= 10 ? '#22c55e' : '#f59e0b'}">${m.savingsRate}%</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; margin: 32px; color: #1e293b; }
  h1 { font-size: 22px; color: #3b82f6; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #64748b; font-weight: normal; margin-bottom: 24px; }
  .kpis { display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
  .kpi { background: #f1f5f9; border-radius: 10px; padding: 14px 18px; min-width: 140px; }
  .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi-value { font-size: 18px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
  td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:hover td { background: #f8fafc; }
  .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; }
</style>
</head><body>
<h1>Rook Money — Relatório Financeiro</h1>
<h2>${label}</h2>
<div class="kpis">
  <div class="kpi">
    <div class="kpi-label">Receitas</div>
    <div class="kpi-value" style="color:#22c55e">R$ ${period.totalIncome.toFixed(2).replace('.', ',')}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Despesas</div>
    <div class="kpi-value" style="color:#ef4444">R$ ${period.totalExpense.toFixed(2).replace('.', ',')}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Saldo</div>
    <div class="kpi-value" style="color:${period.netBalance >= 0 ? '#22c55e' : '#ef4444'}">R$ ${period.netBalance.toFixed(2).replace('.', ',')}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Taxa de poupança</div>
    <div class="kpi-value" style="color:${period.savingsRate >= 10 ? '#22c55e' : '#f59e0b'}">${period.savingsRate}%</div>
  </div>
</div>
<table>
  <thead><tr>
    <th>Mês</th><th>Receitas</th><th>Despesas</th><th>Saldo</th><th>Poupança</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">Gerado pelo Rook Money em ${new Date().toLocaleDateString('pt-BR')}</div>
</body></html>`
}

function buildCSV(monthly: MonthlyReport[], period: PeriodReport) {
  const header = ['Mês', 'Receitas (R$)', 'Despesas (R$)', 'Saldo (R$)', '% Poupança']
  const rows = monthly.map((m) => [
    capitalize(m.monthFull),
    m.totalIncome.toFixed(2).replace('.', ','),
    m.totalExpense.toFixed(2).replace('.', ','),
    m.balance.toFixed(2).replace('.', ','),
    `${m.savingsRate}%`,
  ])
  rows.push([
    'TOTAL',
    period.totalIncome.toFixed(2).replace('.', ','),
    period.totalExpense.toFixed(2).replace('.', ','),
    period.netBalance.toFixed(2).replace('.', ','),
    `${period.savingsRate}%`,
  ])
  return [header, ...rows].map((r) => r.join(';')).join('\n')
}

// ── Reusable bits ───────────────────────────────────────────────────────────

function KpiCard({ icon, iconLib, label, value, sub, color }: {
  icon: string
  iconLib?: 'material'
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeader}>
        {iconLib === 'material'
          ? <MaterialCommunityIcons name={icon as any} size={14} color={color} />
          : <Feather name={icon as any} size={14} color={color} />}
        <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      {sub && <Text style={styles.kpiSub} numberOfLines={1}>{sub}</Text>}
    </View>
  )
}

function ReportCard({ icon, iconColor = COLORS.text, title, sub, caption, children }: {
  icon: string
  iconColor?: string
  title: string
  sub?: React.ReactNode
  caption?: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Feather name={icon as any} size={15} color={iconColor} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {sub && <Text style={styles.sectionSub}>{sub}</Text>}
      </View>
      <View style={styles.card}>
        {children}
      </View>
      {caption && <Text style={styles.caption}>{caption}</Text>}
    </View>
  )
}

function LegendItem({ color, label, variant = 'dot' }: { color: string; label: string; variant?: 'dot' | 'line' | 'dashed' }) {
  return (
    <View style={styles.legendItem}>
      {variant === 'dot' ? (
        <View style={[styles.legendDot, { backgroundColor: color }]} />
      ) : variant === 'line' ? (
        <View style={[styles.legendLine, { backgroundColor: color }]} />
      ) : (
        <View style={[styles.legendLine, { backgroundColor: 'transparent', borderTopWidth: 2, borderColor: color, borderStyle: 'dashed' }]} />
      )}
      <Text style={styles.legendText}>{label}</Text>
    </View>
  )
}

function ChangeBadge({ change }: { change: number }) {
  if (change > 0) {
    return (
      <View style={[styles.changeBadge, { backgroundColor: COLORS.danger + '18' }]}>
        <Feather name="trending-up" size={10} color={COLORS.danger} />
        <Text style={[styles.changeBadgeText, { color: COLORS.danger }]}>+{change}%</Text>
      </View>
    )
  }
  if (change < 0) {
    return (
      <View style={[styles.changeBadge, { backgroundColor: COLORS.success + '18' }]}>
        <Feather name="trending-down" size={10} color={COLORS.success} />
        <Text style={[styles.changeBadgeText, { color: COLORS.success }]}>{change}%</Text>
      </View>
    )
  }
  return (
    <View style={[styles.changeBadge, { backgroundColor: COLORS.muted2 + '60' }]}>
      <Feather name="minus" size={10} color={COLORS.muted} />
      <Text style={[styles.changeBadgeText, { color: COLORS.muted }]}>0%</Text>
    </View>
  )
}

// ── Evolução mensal (bars + lines) ──────────────────────────────────────────

function MonthlyChart({ data }: { data: MonthlyReport[] }) {
  const BAR_H   = 120
  const BAR_W   = 14
  const GAP     = 4
  const GRP_GAP = 26
  const PAD_TOP = 8
  const LABEL_H = 22
  const TOTAL_H = BAR_H + PAD_TOP + LABEL_H

  const groupW = BAR_W * 2 + GAP + GRP_GAP
  const totalW = Math.max(data.length * groupW, 260)

  const allBRL = data.flatMap((m) => [m.totalIncome, m.totalExpense, m.balance])
  const minBRL = Math.min(0, ...allBRL)
  const maxBRL = Math.max(1, ...allBRL)
  const rangeBRL = maxBRL - minBRL || 1
  const yBRL = (v: number) => PAD_TOP + (1 - (v - minBRL) / rangeBRL) * BAR_H
  const zeroY = yBRL(0)

  const pcts    = data.map((m) => m.savingsRate)
  const minPct  = Math.min(0, ...pcts)
  const maxPct  = Math.max(0, ...pcts)
  const rangePct = (maxPct - minPct) || 1
  const yPct = (v: number) => PAD_TOP + (1 - (v - minPct) / rangePct) * BAR_H

  const centerX = (i: number) => i * groupW + GRP_GAP / 2 + BAR_W + GAP / 2

  const balancePoints  = data.map((m, i) => `${centerX(i)},${yBRL(m.balance)}`).join(' ')
  const savingsPoints  = data.map((m, i) => `${centerX(i)},${yPct(m.savingsRate)}`).join(' ')

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={totalW} height={TOTAL_H}>
        {minBRL < 0 && (
          <Line x1={0} y1={zeroY} x2={totalW} y2={zeroY} stroke={COLORS.border} strokeWidth={1} strokeDasharray="4 3" />
        )}
        {data.map((m, i) => {
          const x = i * groupW + GRP_GAP / 2
          const incH = Math.max(zeroY - yBRL(m.totalIncome), m.totalIncome > 0 ? 2 : 0)
          const expH = Math.max(zeroY - yBRL(m.totalExpense), m.totalExpense > 0 ? 2 : 0)
          const label = format(new Date(m.monthKey + '-01'), 'MMM', { locale: ptBR })
          return (
            <React.Fragment key={m.monthKey}>
              <Rect x={x}              y={zeroY - incH} width={BAR_W} height={incH} rx={3} fill={COLORS.success} />
              <Rect x={x + BAR_W + GAP} y={zeroY - expH} width={BAR_W} height={expH} rx={3} fill={COLORS.danger} />
              <SvgText x={x + BAR_W + GAP / 2} y={TOTAL_H - 4} fontSize="9" fill={COLORS.muted} textAnchor="middle">
                {label}
              </SvgText>
            </React.Fragment>
          )
        })}
        <Polyline points={savingsPoints} fill="none" stroke={COLORS.warning} strokeWidth={1.5} strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points={balancePoints} fill="none" stroke={COLORS.brand} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((m, i) => (
          <Circle key={m.monthKey} cx={centerX(i)} cy={yBRL(m.balance)} r={2.5} fill={COLORS.brand} />
        ))}
      </Svg>
    </ScrollView>
  )
}

// ── Gastos por categoria ─────────────────────────────────────────────────────

function CategoryBreakdown({ categories, totalExpense }: { categories: CategoryTrend[]; totalExpense: number }) {
  const [expanded, setExpanded] = useState(false)

  if (categories.length === 0) {
    return <Text style={styles.emptyCardText}>Sem despesas no período.</Text>
  }

  const maxTotal = categories[0]?.total ?? 1
  const visible  = expanded ? categories : categories.slice(0, 6)

  return (
    <View>
      {visible.map((cat) => {
        const barW = maxTotal > 0 ? (cat.total / maxTotal) * 100 : 0
        return (
          <View key={cat.categoryId} style={styles.catRow}>
            <View style={[styles.catRowIcon, { backgroundColor: (cat.color || COLORS.brand) + '22' }]}>
              <Text style={styles.catRowEmoji}>{cat.icon}</Text>
            </View>
            <View style={styles.catRowInfo}>
              <View style={styles.catRowTop}>
                <Text style={styles.catRowName} numberOfLines={1}>{cat.name}</Text>
                <Text style={styles.catRowPct}>{cat.pct}%</Text>
              </View>
              <View style={styles.catRowTrack}>
                <View style={[styles.catRowFill, { width: `${barW}%`, backgroundColor: cat.color || COLORS.brand }]} />
              </View>
            </View>
            <View style={styles.catRowRight}>
              <Text style={styles.catRowAmount}>{fmt(cat.total)}</Text>
              <ChangeBadge change={cat.change} />
            </View>
          </View>
        )
      })}

      {categories.length > 6 && (
        <TouchableOpacity onPress={() => setExpanded((e) => !e)} style={styles.toggleBtn}>
          <Text style={styles.toggleBtnText}>
            {expanded ? 'Ver menos' : `Ver mais ${categories.length - 6} categorias`}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterLabel}>Total de despesas</Text>
        <Text style={styles.cardFooterValue}>{fmt(totalExpense)}</Text>
      </View>
    </View>
  )
}

// ── Maiores despesas ─────────────────────────────────────────────────────────

function TopExpensesList({ expenses, periodExpense }: { expenses: TopExpense[]; periodExpense: number }) {
  if (expenses.length === 0) {
    return <Text style={styles.emptyCardText}>Sem despesas no período.</Text>
  }

  const maxAmt = expenses[0]?.amount ?? 1

  return (
    <View>
      {expenses.map((exp, i) => {
        const barW = maxAmt > 0 ? (exp.amount / maxAmt) * 100 : 0
        const pct  = periodExpense > 0 ? Math.round((exp.amount / periodExpense) * 100) : 0
        return (
          <View key={exp.id} style={styles.expRow}>
            <Text style={styles.expRank}>{i + 1}</Text>
            <View style={[styles.expIcon, { backgroundColor: (exp.category.color || COLORS.brand) + '22' }]}>
              <Text style={styles.expEmoji}>{exp.category.icon}</Text>
            </View>
            <View style={styles.expInfo}>
              <Text style={styles.expDesc} numberOfLines={1}>{exp.description || exp.category.name}</Text>
              <View style={styles.expBarTrack}>
                <View style={[styles.expBarFill, { width: `${barW}%` }]} />
              </View>
              <Text style={styles.expDate}>{format(new Date(exp.date), "dd 'de' MMM yyyy", { locale: ptBR })}</Text>
            </View>
            <View style={styles.expRight}>
              <Text style={styles.expAmount}>{fmt(exp.amount)}</Text>
              <Text style={styles.expPct}>{pct}% do total</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ── Padrão de gasto por dia ──────────────────────────────────────────────────

function SpendingPatternChart({ data }: { data: SpendingDay[] }) {
  const hasData = data.some((d) => d.total > 0)
  if (!hasData) {
    return <Text style={styles.emptyCardText}>Sem dados de despesas.</Text>
  }

  const BAR_H = 90
  const BAR_W = 6
  const GAP   = 2
  const LABEL_H = 16
  const maxTotal = Math.max(...data.map((d) => d.total), 1)
  const totalW   = data.length * (BAR_W + GAP)

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={totalW} height={BAR_H + LABEL_H}>
        {data.map((d, i) => {
          const h = Math.max((d.total / maxTotal) * BAR_H, d.total > 0 ? 2 : 1)
          const x = i * (BAR_W + GAP)
          const color = d.total >= maxTotal * 0.7 ? COLORS.danger
                      : d.total >= maxTotal * 0.4 ? COLORS.warning
                      : COLORS.brand
          const opacity = d.total > 0 ? 0.8 : 0.15
          return (
            <React.Fragment key={d.day}>
              <Rect x={x} y={BAR_H - h} width={BAR_W} height={h} rx={2} fill={color} fillOpacity={opacity} />
              {d.day % 5 === 0 && (
                <SvgText x={x + BAR_W / 2} y={BAR_H + 12} fontSize="8" fill={COLORS.muted} textAnchor="middle">
                  {d.day}
                </SvgText>
              )}
            </React.Fragment>
          )
        })}
      </Svg>
    </ScrollView>
  )
}

// ── Fontes de receita ─────────────────────────────────────────────────────────

function IncomeSourcesList({ sources, totalIncome }: { sources: IncomeSourceReport[]; totalIncome: number }) {
  if (sources.length === 0) {
    return <Text style={styles.emptyCardText}>Sem receitas no período.</Text>
  }

  const maxTotal = sources[0]?.total ?? 1

  return (
    <View>
      {sources.map((src, i) => {
        const barW = maxTotal > 0 ? (src.total / maxTotal) * 100 : 0
        const pct  = totalIncome > 0 ? Math.round((src.total / totalIncome) * 100) : 0
        return (
          <View key={`${src.name}-${i}`} style={styles.incRow}>
            <View style={styles.incInfo}>
              <View style={styles.incTop}>
                <Text style={styles.incName} numberOfLines={1}>{src.name}</Text>
                <Text style={styles.incPct}>{pct}%</Text>
              </View>
              <View style={styles.incTrack}>
                <View style={[styles.incFill, { width: `${barW}%` }]} />
              </View>
            </View>
            <Text style={styles.incAmount}>+{fmt(src.total)}</Text>
          </View>
        )
      })}

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterLabel}>Total de receitas</Text>
        <Text style={[styles.cardFooterValue, { color: COLORS.success }]}>+{fmt(totalIncome)}</Text>
      </View>
    </View>
  )
}

// ── Resumo por mês ────────────────────────────────────────────────────────────

function MonthlySummaryTable({ monthly, period }: { monthly: MonthlyReport[]; period: PeriodReport }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={[styles.summaryRow, styles.summaryHeaderRow]}>
          <Text style={[styles.summaryCellMonth, styles.summaryHeaderText]}>Mês</Text>
          <Text style={[styles.summaryCell, styles.summaryHeaderText]}>Receitas</Text>
          <Text style={[styles.summaryCell, styles.summaryHeaderText]}>Despesas</Text>
          <Text style={[styles.summaryCell, styles.summaryHeaderText]}>Saldo</Text>
          <Text style={[styles.summaryCellPct, styles.summaryHeaderText]}>% Poup.</Text>
        </View>
        {[...monthly].reverse().map((m, i) => (
          <View key={m.monthKey} style={[styles.summaryRow, i % 2 === 0 && styles.summaryRowAlt]}>
            <Text style={styles.summaryCellMonth} numberOfLines={1}>{capitalize(m.monthFull)}</Text>
            <Text style={[styles.summaryCell, { color: COLORS.success }]}>+{fmt(m.totalIncome)}</Text>
            <Text style={[styles.summaryCell, { color: COLORS.danger }]}>-{fmt(m.totalExpense)}</Text>
            <Text style={[styles.summaryCell, { color: m.balance >= 0 ? COLORS.success : COLORS.danger }]}>
              {m.balance >= 0 ? '+' : ''}{fmt(m.balance)}
            </Text>
            <Text style={[styles.summaryCellPct, { color: savingsRateInfo(m.savingsRate).color }]}>
              {m.savingsRate}%
            </Text>
          </View>
        ))}
        <View style={[styles.summaryRow, styles.summaryFooterRow]}>
          <Text style={[styles.summaryCellMonth, styles.summaryFooterText]}>TOTAL</Text>
          <Text style={[styles.summaryCell, styles.summaryFooterText, { color: COLORS.success }]}>+{fmt(period.totalIncome)}</Text>
          <Text style={[styles.summaryCell, styles.summaryFooterText, { color: COLORS.danger }]}>-{fmt(period.totalExpense)}</Text>
          <Text style={[styles.summaryCell, styles.summaryFooterText, { color: period.netBalance >= 0 ? COLORS.success : COLORS.danger }]}>
            {period.netBalance >= 0 ? '+' : ''}{fmt(period.netBalance)}
          </Text>
          <Text style={[styles.summaryCellPct, styles.summaryFooterText, { color: savingsRateInfo(period.savingsRate).color }]}>
            {period.savingsRate}%
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const router = useRouter()
  const [period, setPeriod] = useState(6)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then((r) => r.data),
  })

  const isPro = me?.plan === 'PRO' || me?.plan === 'PRO_PLUS'

  const monthStr   = format(currentMonth, 'yyyy-MM')
  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reports', period, monthStr],
    queryFn:  () => reportsApi.get(period, monthStr).then((r) => r.data),
    enabled:  isPro,
  })

  const hasData = !!data && data.monthly.length > 0
  const [exportingPDF, setExportingPDF] = useState(false)

  async function handleExportCSV() {
    if (!data) return
    const csv = buildCSV(data.monthly, data.period)
    try {
      await Share.share({ message: csv, title: `rook-relatorio-${monthStr}.csv` })
    } catch {
      // share sheet dismissed — ignore
    }
  }

  async function handleExportPDF() {
    if (!data) return
    setExportingPDF(true)
    try {
      const label = hasData
        ? `${capitalize(data.monthly[0].monthFull)} – ${capitalize(data.monthly[data.monthly.length - 1].monthFull)}`
        : monthLabel
      const html  = buildPDF(data.monthly, data.period, label)
      const { uri } = await Print.printToFileAsync({ html, base64: false })
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar relatório PDF' })
      } else {
        Alert.alert('PDF gerado', `Salvo em: ${uri}`)
      }
    } catch (e: unknown) {
      Alert.alert('Erro', (e as Error).message ?? 'Não foi possível gerar o PDF.')
    } finally {
      setExportingPDF(false)
    }
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Relatórios</Text>
          {hasData && (
            <Text style={styles.subtitle}>
              {capitalize(data!.monthly[0].monthFull)} – {capitalize(data!.monthly[data!.monthly.length - 1].monthFull)}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.description}>
        Visualize a evolução das suas finanças ao longo dos meses — receitas, despesas, saldo e gastos por categoria.
      </Text>

      {/* Month picker */}
      <View style={styles.controlsRow}>
        <View style={styles.monthPicker}>
          <TouchableOpacity onPress={() => setCurrentMonth((m) => subMonths(m, 1))} hitSlop={8}>
            <Feather name="chevron-left" size={18} color={COLORS.muted} />
          </TouchableOpacity>
          <View style={styles.monthPickerLabel}>
            <Feather name="calendar" size={13} color={COLORS.muted} />
            <Text style={styles.monthPickerText}>{monthLabel}</Text>
          </View>
          <TouchableOpacity onPress={() => setCurrentMonth((m) => addMonths(m, 1))} hitSlop={8}>
            <Feather name="chevron-right" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Period selector + export */}
      <View style={styles.filtersRow}>
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
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV} disabled={!hasData}>
          <Feather name="download" size={13} color={COLORS.brand} />
          <Text style={styles.exportBtnText}>CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, exportingPDF && { opacity: 0.6 }]}
          onPress={handleExportPDF}
          disabled={!hasData || exportingPDF}
        >
          <Feather name="file-text" size={13} color={COLORS.brand} />
          <Text style={styles.exportBtnText}>{exportingPDF ? '...' : 'PDF'}</Text>
        </TouchableOpacity>
      </View>

      {me && !isPro ? (
        <ProGate
          feature="Relatórios"
          description="Visualize gráficos detalhados de receitas, despesas e categorias por período."
        />
      ) : isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : !hasData ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Feather name="bar-chart-2" size={26} color={COLORS.muted} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum dado para exibir</Text>
          <Text style={styles.emptyText}>Adicione transações para visualizar a evolução das suas finanças.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
        >
          {/* KPIs */}
          <FadeIn delay={0}>
          <View style={styles.kpiGrid}>
            <KpiCard
              icon="trending-up" color={COLORS.success}
              label="Receitas no período" value={fmt(data!.period.totalIncome)}
              sub={`≈ ${fmt(data!.period.avgMonthlyIncome)}/mês`}
            />
            <KpiCard
              icon="trending-down" color={COLORS.danger}
              label="Despesas no período" value={fmt(data!.period.totalExpense)}
              sub={`≈ ${fmt(data!.period.avgMonthlyExpense)}/mês`}
            />
            <KpiCard
              icon="credit-card" color={COLORS.brand}
              label="Saldo do período" value={fmt(data!.period.balance)}
              sub={`${data!.period.positiveMonths}/${data!.period.totalMonths} meses positivos`}
            />
            <KpiCard
              icon="piggy-bank-outline" iconLib="material" color={savingsRateInfo(data!.period.savingsRate).color}
              label="Taxa de poupança"
              value={`${data!.period.savingsRate > 0 ? '+' : ''}${data!.period.savingsRate}%`}
              sub={savingsRateInfo(data!.period.savingsRate).message}
            />
          </View>
          </FadeIn>

          {/* Evolução mensal */}
          <FadeIn delay={80}>
          <ReportCard
            icon="bar-chart-2"
            title="Evolução mensal"
            sub={data!.period.bestMonth ? (
              <>Melhor mês: <Text style={{ color: COLORS.success }}>{capitalize(data!.period.bestMonth)}</Text></>
            ) : undefined}
          >
            <MonthlyChart data={data!.monthly} />
            <View style={styles.chartLegend}>
              <LegendItem color={COLORS.success} label="Receitas" />
              <LegendItem color={COLORS.danger} label="Despesas" />
              <LegendItem color={COLORS.brand} label="Saldo" variant="line" />
              <LegendItem color={COLORS.warning} label="% Poupança" variant="dashed" />
            </View>
          </ReportCard>
          </FadeIn>

          {/* Gastos por categoria */}
          <FadeIn delay={160}>
          <ReportCard icon="layers" title="Gastos por categoria" sub="variação vs mês anterior">
            <CategoryBreakdown categories={data!.categoryTrend} totalExpense={data!.period.totalExpense} />
          </ReportCard>
          </FadeIn>

          {/* Maiores despesas */}
          <FadeIn delay={240}>
          <ReportCard icon="trending-down" title="Maiores despesas" sub={`top ${data!.topExpenses.length} no período`}>
            <TopExpensesList expenses={data!.topExpenses} periodExpense={data!.period.totalExpense} />
          </ReportCard>
          </FadeIn>

          {/* Padrão de gasto por dia */}
          <ReportCard
            icon="calendar" title="Padrão de gasto por dia" sub="acumulado no período"
            caption="Dias em vermelho = maiores gastos acumulados. Útil para identificar datas de vencimentos."
          >
            <SpendingPatternChart data={data!.spendingByDay} />
          </ReportCard>

          {/* Fontes de receita */}
          <ReportCard icon="bar-chart-2" iconColor={COLORS.success} title="Fontes de receita">
            <IncomeSourcesList sources={data!.incomeSources} totalIncome={data!.period.totalIncome} />
          </ReportCard>

          {/* Resumo por mês */}
          <ReportCard icon="list" title="Resumo por mês">
            <MonthlySummaryTable monthly={data!.monthly} period={data!.period} />
          </ReportCard>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 20, paddingTop: 56,
  },
  backBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginLeft: -8 },
  title:    { fontSize: 20, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  description: { fontSize: 11, color: COLORS.muted2, lineHeight: 15, paddingHorizontal: 20, marginTop: 8 },

  controlsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 14,
  },
  monthPicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9,
  },
  monthPickerLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthPickerText:  { fontSize: 13, fontWeight: '600', color: COLORS.text },

  filtersRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4,
  },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  periodBtnActive:  { backgroundColor: COLORS.brandDim, borderColor: COLORS.brand },
  periodText:       { fontSize: 13, color: COLORS.muted },
  periodTextActive: { color: COLORS.brand, fontWeight: '700' },

  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  exportBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.brand },

  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 20, gap: 8 },
  emptyIconWrap: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.card2,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  emptyText:  { fontSize: 12, color: COLORS.muted, textAlign: 'center', maxWidth: 260 },

  // KPIs
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  kpiCard: {
    flexBasis: '48%', flexGrow: 1, gap: 4,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  kpiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kpiLabel:  { fontSize: 10, color: COLORS.muted, fontWeight: '600', flexShrink: 1 },
  kpiValue:  { fontSize: 17, fontWeight: '700' },
  kpiSub:    { fontSize: 10, color: COLORS.muted2 },

  // Section / card
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, gap: 8,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sectionSub:   { fontSize: 11, color: COLORS.muted, flexShrink: 1, textAlign: 'right' },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  caption: { fontSize: 11, color: COLORS.muted, lineHeight: 16, marginTop: 8 },

  // Chart legend
  chartLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 12 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendLine:  { width: 14, height: 2, borderRadius: 1 },
  legendText:  { fontSize: 11, color: COLORS.muted },

  // Category breakdown
  catRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  catRowIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  catRowEmoji: { fontSize: 15 },
  catRowInfo: { flex: 1, gap: 5 },
  catRowTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catRowName: { fontSize: 13, fontWeight: '500', color: COLORS.text, flexShrink: 1 },
  catRowPct:  { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  catRowTrack: { height: 5, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' },
  catRowFill:  { height: 5, borderRadius: 3 },
  catRowRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  catRowAmount: { fontSize: 13, fontWeight: '700', color: COLORS.text },

  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  changeBadgeText: { fontSize: 10, fontWeight: '700' },

  toggleBtn: { paddingVertical: 8, alignItems: 'center' },
  toggleBtnText: { fontSize: 12, color: COLORS.brand, fontWeight: '600' },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  cardFooterLabel: { fontSize: 12, color: COLORS.muted },
  cardFooterValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  // Top expenses
  expRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  expRank: { fontSize: 12, fontWeight: '700', color: COLORS.muted, width: 14, textAlign: 'center' },
  expIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  expEmoji: { fontSize: 15 },
  expInfo: { flex: 1, gap: 5 },
  expDesc: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  expBarTrack: { height: 4, borderRadius: 2, backgroundColor: COLORS.border, overflow: 'hidden' },
  expBarFill:  { height: 4, borderRadius: 2, backgroundColor: COLORS.danger + '99' },
  expDate: { fontSize: 10, color: COLORS.muted },
  expRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  expAmount: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  expPct: { fontSize: 10, color: COLORS.muted },

  // Income sources
  incRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  incInfo: { flex: 1, gap: 5 },
  incTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  incName: { fontSize: 13, fontWeight: '500', color: COLORS.text, flexShrink: 1 },
  incPct:  { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  incTrack: { height: 5, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' },
  incFill:  { height: 5, borderRadius: 3, backgroundColor: COLORS.success + 'b3' },
  incAmount: { fontSize: 13, fontWeight: '700', color: COLORS.success, flexShrink: 0 },

  emptyCardText: { fontSize: 12, color: COLORS.muted, textAlign: 'center', paddingVertical: 12 },

  // Monthly summary table
  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: 4, gap: 10,
  },
  summaryHeaderRow: { borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8 },
  summaryHeaderText: { color: COLORS.muted2, fontWeight: '700' },
  summaryRowAlt: { backgroundColor: COLORS.card2, borderRadius: 8 },
  summaryFooterRow: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4, paddingTop: 10 },
  summaryFooterText: { fontWeight: '800' },
  summaryCellMonth: { fontSize: 12, color: COLORS.text, width: 92, textTransform: 'capitalize' },
  summaryCell:    { fontSize: 12, fontWeight: '600', width: 84, textAlign: 'right' },
  summaryCellPct: { fontSize: 12, fontWeight: '600', width: 56, textAlign: 'right', color: COLORS.text },
})
