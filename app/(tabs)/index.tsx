import { View, ScrollView, TouchableOpacity, FlatList, StyleSheet, RefreshControl, ActivityIndicator, Animated, Easing } from 'react-native'
import { Text } from '@/components/text'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Feather } from '@expo/vector-icons'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Svg, { Circle } from 'react-native-svg'
import { COLORS } from '@/lib/constants'
import { dashboardApi, goalsApi, budgetsApi, type Transaction, type Goal, type Budget } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'
import { AppHeader } from '@/components/app-header'
import { Rookinho } from '@/components/rookinho'
import { KpiDrawer, type KpiType } from '@/components/kpi-drawer'
import { useBadgeStore } from '@/lib/badge-store'
import { ThemedBillCard } from '@/components/themed-bill-card'
import { FinancialHealthCard, type FinancialHealth } from '@/components/financial-health-card'
import { ProjectionsSection } from '@/components/projections-section'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (n >= 1_000)     return `R$ ${(n / 1_000).toFixed(1).replace('.', ',')} mil`
  return fmt(n)
}

const currentMonth = format(new Date(), 'yyyy-MM')

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// ── Section Label (web-style caps header) ──────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, gradientColors, valueColor, glowColor, onPress,
}: {
  label: string; value: string; sub?: string; icon: string
  gradientColors: readonly [string, string]; valueColor: string; glowColor: string; onPress?: () => void
}) {
  return (
    <TouchableOpacity style={[styles.kpiWrap, { shadowColor: glowColor }]} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}>
      <LinearGradient colors={gradientColors} style={[styles.kpiCard, { borderColor: glowColor + '40' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.kpiTop}>
          <Text style={styles.kpiLabel}>{label}</Text>
          <Feather name={icon as never} size={13} color={valueColor} style={{ opacity: 0.7 }} />
        </View>
        <Text style={[styles.kpiValue, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        {sub ? <Text style={styles.kpiSub} numberOfLines={1}>{sub}</Text> : null}
      </LinearGradient>
    </TouchableOpacity>
  )
}

// ── Next Bill Highlight ────────────────────────────────────────────────────
function NextBillHighlight({ bill }: { bill?: { name: string; dueDate: string; amount: number } }) {
  if (!bill) return null
  const daysLeft = Math.ceil((new Date(bill.dueDate).getTime() - Date.now()) / 86_400_000)
  const isOverdue = daysLeft < 0
  const label = isOverdue ? `Venceu há ${Math.abs(daysLeft)} dia(s)` : daysLeft === 0 ? 'Vence hoje' : `Vence em ${daysLeft} dia(s)`
  return (
    <View style={[styles.nextBillCard, isOverdue && styles.nextBillOverdue]}>
      <View style={[styles.nextBillIcon, { backgroundColor: isOverdue ? COLORS.danger + '22' : COLORS.warning + '22' }]}>
        <Feather name="bell" size={18} color={isOverdue ? COLORS.danger : COLORS.warning} />
      </View>
      <View style={styles.nextBillInfo}>
        <Text style={styles.nextBillName}>{bill.name}</Text>
        <Text style={[styles.nextBillDate, { color: isOverdue ? COLORS.danger : COLORS.warning }]}>{label}</Text>
      </View>
      <Text style={[styles.nextBillAmount, { color: isOverdue ? COLORS.danger : COLORS.warning }]}>
        {fmt(bill.amount)}
      </Text>
    </View>
  )
}

// ── Tx Row ─────────────────────────────────────────────────────────────────
function TxRow({ tx }: { tx: Transaction }) {
  const isIncome = tx.type === 'INCOME'
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: isIncome ? COLORS.success + '22' : COLORS.danger + '18' }]}>
        <Text style={styles.txEmoji}>{tx.category.icon}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txName} numberOfLines={1}>{tx.description ?? tx.category.name}</Text>
        <Text style={styles.txDate}>
          {tx.category.name} · {format(new Date(tx.date), "dd/MM/yyyy")}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: isIncome ? COLORS.success : COLORS.text }]}>
        {isIncome ? '+' : '-'}{fmt(tx.amount)}
      </Text>
    </View>
  )
}

// ── Goal Row ───────────────────────────────────────────────────────────────
function GoalRow({ goal }: { goal: Goal }) {
  const pct   = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0
  const color = goal.color ?? COLORS.brand
  return (
    <View style={styles.goalRow}>
      <View style={styles.goalRowTop}>
        <Text style={styles.goalRowName} numberOfLines={1}>{goal.icon ? `${goal.icon} ` : ''}{goal.name}</Text>
        <Text style={[styles.goalRowPct, { color }]}>{pct.toFixed(0)}%</Text>
      </View>
      <View style={styles.goalRowBar}>
        <View style={[styles.goalRowBarFill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.goalRowFooter}>
        <Text style={styles.goalRowAmt}>{fmtShort(goal.currentAmount)}</Text>
        <Text style={styles.goalRowAmt}>{fmtShort(goal.targetAmount)}</Text>
      </View>
    </View>
  )
}

// ── Budget Row ─────────────────────────────────────────────────────────────
function BudgetRow({ budget }: { budget: Budget }) {
  const pct   = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0
  const color = pct > 90 ? COLORS.danger : pct > 70 ? COLORS.warning : COLORS.brand
  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetRowTop}>
        <Text style={styles.budgetRowEmoji}>{budget.category.icon}</Text>
        <Text style={styles.budgetRowName} numberOfLines={1}>{budget.category.name}</Text>
        <Text style={[styles.budgetRowPct, { color }]}>{pct.toFixed(0)}%</Text>
      </View>
      <View style={styles.budgetBarWrap}>
        <View style={[styles.budgetBarFill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

// ── Category Donut ─────────────────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const DONUT_R  = 36
const DONUT_R2 = 24
const DONUT_CXY = 44
const DONUT_CIRC = 2 * Math.PI * DONUT_R

function DonutSlice({
  color, dashArray, dashOffset, progress,
}: {
  color: string; dashArray: number; dashOffset: number; progress: Animated.Value
}) {
  const animatedDashoffset = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [dashOffset + dashArray, dashOffset],
  })
  return (
    <AnimatedCircle
      cx={DONUT_CXY} cy={DONUT_CXY} r={DONUT_R}
      fill="none"
      stroke={color}
      strokeWidth={DONUT_R - DONUT_R2}
      strokeDasharray={`${dashArray} ${DONUT_CIRC - dashArray}`}
      strokeDashoffset={animatedDashoffset as unknown as number}
      transform={`rotate(-90 ${DONUT_CXY} ${DONUT_CXY})`}
    />
  )
}

function CategoryDonutChart({ categories }: { categories: { name: string; color: string; pct: number }[] }) {
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    progress.setValue(0)
    Animated.timing(progress, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [categories, progress])

  let cumulative = 0
  const slices = categories.slice(0, 5).map((cat) => {
    const dashArray  = (cat.pct / 100) * DONUT_CIRC
    const dashOffset = DONUT_CIRC * (1 - cumulative / 100)
    cumulative += cat.pct
    return { ...cat, dashArray, dashOffset }
  })

  return (
    <Svg width={90} height={90} viewBox="0 0 88 88">
      <Circle cx={DONUT_CXY} cy={DONUT_CXY} r={DONUT_R} fill="none" stroke="#1e293b" strokeWidth={DONUT_R - DONUT_R2} />
      {slices.map((s) => (
        <DonutSlice key={s.name} color={s.color ?? COLORS.brand} dashArray={s.dashArray} dashOffset={s.dashOffset} progress={progress} />
      ))}
    </Svg>
  )
}

// ── Main Screen ─────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const user   = useAuthStore((s) => s.user)
  const router = useRouter()

  const [kpiDrawer, setKpiDrawer] = useState<KpiType>(null)

  const setBillsBadge   = useBadgeStore((s) => s.setBillsBadge)
  const setPeopleBadge  = useBadgeStore((s) => s.setPeopleBadge)
  const setOverdueBadge = useBadgeStore((s) => s.setOverdueBadge)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  () => dashboardApi.get().then((r) => r.data),
  })

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn:  () => goalsApi.list().then((r) => r.data),
  })

  const { data: budgets } = useQuery({
    queryKey: ['budgets', currentMonth],
    queryFn:  () => budgetsApi.list(currentMonth).then((r) => r.data),
  })

  const firstName   = user?.name.split(' ')[0] ?? 'você'
  const monthLabel  = format(new Date(), "MMMM yyyy", { locale: ptBR }).toUpperCase()
  const activeGoals = goals?.filter((g) => !g.isCompleted) ?? []
  const topBudgets  = (budgets ?? []).filter((b) => b.amount > 0).slice(0, 5)
  const overdueCount = data?.overdueCount ?? 0

  // MonthPace
  const now          = new Date()
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth   = now.getDate()
  const monthIncome  = data?.monthIncome ?? 0
  const monthExpense = data?.monthExpense ?? 0
  const monthPct     = Math.round((dayOfMonth / daysInMonth) * 100)
  const spendPct     = monthIncome > 0 ? Math.round((monthExpense / monthIncome) * 100) : 0
  const spendPctBar  = Math.min(spendPct, 100)
  const daysLeft     = daysInMonth - dayOfMonth
  const projectedPct = monthPct > 0 ? Math.round((spendPct / monthPct) * 100) : 0

  const paceStatus: 'over' | 'warn' | 'ok' =
    spendPct > 100 ? 'over' : spendPct > monthPct + 15 ? 'warn' : 'ok'
  const paceColor = paceStatus === 'over' ? '#f43f5e' : paceStatus === 'warn' ? '#fbbf24' : COLORS.success
  const paceIcon  = paceStatus === 'over' ? 'alert-triangle' : paceStatus === 'warn' ? 'trending-down' : 'check-circle'
  const paceMessage = paceStatus === 'over'
    ? `Você já gastou ${fmt(monthExpense - monthIncome)} além da sua renda este mês.`
    : paceStatus === 'warn'
    ? `Gastou ${spendPct}% da renda com só ${monthPct}% do mês passado — nesse ritmo vai usar ${projectedPct}% da renda total.`
    : `Tudo certo. Ainda tem ${fmt(monthIncome - monthExpense)} disponíveis para os próximos ${daysLeft} dias.`

  // Saúde financeira
  const monthIncomeVal  = data?.monthIncome ?? 0
  const monthExpenseVal = data?.monthExpense ?? 0
  const savingsRate  = monthIncomeVal > 0
    ? Math.round(((monthIncomeVal - monthExpenseVal) / monthIncomeVal) * 100)
    : 0
  const savingsScore = Math.min(30, Math.max(0, Math.round(savingsRate * 0.3)))
  const billsScore   = overdueCount === 0 ? 20 : Math.max(0, 20 - overdueCount * 5)
  const goalsScore   = activeGoals.length > 0 ? 20 : 0
  const totalScore   = savingsScore + billsScore + goalsScore
  const healthGrade: FinancialHealth['grade'] =
    totalScore >= 60 ? 'A' : totalScore >= 45 ? 'B' : totalScore >= 30 ? 'C' : 'D'
  const healthLabel =
    totalScore >= 60 ? 'Muito bom' : totalScore >= 45 ? 'Bom' : totalScore >= 30 ? 'Regular' : 'Atenção'
  const healthColor =
    totalScore >= 45 ? COLORS.success : totalScore >= 30 ? COLORS.warning : COLORS.danger

  const health: FinancialHealth = {
    score: Math.min(100, totalScore + 30),
    grade: healthGrade,
    label: healthLabel,
    color: healthColor,
    components: [
      {
        key: 'savings_rate', label: 'Taxa de poupança', score: savingsScore, max: 30,
        detail: monthIncomeVal > 0
          ? `${savingsRate >= 0 ? 'Poupou' : 'Gastou'} ${Math.abs(savingsRate)}% da renda`
          : 'Nenhuma transação ainda.',
        status: savingsRate >= 20 ? 'good' : savingsRate >= 0 ? 'ok' : 'bad',
      },
      {
        key: 'bills_on_time', label: 'Contas em dia', score: billsScore, max: 20,
        detail: overdueCount === 0 ? 'Nenhuma conta atrasada' : `${overdueCount} conta(s) em atraso`,
        status: overdueCount === 0 ? 'good' : overdueCount <= 2 ? 'ok' : 'bad',
      },
      {
        key: 'goals', label: 'Metas ativas', score: goalsScore, max: 20,
        detail: activeGoals.length > 0 ? `${activeGoals.length} meta(s) ativa(s)` : 'Sem metas definidas',
        status: activeGoals.length >= 2 ? 'good' : activeGoals.length === 1 ? 'ok' : 'neutral',
      },
    ],
  }

  const futurePersonPayables = data?.futurePersonPayables ?? []
  const nextBill = data?.upcomingBills?.[0]

  // Sync global badge counts whenever dashboard data changes
  useEffect(() => {
    if (!data) return
    setBillsBadge(data.pendingBillsCount ?? 0)
    setPeopleBadge(data.futurePersonPayables?.length ?? 0)
    setOverdueBadge(data.overdueCount ?? 0)
  }, [data])

  return (
    <View style={styles.screen}>
      <AppHeader bellBadge={overdueCount} />
      <KpiDrawer type={kpiDrawer} data={data} onClose={() => setKpiDrawer(null)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
      >
      {/* Greeting */}
      <View style={styles.header}>
        <Rookinho mood={data?.mood} size={64} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerGreeting}>{greeting()}, {firstName}.</Text>
          <Text style={styles.headerMonth}>{format(now, "MMMM yyyy", { locale: ptBR })}</Text>
        </View>
        {overdueCount > 0 && (
          <TouchableOpacity style={styles.overdueBadge} onPress={() => router.push('/(tabs)/bills')}>
            <Feather name="alert-circle" size={13} color={COLORS.danger} />
            <Text style={styles.overdueBadgeText}>{overdueCount} em atraso</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 80 }} />
      ) : (
        <>
          {/* ── VISÃO DO MÊS ─────────────────────────────────────────── */}
          <SectionLabel>{`VISÃO DO MÊS — ${monthLabel}`}</SectionLabel>
          <View style={styles.kpiGrid}>
            <KpiCard
              label="A RECEBER"
              value={fmtShort(data?.totalReceivable ?? 0)}
              sub={`${fmtShort(data?.totalIncomeReceivable ?? 0)} de rendas`}
              icon="arrow-down-circle"
              gradientColors={['#062828', '#0e3a3a']}
              valueColor="#67e8f9"
              glowColor="#22d3ee"
              onPress={() => setKpiDrawer('receivable')}
            />
            <KpiCard
              label="RECEITAS"
              value={fmtShort(data?.monthIncome ?? 0)}
              sub={data?.incomeChange != null
                ? `${data.incomeChange >= 0 ? '↑' : '↓'}${Math.abs(Math.round(data.incomeChange))}% vs mês ant.`
                : 'Total recebido'}
              icon="trending-up"
              gradientColors={['#052e16', '#0a4020']}
              valueColor={COLORS.success}
              glowColor={COLORS.success}
              onPress={() => setKpiDrawer('income')}
            />
            <KpiCard
              label="A PAGAR"
              value={fmtShort((data?.pendingBillsAmount ?? 0) + (data?.personPayablesAmount ?? 0))}
              sub={(data?.pendingBillsCount ?? 0) > 0
                ? `${data?.pendingBillsCount} conta(s)${data?.expenseChange != null ? ` · ${data.expenseChange >= 0 ? '↑' : '↓'}${Math.abs(Math.round(data.expenseChange))}%` : ''}`
                : 'Em dia'}
              icon="trending-down"
              gradientColors={['#450a0a', '#5c1414']}
              valueColor="#f43f5e"
              glowColor="#ef4444"
              onPress={() => setKpiDrawer('bills')}
            />
            <KpiCard
              label="SALDO DO MÊS"
              value={fmtShort(data?.monthBalance ?? 0)}
              sub={`Já pago: ${fmtShort(data?.monthExpense ?? 0)}`}
              icon="calendar"
              gradientColors={['#111e32', '#16294a']}
              valueColor={COLORS.text}
              glowColor={COLORS.brand}
              onPress={() => setKpiDrawer('balance')}
            />
          </View>

          {/* ── ATENÇÃO ──────────────────────────────────────────────── */}
          {(!!data?.insight || !!nextBill) && (
            <>
              <SectionLabel>ATENÇÃO</SectionLabel>
              {!!data?.insight && (
                <View style={styles.insightCard}>
                  <Rookinho mood={data.mood} size={52} />
                  <Text style={styles.insightText}>{data.insight}</Text>
                </View>
              )}
              <NextBillHighlight bill={nextBill} />
            </>
          )}

          {/* ── ESTE MÊS ─────────────────────────────────────────────── */}
          <SectionLabel>ESTE MÊS</SectionLabel>

          {/* Ritmo de gastos */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Feather name={paceIcon} size={14} color={paceColor} />
              <Text style={styles.cardTitle}>Ritmo de gastos</Text>
              <Text style={styles.cardTitleSub}>dia {dayOfMonth}/{daysInMonth}</Text>
            </View>
            <Text style={styles.paceSubtitle}>Seus gastos vs. o tempo do mês</Text>
            <View style={styles.paceRow}>
              <Text style={styles.paceRowLabel}>do mês{'\n'}passou</Text>
              <View style={styles.paceBarOuter}>
                <View style={[styles.paceBarInner, { width: `${monthPct}%` as `${number}%`, backgroundColor: COLORS.muted }]} />
              </View>
              <Text style={styles.paceRowPct}>{monthPct}%</Text>
            </View>
            <View style={styles.paceRow}>
              <Text style={styles.paceRowLabel}>da renda{'\n'}já gasta</Text>
              <View style={styles.paceBarOuter}>
                <View style={[styles.paceBarInner, { width: `${spendPctBar}%` as `${number}%`, backgroundColor: paceColor }]} />
              </View>
              <Text style={[styles.paceRowPct, { color: paceColor }]}>{spendPct}%</Text>
            </View>
            <Text style={styles.paceWarning}>{paceMessage}</Text>
          </View>

          {/* Gastos por categoria */}
          {(data?.topCategories?.length ?? 0) > 0 && (
            <View style={[styles.card, { marginTop: 10 }]}>
              <Text style={styles.cardTitle}>Gastos por categoria</Text>
              <View style={styles.catBody}>
                {/* Donut */}
                <View style={styles.catDonut}>
                  <CategoryDonutChart categories={data!.topCategories} />
                  <View style={styles.catDonutCenter}>
                    <Text style={styles.catDonutTotal}>Total</Text>
                    <Text style={styles.catDonutAmt}>{fmtShort(data?.monthExpense ?? 0)}</Text>
                  </View>
                </View>
                {/* Category bars */}
                <View style={styles.catList}>
                  {data!.topCategories.slice(0, 5).map((cat) => (
                    <View key={cat.name} style={styles.catItem}>
                      <View style={styles.catItemTop}>
                        <Text style={styles.catItemEmoji}>{cat.icon}</Text>
                        <Text style={styles.catItemName} numberOfLines={1}>{cat.name}</Text>
                        <Text style={styles.catItemPct}>{cat.pct}%</Text>
                      </View>
                      <View style={styles.catBarWrap}>
                        <View style={[styles.catBarFill, {
                          width: `${cat.pct}%` as `${number}%`,
                          backgroundColor: cat.color ?? COLORS.brand,
                        }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ── ATIVIDADE RECENTE ─────────────────────────────────────── */}
          <SectionLabel>ATIVIDADE RECENTE</SectionLabel>

          {/* Transações recentes */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Transações recentes</Text>
              <TouchableOpacity onPress={() => router.push('/transactions')}>
                <Text style={styles.seeAll}>Ver todas →</Text>
              </TouchableOpacity>
            </View>
            {!data?.recentTransactions?.length ? (
              <View style={styles.empty}>
                <Feather name="inbox" size={24} color={COLORS.muted} />
                <Text style={styles.emptyText}>Nenhuma transação ainda</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/new-transaction')}>
                  <Text style={styles.emptyBtnText}>+ Adicionar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              data.recentTransactions.map((tx) => <TxRow key={tx.id} tx={tx} />)
            )}
          </View>

          {/* Metas ativas */}
          {activeGoals.length > 0 && (
            <View style={[styles.card, { marginTop: 10 }]}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Metas ativas</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/goals')}>
                  <Text style={styles.seeAll}>Ver todas →</Text>
                </TouchableOpacity>
              </View>
              {activeGoals.slice(0, 4).map((g) => <GoalRow key={g.id} goal={g} />)}
            </View>
          )}

          {/* ── COMPROMISSOS ─────────────────────────────────────────── */}
          <SectionLabel>COMPROMISSOS</SectionLabel>

          {/* A Pagar */}
          <ThemedBillCard
            pendingBillsCount={data?.pendingBillsCount ?? 0}
            pendingBillsAmount={data?.pendingBillsAmount ?? 0}
            personPayablesAmount={data?.personPayablesAmount ?? 0}
            overdueCount={overdueCount}
            onPress={() => router.push('/(tabs)/bills')}
          />

          {/* Próximos vencimentos */}
          <View style={[styles.card, { marginTop: 10 }]}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Próximos vencimentos</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/bills')}>
                <Text style={styles.seeAll}>Ver todas →</Text>
              </TouchableOpacity>
            </View>
            {(data?.upcomingBills?.length ?? 0) === 0 ? (
              <Text style={styles.emptyText}>Nenhuma conta próxima.</Text>
            ) : (
              data!.upcomingBills.slice(0, 5).map((bill) => {
                const isOverdue = new Date(bill.dueDate) < new Date()
                return (
                  <View key={bill.id} style={styles.commitRow}>
                    <View style={styles.commitInfo}>
                      <Text style={styles.commitName}>{bill.name}</Text>
                      <Text style={[styles.commitDate, isOverdue && { color: COLORS.danger }]}>
                        {isOverdue ? '⚠️ Venceu ' : 'Vence '}
                        {format(new Date(bill.dueDate), "d 'de' MMM", { locale: ptBR })}
                      </Text>
                    </View>
                    <Text style={[styles.commitAmt, { color: isOverdue ? COLORS.danger : COLORS.warning }]}>
                      {fmt(bill.amount)}
                    </Text>
                  </View>
                )
              })
            )}
          </View>

          {/* Com pessoas */}
          <View style={[styles.card, { marginTop: 10 }]}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Com pessoas</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/people')}>
                <Text style={styles.seeAll}>Ver todas →</Text>
              </TouchableOpacity>
            </View>
            {futurePersonPayables.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum compromisso próximo.</Text>
            ) : (
              futurePersonPayables.slice(0, 4).map((e) => (
                <View key={e.id} style={styles.commitRow}>
                  <View style={styles.commitInfo}>
                    <Text style={styles.commitName}>{e.person.name}</Text>
                    <Text style={styles.commitDate}>
                      {e.description} · {format(new Date(e.date), "d 'de' MMM", { locale: ptBR })}
                    </Text>
                  </View>
                  <Text style={[styles.commitAmt, { color: COLORS.danger }]}>-{fmt(e.amount)}</Text>
                </View>
              ))
            )}
          </View>

          {/* ── PLANEJAMENTO ──────────────────────────────────────────── */}
          <SectionLabel>PLANEJAMENTO</SectionLabel>

          {/* Orçamento */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Orçamento do mês</Text>
              <TouchableOpacity onPress={() => router.push('/budget')}>
                <Text style={styles.seeAll}>Configurar →</Text>
              </TouchableOpacity>
            </View>
            {topBudgets.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum orçamento configurado.</Text>
            ) : (
              topBudgets.map((b) => <BudgetRow key={b.id} budget={b} />)
            )}
          </View>

          {/* Saúde financeira */}
          <View style={{ marginTop: 10 }}>
            <FinancialHealthCard health={health} />
          </View>

          {/* ── FUTURO ───────────────────────────────────────────────── */}
          <SectionLabel>FUTURO</SectionLabel>
          <ProjectionsSection projections={data?.projections ?? []} />
        </>
      )}
      </ScrollView>
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 100 },

  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 16, marginBottom: 20 },
  headerGreeting: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerMonth:    { fontSize: 12, color: COLORS.muted, marginTop: 1, textTransform: 'capitalize' },

  overdueBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.danger + '18', borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 5,
    borderWidth: 1, borderColor: COLORS.danger + '40',
  },
  overdueBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.danger },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: COLORS.muted,
    letterSpacing: 1.2, marginBottom: 10, marginTop: 20, paddingHorizontal: 2,
  },

  // KPI grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiWrap: {
    width: '47.5%', borderRadius: 16,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 6,
  },
  kpiCard: { borderRadius: 16, padding: 14, borderWidth: 1, minHeight: 90 },
  kpiTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  kpiLabel:{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.6 },
  kpiValue:{ fontSize: 20, fontWeight: '800', marginBottom: 4 },
  kpiSub:  { fontSize: 10, color: 'rgba(255,255,255,0.35)' },

  // Card
  card: {
    backgroundColor: COLORS.card, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 0,
  },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardTitleSub: { fontSize: 12, color: COLORS.muted },
  seeAll: { fontSize: 13, color: COLORS.brand },

  // Insight
  insightCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
  },
  insightText:  { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },

  // Next bill
  nextBillCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: COLORS.warning + '40', marginBottom: 0,
  },
  nextBillOverdue: { borderColor: COLORS.danger + '40' },
  nextBillIcon:    { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  nextBillInfo:    { flex: 1 },
  nextBillName:    { fontSize: 14, fontWeight: '600', color: COLORS.text },
  nextBillDate:    { fontSize: 12, marginTop: 2, fontWeight: '500' },
  nextBillAmount:  { fontSize: 16, fontWeight: '700' },

  // Pace
  paceSubtitle: { fontSize: 12, color: COLORS.muted, marginBottom: 12 },
  paceRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  paceRowLabel: { fontSize: 10, color: COLORS.muted, width: 50, lineHeight: 14 },
  paceBarOuter: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#162641', overflow: 'hidden' },
  paceBarInner: { height: 8, borderRadius: 4 },
  paceRowPct:   { fontSize: 12, fontWeight: '700', color: COLORS.text, width: 36, textAlign: 'right' },
  paceWarning:  { fontSize: 12, color: COLORS.muted, marginTop: 4, lineHeight: 17 },

  // Categories
  catBody:      { flexDirection: 'row', gap: 16, marginTop: 8 },
  catDonut:     { width: 90, height: 90, justifyContent: 'center', alignItems: 'center' },
  catDonutCenter: { position: 'absolute', alignItems: 'center' },
  catDonutTotal:  { fontSize: 9, color: COLORS.muted },
  catDonutAmt:    { fontSize: 11, fontWeight: '700', color: COLORS.text },
  catList:      { flex: 1, gap: 8 },
  catItem:      { gap: 4 },
  catItemTop:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catItemEmoji: { fontSize: 13, width: 20 },
  catItemName:  { flex: 1, fontSize: 12, color: COLORS.text },
  catItemPct:   { fontSize: 11, fontWeight: '700', color: COLORS.muted, width: 28, textAlign: 'right' },
  catBarWrap:   { height: 3, borderRadius: 2, backgroundColor: '#162641', overflow: 'hidden' },
  catBarFill:   { height: 3, borderRadius: 2 },

  // Transactions
  txRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  txIcon:  { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  txEmoji: { fontSize: 17 },
  txInfo:  { flex: 1 },
  txName:  { fontSize: 14, fontWeight: '500', color: COLORS.text },
  txDate:  { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  txAmount:{ fontSize: 14, fontWeight: '600' },

  // Goals
  goalRow:        { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  goalRowTop:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalRowName:    { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '500' },
  goalRowPct:     { fontSize: 12, fontWeight: '700' },
  goalRowBar:     { height: 4, borderRadius: 2, backgroundColor: COLORS.border, overflow: 'hidden', marginBottom: 4 },
  goalRowBarFill: { height: 4, borderRadius: 2 },
  goalRowFooter:  { flexDirection: 'row', justifyContent: 'space-between' },
  goalRowAmt:     { fontSize: 11, color: COLORS.muted },

  // Budget
  budgetRow:    { paddingVertical: 6, gap: 6 },
  budgetRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  budgetRowEmoji: { fontSize: 14 },
  budgetRowName:  { flex: 1, fontSize: 13, color: COLORS.text },
  budgetRowPct:   { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
  budgetBarWrap:  { height: 4, borderRadius: 2, backgroundColor: COLORS.border, overflow: 'hidden' },
  budgetBarFill:  { height: 4, borderRadius: 2 },

  // Commit rows (people + bills)
  commitRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  commitInfo: { flex: 1 },
  commitName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  commitDate: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  commitAmt:  { fontSize: 14, fontWeight: '600' },

  // Empty
  empty:      { paddingVertical: 20, alignItems: 'center', gap: 8 },
  emptyText:  { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  emptyBtn:   { marginTop: 4, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: COLORS.brand + '22', borderRadius: 10 },
  emptyBtnText: { color: COLORS.brand, fontSize: 13, fontWeight: '600' },
})
