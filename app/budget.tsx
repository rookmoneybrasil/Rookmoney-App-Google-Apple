import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { PressableScale } from '@/components/pressable-scale'
import { AnimatedProgress } from '@/components/animated-progress'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { ListSkeleton } from '@/components/skeleton'
import { budgetsApi, meApi, type Budget } from '@/lib/api'
import { ProGate } from '@/components/pro-gate'
import { FadeIn } from '@/components/animated-entry'
import { EmptyState } from '@/components/empty-state'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function EditBudgetSheet({ budget, onClose }: { budget: Budget; onClose: () => void }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(String(budget.amount))

  const mutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(amount.replace(',', '.'))
      if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')
      return budgetsApi.update({ categoryId: budget.categoryId, amount: amt, month: budget.month })
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['budgets'] })
      onClose()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>
        Editar orçamento — {budget.category.icon} {budget.category.name}
      </Text>
      <Text style={styles.sheetSub}>Gasto atual: {fmt(budget.spent)}</Text>

      <Text style={styles.sheetLabel}>Novo valor (R$)</Text>
      <TextInput
        style={styles.sheetInput}
        value={amount}
        onChangeText={setAmount}
        placeholder="0,00"
        placeholderTextColor={COLORS.muted}
        keyboardType="decimal-pad"
        autoFocus
      />

      <View style={styles.sheetActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          <Text style={styles.saveBtnText}>{mutation.isPending ? 'Salvando...' : 'Salvar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function BudgetItem({ budget, onEdit, onDelete }: { budget: Budget; onEdit: () => void; onDelete: () => void }) {
  const pct       = Number(budget.amount) > 0 ? Math.min(Math.round((budget.spent / Number(budget.amount)) * 100), 100) : 0
  const isOver    = budget.spent > Number(budget.amount)
  const isWarning = !isOver && pct >= 80
  const barColor  = isOver ? COLORS.danger : isWarning ? COLORS.warning : COLORS.brand

  const showOptions = () =>
    Alert.alert('Opções', budget.category.name, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Editar valor', onPress: onEdit },
      { text: 'Excluir', style: 'destructive', onPress: onDelete },
    ])

  return (
    <PressableScale
      style={styles.item}
      onLongPress={showOptions}
    >
      <View style={[styles.catIcon, { backgroundColor: budget.category.color + '22' }]}>
        <Text style={styles.catEmoji}>{budget.category.icon}</Text>
      </View>
      <View style={styles.itemInfo}>
        <View style={styles.itemTopRow}>
          <Text style={styles.itemName} numberOfLines={1}>{budget.category.name}</Text>
          {isOver && (
            <View style={[styles.badge, styles.badgeDanger]}>
              <View style={[styles.badgeDot, { backgroundColor: COLORS.danger }]} />
              <Text style={[styles.badgeText, { color: COLORS.danger }]}>Acima do limite</Text>
            </View>
          )}
          {isWarning && (
            <View style={[styles.badge, styles.badgeWarning]}>
              <View style={[styles.badgeDot, { backgroundColor: COLORS.warning }]} />
              <Text style={[styles.badgeText, { color: COLORS.warning }]}>Atenção {pct}%</Text>
            </View>
          )}
          {!isOver && !isWarning && <Text style={styles.pctText}>{pct}%</Text>}
        </View>
        <Text style={styles.itemAmounts}>{fmt(budget.spent)} / {fmt(Number(budget.amount))}</Text>
        <AnimatedProgress value={pct} max={100} height={5} color={barColor} bgColor={COLORS.border} borderRadius={3} />
      </View>
      <TouchableOpacity onPress={showOptions} hitSlop={8} style={{ padding: 4 }}>
        <Feather name="more-vertical" size={16} color={COLORS.muted} />
      </TouchableOpacity>
    </PressableScale>
  )
}

export default function BudgetScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then(r => r.data),
  })

  const isPro = me?.plan === 'PRO' || me?.plan === 'PRO_PLUS'

  const monthStr = format(currentMonth, 'yyyy-MM')
  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })
  const monthLabelHeader = capitalize(format(currentMonth, 'MMMM yyyy', { locale: ptBR }))

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['budgets', monthStr],
    queryFn:  () => budgetsApi.list(monthStr).then((r) => r.data),
    enabled:  isPro,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetsApi.delete(id),
    onSuccess:  () => {
      qc.refetchQueries({ queryKey: ['budgets'] })
      qc.refetchQueries({ queryKey: ['dashboard'] })
    },
    onError:    (e: Error) => Alert.alert('Erro', e.message),
  })

  const budgets = data ?? []
  const totalBudget    = budgets.reduce((s, b) => s + Number(b.amount), 0)
  const totalSpent     = budgets.reduce((s, b) => s + b.spent, 0)
  const totalAvailable = totalBudget - totalSpent
  const overBudget     = budgets.filter((b) => b.spent > Number(b.amount))

  return (
    <View style={styles.screen}>
      {/* Header */}
      <FadeIn delay={0}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Orçamento</Text>
          <Text style={styles.subtitle}>{monthLabelHeader}</Text>
        </View>
      </View>
      <Text style={styles.description}>
        Defina um limite de gasto por categoria para cada mês. Você recebe alertas quando se aproximar ou ultrapassar o limite.
      </Text>

      {/* Controls */}
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
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push({ pathname: '/new-budget', params: { month: monthStr } })}
        >
          <Feather name="plus" size={14} color="#fff" />
          <Text style={styles.addBtnText}>Definir</Text>
        </TouchableOpacity>
      </View>
      </FadeIn>

      {me && !isPro ? (
        <ProGate
          feature="Orçamento"
          description="Defina limites de gastos por categoria e acompanhe seu orçamento mensal."
        />
      ) : isLoading ? (
        <ListSkeleton rows={4} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
        >
          {budgets.length > 0 && (
            <FadeIn delay={80}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Orçamento total</Text>
                <Text style={styles.summaryValue}>{fmt(totalBudget)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Gasto até agora</Text>
                <Text style={[styles.summaryValue, totalSpent > totalBudget && { color: COLORS.danger }]}>
                  {fmt(totalSpent)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Disponível</Text>
                <Text style={[styles.summaryValue, { color: totalAvailable < 0 ? COLORS.danger : COLORS.success }]}>
                  {fmt(Math.abs(totalAvailable))}{totalAvailable < 0 ? ' acima' : ''}
                </Text>
              </View>
            </View>
            </FadeIn>
          )}

          {budgets.length === 0 ? (
            <EmptyState
              mood="determined"
              title="Nenhum orçamento definido"
              subtitle="Defina limites por categoria para controlar seus gastos"
            />
          ) : (
            <>
              {budgets.map((b, i) => (
                <FadeIn key={b.id} delay={160 + i * 80}>
                <BudgetItem
                  budget={b}
                  onEdit={() => setEditingBudget(b)}
                  onDelete={() => deleteMutation.mutate(b.id)}
                />
                </FadeIn>
              ))}

              {overBudget.length > 0 && (
                <View style={styles.alertBox}>
                  <Feather name="trending-up" size={16} color={COLORS.danger} style={{ marginTop: 1 }} />
                  <Text style={styles.alertText}>
                    {overBudget.length} categoria{overBudget.length > 1 ? 's' : ''} acima do orçamento: {overBudget.map((b) => b.category.name).join(', ')}.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {editingBudget && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setEditingBudget(null)} />
          <EditBudgetSheet budget={editingBudget} onClose={() => setEditingBudget(null)} />
        </View>
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
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginLeft: -8 },
  title:    { fontSize: 20, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  description: { fontSize: 11, color: COLORS.muted2, lineHeight: 15, paddingHorizontal: 20, marginTop: 8 },

  controlsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4,
  },
  monthPicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9,
  },
  monthPickerLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthPickerText:  { fontSize: 13, fontWeight: '600', color: COLORS.text },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.brand, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, flexShrink: 0,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 16 },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  summaryLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  list: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 16 },

  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  catIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  catEmoji: { fontSize: 16 },
  itemInfo: { flex: 1, gap: 6 },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text, flexShrink: 1 },
  itemAmounts: { fontSize: 12, color: COLORS.muted },
  pctText: { fontSize: 12, color: COLORS.muted },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexShrink: 0 },
  badgeDanger:  { backgroundColor: COLORS.danger + '18' },
  badgeWarning: { backgroundColor: COLORS.warning + '18' },
  badgeDot:  { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  progressBg:   { height: 5, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },

  alertBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.danger + '18', borderWidth: 1, borderColor: COLORS.danger + '33',
    borderRadius: 12, padding: 12, marginTop: 4,
  },
  alertText: { flex: 1, fontSize: 12, color: COLORS.danger, lineHeight: 17 },

  empty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyIconWrap: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.card2,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  emptyText:  { fontSize: 12, color: COLORS.muted, textAlign: 'center', maxWidth: 260 },

  overlay:   { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.muted2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:   { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  sheetSub:     { fontSize: 13, color: COLORS.muted, marginBottom: 16 },
  sheetLabel:   { fontSize: 12, color: COLORS.muted, marginBottom: 8 },
  sheetInput: {
    backgroundColor: COLORS.card2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    color: COLORS.text, fontSize: 22, fontWeight: '700', borderWidth: 1, borderColor: COLORS.border,
  },
  sheetActions:  { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn:     { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: 15 },
  saveBtn:       { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.brand, alignItems: 'center' },
  saveBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
})
