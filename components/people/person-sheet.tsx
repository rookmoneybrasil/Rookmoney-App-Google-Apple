import { useState, useEffect } from 'react'
import { View, Modal, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { COLORS } from '@/lib/constants'
import { peopleApi, type Person } from '@/lib/api'
import { AVATAR_COLORS } from './avatar'
import { sheetStyles as s } from './sheet-styles'

interface Props {
  visible: boolean
  person?: Person | null
  onClose: () => void
}

export function PersonSheet({ visible, person, onClose }: Props) {
  const qc = useQueryClient()
  const [name, setName]   = useState('')
  const [color, setColor] = useState<string>(AVATAR_COLORS[0])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (visible) {
      setName(person?.name ?? '')
      setColor(person?.color ?? AVATAR_COLORS[0])
      setNotes(person?.notes ?? '')
    }
  }, [visible, person])

  const mutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('Nome não pode ser vazio')
      const body = { name: name.trim(), color, notes: notes.trim() || null }
      return person ? peopleApi.update(person.id, body) : peopleApi.create(body)
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['people'] })
      if (person) qc.refetchQueries({ queryKey: ['person', person.id] })
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
            <Text style={s.modalTitle}>{person ? 'Editar pessoa' : 'Nova pessoa'}</Text>

            {mutation.isError && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{(mutation.error as Error).message}</Text>
              </View>
            )}

            <Text style={s.label}>Nome</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: João Silva"
              placeholderTextColor={COLORS.muted}
              maxLength={60}
            />

            <Text style={s.label}>Cor do avatar</Text>
            <View style={styles.colorGrid}>
              {AVATAR_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <Text style={s.label}>Observações</Text>
            <TextInput
              style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
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
              <Text style={s.saveBtnText}>
                {mutation.isPending ? 'Salvando...' : person ? 'Salvar' : 'Criar'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  colorDot:  { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: '#fff' },
})
