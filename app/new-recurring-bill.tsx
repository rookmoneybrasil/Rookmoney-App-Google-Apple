import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { CurrencyInput } from '@/components/currency-input'
import { useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { recurringBillsApi, categoriesApi } from '@/lib/api'
import { AccountPicker } from '@/components/account-picker'
import { DateInput } from '@/components/date-input'
import { format } from 'date-fns'

export default function NewRecurringBillScreen() {
  const router = useRouter()
  const qc     = useQueryClient()

  const [name, setName]             = useState('')
  const [amount, setAmount]         = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [firstDate, setFirstDate]   = useState(format(new Date(), 'yyyy-MM-dd'))
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [accountId, setAccountId]   = useState<string | null>(null)
  const [notes, setNotes]           = useState('')
  const [showNotes, setShowNotes]   = useState(false)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(amount.replace(',', '.'))
      const day = parseInt(dayOfMonth)
      if (!name.trim())                      throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0)            throw new Error('Valor inválido')
      if (isNaN(day) || day < 1 || day > 31) throw new Error('Dia do mês deve ser entre 1 e 31')

      return recurringBillsApi.create({
        name:        name.trim(),
        amount:      amt,
        dayOfMonth:  day,
        categoryId:  categoryId || null,
        accountId:   accountId,
        notes:       notes.trim() || null,
        firstDate:   firstDate || undefined, // mês da 1ª data → startMonth; se for este mês e passada, gera já
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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Conta Fixa</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBox}>
          <Feather name="info" size={13} color={COLORS.brand} />
          <Text style={styles.infoText}>
            Contas fixas se repetem todo mês no dia configurado — cadastre uma vez e elas aparecem automaticamente.
          </Text>
        </View>

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
            <CurrencyInput
              style={styles.input}
              placeholder="0,00"
              value={amount}
              onChangeValue={setAmount}
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

        <Text style={[styles.label, { marginTop: 16 }]}>1ª data (quando começa) *</Text>
        <DateInput value={firstDate} onChange={setFirstDate} />

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

        <AccountPicker value={accountId} onChange={setAccountId} />

        {/* Observações */}
        <TouchableOpacity
          style={styles.notesToggle}
          onPress={() => setShowNotes(v => !v)}
          activeOpacity={0.8}
        >
          <Feather name={showNotes ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.muted} />
          <Text style={styles.notesToggleText}>
            {showNotes ? 'Esconder observações' : 'Adicionar observações'}
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
            {mutation.isPending ? 'Criando...' : 'Criar Conta Fixa'}
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
  closeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:    { fontSize: 18, fontWeight: '700', color: COLORS.text },

  content: { padding: 20, paddingBottom: 60 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.card2, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.brand + '33', marginBottom: 4,
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.muted, lineHeight: 17 },

  row: { flexDirection: 'row' },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },

  catScroll:        { marginTop: 4, marginBottom: 4 },
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
