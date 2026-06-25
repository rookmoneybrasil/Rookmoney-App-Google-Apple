import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { billsApi, categoriesApi } from '@/lib/api'

export default function EditInstallmentGroupScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const params = useLocalSearchParams<{
    groupId: string; name: string; amount: string
    categoryId: string; notes: string; total: string; paidCount: string
  }>()

  const total     = parseInt(params.total ?? '0', 10)
  const paidCount = parseInt(params.paidCount ?? '0', 10)
  const remaining = total - paidCount

  const [name, setName]             = useState(params.name ?? '')
  const [amount, setAmount]         = useState(params.amount ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId || null)
  const [notes, setNotes]           = useState(params.notes ?? '')
  const [showNotes, setShowNotes]   = useState(!!(params.notes))

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(amount.replace(',', '.'))
      if (!name.trim())           throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')

      return billsApi.updateGroup(params.groupId!, {
        name:       name.trim(),
        amount:     amt,
        categoryId: categoryId ?? null,
        notes:      notes.trim() || null,
      })
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['bills'] })
      qc.refetchQueries({ queryKey: ['dashboard'] })
      router.back()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => billsApi.deleteGroup(params.groupId!),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['bills'] })
      qc.refetchQueries({ queryKey: ['dashboard'] })
      router.back()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  function confirmDelete() {
    Alert.alert('Excluir parcelamento', `Excluir todas as ${total} parcelas de "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir tudo', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ])
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Editar Parcelamento</Text>
        <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Valor e categoria serão aplicados nas <Text style={styles.infoBold}>{remaining} parcelas pendentes</Text>.
            {paidCount > 0 ? ` As ${paidCount} já pagas mantêm o valor original.` : ''}
          </Text>
        </View>

        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: iPhone 15, Notebook..."
          placeholderTextColor={COLORS.muted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Valor por parcela (R$) *</Text>
        <TextInput
          style={styles.input}
          placeholder="0,00"
          placeholderTextColor={COLORS.muted}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{total}x</Text>
            <Text style={styles.statLabel}>Parcelas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{paidCount}</Text>
            <Text style={styles.statLabel}>Pagas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.brand }]}>{remaining}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
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

  infoBox: {
    backgroundColor: COLORS.brand + '0d', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.brand + '33', marginBottom: 8,
  },
  infoText:  { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  infoBold:  { color: COLORS.text, fontWeight: '700' },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 10, color: COLORS.muted, marginTop: 2 },

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
