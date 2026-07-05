import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { CurrencyInput } from '@/components/currency-input'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { budgetsApi, categoriesApi, type Category } from '@/lib/api'

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function CategoryPickerSheet({ categories, selectedId, onSelect, onClose }: {
  categories: Category[]
  selectedId: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>Selecionar categoria</Text>
      <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.catRow}
            onPress={() => { onSelect(cat.id); onClose() }}
          >
            <View style={[styles.catRowIcon, { backgroundColor: cat.color + '22' }]}>
              <Text style={styles.catRowEmoji}>{cat.icon}</Text>
            </View>
            <Text style={styles.catRowName}>{cat.name}</Text>
            {selectedId === cat.id && <Feather name="check" size={18} color={COLORS.brand} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

export default function NewBudgetScreen() {
  const router  = useRouter()
  const qc      = useQueryClient()
  const params  = useLocalSearchParams<{ month?: string }>()

  const defaultMonth = params.month ?? format(new Date(), 'yyyy-MM')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount]         = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [month] = useState(defaultMonth)
  const monthLabel = capitalize(format(parseISO(`${defaultMonth}-01`), "MMMM 'de' yyyy", { locale: ptBR }))

  const { data: categories, isLoading: loadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then((r) => r.data),
  })

  const selectedCategory = categories?.find((c) => c.id === categoryId)

  const mutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(amount.replace(',', '.'))
      if (!categoryId)              throw new Error('Selecione uma categoria')
      if (isNaN(amt) || amt <= 0)   throw new Error('Valor inválido')
      return budgetsApi.create({ categoryId, amount: amt, month })
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['budgets'] })
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
        <Text style={styles.title}>Definir orçamento</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.monthInfo}>{monthLabel}</Text>

        <Text style={styles.label}>Categoria *</Text>
        {loadingCats ? (
          <ActivityIndicator color={COLORS.brand} />
        ) : (
          <TouchableOpacity style={styles.selectField} onPress={() => setPickerOpen(true)}>
            {selectedCategory ? (
              <View style={styles.selectedCat}>
                <View style={[styles.selectedCatIcon, { backgroundColor: selectedCategory.color + '22' }]}>
                  <Text style={styles.selectedCatEmoji}>{selectedCategory.icon}</Text>
                </View>
                <Text style={styles.selectFieldText}>{selectedCategory.name}</Text>
              </View>
            ) : (
              <Text style={styles.selectFieldPlaceholder}>Selecionar categoria</Text>
            )}
            <Feather name="chevron-down" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Limite mensal (R$) *</Text>
        <CurrencyInput
          style={styles.input}
          placeholder="0,00"
          value={amount}
          onChangeValue={setAmount}
        />

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, (mutation.isPending || !categoryId) && { opacity: 0.6 }]}
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending || !categoryId}
          >
            <Text style={styles.saveBtnText}>
              {mutation.isPending ? 'Salvando...' : 'Definir'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {pickerOpen && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setPickerOpen(false)} />
          <CategoryPickerSheet
            categories={categories ?? []}
            selectedId={categoryId}
            onSelect={setCategoryId}
            onClose={() => setPickerOpen(false)}
          />
        </View>
      )}
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

  monthInfo: { fontSize: 13, color: COLORS.muted, marginBottom: 8 },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },

  selectField: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  selectFieldPlaceholder: { fontSize: 15, color: COLORS.muted },
  selectFieldText:        { fontSize: 15, color: COLORS.text },
  selectedCat:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedCatIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  selectedCatEmoji: { fontSize: 14 },

  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  cancelBtn:     { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    backgroundColor: COLORS.brand,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  overlay:   { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '70%',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.muted2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  sheetList:   { maxHeight: 360 },

  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  catRowIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  catRowEmoji: { fontSize: 16 },
  catRowName:  { flex: 1, fontSize: 14, color: COLORS.text },
})
