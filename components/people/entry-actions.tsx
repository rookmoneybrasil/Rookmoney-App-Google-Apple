import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Text } from '@/components/text'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { peopleApi } from '@/lib/api'

interface Props {
  entryId:   string
  personId:  string
  isSettled: boolean
}

export function EntryActions({ entryId, personId, isSettled }: Props) {
  const qc = useQueryClient()

  const settleMutation = useMutation({
    mutationFn: () => isSettled ? peopleApi.unsettleEntry(entryId) : peopleApi.settleEntry(entryId),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['person', personId] })
      qc.refetchQueries({ queryKey: ['people'] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => peopleApi.deleteEntry(entryId),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['person', personId] })
      qc.refetchQueries({ queryKey: ['people'] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  function confirmDelete() {
    Alert.alert('Excluir lançamento', 'Remover este lançamento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ])
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.btn, isSettled ? styles.btnMuted : styles.btnSuccess]}
        onPress={() => settleMutation.mutate()}
        disabled={settleMutation.isPending}
      >
        <Feather name={isSettled ? 'rotate-ccw' : 'check-circle'} size={12} color={isSettled ? COLORS.muted : COLORS.success} />
        <Text style={[styles.btnText, { color: isSettled ? COLORS.muted : COLORS.success }]}>
          {isSettled ? 'Reabrir' : 'Acertar'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconBtn} onPress={confirmDelete} disabled={deleteMutation.isPending}>
        <Feather name="trash-2" size={13} color={COLORS.muted} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
  },
  btnSuccess: { backgroundColor: COLORS.success + '1a' },
  btnMuted:   { backgroundColor: COLORS.card2 },
  btnText:    { fontSize: 11, fontWeight: '700' },
  iconBtn: {
    width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.card2,
  },
})
