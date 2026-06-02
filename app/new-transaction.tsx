import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { COLORS } from '@/lib/constants'
import { transactionsApi, categoriesApi, type Category } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

export default function NewTransactionModal() {
  const router       = useRouter()
  const queryClient  = useQueryClient()

  const [type,        setType]        = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [amount,      setAmount]      = useState('')
  const [description, setDescription] = useState('')
  const [categoryId,  setCategoryId]  = useState('')
  const [error,       setError]       = useState('')
  const [saving,      setSaving]      = useState(false)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then((r) => r.data),
  })

  const today = format(new Date(), 'yyyy-MM-dd')

  async function handleSave() {
    const num = parseFloat(amount.replace(',', '.'))
    if (!num || num <= 0)  { setError('Informe um valor válido.'); return }
    if (!categoryId)       { setError('Selecione uma categoria.'); return }
    setError('')
    setSaving(true)
    try {
      await transactionsApi.create({
        amount: num,
        type,
        description: description.trim() || undefined,
        date: new Date().toISOString(),
        categoryId,
      })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      router.back()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Handle bar */}
      <View style={styles.handle} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Nova transação</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        {/* Type toggle */}
        <View style={styles.typeRow}>
          {(['EXPENSE', 'INCOME'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, type === t && (t === 'EXPENSE' ? styles.expenseActive : styles.incomeActive)]}
              onPress={() => setType(t)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.typeBtnText,
                type === t && { color: t === 'EXPENSE' ? COLORS.danger : COLORS.success, fontWeight: '600' }
              ]}>
                {t === 'EXPENSE' ? '💸 Despesa' : '💰 Receita'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <View style={styles.amountBox}>
          <Text style={styles.currency}>R$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            placeholderTextColor={COLORS.muted}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Supermercado, Salário..."
            placeholderTextColor={COLORS.muted}
          />
        </View>

        {/* Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Data</Text>
          <View style={[styles.input, styles.dateField]}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
            <Text style={styles.dateText}>{today}</Text>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.field}>
          <Text style={styles.label}>Categoria *</Text>
          <View style={styles.cats}>
            {categories?.map((cat: Category) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.cat, categoryId === cat.id && styles.catActive]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[styles.catName, categoryId === cat.id && styles.catNameActive]} numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.saveBtn,
            type === 'INCOME' ? styles.saveBtnIncome : styles.saveBtnExpense,
            saving && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>
                {type === 'EXPENSE' ? 'Registrar despesa' : 'Registrar receita'}
              </Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.card },
  handle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.muted2, alignSelf: 'center', marginTop: 12 },
  content: { padding: 20, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:  { fontSize: 18, fontWeight: '700', color: COLORS.text },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.card2, justifyContent: 'center', alignItems: 'center' },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  expenseActive: { borderColor: COLORS.danger,  backgroundColor: 'rgba(239,68,68,0.1)' },
  incomeActive:  { borderColor: COLORS.success, backgroundColor: 'rgba(34,197,94,0.1)'  },
  typeBtnText:   { fontSize: 14, color: COLORS.muted },

  amountBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center', marginBottom: 28,
  },
  currency:    { fontSize: 28, fontWeight: '300', color: COLORS.muted },
  amountInput: { fontSize: 48, fontWeight: '700', color: COLORS.text, minWidth: 120, textAlign: 'center' },

  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '500', color: COLORS.text, marginBottom: 6 },
  input: {
    height: 46, backgroundColor: COLORS.card2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, color: COLORS.text, fontSize: 14,
  },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText:  { color: COLORS.text, fontSize: 14 },

  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
  },
  catActive:     { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  catIcon:       { fontSize: 16 },
  catName:       { fontSize: 12, color: COLORS.muted, maxWidth: 70 },
  catNameActive: { color: COLORS.brand },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    padding: 12, marginBottom: 16,
  },
  errorText: { color: COLORS.danger, fontSize: 13 },

  saveBtn: {
    height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  saveBtnExpense:  { backgroundColor: COLORS.danger },
  saveBtnIncome:   { backgroundColor: COLORS.success },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
})
