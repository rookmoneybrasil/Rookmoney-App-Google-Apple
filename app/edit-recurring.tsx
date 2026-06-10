import { useState, useEffect } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { recurringApi, type Recurring } from '@/lib/api'

const TYPES = [
  { value: 'EXPENSE', label: 'Despesa', color: COLORS.danger },
  { value: 'INCOME',  label: 'Receita', color: COLORS.success },
]

const FREQUENCIES = [
  { value: 'WEEKLY',  label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'YEARLY',  label: 'Anual' },
]

export default function EditRecurringScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [rec,         setRec]       = useState<Recurring | null>(null)
  const [name,        setName]      = useState('')
  const [type,        setType]      = useState('EXPENSE')
  const [amount,      setAmount]    = useState('')
  const [frequency,   setFrequency] = useState('MONTHLY')
  const [categoryId,  setCategoryId] = useState('')
  const [dayOfMonth,  setDay]       = useState('')
  const [description, setDesc]      = useState('')

  useEffect(() => {
    const list = qc.getQueryData<Recurring[]>(['recurring'])
    const found = list?.find((r) => r.id === id)
    if (found) {
      setRec(found)
      setName(found.name)
      setType(found.type)
      setAmount(String(found.amount))
      setFrequency(found.frequency)
      setCategoryId(found.category.id)
      setDay(found.dayOfMonth ? String(found.dayOfMonth) : '')
      setDesc(found.description ?? '')
    }
  }, [id])

  const mutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(amount.replace(',', '.'))
      if (!name.trim())           throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')
      const day = dayOfMonth ? parseInt(dayOfMonth, 10) : undefined
      if (day !== undefined && (isNaN(day) || day < 1 || day > 31)) {
        throw new Error('Dia inválido (1-31)')
      }
      return recurringApi.update(id!, { name: name.trim(), type, amount: amt, frequency, categoryId: categoryId || undefined, dayOfMonth: day, description: description.trim() || null })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] })
      router.back()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => recurringApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] })
      router.back()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  if (!rec) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.brand} />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Editar Recorrência</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() =>
            Alert.alert('Excluir recorrência', `Excluir "${name}"?`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate() },
            ])
          }
        >
          <Feather name="trash-2" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Tipo — read-only indicator */}
        <View style={styles.typeRow}>
          {TYPES.map((t) => (
            <View
              key={t.value}
              style={[
                styles.typeBtn,
                type === t.value && { borderColor: t.color, backgroundColor: t.color + '18' },
              ]}
            >
              <Text style={[styles.typeLabel, type === t.value && { color: t.color }]}>
                {t.label}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.readOnlyHint}>Tipo e categoria não podem ser alterados</Text>

        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Spotify, Academia..."
          placeholderTextColor={COLORS.muted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Valor (R$) *</Text>
        <TextInput
          style={styles.input}
          placeholder="0,00"
          placeholderTextColor={COLORS.muted}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={styles.label}>Frequência</Text>
        <View style={styles.freqRow}>
          {FREQUENCIES.map((f) => (
            <View
              key={f.value}
              style={[
                styles.freqBtn,
                frequency === f.value && styles.freqBtnActive,
              ]}
            >
              <Text style={[styles.freqLabel, frequency === f.value && { color: COLORS.brand }]}>
                {f.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Categoria — read-only */}
        {rec.category && (
          <View style={styles.catReadOnly}>
            <Text style={styles.catEmoji}>{rec.category.icon}</Text>
            <Text style={styles.catName}>{rec.category.name}</Text>
          </View>
        )}

        <Text style={styles.label}>Dia do mês (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 10"
          placeholderTextColor={COLORS.muted}
          keyboardType="number-pad"
          value={dayOfMonth}
          onChangeText={setDay}
        />

        <Text style={styles.label}>Descrição (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Observações..."
          placeholderTextColor={COLORS.muted}
          value={description}
          onChangeText={setDesc}
        />

        <TouchableOpacity
          style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          <Text style={styles.saveBtnText}>
            {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
          </Text>
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
  closeBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:     { fontSize: 18, fontWeight: '700', color: COLORS.text },

  content: { padding: 20, paddingBottom: 40 },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },

  typeRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  typeLabel:     { fontSize: 14, fontWeight: '600', color: COLORS.muted },
  readOnlyHint:  { fontSize: 11, color: COLORS.muted2, marginTop: 6 },

  freqRow: { flexDirection: 'row', gap: 10 },
  freqBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  freqBtnActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  freqLabel:     { fontSize: 13, color: COLORS.muted },

  catReadOnly: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  catEmoji: { fontSize: 18 },
  catName:  { fontSize: 14, color: COLORS.muted },

  saveBtn: {
    backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 32,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
