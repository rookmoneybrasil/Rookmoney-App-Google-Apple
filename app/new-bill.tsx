import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format } from 'date-fns'
import { COLORS } from '@/lib/constants'
import { billsApi, categoriesApi } from '@/lib/api'

export default function NewBillScreen() {
  const router  = useRouter()
  const qc      = useQueryClient()
  const params  = useLocalSearchParams<{ month?: string }>()

  // If opened from a specific month view, default date to 1st of that month
  const defaultDate = params.month
    ? `${params.month}-01`
    : format(new Date(), 'yyyy-MM-dd')

  const [name, setName]               = useState('')
  const [amount, setAmount]           = useState('')
  const [dueDate, setDueDate]         = useState(defaultDate)
  const [isRecurring, setRecurring]   = useState(false)
  const [categoryId, setCategoryId]   = useState<string | undefined>()
  const [installments, setInstallments] = useState('')
  const [alreadyPaid, setAlreadyPaid]   = useState('0')
  const [notes, setNotes]             = useState('')
  const [showInstallments, setShowInstallments] = useState(false)
  const [showNotes, setShowNotes]     = useState(false)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(amount.replace(',', '.'))
      if (!name.trim())           throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')
      if (!dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error('Data inválida (use AAAA-MM-DD)')

      const inst = parseInt(installments) || 1
      const paid = parseInt(alreadyPaid) || 0

      return billsApi.create({
        name:        name.trim(),
        amount:      amt,
        dueDate:     dueDate.trim(),
        isRecurring: showInstallments ? false : isRecurring,
        categoryId:  categoryId || undefined,
        installments: showInstallments && inst > 1 ? inst : undefined,
        alreadyPaid:  showInstallments && inst > 1 ? paid : undefined,
        notes:        notes.trim() || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      router.back()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const numInst  = parseInt(installments) || 1
  const numPaid  = Math.min(parseInt(alreadyPaid) || 0, numInst - 1)
  const remaining = numInst - numPaid
  const perInst  = numInst > 1 && amount && remaining > 0
    ? (parseFloat(amount.replace(',', '.')) / remaining).toFixed(2)
    : null

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Conta</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Nome */}
        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Netflix, Aluguel, Água..."
          placeholderTextColor={COLORS.muted}
          value={name}
          onChangeText={setName}
        />

        {/* Valor */}
        <Text style={styles.label}>Valor total (R$) *</Text>
        <TextInput
          style={styles.input}
          placeholder="0,00"
          placeholderTextColor={COLORS.muted}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />

        {/* Data */}
        <Text style={styles.label}>Vencimento *</Text>
        <TextInput
          style={styles.input}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={COLORS.muted}
          value={dueDate}
          onChangeText={setDueDate}
          keyboardType="numeric"
        />
        <Text style={styles.hint}>Formato: AAAA-MM-DD (ex: {format(new Date(), 'yyyy-MM-dd')})</Text>

        {/* Categoria */}
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
              <Text style={[styles.catPillText, categoryId === c.id && styles.catPillTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Parcelamento */}
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setShowInstallments(v => !v)}
          activeOpacity={0.8}
        >
          <View>
            <Text style={styles.switchLabel}>Parcelado</Text>
            <Text style={styles.switchSub}>Dividir em várias parcelas</Text>
          </View>
          <Switch
            value={showInstallments}
            onValueChange={setShowInstallments}
            trackColor={{ false: COLORS.muted2, true: COLORS.brand }}
            thumbColor="#fff"
          />
        </TouchableOpacity>

        {showInstallments && (
          <View style={styles.installBox}>
            <View style={styles.installRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Total de parcelas</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 6"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="number-pad"
                  value={installments}
                  onChangeText={setInstallments}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
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
            {perInst && numInst > 1 && (
              <View style={styles.installHint}>
                <Feather name="info" size={13} color={COLORS.brand} />
                <Text style={styles.installHintText}>
                  {numInst - numPaid} parcelas de R$ {perInst} serão criadas
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recorrente (só quando não é parcelado) */}
        {!showInstallments && (
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setRecurring(v => !v)}
            activeOpacity={0.8}
          >
            <View>
              <Text style={styles.switchLabel}>Conta recorrente</Text>
              <Text style={styles.switchSub}>Se repete todo mês</Text>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={setRecurring}
              trackColor={{ false: COLORS.muted2, true: COLORS.brand }}
              thumbColor="#fff"
            />
          </TouchableOpacity>
        )}

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
            {mutation.isPending ? 'Criando...' : 'Criar Conta'}
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

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 16 },
  hint:  { fontSize: 11, color: COLORS.muted2, marginTop: 4 },
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

  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    marginTop: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  switchLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  switchSub:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  installBox: {
    backgroundColor: COLORS.card2, borderRadius: 12, padding: 14,
    marginTop: 8, borderWidth: 1, borderColor: COLORS.brand + '33',
  },
  installRow:     { flexDirection: 'row', alignItems: 'flex-end' },
  installHint:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  installHintText:{ fontSize: 12, color: COLORS.brand, flex: 1 },

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
