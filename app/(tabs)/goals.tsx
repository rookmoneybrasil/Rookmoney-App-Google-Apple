import { useState, useRef, useCallback } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { CurrencyInput } from '@/components/currency-input'
import { PressableScale } from '@/components/pressable-scale'
import { AnimatedProgress } from '@/components/animated-progress'
import { triggerConfetti } from '@/components/confetti'
import { useRouter, useFocusEffect } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS, GOAL_COLORS } from '@/lib/constants'
import { ListSkeleton } from '@/components/skeleton'
import { goalsApi, categoriesApi, type Goal, type Category } from '@/lib/api'
import { hapticSuccess, hapticLight } from '@/lib/haptics'
import { FadeIn } from '@/components/animated-entry'
import { EmptyState } from '@/components/empty-state'
import { InfoSheet, type InfoRow } from '@/components/info-sheet'

function goalInfoProps(goal: Goal) {
  const pct  = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
  const rows: InfoRow[] = [
    { label: 'Guardado',   value: fmt(goal.currentAmount) },
    { label: 'Meta',       value: fmt(goal.targetAmount) },
    { label: 'Progresso',  value: `${Math.round(pct)}%` },
    { label: 'Falta',      value: fmt(Math.max(goal.targetAmount - goal.currentAmount, 0)) },
    { label: 'Prazo',      value: goal.deadline ? format(new Date(goal.deadline), "MMMM 'de' yyyy", { locale: ptBR }) : '' },
    { label: 'Descrição',  value: goal.description ?? '' },
  ]
  return {
    typeLabel:   'Meta',
    title:       goal.name,
    amount:      fmt(goal.currentAmount),
    amountColor: COLORS.brand,
    badge:       goal.isCompleted ? { label: 'Concluída', color: COLORS.success } : { label: `${Math.round(pct)}%`, color: COLORS.brand },
    rows,
  }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

function CircularProgress({ pct, size = 44, strokeWidth = 4, color }: { pct: number; size?: number; strokeWidth?: number; color: string }) {
  const r    = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(Math.max(pct, 0), 100) / 100) * circ
  const c    = size / 2

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke={COLORS.border} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={c} cy={c} r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={styles.pctText}>{Math.round(pct)}%</Text>
    </View>
  )
}

function EditGoalSheet({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [name,        setName]        = useState(goal.name)
  const [icon,        setIcon]        = useState(goal.icon ?? '')
  const [target,      setTarget]      = useState(String(goal.targetAmount))
  const [deadline,    setDeadline]    = useState(goal.deadline?.slice(0, 10) ?? '')
  const [description, setDescription] = useState(goal.description ?? '')
  const [color,       setColor]       = useState(goal.color ?? GOAL_COLORS[0])
  const qc = useQueryClient()

  const refetchAll = async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ['goals'], type: 'active' }),
      qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' }),
    ])
  }

  const mutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(target.replace(',', '.'))
      if (!name.trim())           throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0) throw new Error('Meta inválida')
      return goalsApi.update(goal.id, {
        name:        name.trim(),
        targetAmount: amt,
        deadline:    deadline.trim() || undefined,
        description: description.trim() || undefined,
        icon:        icon.trim() || undefined,
        color,
      })
    },
    onSuccess: async () => {
      await refetchAll()
      onClose()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>Editar meta</Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Nome *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Viagem, Reserva..."
            placeholderTextColor={COLORS.muted}
            value={name}
            onChangeText={setName}
          />
        </View>
        <View style={{ width: 64 }}>
          <Text style={styles.label}>Ícone</Text>
          <TextInput
            style={[styles.input, styles.iconInput]}
            placeholder="🎯"
            placeholderTextColor={COLORS.muted}
            value={icon}
            onChangeText={setIcon}
            maxLength={2}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Valor alvo (R$) *</Text>
          <CurrencyInput
            style={styles.input}
            placeholder="0,00"
            value={target}
            onChangeValue={setTarget}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Prazo</Text>
          <TextInput
            style={styles.input}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={COLORS.muted}
            value={deadline}
            onChangeText={setDeadline}
          />
        </View>
      </View>

      <Text style={styles.label}>Cor</Text>
      <View style={styles.colorRow}>
        {GOAL_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setColor(c)}
            style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchActive]}
          />
        ))}
      </View>

      <Text style={styles.label}>Descrição (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Motivo ou detalhe"
        placeholderTextColor={COLORS.muted}
        value={description}
        onChangeText={setDescription}
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
          <Text style={styles.saveBtnText}>
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function GoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
}: {
  goal: Goal
  onContribute: (goal: Goal) => void
  onEdit: (goal: Goal) => void
  onDelete: (goal: Goal) => void
}) {
  const target  = goal.targetAmount
  const current = goal.currentAmount
  const pct     = target > 0 ? (current / target) * 100 : 0
  const contributions = goal.contributions ?? []
  const [infoOpen, setInfoOpen] = useState(false)

  return (
    <PressableScale style={styles.goalCard} onPress={() => setInfoOpen(true)}>
      <View style={styles.goalTop}>
        <View style={[styles.goalIconWrap, { backgroundColor: (goal.color ?? '#3B82F6') + '20' }]}>
          <Text style={styles.goalIcon}>{goal.icon ?? '🎯'}</Text>
        </View>
        <View style={styles.goalInfo}>
          <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
          {!!goal.description && (
            <Text style={styles.goalDesc} numberOfLines={1}>{goal.description}</Text>
          )}
        </View>
        <CircularProgress pct={pct} color={COLORS.brand} />
      </View>

      <AnimatedProgress value={Math.min(pct, 100)} max={100} height={6} color={COLORS.brand} bgColor={COLORS.border} borderRadius={3} style={{ marginTop: 14, marginBottom: 6 }} />
      <View style={styles.amountsRow}>
        <Text style={styles.amountCurrent}>{fmt(current)}</Text>
        <Text style={styles.amountTarget}>meta: {fmt(target)}</Text>
      </View>

      <View style={styles.goalFooter}>
        {goal.deadline ? (
          <View style={styles.deadlineRow}>
            <Feather name="calendar" size={12} color={COLORS.muted2} />
            <Text style={styles.deadlineText}>
              {format(new Date(goal.deadline), 'MMM yyyy', { locale: ptBR })}
            </Text>
          </View>
        ) : <View />}

        <View style={styles.goalActions}>
          {!goal.isCompleted && (
            <TouchableOpacity style={styles.iconBtn} onPress={() => onContribute(goal)}>
              <Feather name="plus" size={14} color={COLORS.muted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={() => onEdit(goal)}>
            <Feather name="edit-2" size={13} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onDelete(goal)}>
            <Feather name="trash-2" size={13} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {contributions.length > 0 && (
        <View style={styles.contribSection}>
          <View style={styles.contribHeader}>
            <Feather name="trending-up" size={11} color={COLORS.muted2} />
            <Text style={styles.contribHeaderText}>Movimentações</Text>
          </View>
          {contributions.map((c) => {
            const isWithdrawal = c.amount < 0
            return (
              <View key={c.id} style={styles.contribRow}>
                <Text style={styles.contribDate} numberOfLines={1}>
                  {isWithdrawal ? '↓ ' : ''}
                  {format(new Date(c.createdAt), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  {c.note && c.note !== 'Retirada' ? ` · ${c.note}` : ''}
                </Text>
                <Text style={[styles.contribAmount, { color: isWithdrawal ? COLORS.danger : COLORS.success }]}>
                  {isWithdrawal ? '' : '+'}{fmt(Math.abs(c.amount))}
                </Text>
              </View>
            )
          })}
        </View>
      )}
      <InfoSheet visible={infoOpen} onClose={() => setInfoOpen(false)} {...goalInfoProps(goal)} />
    </PressableScale>
  )
}

function CompletedGoalRow({ goal }: { goal: Goal }) {
  return (
    <View style={styles.completedRow}>
      <View style={[styles.completedIconWrap, { backgroundColor: (goal.color ?? '#22C55E') + '20' }]}>
        <Text style={styles.completedIcon}>{goal.icon ?? '✓'}</Text>
      </View>
      <Text style={styles.completedName} numberOfLines={1}>{goal.name}</Text>
      <View style={styles.completedBadge}>
        <Feather name="check-circle" size={12} color={COLORS.success} />
        <Text style={styles.completedBadgeText}>Concluída</Text>
      </View>
      <Text style={styles.completedAmount}>{fmt(goal.targetAmount)}</Text>
    </View>
  )
}

const CONTRIBUTE_SOURCES = [
  { label: '💰 Salário',   value: 'Salário' },
  { label: '💵 Extra',     value: 'Extra' },
  { label: '💸 Economia',  value: 'Economia' },
  { label: '🎁 Presente',  value: 'Presente' },
  { label: '📈 Rendimento', value: 'Rendimento' },
]

function ContributeSheet({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [amount, setAmount]       = useState('')
  const [note, setNote]           = useState('')
  const [source, setSource]       = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [mode, setMode]           = useState<'contribute' | 'withdraw'>('contribute')
  const qc = useQueryClient()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then(r => r.data),
  })

  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0)

  const finalNote = mode === 'contribute'
    ? [source, note.trim()].filter(Boolean).join(' · ') || undefined
    : undefined

  const refetchAll = async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ['goals'], type: 'active' }),
      qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' }),
    ])
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const val = parseFloat(amount.replace(',', '.'))
      if (mode === 'contribute') await goalsApi.contribute(goal.id, val, finalNote, categoryId)
      else                        await goalsApi.withdraw(goal.id, val)
    },
    onSuccess: async () => {
      hapticSuccess()
      await refetchAll()
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
      <Text style={styles.sheetTitle}>
        {mode === 'contribute' ? 'Contribuir para meta' : 'Retirar da meta'}
      </Text>
      <Text style={styles.sheetSub}>
        {goal.name} · {mode === 'contribute' ? `faltam ${fmt(remaining)}` : `disponível ${fmt(goal.currentAmount)}`}
      </Text>

      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'contribute' && styles.modeBtnActiveSuccess]}
          onPress={() => setMode('contribute')}
        >
          <Feather name="plus" size={14} color={mode === 'contribute' ? COLORS.success : COLORS.muted} />
          <Text style={[styles.modeBtnText, mode === 'contribute' && { color: COLORS.success }]}>Aportar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'withdraw' && styles.modeBtnActiveDanger]}
          onPress={() => setMode('withdraw')}
        >
          <Feather name="minus" size={14} color={mode === 'withdraw' ? COLORS.danger : COLORS.muted} />
          <Text style={[styles.modeBtnText, mode === 'withdraw' && { color: COLORS.danger }]}>Retirar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Valor (R$)</Text>
      <CurrencyInput
        style={styles.input}
        placeholder="0,00"
        value={amount}
        onChangeValue={setAmount}
      />

      {mode === 'contribute' && (
        <>
          <Text style={styles.label}>Origem do aporte</Text>
          <View style={styles.sourceRow}>
            {CONTRIBUTE_SOURCES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[styles.sourceChip, source === s.value && styles.sourceChipActive]}
                onPress={() => setSource(source === s.value ? '' : s.value)}
              >
                <Text style={[styles.sourceChipText, source === s.value && styles.sourceChipTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Categoria da transação</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View style={styles.sourceRow}>
              {(categories ?? []).slice(0, 8).map((c: Category) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.sourceChip, categoryId === c.id && styles.sourceChipActive]}
                  onPress={() => setCategoryId(categoryId === c.id ? undefined : c.id)}
                >
                  <Text style={[styles.sourceChipText, categoryId === c.id && styles.sourceChipTextActive]}>
                    {c.icon} {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.label}>Observação (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: bônus de dezembro"
            placeholderTextColor={COLORS.muted}
            value={note}
            onChangeText={setNote}
          />
        </>
      )}

      {mode === 'withdraw' && (
        <Text style={styles.hintText}>💡 A retirada cria uma receita revertendo a despesa do aporte original.</Text>
      )}

      <View style={styles.sheetActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[mode === 'withdraw' ? styles.saveBtnDanger : styles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={mutation.isPending}
        >
          <Text style={styles.saveBtnText}>
            {mutation.isPending ? 'Salvando...' : mode === 'contribute' ? 'Adicionar aporte' : 'Confirmar retirada'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function GoalsScreen() {
  const router  = useRouter()
  const qc      = useQueryClient()
  const scrollRef = useRef<any>(null)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [editingGoal,  setEditingGoal]  = useState<Goal | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false })
  }, []))

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['goals', 'all'],
    queryFn:  () => goalsApi.list(true).then((r) => r.data),
  })

  const refetchAll = async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ['goals'], type: 'active' }),
      qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' }),
    ])
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsApi.delete(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['goals', 'all'] })
      const prev = qc.getQueryData<{ id: string }[]>(['goals', 'all'])
      if (prev) qc.setQueryData(['goals', 'all'], prev.filter((g) => g.id !== id))
      return { prev }
    },
    onError: (e: Error, _id, ctx?: { prev?: { id: string }[] }) => {
      if (ctx?.prev) qc.setQueryData(['goals', 'all'], ctx.prev)
      Alert.alert('Erro', e.message)
    },
    onSettled: () => refetchAll(),
  })

  function handleDelete(goal: Goal) {
    Alert.alert('Excluir meta', `Excluir "${goal.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(goal.id) },
    ])
  }

  const active    = data?.filter((g) => !g.isCompleted) ?? []
  const completed = data?.filter((g) =>  g.isCompleted) ?? []

  return (
    <View style={styles.screen}>
      <FadeIn delay={0}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Metas</Text>
          <Text style={styles.subtitle}>
            {active.length} ativa{active.length !== 1 ? 's' : ''} · {completed.length} concluída{completed.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.description}>
            Defina objetivos financeiros e acompanhe o progresso. Cada aporte registrado vira uma despesa e alimenta o saldo da meta.
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-goal')}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Nova meta</Text>
        </TouchableOpacity>
      </View>
      </FadeIn>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
        >
          {active.length === 0 && completed.length === 0 && (
            <EmptyState
              mood="determined"
              title="Nenhuma meta ainda"
              subtitle="Crie sua primeira meta e comece a economizar!"
            />
          )}

          {active.map((g, i) => (
            <FadeIn key={g.id} delay={80 + i * 80}>
            <GoalCard goal={g} onContribute={setSelectedGoal} onEdit={setEditingGoal} onDelete={handleDelete} />
            </FadeIn>
          ))}

          <TouchableOpacity style={styles.addCard} onPress={() => router.push('/new-goal')}>
            <View style={styles.addCardIcon}>
              <Feather name="plus" size={20} color={COLORS.muted} />
            </View>
            <Text style={styles.addCardText}>Nova meta</Text>
          </TouchableOpacity>

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

          {showCompleted && completed.length > 0 && (
            <FadeIn delay={80}>
            <View style={styles.completedSection}>
              <Text style={styles.completedSectionTitle}>Concluídas</Text>
              {completed.map((g) => (
                <CompletedGoalRow key={g.id} goal={g} />
              ))}
            </View>
            </FadeIn>
          )}
        </ScrollView>
      )}

      {selectedGoal && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setSelectedGoal(null)} />
          <ContributeSheet goal={selectedGoal} onClose={() => setSelectedGoal(null)} />
        </View>
      )}

      {editingGoal && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setEditingGoal(null)} />
          <EditGoalSheet goal={editingGoal} onClose={() => setEditingGoal(null)} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  title:       { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle:    { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  description: { fontSize: 11, color: COLORS.muted2, marginTop: 6, lineHeight: 15 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.brand, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, flexShrink: 0,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  content: { paddingHorizontal: 20, paddingBottom: 100 },

  // Goal card
  goalCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  goalTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  goalIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  goalIcon:     { fontSize: 20 },
  goalInfo:     { flex: 1, justifyContent: 'center' },
  goalName:     { fontSize: 14, fontWeight: '600', color: COLORS.text },
  goalDesc:     { fontSize: 11, color: COLORS.muted2, marginTop: 2 },
  pctText:      { fontSize: 10, fontWeight: '700', color: COLORS.text },

  progressBg: {
    height: 6, borderRadius: 3, backgroundColor: COLORS.border,
    marginTop: 14, marginBottom: 6, overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },

  amountsRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  amountCurrent: { fontSize: 11, color: COLORS.text },
  amountTarget:  { fontSize: 11, color: COLORS.muted2 },

  goalFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  deadlineRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deadlineText: { fontSize: 11, color: COLORS.muted2 },
  goalActions:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.card2,
    justifyContent: 'center', alignItems: 'center',
  },

  // Mini extrato
  contribSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  contribHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  contribHeaderText: {
    fontSize: 10, fontWeight: '600', color: COLORS.muted2,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  contribRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  contribDate:   { fontSize: 11, color: COLORS.muted2, flex: 1, marginRight: 8 },
  contribAmount: { fontSize: 11, fontWeight: '600' },

  // Add new goal card
  addCard: {
    alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border,
    paddingVertical: 28, marginBottom: 12, minHeight: 120,
  },
  addCardIcon: {
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.muted2,
    justifyContent: 'center', alignItems: 'center',
  },
  addCardText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },

  // Completed
  toggleSection: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, paddingVertical: 12, marginBottom: 4,
  },
  toggleText: { fontSize: 13, color: COLORS.muted },
  completedSection: { gap: 8, marginTop: 4 },
  completedSectionTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  completedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10, opacity: 0.7,
  },
  completedIconWrap: {
    width: 28, height: 28, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  completedIcon: { fontSize: 14 },
  completedName: { fontSize: 13, color: COLORS.text, flex: 1 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  completedBadgeText: { fontSize: 11, color: COLORS.success, fontWeight: '600' },
  completedAmount: { fontSize: 13, fontWeight: '700', color: COLORS.success },

  empty:      { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  emptyText:  { fontSize: 13, color: COLORS.muted },

  // Sheets
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
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  sheetSub:   { fontSize: 13, color: COLORS.muted, marginTop: 4 },

  row: { flexDirection: 'row', gap: 12 },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.card2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },
  iconInput: { textAlign: 'center', fontSize: 18, paddingHorizontal: 8 },

  colorRow: { flexDirection: 'row', gap: 10 },
  colorSwatch: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchActive: { borderColor: 'rgba(255,255,255,0.5)' },

  // Mode toggle (contribute/withdraw)
  modeToggle: { flexDirection: 'row', gap: 8, backgroundColor: COLORS.card2, borderRadius: 12, padding: 4, marginTop: 16 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 9,
  },
  modeBtnActiveSuccess: { backgroundColor: 'rgba(34,197,94,0.15)' },
  modeBtnActiveDanger:  { backgroundColor: 'rgba(239,68,68,0.15)' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  hintText: {
    fontSize: 11, color: COLORS.muted, backgroundColor: COLORS.card2,
    borderRadius: 10, padding: 10, marginTop: 12, lineHeight: 16,
  },
  sourceRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sourceChip:         { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border },
  sourceChipActive:   { backgroundColor: COLORS.success + '20', borderColor: COLORS.success + '60' },
  sourceChipText:     { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  sourceChipTextActive: { color: COLORS.success },

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
  saveBtnDanger: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.danger, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
