import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { dashboardApi, goalsApi, budgetsApi, type Transaction, type Goal, type Budget } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const currentMonth = format(new Date(), 'yyyy-MM')

function StatCard({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  const color = positive === undefined ? COLORS.text : (positive ? COLORS.success : COLORS.danger)
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{fmt(value)}</Text>
    </View>
  )
}

function TxRow({ tx }: { tx: Transaction }) {
  const isIncome = tx.type === 'INCOME'
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: isIncome ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)' }]}>
        <Text style={styles.txEmoji}>{tx.category.icon}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txName} numberOfLines={1}>{tx.description ?? tx.category.name}</Text>
        <Text style={styles.txDate}>
          {format(new Date(tx.date), "d 'de' MMM", { locale: ptBR })}
          {' · '}{tx.category.name}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: isIncome ? COLORS.success : COLORS.danger }]}>
        {isIncome ? '+' : '-'}{fmt(tx.amount)}
      </Text>
    </View>
  )
}

function GoalMiniCard({ goal }: { goal: Goal }) {
  const pct   = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0
  const color = goal.color ?? COLORS.brand
  return (
    <View style={styles.goalMini}>
      <Text style={styles.goalMiniIcon}>{goal.icon ?? '🎯'}</Text>
      <Text style={styles.goalMiniName} numberOfLines={1}>{goal.name}</Text>
      <View style={styles.goalMiniBar}>
        <View style={[styles.goalMiniBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.goalMiniPct, { color }]}>{pct.toFixed(0)}%</Text>
    </View>
  )
}

function BudgetMiniRow({ budget }: { budget: Budget }) {
  const pct      = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0
  const barColor = pct > 90 ? COLORS.danger : pct > 70 ? COLORS.warning : COLORS.success
  return (
    <View style={styles.budgetMini}>
      <View style={styles.budgetMiniLeft}>
        <Text style={styles.budgetMiniEmoji}>{budget.category.icon}</Text>
        <Text style={styles.budgetMiniName} numberOfLines={1}>{budget.category.name}</Text>
      </View>
      <View style={styles.budgetMiniRight}>
        <Text style={[styles.budgetMiniPct, { color: barColor }]}>{pct.toFixed(0)}%</Text>
      </View>
      <View style={styles.budgetMiniBarWrap}>
        <View style={[styles.budgetMiniBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  )
}

export default function DashboardScreen() {
  const user   = useAuthStore((s) => s.user)
  const router = useRouter()

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

  const firstName  = user?.name.split(' ')[0] ?? 'você'
  const month      = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })
  const activeGoals = goals?.filter((g) => !g.isCompleted) ?? []
  const topBudgets  = (budgets ?? []).filter((b) => b.amount > 0).slice(0, 4)

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
    >
      {/* Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Olá, {firstName} 👋</Text>
          <Text style={styles.month}>{month}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-transaction')}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <>
          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Saldo do mês</Text>
            <Text style={[
              styles.balanceValue,
              { color: (data?.monthBalance ?? 0) >= 0 ? COLORS.success : COLORS.danger }
            ]}>
              {fmt(data?.monthBalance ?? 0)}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard label="Receitas" value={data?.monthIncome ?? 0} positive />
            <StatCard label="Despesas" value={data?.monthExpense ?? 0} positive={false} />
          </View>

          {/* Goals summary */}
          {activeGoals.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Metas ativas</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/goals')}>
                  <Text style={styles.seeAll}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                horizontal
                data={activeGoals}
                keyExtractor={(g) => g.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => <GoalMiniCard goal={item} />}
                ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
              />
            </View>
          )}

          {/* Budget overview */}
          {topBudgets.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Orçamento</Text>
                <TouchableOpacity onPress={() => router.push('/budget')}>
                  <Text style={styles.seeAll}>Ver tudo</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.budgetCard}>
                {topBudgets.map((b) => <BudgetMiniRow key={b.id} budget={b} />)}
              </View>
            </View>
          )}

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recentes</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                <Text style={styles.seeAll}>Ver todas</Text>
              </TouchableOpacity>
            </View>

            {data?.recentTransactions?.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Nenhuma transação ainda.</Text>
              </View>
            )}
            {data?.recentTransactions?.map((tx) => <TxRow key={tx.id} tx={tx} />)}
          </View>

          {/* Upcoming Bills */}
          {(data?.upcomingBills?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Contas próximas</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/bills')}>
                  <Text style={styles.seeAll}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              {data?.upcomingBills?.map((bill) => (
                <View key={bill.id} style={styles.billRow}>
                  <View style={styles.billLeft}>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billDate}>
                      Vence {format(new Date(bill.dueDate), "d 'de' MMM", { locale: ptBR })}
                    </Text>
                  </View>
                  <Text style={styles.billAmount}>{fmt(bill.amount)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 32 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingTop: 12 },
  greeting: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  month:    { fontSize: 13, color: COLORS.muted, marginTop: 2, textTransform: 'capitalize' },
  addBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },

  balanceCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  balanceLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  balanceValue: { fontSize: 36, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statLabel: { fontSize: 12, color: COLORS.muted, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '600' },

  section:       { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 15, fontWeight: '600', color: COLORS.text },
  seeAll:        { fontSize: 13, color: COLORS.brand },

  // Goals mini cards
  goalMini: {
    width: 140, backgroundColor: COLORS.card, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  goalMiniIcon:    { fontSize: 22, marginBottom: 6 },
  goalMiniName:    { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  goalMiniBar:     { height: 4, borderRadius: 2, backgroundColor: COLORS.border, overflow: 'hidden', marginBottom: 4 },
  goalMiniBarFill: { height: 4, borderRadius: 2 },
  goalMiniPct:     { fontSize: 12, fontWeight: '700' },

  // Budget mini
  budgetCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  budgetMini: { marginBottom: 10 },
  budgetMiniLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  budgetMiniEmoji:  { fontSize: 15 },
  budgetMiniName:   { flex: 1, fontSize: 13, color: COLORS.text },
  budgetMiniRight:  { position: 'absolute', right: 0, top: 0 },
  budgetMiniPct:    { fontSize: 12, fontWeight: '700' },
  budgetMiniBarWrap: { height: 4, borderRadius: 2, backgroundColor: COLORS.border, overflow: 'hidden' },
  budgetMiniBarFill: { height: 4, borderRadius: 2 },

  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  txIcon:   { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txEmoji:  { fontSize: 18 },
  txInfo:   { flex: 1 },
  txName:   { fontSize: 14, fontWeight: '500', color: COLORS.text },
  txDate:   { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  txAmount: { fontSize: 14, fontWeight: '600' },

  billRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  billLeft:   { flex: 1 },
  billName:   { fontSize: 14, fontWeight: '500', color: COLORS.text },
  billDate:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  billAmount: { fontSize: 15, fontWeight: '600', color: COLORS.warning },

  empty:     { paddingVertical: 20, alignItems: 'center' },
  emptyText: { color: COLORS.muted, fontSize: 14 },
})
