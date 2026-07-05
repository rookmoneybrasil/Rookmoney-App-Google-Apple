import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { CurrencyInput } from '@/components/currency-input'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format } from 'date-fns'
import { COLORS } from '@/lib/constants'
import { billsApi, recurringBillsApi, categoriesApi } from '@/lib/api'
import { QUICK_BILL_SERVICES, getServiceBrand } from '@/lib/service-brands'
import { DateInput } from '@/components/date-input'

type Mode = 'avulso' | 'parcelado' | 'recorrente'

const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'avulso',     label: 'Avulso',     icon: '💸' },
  { key: 'parcelado',  label: 'Parcelado',  icon: '📅' },
  { key: 'recorrente', label: 'Recorrente', icon: '🔁' },
]

export default function NewBillScreen() {
  const router  = useRouter()
  const qc      = useQueryClient()
  const params  = useLocalSearchParams<{ month?: string }>()

  const defaultDate = params.month
    ? `${params.month}-01`
    : format(new Date(), 'yyyy-MM-dd')

  const [mode, setMode]                 = useState<Mode>('avulso')
  const [name, setName]                 = useState('')
  const [amount, setAmount]             = useState('')
  const [dueDate, setDueDate]           = useState(defaultDate)
  const [dayOfMonth, setDayOfMonth]     = useState('1')
  const [categoryId, setCategoryId]     = useState<string | undefined>()
  const [installments, setInstallments] = useState('2')
  const [alreadyPaid, setAlreadyPaid]   = useState('0')
  const [notes, setNotes]               = useState('')
  const [showNotes, setShowNotes]       = useState(false)
  const [showServices, setShowServices] = useState(false)
  const detectedBrand = getServiceBrand(name)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then(r => r.data),
  })

  const refetchAll = async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ['bills'], type: 'active' }),
      qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' }),
    ])
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount.replace(',', '.'))
      if (!name.trim())           throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')

      if (mode === 'recorrente') {
        const day = parseInt(dayOfMonth) || 1
        if (day < 1 || day > 31) throw new Error('Dia inválido (1-31)')
        await recurringBillsApi.create({
          name: name.trim(),
          amount: amt,
          dayOfMonth: day,
          categoryId: categoryId || null,
          notes: notes.trim() || null,
          generateNow: true,
        })
        return
      }

      const inst = parseInt(installments) || 1
      const paid = parseInt(alreadyPaid) || 0

      if (mode === 'parcelado') {
        if (inst < 2) throw new Error('Mínimo 2 parcelas')
        const remaining = inst - paid
        return billsApi.create({
          name:         name.trim(),
          amount:       amt * remaining,
          dueDate:      dueDate,
          isRecurring:  false,
          categoryId:   categoryId || undefined,
          installments: inst,
          alreadyPaid:  paid,
          notes:        notes.trim() || undefined,
        })
      }

      return billsApi.create({
        name:        name.trim(),
        amount:      amt,
        dueDate:     dueDate,
        isRecurring: false,
        categoryId:  categoryId || undefined,
        notes:       notes.trim() || undefined,
      })
    },
    onSuccess: async () => { await refetchAll(); router.back() },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const numInst   = Math.max(parseInt(installments) || 2, 2)
  const numPaid   = Math.min(parseInt(alreadyPaid) || 0, numInst - 1)
  const remaining = numInst - numPaid
  const amt       = parseFloat(amount.replace(',', '.')) || 0

  const submitLabel = mode === 'parcelado'
    ? `Criar ${remaining} parcela${remaining > 1 ? 's' : ''}`
    : mode === 'recorrente' ? 'Salvar conta fixa' : 'Adicionar'

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nova conta a pagar</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Mode tabs */}
        <View style={styles.modeRow}>
          {MODES.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.modeBtn, mode === m.key && styles.modeBtnActive]}
              onPress={() => setMode(m.key)}
            >
              <Text style={styles.modeEmoji}>{m.icon}</Text>
              <Text style={[styles.modeLabel, mode === m.key && styles.modeLabelActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick service */}
        <TouchableOpacity
          style={styles.serviceToggle}
          onPress={() => setShowServices(v => !v)}
          activeOpacity={0.7}
        >
          <Feather name="zap" size={14} color={COLORS.brand} />
          <Text style={styles.serviceToggleText}>Selecionar serviço rápido</Text>
          <Feather name={showServices ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.muted} />
        </TouchableOpacity>

        {showServices && (
          <View style={styles.serviceGrid}>
            {QUICK_BILL_SERVICES.map(({ key, label, brand }) => {
              const active = name.toLowerCase() === label.toLowerCase()
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.servicePill, { borderColor: active ? brand.color : brand.color + '40', backgroundColor: active ? brand.color : brand.color + '18' }]}
                  onPress={() => { setName(active ? '' : label); setShowServices(false) }}
                >
                  <View style={[styles.serviceBadge, { backgroundColor: brand.color }]}>
                    <Text style={[styles.serviceBadgeText, { color: brand.text }]}>{brand.short}</Text>
                  </View>
                  <Text style={[styles.servicePillText, { color: active ? brand.text : brand.color }]} numberOfLines={1}>{label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Name */}
        <Text style={styles.label}>Nome da conta *</Text>
        <View>
          <TextInput
            style={styles.input}
            placeholder="Ex: Netflix, Aluguel, Água..."
            placeholderTextColor={COLORS.muted}
            value={name}
            onChangeText={setName}
          />
          {detectedBrand && (
            <View style={[styles.brandBadgeInline, { backgroundColor: detectedBrand.color }]}>
              <Text style={[styles.brandBadgeText, { color: detectedBrand.text }]}>{detectedBrand.short}</Text>
            </View>
          )}
        </View>

        {/* Amount + Date/Day row */}
        <View style={styles.row2}>
          <View style={styles.col}>
            <Text style={styles.label}>
              {mode === 'parcelado' ? 'Valor por parcela (R$) *' : 'Valor (R$) *'}
            </Text>
            <CurrencyInput
              style={styles.input}
              placeholder="0,00"
              value={amount}
              onChangeValue={setAmount}
            />
          </View>
          <View style={styles.col}>
            {mode === 'recorrente' ? (
              <>
                <Text style={styles.label}>Todo dia *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1-31"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="number-pad"
                  value={dayOfMonth}
                  onChangeText={setDayOfMonth}
                  maxLength={2}
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>
                  {mode === 'parcelado' ? 'Próximo vencimento *' : '1º vencimento *'}
                </Text>
                <DateInput value={dueDate} onChange={setDueDate} />
              </>
            )}
          </View>
        </View>

        {/* Recorrente info */}
        {mode === 'recorrente' && (
          <View style={styles.infoBox}>
            <Feather name="repeat" size={14} color={COLORS.brand} />
            <Text style={styles.infoText}>
              A conta será gerada automaticamente todo mês no dia {dayOfMonth || '1'}.
              {amt > 0 && ` Valor: R$ ${amt.toFixed(2).replace('.', ',')} por mês.`}
            </Text>
          </View>
        )}

        {/* Parcelado options */}
        {mode === 'parcelado' && (
          <View style={styles.installBox}>
            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.label}>Total de parcelas</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="number-pad"
                  value={installments}
                  onChangeText={(v) => {
                    setInstallments(v)
                    const n = parseInt(v) || 2
                    if (numPaid >= n) setAlreadyPaid(String(n - 1))
                  }}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Já pagas</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="number-pad"
                  value={alreadyPaid}
                  onChangeText={setAlreadyPaid}
                />
              </View>
            </View>
            {amt > 0 && (
              <View style={styles.installCalc}>
                <Text style={styles.installCalcText}>
                  <Text style={styles.installCalcBold}>{remaining} parcela{remaining > 1 ? 's' : ''}</Text>
                  {' '}× R$ {amt.toFixed(2).replace('.', ',')} ={' '}
                  <Text style={styles.installCalcTotal}>R$ {(amt * remaining).toFixed(2).replace('.', ',')}</Text>
                </Text>
                {numPaid > 0 && (
                  <Text style={styles.installCalcSub}>
                    {numPaid} parcela{numPaid > 1 ? 's' : ''} já paga{numPaid > 1 ? 's' : ''} não será{numPaid > 1 ? 'ão' : ''} cadastrada{numPaid > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Category */}
        <Text style={[styles.label, { marginTop: 16 }]}>Categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          <TouchableOpacity
            style={[styles.catPill, !categoryId && styles.catPillActive]}
            onPress={() => setCategoryId(undefined)}
          >
            <Text style={[styles.catPillText, !categoryId && styles.catPillTextActive]}>Nenhuma</Text>
          </TouchableOpacity>
          {(categories ?? []).map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catPill, categoryId === c.id && styles.catPillActive]}
              onPress={() => setCategoryId(c.id)}
            >
              <Text style={styles.catEmoji}>{c.icon}</Text>
              <Text style={[styles.catPillText, categoryId === c.id && styles.catPillTextActive]} numberOfLines={1}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Notes */}
        <TouchableOpacity
          style={styles.notesToggle}
          onPress={() => setShowNotes(v => !v)}
          activeOpacity={0.8}
        >
          <Feather name={showNotes ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.muted} />
          <Text style={styles.notesToggleText}>
            {showNotes ? 'Esconder observações' : 'Observações'}
          </Text>
        </TouchableOpacity>

        {showNotes && (
          <TextInput
            style={[styles.input, { minHeight: 72, textAlignVertical: 'top', marginTop: 8 }]}
            placeholder="Observações opcionais..."
            placeholderTextColor={COLORS.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        )}

        <TouchableOpacity
          style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>{submitLabel}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  closeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:    { fontSize: 18, fontWeight: '700', color: COLORS.text },

  content: { padding: 20, paddingBottom: 60 },

  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  modeBtnActive: { borderColor: COLORS.brand + '80', backgroundColor: COLORS.brandDim },
  modeEmoji:     { fontSize: 16 },
  modeLabel:     { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  modeLabelActive: { color: COLORS.brand },

  serviceToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.brand + '12', borderWidth: 1, borderColor: COLORS.brand + '33',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4,
  },
  serviceToggleText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.brand },
  serviceGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    backgroundColor: COLORS.card2, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 4,
    // NÃO usar maxHeight aqui: com flexWrap os pills passam da altura e vazam por
    // cima dos campos abaixo (o container reserva só maxHeight no layout, mas os
    // pills renderizam fora). Sem maxHeight, o grid empurra o conteúdo (form é ScrollView).
  },
  servicePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  serviceBadge: { width: 18, height: 18, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  serviceBadgeText: { fontSize: 8, fontWeight: '800' },
  servicePillText: { fontSize: 11, fontWeight: '600', maxWidth: 80 },
  brandBadgeInline: {
    position: 'absolute' as const, right: 12, top: 10,
    width: 22, height: 22, borderRadius: 6,
    justifyContent: 'center' as const, alignItems: 'center' as const,
  },
  brandBadgeText: { fontSize: 9, fontWeight: '800' as const },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },

  row2: { flexDirection: 'row', gap: 12 },
  col:  { flex: 1 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12,
    backgroundColor: COLORS.brandDim, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.brand + '40',
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.brand, lineHeight: 19 },

  installBox: {
    backgroundColor: COLORS.card2, borderRadius: 12, padding: 14,
    marginTop: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  installCalc: { marginTop: 12 },
  installCalcText: { fontSize: 13, color: COLORS.muted },
  installCalcBold: { fontWeight: '600', color: COLORS.text },
  installCalcTotal: { fontWeight: '700', color: COLORS.brand },
  installCalcSub:  { fontSize: 11, color: COLORS.muted2, marginTop: 4 },

  catScroll: { marginTop: 4, marginBottom: 4 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 7, marginRight: 7,
  },
  catPillActive:    { backgroundColor: COLORS.brandDim, borderColor: COLORS.brand },
  catEmoji:         { fontSize: 14 },
  catPillText:      { fontSize: 13, color: COLORS.muted },
  catPillTextActive:{ color: COLORS.brand, fontWeight: '600' },

  notesToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, marginTop: 8,
  },
  notesToggleText: { fontSize: 13, color: COLORS.muted },

  saveBtn: {
    backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 32,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
