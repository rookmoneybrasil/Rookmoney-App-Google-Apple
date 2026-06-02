import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { budgetsApi, type Budget } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

function BudgetItem({ budget, onDelete }: { budget: Budget; onDelete: () => void }) {
  const pct  = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0
  const over = budget.spent > budget.amount
  const barColor = over ? COLORS.danger : pct > 80 ? COLORS.warning : COLORS.success

  return (
    <TouchableOpacity
      style={styles.item}
      onLongPress={() =>
        Alert.alert('Excluir orçamento', `Remover orçamento de ${budget.category.name}?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: onDelete },
        ])
      }
      activeOpacity={0.8}
    >
      <View style={styles.itemTop}>
        <View style={styles.catIcon}>
          <Text style={styles.catEmoji}>{budget.category.icon}</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{budget.category.name}</Text>
          <Text style={styles.itemSub}>
            Gasto: {fmt(budget.spent)} / {fmt(budget.amount)}
          </Text>
        </View>
        <Text style={[styles.pct, { color: barColor }]}>{pct.toFixed(0)}%</Text>
      </View>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      {over && (
        <Text style={styles.overText}>Acima em {fmt(budget.spent - budget.amount)}</Text>
      )}
    </TouchableOpacity>
  )
}

export default function BudgetScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStr = format(currentMonth, 'yyyy-MM')
  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['budgets', monthStr],
    queryFn:  () => budgetsApi.list(monthStr).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetsApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['budgets'] }),
    onError:    (e: Error) => Alert.alert('Erro', e.message),
  })

  const totalBudget  = data?.reduce((s, b) => s + b.amount, 0) ?? 0
  const totalSpent   = data?.reduce((s, b) => s + b.spent, 0) ?? 0
  const totalAvailable = totalBudget - totalSpent

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Orçamento</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push({ pathname: '/new-budget', params: { month: monthStr } })}
        >
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Month picker */}
      <View style={styles.monthPicker}>
        <TouchableOpacity onPress={() => setCurrentMonth((m) => subMonths(m, 1))}>
          <Feather name="chevron-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => setCurrentMonth((m) => addMonths(m, 1))}>
          <Feather name="chevron-right" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Orçado</Text>
          <Text style={styles.summaryValue}>{fmt(totalBudget)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Gasto</Text>
          <Text style={[styles.summaryValue, { color: COLORS.danger }]}>{fmt(totalSpent)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Disponível</Text>
          <Text style={[styles.summaryValue, { color: totalAvailable >= 0 ? COLORS.success : COLORS.danger }]}>
            {fmt(totalAvailable)}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
        >
          {(data ?? []).length === 0 && (
            <View style={styles.empty}>
              <Feather name="pie-chart" size={40} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>Nenhum orçamento</Text>
              <Text style={styles.emptyText}>Adicione orçamentos por categoria</Text>
            </View>
          )}
          {(data ?? []).map((b) => (
            <BudgetItem
              key={b.id}
              budget={b}
              onDelete={() => deleteMutation.mutate(b.id)}
            />
          ))}
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
  title:  { fontSize: 20, fontWeight: '700', color: COLORS.text },
  addBtn: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },

  monthPicker: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 20, paddingVertical: 12,
  },
  monthLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text, textTransform: 'capitalize', minWidth: 160, textAlign: 'center' },

  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  summaryLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  list: { paddingHorizontal: 20, paddingBottom: 32 },

  item: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  catIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.card2, justifyContent: 'center', alignItems: 'center',
  },
  catEmoji:  { fontSize: 18 },
  itemInfo:  { flex: 1 },
  itemName:  { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemSub:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  pct:       { fontSize: 14, fontWeight: '700' },
  progressBg: { height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  overText:  { fontSize: 11, color: COLORS.danger, marginTop: 6 },

  empty:      { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  emptyText:  { fontSize: 13, color: COLORS.muted },
})
