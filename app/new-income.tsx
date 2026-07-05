import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { CurrencyInput } from '@/components/currency-input'
import { useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { incomeSourcesApi, categoriesApi, type Category } from '@/lib/api'
import { DateInput } from '@/components/date-input'

const TYPES = [
  { value: 'EMPLOYMENT', label: 'CLT / PJ',   emoji: '💼' },
  { value: 'FREELANCE',  label: 'Freelance',   emoji: '🧑‍💻' },
  { value: 'RENTAL',     label: 'Aluguel',     emoji: '🏠' },
  { value: 'OTHER',      label: 'Outro',       emoji: '💡' },
]

const RECURRENCE_OPTIONS = [
  { value: true,  label: 'Recorrente', emoji: '🔁', desc: 'Entra todo mês' },
  { value: false, label: 'Eventual',   emoji: '💡', desc: 'Renda pontual' },
]

export default function NewIncomeScreen() {
  const router = useRouter()
  const qc     = useQueryClient()

  const [name, setName]             = useState('')
  const [type, setType]             = useState('EMPLOYMENT')
  const [amount, setAmount]         = useState('')
  const [isRecurring, setRecurring] = useState(true)
  const [dayOfMonth, setDay]        = useState('')
  const [startDate, setStartDate]   = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes]           = useState('')
  const [showNotes, setShowNotes]   = useState(false)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then((r) => r.data),
  })

  const refetchAll = async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ['income-sources'], type: 'active' }),
      qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' }),
    ])
  }

  const mutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(amount.replace(',', '.'))
      if (!name.trim())           throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')

      const day = dayOfMonth ? parseInt(dayOfMonth, 10) : undefined
      if (day !== undefined && (isNaN(day) || day < 1 || day > 31)) {
        throw new Error('Dia inválido (1-31)')
      }
      if (isRecurring && !categoryId) throw new Error('Selecione uma categoria para rendas recorrentes')

      return incomeSourcesApi.create({
        name:        name.trim(),
        type,
        amount:      amt,
        isRecurring,
        dayOfMonth:  day,
        startDate:   startDate.trim() || undefined,
        notes:       notes.trim() || undefined,
        categoryId:  categoryId || undefined,
      })
    },
    onSuccess: async () => { await refetchAll(); router.back() },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nova fonte de renda</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Recurrence toggle */}
        <View style={styles.recRow}>
          {RECURRENCE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.recBtn, isRecurring === opt.value && styles.recBtnActive]}
              onPress={() => setRecurring(opt.value)}
            >
              <Text style={styles.recEmoji}>{opt.emoji}</Text>
              <Text style={[styles.recLabel, isRecurring === opt.value && styles.recLabelActive]}>
                {opt.label}
              </Text>
              <Text style={styles.recDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Name */}
        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: Empresa X, Cliente Y"
          placeholderTextColor={COLORS.muted}
          value={name}
          onChangeText={setName}
        />

        {/* Type + Amount row */}
        <View style={styles.row2}>
          <View style={styles.col}>
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.typeGrid}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeBtn, type === t.value && styles.typeBtnActive]}
                  onPress={() => setType(t.value)}
                >
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text style={[styles.typeLabel, type === t.value && { color: COLORS.brand }]} numberOfLines={1}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Valor (R$) *</Text>
            <CurrencyInput
              style={styles.input}
              placeholder="0,00"
              value={amount}
              onChangeValue={setAmount}
            />
          </View>
        </View>

        {/* Recurring fields */}
        {isRecurring && (
          <>
            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.label}>Dia do recebimento</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex.: 5"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="number-pad"
                  value={dayOfMonth}
                  onChangeText={setDay}
                  maxLength={2}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Primeiro pagamento</Text>
                <DateInput
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Selecionar data"
                />
              </View>
            </View>
            <Text style={styles.hint}>Deixe vazio para começar este mês</Text>
          </>
        )}

        {/* Category */}
        <Text style={styles.label}>Categoria {isRecurring ? '*' : ''}</Text>
        <View style={styles.cats}>
          {categories?.map((cat: Category) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.cat, categoryId === cat.id && styles.catActive]}
              onPress={() => setCategoryId(categoryId === cat.id ? '' : cat.id)}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={[styles.catName, categoryId === cat.id && styles.catNameActive]} numberOfLines={1}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {isRecurring && (
          <Text style={styles.hint}>Necessária para registro automático mensal.</Text>
        )}

        {/* Notes */}
        <TouchableOpacity style={styles.notesToggle} onPress={() => setShowNotes(v => !v)} activeOpacity={0.8}>
          <Feather name={showNotes ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.muted} />
          <Text style={styles.notesToggleText}>{showNotes ? 'Esconder observações' : 'Observações'}</Text>
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
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Adicionar</Text>}
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

  content: { padding: 20, paddingBottom: 40 },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 8, marginTop: 16 },
  hint:  { fontSize: 11, color: COLORS.muted, marginTop: 6 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },

  recRow: { flexDirection: 'row', gap: 10 },
  recBtn: {
    flex: 1, alignItems: 'center', gap: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  recBtnActive:   { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  recEmoji:       { fontSize: 20 },
  recLabel:       { fontSize: 13, fontWeight: '600', color: COLORS.text },
  recLabelActive: { color: COLORS.brand },
  recDesc:        { fontSize: 11, color: COLORS.muted },

  row2: { flexDirection: 'row', gap: 12 },
  col:  { flex: 1 },

  typeGrid: { gap: 6 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: COLORS.border,
  },
  typeBtnActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  typeEmoji:     { fontSize: 16 },
  typeLabel:     { fontSize: 12, color: COLORS.text, fontWeight: '500', flexShrink: 1 },

  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  catActive:     { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  catIcon:       { fontSize: 16 },
  catName:       { fontSize: 12, color: COLORS.muted, maxWidth: 90 },
  catNameActive: { color: COLORS.brand },

  notesToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, marginTop: 8 },
  notesToggleText: { fontSize: 13, color: COLORS.muted },

  saveBtn: {
    backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 32,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
