import { useState, useEffect } from 'react'
import { View, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { CurrencyInput } from '@/components/currency-input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { COLORS } from '@/lib/constants'
import { personRecurringApi, categoriesApi, type PersonEntryRecurring } from '@/lib/api'
import { sheetStyles as s } from './sheet-styles'

interface Props {
  visible:  boolean
  item:     PersonEntryRecurring | null
  personId: string
  onClose:  () => void
}

export function EditRecurringModal({ visible, item, personId, onClose }: Props) {
  const qc = useQueryClient()
  const [description, setDescription] = useState('')
  const [amount, setAmount]           = useState('')
  const [dayOfMonth, setDayOfMonth]   = useState('1')
  const [categoryId, setCategoryId]   = useState<string | undefined>()
  const [notes, setNotes]             = useState('')

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then(r => r.data),
  })

  useEffect(() => {
    if (visible && item) {
      setDescription(item.description)
      setAmount(String(item.amount))
      setDayOfMonth(String(item.dayOfMonth))
      setCategoryId(item.categoryId ?? undefined)
      setNotes(item.notes ?? '')
    }
  }, [visible, item])

  const mutation = useMutation({
    mutationFn: () => {
      if (!item) throw new Error('Recorrente inválido')
      const amt = parseFloat(amount.replace(',', '.'))
      if (!description.trim())    throw new Error('Descrição é obrigatória')
      if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')

      const day = Math.min(31, Math.max(1, parseInt(dayOfMonth) || item.dayOfMonth))

      return personRecurringApi.update(item.id, {
        description: description.trim(),
        amount:      amt,
        dayOfMonth:  day,
        categoryId:  categoryId ?? null,
        notes:       notes.trim() || null,
      })
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['personRecurring', personId] })
      qc.refetchQueries({ queryKey: ['person', personId] })
      onClose()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.modalSheet} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Editar recorrente</Text>

            {mutation.isError && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{(mutation.error as Error).message}</Text>
              </View>
            )}

            <Text style={s.label}>Descrição</Text>
            <TextInput
              style={s.input}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={COLORS.muted}
            />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Valor (R$)</Text>
                <CurrencyInput
                  style={s.input}
                  value={amount}
                  onChangeValue={setAmount}
                  placeholder="0,00"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Todo dia</Text>
                <TextInput
                  style={[s.input, { textAlign: 'center' }]}
                  value={dayOfMonth}
                  onChangeText={setDayOfMonth}
                  keyboardType="number-pad"
                  placeholderTextColor={COLORS.muted}
                />
              </View>
            </View>

            <Text style={s.label}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
              <TouchableOpacity
                style={[s.catPill, !categoryId && s.catPillActive]}
                onPress={() => setCategoryId(undefined)}
              >
                <Text style={[s.catPillText, !categoryId && s.catPillTextActive]}>Nenhuma</Text>
              </TouchableOpacity>
              {(categories ?? []).map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.catPill, categoryId === c.id && s.catPillActive]}
                  onPress={() => setCategoryId(c.id)}
                >
                  <Text style={s.catEmoji}>{c.icon}</Text>
                  <Text style={[s.catPillText, categoryId === c.id && s.catPillTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>Observações</Text>
            <TextInput
              style={[s.input, { minHeight: 56, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Opcional"
              placeholderTextColor={COLORS.muted}
              multiline
            />

            <TouchableOpacity
              style={[s.saveBtn, mutation.isPending && { opacity: 0.6 }]}
              onPress={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              <Text style={s.saveBtnText}>{mutation.isPending ? 'Salvando...' : 'Salvar'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
