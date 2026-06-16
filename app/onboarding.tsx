import { useState } from 'react'
import {
  View, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { settingsApi, incomeSourcesApi, billsApi, goalsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

const TOTAL_STEPS = 3

function currentMonthDate(day: number) {
  const now = new Date()
  const d = Math.max(1, Math.min(day, 28))
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function OnboardingScreen() {
  const router = useRouter()
  const { user, setAuth, token } = useAuthStore()
  const [step, setStep] = useState(0)

  // Step 1 — Income
  const [incomeName,   setIncomeName]   = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeDay,    setIncomeDay]    = useState('')

  // Step 2 — Bill
  const [billName,   setBillName]   = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [billDay,    setBillDay]    = useState('')

  // Step 3 — Goal
  const [goalName,   setGoalName]   = useState('')
  const [goalAmount, setGoalAmount] = useState('')

  const finishMutation = useMutation({
    mutationFn: () => settingsApi.update({ hasOnboarded: true }),
    onSuccess: () => {
      if (user && token) setAuth(token, { ...user, hasOnboarded: true })
      router.replace('/(tabs)')
    },
    onError: () => {
      if (user && token) setAuth(token, { ...user, hasOnboarded: true })
      router.replace('/(tabs)')
    },
  })

  const incomeMutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(incomeAmount.replace(',', '.'))
      if (!incomeName.trim())     throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')
      const day = incomeDay ? parseInt(incomeDay, 10) : undefined
      return incomeSourcesApi.create({ name: incomeName.trim(), type: 'SALARY', amount: amt, isRecurring: true, dayOfMonth: day })
    },
    onSuccess: () => setStep(2),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const billMutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(billAmount.replace(',', '.'))
      if (!billName.trim())       throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')
      const day = billDay ? parseInt(billDay, 10) : new Date().getDate()
      return billsApi.create({ name: billName.trim(), amount: amt, dueDate: currentMonthDate(day), isRecurring: true })
    },
    onSuccess: () => setStep(3),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const goalMutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(goalAmount.replace(',', '.'))
      if (!goalName.trim())       throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')
      return goalsApi.create({ name: goalName.trim(), targetAmount: amt })
    },
    onSuccess: () => setStep(4),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  // ── Welcome ──────────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.welcome}>
          <Text style={styles.welcomeIcon}>🏰</Text>
          <Text style={styles.welcomeTitle}>Bem-vindo ao Rook Money</Text>
          <Text style={styles.welcomeDesc}>
            Vamos configurar sua conta em 3 passos rápidos para você ter o controle total das suas finanças.
          </Text>

          <View style={styles.stepPreview}>
            {[
              { icon: '💰', label: 'Renda' },
              { icon: '📄', label: 'Conta' },
              { icon: '🎯', label: 'Meta' },
            ].map((s, i) => (
              <View key={i} style={styles.stepPreviewItem}>
                <View style={styles.stepPreviewIcon}>
                  <Text style={styles.stepPreviewEmoji}>{s.icon}</Text>
                </View>
                <Text style={styles.stepPreviewLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtnFull} onPress={() => setStep(1)} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Vamos lá</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipAll} onPress={() => finishMutation.mutate()} disabled={finishMutation.isPending}>
            <Text style={styles.skipAllText}>Pular configuração</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <View style={styles.screen}>
        <View style={styles.done}>
          <Text style={styles.doneIcon}>🎉</Text>
          <Text style={styles.doneTitle}>Tudo pronto!</Text>
          <Text style={styles.doneDesc}>
            Sua conta está configurada. Explore o dashboard, adicione mais lançamentos e acompanhe seu progresso.
          </Text>

          <View style={styles.doneTips}>
            <Text style={styles.doneTipsLabel}>PRÓXIMOS PASSOS</Text>
            {[
              '📊 Veja seu resumo no Dashboard',
              '💸 Registre suas transações do dia a dia',
              '🔔 Ative lembretes de vencimento nas configurações',
            ].map((tip) => (
              <Text key={tip} style={styles.doneTip}>{tip}</Text>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtnFull, { backgroundColor: COLORS.success }, finishMutation.isPending && { opacity: 0.6 }]}
            onPress={() => finishMutation.mutate()}
            disabled={finishMutation.isPending}
            activeOpacity={0.85}
          >
            {finishMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Ir para o Dashboard</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Steps 1-3 ────────────────────────────────────────────────────────────
  const stepConfig = {
    1: { color: COLORS.success, emoji: '💰', tag: 'PASSO 1', title: 'Qual é sua renda principal?',  desc: 'Salário, freelance, ou qualquer fonte regular.' },
    2: { color: COLORS.danger,  emoji: '📄', tag: 'PASSO 2', title: 'Sua maior conta fixa',         desc: 'Aluguel, financiamento, ou outra despesa mensal.' },
    3: { color: COLORS.brand,   emoji: '🎯', tag: 'PASSO 3', title: 'Crie sua primeira meta',        desc: 'Um objetivo financeiro para focar sua energia.' },
  }[step as 1|2|3]!

  const activeMutation = step === 1 ? incomeMutation : step === 2 ? billMutation : goalMutation

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.stepHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Feather name="arrow-left" size={18} color={COLORS.muted} />
          </TouchableOpacity>
          <View style={styles.progressBar}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  i < step     && styles.progressSegmentDone,
                  i === step - 1 && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressLabel}>{step}/{TOTAL_STEPS}</Text>
        </View>

        {/* Step badge */}
        <View style={styles.stepIconRow}>
          <View style={[styles.stepBadge, { backgroundColor: stepConfig.color + '20' }]}>
            <Text style={styles.stepBadgeEmoji}>{stepConfig.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stepTag, { color: stepConfig.color }]}>{stepConfig.tag}</Text>
            <Text style={styles.stepTitle}>{stepConfig.title}</Text>
            <Text style={styles.stepDesc}>{stepConfig.desc}</Text>
          </View>
        </View>

        {/* ── Step 1: Income ── */}
        {step === 1 && (
          <>
            <Text style={styles.label}>Nome da fonte de renda *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Salário CLT, Freelance..."
              placeholderTextColor={COLORS.muted}
              value={incomeName}
              onChangeText={setIncomeName}
            />

            <Text style={styles.label}>Valor mensal (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="3.000,00"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              value={incomeAmount}
              onChangeText={setIncomeAmount}
            />

            <Text style={styles.label}>Dia do recebimento (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 5"
              placeholderTextColor={COLORS.muted}
              keyboardType="number-pad"
              value={incomeDay}
              onChangeText={setIncomeDay}
            />

            <View style={styles.tip}>
              <Text style={styles.tipEmoji}>💡</Text>
              <Text style={styles.tipText}>Você pode adicionar mais fontes de renda depois no menu Rendas.</Text>
            </View>
          </>
        )}

        {/* ── Step 2: Bill ── */}
        {step === 2 && (
          <>
            <Text style={styles.label}>Nome da conta *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Aluguel, Financiamento..."
              placeholderTextColor={COLORS.muted}
              value={billName}
              onChangeText={setBillName}
            />

            <Text style={styles.label}>Valor (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="1.200,00"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              value={billAmount}
              onChangeText={setBillAmount}
            />

            <Text style={styles.label}>Dia de vencimento (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 10"
              placeholderTextColor={COLORS.muted}
              keyboardType="number-pad"
              value={billDay}
              onChangeText={setBillDay}
            />

            <View style={styles.tip}>
              <Text style={styles.tipEmoji}>💡</Text>
              <Text style={styles.tipText}>A conta será marcada como recorrente e vai aparecer todo mês automaticamente.</Text>
            </View>
          </>
        )}

        {/* ── Step 3: Goal ── */}
        {step === 3 && (
          <>
            <View style={styles.goalSuggestions}>
              {[
                { icon: '🏖️', label: 'Viagem' },
                { icon: '🏠', label: 'Imóvel' },
                { icon: '🛡️', label: 'Reserva' },
              ].map((g) => (
                <TouchableOpacity key={g.label} style={styles.goalChip} onPress={() => setGoalName(g.label)}>
                  <Text style={styles.goalChipEmoji}>{g.icon}</Text>
                  <Text style={styles.goalChipLabel}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Nome da meta *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Fundo de emergência..."
              placeholderTextColor={COLORS.muted}
              value={goalName}
              onChangeText={setGoalName}
            />

            <Text style={styles.label}>Valor alvo (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="10.000,00"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              value={goalAmount}
              onChangeText={setGoalAmount}
            />
          </>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => setStep(s => Math.min(s + 1, 4))}
          >
            <Text style={styles.skipBtnText}>Pular</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, activeMutation.isPending && { opacity: 0.6 }]}
            onPress={() => activeMutation.mutate()}
            disabled={activeMutation.isPending}
          >
            {activeMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>{step === 3 ? 'Criar meta' : 'Adicionar'}</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  // Welcome
  welcome: {
    flex: 1, paddingHorizontal: 32, paddingTop: 80, paddingBottom: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  welcomeIcon:  { fontSize: 64, marginBottom: 24 },
  welcomeTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 12 },
  welcomeDesc:  { fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 24, marginBottom: 32 },

  stepPreview: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: COLORS.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: COLORS.border,
    width: '100%', marginBottom: 32,
  },
  stepPreviewItem:  { alignItems: 'center', gap: 8 },
  stepPreviewIcon:  {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center',
  },
  stepPreviewEmoji: { fontSize: 22 },
  stepPreviewLabel: { fontSize: 12, color: COLORS.muted },

  primaryBtnFull: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 16,
    width: '100%', justifyContent: 'center', marginBottom: 12,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  skipAll:     { paddingVertical: 8 },
  skipAllText: { fontSize: 13, color: COLORS.muted2 },

  // Steps
  stepContent: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  stepHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  progressBar:           { flex: 1, flexDirection: 'row', gap: 4 },
  progressSegment:       { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.card },
  progressSegmentDone:   { backgroundColor: COLORS.brand },
  progressSegmentActive: { backgroundColor: COLORS.brand },
  progressLabel:         { fontSize: 11, color: COLORS.muted2 },

  stepIconRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 12 },
  stepBadge: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  stepBadgeEmoji: { fontSize: 22 },
  stepTag:   { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  stepDesc:  { fontSize: 13, color: COLORS.muted, lineHeight: 18 },

  label: { fontSize: 12, color: COLORS.muted, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },

  tip: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, marginTop: 12,
  },
  tipEmoji: { fontSize: 14, marginTop: 1 },
  tipText:  { flex: 1, fontSize: 12, color: COLORS.muted, lineHeight: 18 },

  footer: { flexDirection: 'row', gap: 12, marginTop: 28 },
  skipBtn: {
    flex: 1, height: 50, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  skipBtnText: { fontSize: 14, color: COLORS.muted, fontWeight: '500' },
  primaryBtn: {
    flex: 2, height: 50, borderRadius: 12,
    backgroundColor: COLORS.brand, justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', gap: 8,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 8, elevation: 3,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  goalSuggestions: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 4 },
  goalChip: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10,
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  goalChipEmoji: { fontSize: 20 },
  goalChipLabel: { fontSize: 12, color: COLORS.muted },

  // Done
  done: {
    flex: 1, paddingHorizontal: 32, paddingTop: 80, paddingBottom: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  doneIcon:  { fontSize: 72, marginBottom: 24 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 12 },
  doneDesc:  { fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  doneTips:  {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: COLORS.border, width: '100%', marginBottom: 32, gap: 8,
  },
  doneTipsLabel: { fontSize: 10, fontWeight: '700', color: COLORS.muted2, letterSpacing: 1, marginBottom: 4 },
  doneTip:       { fontSize: 14, color: COLORS.muted, lineHeight: 20 },
})
