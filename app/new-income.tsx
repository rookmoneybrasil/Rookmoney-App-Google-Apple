import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Switch,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { incomeSourcesApi } from '@/lib/api'

const TYPES = [
  { value: 'EMPLOYMENT', label: 'CLT / Emprego', emoji: '💼' },
  { value: 'FREELANCE',  label: 'Freelance',      emoji: '🧑‍💻' },
  { value: 'RENTAL',     label: 'Aluguel',         emoji: '🏠' },
  { value: 'OTHER',      label: 'Outro',           emoji: '💡' },
]

export default function NewIncomeScreen() {
  const router = useRouter()
  const qc     = useQueryClient()

  const [name, setName]           = useState('')
  const [type, setType]           = useState('EMPLOYMENT')
  const [amount, setAmount]       = useState('')
  const [isRecurring, setRecurring] = useState(true)
  const [dayOfMonth, setDay]      = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(amount.replace(',', '.'))
      if (!name.trim())           throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')

      const day = dayOfMonth ? parseInt(dayOfMonth, 10) : undefined
      if (day !== undefined && (isNaN(day) || day < 1 || day > 31)) {
        throw new Error('Dia inválido (1-31)')
      }

      return incomeSourcesApi.create({
        name:        name.trim(),
        type,
        amount:      amt,
        isRecurring,
        dayOfMonth:  day,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['income-sources'] })
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
        <Text style={styles.title}>Nova Renda</Text>
        <View style={{ width: 36 }} />
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
          </>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          <Text style={styles.saveBtnText}>
            {mutation.isPending ? 'Salvando...' : 'Adicionar Renda'}
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

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    marginTop: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  switchLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  switchSub:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  saveBtn: {
    backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 32,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
