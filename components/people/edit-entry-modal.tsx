import { useState, useEffect } from 'react'
import { View, Modal, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { DateInput } from '@/components/date-input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format } from 'date-fns'
import { COLORS } from '@/lib/constants'
import { peopleApi, categoriesApi, type PersonEntry } from '@/lib/api'
import { sheetStyles as s } from './sheet-styles'

type EntryType = 'THEY_OWE_ME' | 'I_OWE_THEM'

interface Props {
  visible:    boolean
  entry:      PersonEntry | null
  personId:   string
  isGroup?:   boolean
  groupSize?: number
  onClose:    () => void
}

export function EditEntryModal({ visible, entry, personId, isGroup, groupSize, onClose }: Props) {
  const qc = useQueryClient()
  const [entryType, setEntryType]     = useState<EntryType>('THEY_OWE_ME')
  const [description, setDescription] = useState('')
  const [amount, setAmount]           = useState('')
  const [date, setDate]               = useState('')
  const [categoryId, setCategoryId]   = useState<string | undefined>()
  const [notes, setNotes]             = useState('')

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then(r => r.data),
  })

  useEffect(() => {
    if (visible && entry) {
      setEntryType(entry.type)
      setDescription(entry.description.replace(/\s*\(\d+\/\d+\)$/, ''))
      setAmount(String(entry.amount))
      setDate(format(new Date(entry.date), 'yyyy-MM-dd'))
      setCategoryId(entry.categoryId ?? undefined)
      setNotes(entry.notes ?? '')
    }
  }, [visible, entry])

  const mutation = useMutation({
    mutationFn: () => {
      if (!entry) throw new Error('Lançamento inválido')
      const amt = parseFloat(amount.replace(',', '.'))
      if (!description.trim())               throw new Error('Descrição é obrigatória')
      if (isNaN(amt) || amt <= 0)             throw new Error('Valor inválido')
      if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error('Data inválida (use AAAA-MM-DD)')

      return peopleApi.editEntry(entry.id, {
        type:        entryType,
        description: description.trim(),
        amount:      amt,
        date,
        categoryId:  categoryId ?? null,
        notes:       notes.trim() || null,
        applyToGroup: isGroup,
      })
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['person', personId] })
      qc.refetchQueries({ queryKey: ['people'] })
      if (isGroup) qc.refetchQueries({ queryKey: ['personRecurring', personId] })
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
            <Text style={s.modalTitle}>
              {isGroup ? `Editar grupo (${groupSize} parcelas)` : 'Editar lançamento'}
            </Text>

            {mutation.isError && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{(mutation.error as Error).message}</Text>
              </View>
            )}

            {isGroup && (
              <View style={s.infoBox}>
                <Text style={s.infoBoxText}>
                  💡 Alterações serão aplicadas a todas as {groupSize} parcelas pendentes.
                </Text>
              </View>
            )}

            {/* Direção: quem deve a quem */}
            <View style={s.dirRow}>
              <TouchableOpacity
                style={[s.dirBtn, entryType === 'THEY_OWE_ME' && s.dirBtnActiveSuccess]}
                onPress={() => setEntryType('THEY_OWE_ME')}
              >
                <Feather name="trending-up" size={16} color={entryType === 'THEY_OWE_ME' ? COLORS.success : COLORS.muted} />
                <Text style={[s.dirText, entryType === 'THEY_OWE_ME' && s.dirTextActiveSuccess]}>Me deve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.dirBtn, entryType === 'I_OWE_THEM' && s.dirBtnActiveDanger]}
                onPress={() => setEntryType('I_OWE_THEM')}
              >
                <Feather name="trending-down" size={16} color={entryType === 'I_OWE_THEM' ? COLORS.danger : COLORS.muted} />
                <Text style={[s.dirText, entryType === 'I_OWE_THEM' && s.dirTextActiveDanger]}>Eu devo</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Descrição</Text>
            <TextInput
              style={s.input}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={COLORS.muted}
            />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{isGroup ? 'Valor por parcela (R$)' : 'Valor (R$)'}</Text>
                <TextInput
                  style={s.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0,00"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{isGroup ? 'Data da próxima' : 'Data'}</Text>
                <DateInput value={date} onChange={setDate} placeholder="Selecionar data" />
              </View>
            </View>
            <Text style={s.hint}>Formato: AAAA-MM-DD</Text>

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
