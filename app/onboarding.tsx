import { useState } from 'react'
import {
  View, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ImageBackground, Switch,
} from 'react-native'
import { type ImageSourcePropType } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Text, TextInput } from '@/components/text'
import { useRouter } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { settingsApi, incomeSourcesApi, billsApi, goalsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

const BG_IMAGES: Record<number, ImageSourcePropType> = {
  0: require('../assets/onboarding/bg-usando-app.png'),
  1: require('../assets/onboarding/bg-organizando-contas.png'),
  2: require('../assets/onboarding/bg-fugindo-contas.png'),
  3: require('../assets/onboarding/bg-comprando.png'),
  4: require('../assets/onboarding/bg-finalizacao.png'),
}

const TOTAL_STEPS = 3

const INCOME_TYPES = [
  { value: 'EMPLOYMENT', label: 'CLT / Emprego', emoji: '💼' },
  { value: 'FREELANCE',  label: 'Freelance',     emoji: '🧑‍💻' },
  { value: 'RENTAL',     label: 'Aluguel',        emoji: '🏠' },
  { value: 'OTHER',      label: 'Outro',          emoji: '💡' },
]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function OnboardingScreen() {
  const router = useRouter()
  const { user, setAuth, token } = useAuthStore()
  const [step, setStep] = useState(0)

  // Step 1 — Income
  const [incomeName,       setIncomeName]       = useState('')
  const [incomeAmount,     setIncomeAmount]     = useState('')
  const [incomeType,       setIncomeType]       = useState('EMPLOYMENT')
  const [incomeIsRecurring, setIncomeRecurring] = useState(true)
  const [incomeDay,        setIncomeDay]        = useState('')
  const [incomeStartDate,  setIncomeStartDate]  = useState('')

  // Step 2 — Bill
  const [billName,             setBillName]         = useState('')
  const [billAmount,           setBillAmount]       = useState('')
  const [billDueDate,          setBillDueDate]      = useState(todayStr())
  const [billIsRecurring,      setBillRecurring]    = useState(false)
  const [showBillInstallments, setShowBillInst]     = useState(false)
  const [billInstallments,     setBillInstallments] = useState('')
  const [billAlreadyPaid,      setBillAlreadyPaid]  = useState('0')

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
      return incomeSourcesApi.create({
        name:        incomeName.trim(),
        type:        incomeType,
        amount:      amt,
        isRecurring: incomeIsRecurring,
        dayOfMonth:  day,
        startDate:   incomeStartDate.trim() || undefined,
      })
    },
    onSuccess: () => setStep(2),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const billMutation = useMutation({
    mutationFn: () => {
      const amt  = parseFloat(billAmount.replace(',', '.'))
      if (!billName.trim())       throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')
      if (!billDueDate.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error('Data inválida (AAAA-MM-DD)')
      const inst = parseInt(billInstallments) || 1
      const paid = parseInt(billAlreadyPaid)  || 0
      return billsApi.create({
        name:         billName.trim(),
        amount:       amt,
        dueDate:      billDueDate,
        isRecurring:  showBillInstallments ? false : billIsRecurring,
        installments: showBillInstallments && inst > 1 ? inst : undefined,
        alreadyPaid:  showBillInstallments && inst > 1 ? paid : undefined,
      })
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

  const numInst = parseInt(billInstallments) || 1
  const numPaid = parseInt(billAlreadyPaid)  || 0
  const perInst = numInst > 1 && billAmount
    ? (parseFloat(billAmount.replace(',', '.')) / (numInst - numPaid)).toFixed(2)
    : null

  // ── Welcome ──────────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <ImageBackground source={BG_IMAGES[0]} style={styles.screen} resizeMode="cover">
        <LinearGradient
          colors={['transparent', 'rgba(5,8,18,0.55)', COLORS.bg]}
          locations={[0.25, 0.55, 0.85]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.welcome}>
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
      </ImageBackground>
    )
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <ImageBackground source={BG_IMAGES[4]} style={styles.screen} resizeMode="cover">
        <LinearGradient
          colors={['transparent', 'rgba(5,8,18,0.55)', COLORS.bg]}
          locations={[0.25, 0.55, 0.85]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.done}>
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
      </ImageBackground>
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
    <ImageBackground source={BG_IMAGES[step]} style={styles.screen} resizeMode="cover">
      <LinearGradient
        colors={['transparent', 'rgba(5,8,18,0.55)', COLORS.bg]}
        locations={[0.25, 0.55, 0.85]}
        style={StyleSheet.absoluteFillObject}
      />
    <KeyboardAvoidingView style={styles.screenTransparent} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Back button — fixed top left */}
      <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
        <Feather name="arrow-left" size={18} color={COLORS.muted} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">

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
            {/* Recorrente / Eventual */}
            <View style={styles.recRow}>
              {[
                { value: true,  label: 'Recorrente', emoji: '🔁', desc: 'Entra todo mês' },
                { value: false, label: 'Eventual',   emoji: '💡', desc: 'Renda pontual'  },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.recBtn, incomeIsRecurring === opt.value && styles.recBtnActive]}
                  onPress={() => setIncomeRecurring(opt.value)}
                >
                  <Text style={styles.recEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.recLabel, incomeIsRecurring === opt.value && styles.recLabelActive]}>{opt.label}</Text>
                  <Text style={styles.recDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Salário, Freela Design..."
              placeholderTextColor={COLORS.muted}
              value={incomeName}
              onChangeText={setIncomeName}
            />

            <Text style={styles.label}>Tipo de renda</Text>
            <View style={styles.typeGrid}>
              {INCOME_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeBtn, incomeType === t.value && styles.typeBtnActive]}
                  onPress={() => setIncomeType(t.value)}
                >
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text style={[styles.typeLabel, incomeType === t.value && { color: COLORS.brand }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Valor (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              value={incomeAmount}
              onChangeText={setIncomeAmount}
            />

            {incomeIsRecurring && (
              <View style={styles.row2}>
                <View style={styles.col}>
                  <Text style={styles.label}>Dia do recebimento</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 5"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="number-pad"
                    value={incomeDay}
                    onChangeText={setIncomeDay}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Primeiro pagamento</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={COLORS.muted}
                    value={incomeStartDate}
                    onChangeText={setIncomeStartDate}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                </View>
              </View>
            )}
          </>
        )}

        {/* ── Step 2: Bill ── */}
        {step === 2 && (
          <>
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Netflix, Aluguel, Água..."
              placeholderTextColor={COLORS.muted}
              value={billName}
              onChangeText={setBillName}
            />

            <Text style={styles.label}>Valor total (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              value={billAmount}
              onChangeText={setBillAmount}
            />

            <Text style={styles.label}>Vencimento *</Text>
            <TextInput
              style={styles.input}
              placeholder={`AAAA-MM-DD (ex: ${todayStr()})`}
              placeholderTextColor={COLORS.muted}
              value={billDueDate}
              onChangeText={setBillDueDate}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            {/* Parcelado */}
            <TouchableOpacity style={styles.toggleRow} onPress={() => setShowBillInst(v => !v)} activeOpacity={0.8}>
              <View>
                <Text style={styles.switchLabel}>Parcelado</Text>
                <Text style={styles.switchSub}>Dividir em várias parcelas</Text>
              </View>
              <Switch value={showBillInstallments} onValueChange={setShowBillInst}
                trackColor={{ false: COLORS.muted2, true: COLORS.brand }} thumbColor="#fff" />
            </TouchableOpacity>

            {showBillInstallments && (
              <View style={styles.installBox}>
                <View style={styles.installRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Total de parcelas</Text>
                    <TextInput style={styles.input} placeholder="Ex: 6" placeholderTextColor={COLORS.muted}
                      keyboardType="number-pad" value={billInstallments} onChangeText={setBillInstallments} />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Já pagas</Text>
                    <TextInput style={styles.input} placeholder="0" placeholderTextColor={COLORS.muted}
                      keyboardType="number-pad" value={billAlreadyPaid} onChangeText={setBillAlreadyPaid} />
                  </View>
                </View>
                {perInst && numInst > 1 && (
                  <View style={styles.installHint}>
                    <Feather name="info" size={13} color={COLORS.brand} />
                    <Text style={styles.installHintText}>{numInst - numPaid} parcelas de R$ {perInst} serão criadas</Text>
                  </View>
                )}
              </View>
            )}

            {/* Recorrente (só se não parcelado) */}
            {!showBillInstallments && (
              <TouchableOpacity style={styles.toggleRow} onPress={() => setBillRecurring(v => !v)} activeOpacity={0.8}>
                <View>
                  <Text style={styles.switchLabel}>Conta recorrente</Text>
                  <Text style={styles.switchSub}>Se repete todo mês</Text>
                </View>
                <Switch value={billIsRecurring} onValueChange={setBillRecurring}
                  trackColor={{ false: COLORS.muted2, true: COLORS.brand }} thumbColor="#fff" />
              </TouchableOpacity>
            )}
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

      </ScrollView>

      {/* Footer — fora do scroll */}
      <View style={styles.bottomArea}>
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

        {/* Progress bar abaixo dos botões */}
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  i < step       && styles.progressSegmentDone,
                  i === step - 1 && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressLabel}>{step}/{TOTAL_STEPS}</Text>
        </View>
      </View>

    </KeyboardAvoidingView>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  screen:            { flex: 1, backgroundColor: COLORS.bg },
  screenTransparent: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 8, 18, 0.72)',
  },

  // Welcome
  welcome: {
    flex: 1, paddingHorizontal: 32, paddingBottom: 48,
    alignItems: 'center', justifyContent: 'flex-end',
  },
  welcomeTitle: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12 },
  welcomeDesc:  { fontSize: 15, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 24, marginBottom: 32 },

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
  stepContent: { paddingHorizontal: 24, paddingTop: 255, paddingBottom: 16 },
  backBtn: {
    position: 'absolute', top: 52, left: 24, zIndex: 10,
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  bottomArea: { paddingHorizontal: 24, paddingBottom: 32 },
  footer:     { flexDirection: 'row', gap: 12, marginBottom: 14 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar:           { flex: 1, flexDirection: 'row', gap: 4 },
  progressSegment:       { flex: 1, height: 5, borderRadius: 3, backgroundColor: COLORS.card },
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
  stepTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  stepDesc:  { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },

  label: { fontSize: 12, color: '#fff', marginTop: 14, marginBottom: 6 },
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
  tipText:  { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },

  recRow:         { flexDirection: 'row', gap: 10, marginBottom: 4 },
  recBtn:         { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12, borderRadius: 14, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  recBtnActive:   { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  recEmoji:       { fontSize: 18 },
  recLabel:       { fontSize: 13, fontWeight: '600', color: COLORS.text },
  recLabelActive: { color: COLORS.brand },
  recDesc:        { fontSize: 11, color: COLORS.muted },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, flex: 1, minWidth: '45%' },
  typeBtnActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  typeEmoji: { fontSize: 16 },
  typeLabel: { fontSize: 13, color: COLORS.text, fontWeight: '500', flexShrink: 1 },

  row2: { flexDirection: 'row', gap: 12 },
  col:  { flex: 1 },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: COLORS.border },
  switchLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  switchSub:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  installBox:     { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 1, borderColor: COLORS.brand + '33' },
  installRow:     { flexDirection: 'row', alignItems: 'flex-end' },
  installHint:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  installHintText:{ fontSize: 12, color: COLORS.brand, flex: 1 },

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
    flex: 1, paddingHorizontal: 32, paddingBottom: 48,
    alignItems: 'center', justifyContent: 'flex-end',
  },
  doneTitle: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12 },
  doneDesc:  { fontSize: 15, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  doneTips:  {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: COLORS.border, width: '100%', marginBottom: 32, gap: 8,
  },
  doneTipsLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 4 },
  doneTip:       { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
})
