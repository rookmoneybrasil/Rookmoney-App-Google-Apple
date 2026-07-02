import { useState, useEffect } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch, ActivityIndicator } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { DateInput } from '@/components/date-input'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { incomeSourcesApi, categoriesApi, type IncomeSource, type Category } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

const TYPES = [
  { value: 'EMPLOYMENT', label: 'CLT / Emprego', emoji: '💼' },
  { value: 'FREELANCE',  label: 'Freelance',      emoji: '🧑‍💻' },
  { value: 'RENTAL',     label: 'Aluguel',         emoji: '🏠' },
  { value: 'OTHER',      label: 'Outro',           emoji: '💡' },
]

export default function EditIncomeScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [source,     setSource]     = useState<IncomeSource | null>(null)
  const [name,       setName]       = useState('')
  const [type,       setType]       = useState('EMPLOYMENT')
  const [amount,     setAmount]     = useState('')
  const [isRecurring, setRecurring] = useState(true)
  const [dayOfMonth, setDay]        = useState('')
  const [startDate,  setStartDate]  = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [notes,      setNotes]      = useState('')
  const [showNotes,  setShowNotes]  = useState(false)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then((r) => r.data),
  })

  useEffect(() => {
    const list = qc.getQueryData<IncomeSource[]>(['income-sources'])
    const found = list?.find((s) => s.id === id)
    if (found) {
      setSource(found)
      setName(found.name)
      setType(found.type)
      setAmount(String(found.amount))
      setRecurring(found.isRecurring)
      setDay(found.dayOfMonth ? String(found.dayOfMonth) : '')
      setStartDate(found.startDate ? String(found.startDate).slice(0, 10) : '')
      setCategoryId(found.categoryId ?? '')
      setNotes(found.notes ?? '')
      setShowNotes(!!(found.notes))
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
      return incomeSourcesApi.update(id!, { name: name.trim(), type, amount: amt, isRecurring, dayOfMonth: day, startDate: startDate.trim() || null, notes: notes.trim() || null, categoryId: categoryId || null })
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['income-sources'] })
      qc.refetchQueries({ queryKey: ['dashboard'] })
      router.back()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => incomeSourcesApi.delete(id!),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['income-sources'] })
      qc.refetchQueries({ queryKey: ['dashboard'] })
      router.back()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  if (!source) {
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
        <Text style={styles.title}>Editar Renda</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() =>
            Alert.alert('Excluir renda', `Excluir "${name}"?`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate() },
            ])
          }
        >
          <Feather name="trash-2" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Tipo de renda *</Text>
        <View style={styles.typeGrid}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeBtn, type === t.value && styles.typeBtnActive]}
              onPress={() => setType(t.value)}
            >
              <Text style={styles.typeEmoji}>{t.emoji}</Text>
              <Text style={[styles.typeLabel, type === t.value && { color: COLORS.brand }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Salário, Freela Design..."
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

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Recorrente</Text>
            <Text style={styles.switchSub}>Recebo todo mês</Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setRecurring}
            trackColor={{ false: COLORS.muted2, true: COLORS.brand }}
            thumbColor="#fff"
          />
        </View>

        {isRecurring && (
          <>
            <Text style={styles.label}>Dia do mês de recebimento (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 5"
              placeholderTextColor={COLORS.muted}
              keyboardType="number-pad"
              value={dayOfMonth}
              onChangeText={setDay}
            />
            <Text style={styles.label}>Data de início (opcional)</Text>
            <DateInput value={startDate} onChange={setStartDate} placeholder="Selecionar data de início" />
          </>
        )}

        <Text style={styles.label}>Categoria</Text>
        <View style={styles.cats}>
          {(categories ?? []).map((cat: Category) => (
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

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border, flex: 1, minWidth: '45%',
  },
  typeBtnActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  typeEmoji:     { fontSize: 18 },
  typeLabel:     { fontSize: 13, color: COLORS.text, fontWeight: '500', flexShrink: 1 },

  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  catActive:     { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  catIcon:       { fontSize: 16 },
  catName:       { fontSize: 12, color: COLORS.muted, maxWidth: 90 },
  catNameActive: { color: COLORS.brand },

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    marginTop: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  switchLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  switchSub:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  notesToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, marginTop: 8 },
  notesToggleText: { fontSize: 13, color: COLORS.muted },

  saveBtn: {
    backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 32,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
