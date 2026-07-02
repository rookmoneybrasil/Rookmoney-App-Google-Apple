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

  // Optimistically patch the nested entries[] of the ['person', id] object,
  // roll back on error, reconcile onSettled. Settling flips isSettled (moves the
  // row between the "abertos"/"acertados" sections instantly); delete removes it.
  const patchEntries = async (fn: (entries: any[]) => any[]) => {
    await qc.cancelQueries({ queryKey: ['person', personId] })
    const prev = qc.getQueryData<any>(['person', personId])
    if (prev?.entries) qc.setQueryData(['person', personId], { ...prev, entries: fn(prev.entries) })
    return { prev }
  }
  const rollback = (ctx?: { prev?: any }) => { if (ctx?.prev) qc.setQueryData(['person', personId], ctx.prev) }
  const reconcile = () => {
    qc.refetchQueries({ queryKey: ['person', personId] })
    qc.refetchQueries({ queryKey: ['people'] })
  }

  const settleMutation = useMutation({
    mutationFn: () => isSettled ? peopleApi.unsettleEntry(entryId) : peopleApi.settleEntry(entryId),
    onMutate: () => patchEntries((es) => es.map((e) => e.id === entryId ? { ...e, isSettled: !isSettled } : e)),
    onError: (e: Error, _v, ctx) => { rollback(ctx); Alert.alert('Erro', e.message) },
    onSettled: reconcile,
  })

  const deleteMutation = useMutation({
    mutationFn: () => peopleApi.deleteEntry(entryId),
    onMutate: () => patchEntries((es) => es.filter((e) => e.id !== entryId)),
    onError: (e: Error, _v, ctx) => { rollback(ctx); Alert.alert('Erro', e.message) },
    onSettled: reconcile,
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
