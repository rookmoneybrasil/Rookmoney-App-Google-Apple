import { useState, useEffect } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch, ActivityIndicator } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { recurringBillsApi, categoriesApi, type RecurringBill } from '@/lib/api'

export default function EditRecurringBillScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [bill, setBill]             = useState<RecurringBill | null>(null)
  const [name, setName]             = useState('')
  const [amount, setAmount]         = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [isActive, setIsActive]     = useState(true)
  const [notes, setNotes]           = useState('')
  const [showNotes, setShowNotes]   = useState(false)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then(r => r.data),
  })

  useEffect(() => {
    // Try cache first, then fetch from API
    const list  = qc.getQueryData<RecurringBill[]>(['recurringBills'])
    const found = list?.find((b) => b.id === id)
    if (found) {
      populateBill(found)
    } else if (id) {
      recurringBillsApi.list().then(res => {
        const items = (res as any).data ?? res
        const arr = Array.isArray(items) ? items : []
        const b = arr.find((x: RecurringBill) => x.id === id)
        if (b) populateBill(b)
      }).catch(() => {})
    }
  }, [id])

  function populateBill(found: RecurringBill) {
    setBill(found)
    setName(found.name)
    setAmount(String(found.amount))
    setDayOfMonth(String(found.dayOfMonth))
    setCategoryId(found.categoryId ?? found.category?.id ?? null)
    setIsActive(found.isActive)
    setNotes(found.notes ?? '')
    setShowNotes(!!(found.notes))
  }

  const mutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(amount.replace(',', '.'))
      const day = parseInt(dayOfMonth)
      if (!name.trim())                      throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0)            throw new Error('Valor inválido')
      if (isNaN(day) || day < 1 || day > 31) throw new Error('Dia do mês deve ser entre 1 e 31')

      return recurringBillsApi.update(id!, {
        name:       name.trim(),
        amount:     amt,
        dayOfMonth: day,
        categoryId: categoryId,
        notes:      notes.trim() || null,
        isActive,
      })
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['recurringBills'] })
      qc.refetchQueries({ queryKey: ['bills'] })
      qc.refetchQueries({ queryKey: ['dashboard'] })
      router.back()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => recurringBillsApi.delete(id!),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['recurringBills'] })
      qc.refetchQueries({ queryKey: ['bills'] })
      qc.refetchQueries({ queryKey: ['dashboard'] })
      router.back()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  function confirmDelete() {
    Alert.alert('Excluir conta fixa', `Excluir "${name}"? Contas já geradas não serão apagadas.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ])
  }

  if (!bill) {
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
        <Text style={styles.title}>Editar Conta Fixa</Text>
        <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Netflix, Aluguel, Água..."
          placeholderTextColor={COLORS.muted}
          value={name}
          onChangeText={setName}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Valor (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Todo dia *</Text>
            <TextInput
              style={styles.input}
              placeholder="1-31"
              placeholderTextColor={COLORS.muted}
              keyboardType="number-pad"
              value={dayOfMonth}
              onChangeText={setDayOfMonth}
            />
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          <TouchableOpacity
            style={[styles.catPill, !categoryId && styles.catPillActive]}
            onPress={() => setCategoryId(null)}
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

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Conta fixa ativa</Text>
            <Text style={styles.switchSub}>Pausada não gera novas contas todo mês</Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: COLORS.muted2, true: COLORS.brand }}
            thumbColor="#fff"
          />
        </View>

        {/* Observações */}
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

  row: { flexDirection: 'row' },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },

  catScroll:         { marginTop: 4, marginBottom: 4 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 7, marginRight: 7,
  },
  catPillActive:     { backgroundColor: COLORS.brandDim, borderColor: COLORS.brand },
  catEmoji:          { fontSize: 14 },
  catPillText:       { fontSize: 13, color: COLORS.muted },
  catPillTextActive: { color: COLORS.brand, fontWeight: '600' },

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    marginTop: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  switchLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  switchSub:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },

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
