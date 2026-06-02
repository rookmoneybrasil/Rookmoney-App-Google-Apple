import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, TextInput,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { goalsApi, type Goal } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

function CircularProgress({ pct, size = 56, color }: { pct: number; size?: number; color: string }) {
  const r     = (size - 6) / 2
  const circ  = 2 * Math.PI * r
  const dash  = Math.min(pct / 100, 1) * circ
  const cx    = size / 2
  const cy    = size / 2

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke={COLORS.border} strokeWidth={5} fill="none" />
      <Circle
        cx={cx} cy={cy} r={r}
        stroke={color}
        strokeWidth={5}
        fill="none"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function GoalCard({
  goal,
  onContribute,
}: {
  goal: Goal
  onContribute: (goal: Goal) => void
}) {
  const pct   = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
  const color = goal.isCompleted ? COLORS.success : (goal.color ?? COLORS.brand)

  return (
    <View style={styles.goalCard}>
      <View style={styles.goalTop}>
        <View style={styles.goalIconWrap}>
          <Text style={styles.goalIcon}>{goal.icon ?? '🎯'}</Text>
        </View>
        <View style={styles.goalInfo}>
          <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
          <Text style={styles.goalSub}>
            {fmt(goal.currentAmount)} / {fmt(goal.targetAmount)}
          </Text>
          {goal.deadline && (
            <Text style={styles.goalDeadline}>
              Prazo: {format(new Date(goal.deadline), "d MMM yyyy", { locale: ptBR })}
            </Text>
          )}
        </View>
        <CircularProgress pct={pct} size={52} color={color} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>

      <View style={styles.goalBottom}>
        <Text style={[styles.pctText, { color }]}>{pct.toFixed(0)}%</Text>
        {!goal.isCompleted && (
          <TouchableOpacity style={styles.contributeBtn} onPress={() => onContribute(goal)}>
            <Feather name="plus" size={14} color={COLORS.brand} />
            <Text style={styles.contributeBtnText}>Contribuir</Text>
          </TouchableOpacity>
        )}
        {goal.isCompleted && (
          <View style={styles.completedBadge}>
            <Feather name="check-circle" size={14} color={COLORS.success} />
            <Text style={styles.completedText}>Concluída</Text>
          </View>
        )}
      </View>
    </View>
  )
}

function ContributeSheet({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const [note, setNote]     = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => {
      const val = parseFloat(amount.replace(',', '.'))
      return goalsApi.contribute(goal.id, val, note || undefined)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  function handleSave() {
    const val = parseFloat(amount.replace(',', '.'))
    if (!amount || isNaN(val) || val <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.')
      return
    }
    mutation.mutate()
  }

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>Contribuir para "{goal.name}"</Text>
      <Text style={styles.sheetSub}>
        Atual: {fmt(goal.currentAmount)} · Meta: {fmt(goal.targetAmount)}
      </Text>

      <Text style={styles.label}>Valor (R$)</Text>
      <TextInput
        style={styles.input}
        placeholder="0,00"
        placeholderTextColor={COLORS.muted}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={styles.label}>Observação (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Poupei do salário"
        placeholderTextColor={COLORS.muted}
        value={note}
        onChangeText={setNote}
      />

      <View style={styles.sheetActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={mutation.isPending}
        >
          <Text style={styles.saveBtnText}>
            {mutation.isPending ? 'Salvando...' : 'Confirmar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function GoalsScreen() {
  const router  = useRouter()
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['goals'],
    queryFn:  () => goalsApi.list().then((r) => r.data),
  })

  const active    = data?.filter((g) => !g.isCompleted) ?? []
  const completed = data?.filter((g) =>  g.isCompleted) ?? []

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Metas</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-goal')}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
        >
          {active.length === 0 && completed.length === 0 && (
            <View style={styles.empty}>
              <Feather name="target" size={40} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>Nenhuma meta ainda</Text>
              <Text style={styles.emptyText}>Crie sua primeira meta financeira</Text>
            </View>
          )}

          {active.map((g) => (
            <GoalCard key={g.id} goal={g} onContribute={setSelectedGoal} />
          ))}

          {completed.length > 0 && (
            <TouchableOpacity
              style={styles.toggleSection}
              onPress={() => setShowCompleted((v) => !v)}
            >
              <Text style={styles.toggleText}>
                {showCompleted ? 'Ocultar concluídas' : `Ver ${completed.length} concluída${completed.length !== 1 ? 's' : ''}`}
              </Text>
              <Feather name={showCompleted ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
            </TouchableOpacity>
          )}

          {showCompleted && completed.map((g) => (
            <GoalCard key={g.id} goal={g} onContribute={setSelectedGoal} />
          ))}
        </ScrollView>
      )}

      {selectedGoal && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setSelectedGoal(null)} />
          <ContributeSheet goal={selectedGoal} onClose={() => setSelectedGoal(null)} />
        </View>
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
  title:  { fontSize: 22, fontWeight: '700', color: COLORS.text },
  addBtn: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },

  content: { paddingHorizontal: 20, paddingBottom: 32 },

  goalCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  goalTop:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  goalIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.card2, justifyContent: 'center', alignItems: 'center',
  },
  goalIcon:     { fontSize: 22 },
  goalInfo:     { flex: 1 },
  goalName:     { fontSize: 15, fontWeight: '600', color: COLORS.text },
  goalSub:      { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  goalDeadline: { fontSize: 11, color: COLORS.muted2, marginTop: 2 },

  progressBg: {
    height: 6, borderRadius: 3, backgroundColor: COLORS.border, marginBottom: 10, overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },

  goalBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pctText:    { fontSize: 13, fontWeight: '700' },

  contributeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: COLORS.brandDim,
  },
  contributeBtnText: { fontSize: 13, color: COLORS.brand, fontWeight: '600' },

  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  completedText:  { fontSize: 13, color: COLORS.success, fontWeight: '600' },

  toggleSection: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, paddingVertical: 12, marginBottom: 4,
  },
  toggleText: { fontSize: 13, color: COLORS.muted },

  empty:      { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  emptyText:  { fontSize: 13, color: COLORS.muted },

  // Contribute sheet
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.muted2,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  sheetSub:   { fontSize: 13, color: COLORS.muted, marginBottom: 20 },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.card2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },

  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.brand, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
