import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Text } from '@/components/text'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { personRecurringApi, type PersonEntryRecurring } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

interface Props {
  item:     PersonEntryRecurring
  personId: string
  onEdit:   () => void
}

// Standardized to match the Contas Fixas recurring row: the template only
// toggles active/paused, edits, or deletes — it does NOT have a "Pago"
// action. The month's actual generated entry (with its own pay button)
// already appears in the regular entries list on this screen, so a pay
// button here would just be a redundant second way to do the same thing.
export function RecurringEntryRow({ item, personId, onEdit }: Props) {
  const qc = useQueryClient()
  const isTheyOwe = item.type === 'THEY_OWE_ME'
  const [toggling, setToggling] = useState(false)

  const toggleMutation = useMutation({
    mutationFn: () => personRecurringApi.update(item.id, { isActive: !item.isActive }),
    onSettled: () => {
      setToggling(false)
      qc.refetchQueries({ queryKey: ['personRecurring', personId] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const stopMutation = useMutation({
    mutationFn: () => personRecurringApi.delete(item.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['personRecurring', personId] })
      const prev = qc.getQueryData<{ id: string }[]>(['personRecurring', personId])
      if (prev) qc.setQueryData(['personRecurring', personId], prev.filter((r) => r.id !== item.id))
      return { prev }
    },
    onError: (e: Error, _v, ctx?: { prev?: { id: string }[] }) => {
      if (ctx?.prev) qc.setQueryData(['personRecurring', personId], ctx.prev)
      Alert.alert('Erro', e.message)
    },
    onSettled: () => {
      qc.refetchQueries({ queryKey: ['personRecurring', personId] })
      qc.refetchQueries({ queryKey: ['person', personId] })
    },
  })

  function confirmStop() {
    Alert.alert('Remover recorrência', `Remover "${item.description}"? Lançamentos já gerados não serão apagados.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => stopMutation.mutate() },
    ])
  }

  return (
    <View style={[styles.card, item.isActive ? styles.cardActive : styles.cardPaused]}>
      <View style={[styles.icon, item.isActive ? styles.iconActive : styles.iconPaused]}>
        <Feather name="refresh-cw" size={15} color={item.isActive ? COLORS.brand : COLORS.muted} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, !item.isActive && styles.titlePaused]} numberOfLines={1}>{item.description}</Text>
          {!item.isActive && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Pausada</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          <Text style={{ color: isTheyOwe ? COLORS.success : COLORS.danger }}>
            {isTheyOwe ? '+' : '-'}{fmt(item.amount)}/mês
          </Text>
          {' '}· dia {item.dayOfMonth}
          {item.category ? ` · ${item.category.icon} ${item.category.name}` : ''}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => { setToggling(true); toggleMutation.mutate() }}
          disabled={toggling}
        >
          <Feather
            name={item.isActive ? 'toggle-right' : 'toggle-left'}
            size={18}
            color={item.isActive ? COLORS.success : COLORS.muted}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
          <Feather name="edit-2" size={14} color={COLORS.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={confirmStop} disabled={stopMutation.isPending}>
          <Feather name="x" size={14} color={COLORS.muted} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  cardActive: { backgroundColor: COLORS.brand + '14', borderColor: COLORS.brand + '33' },
  cardPaused: { backgroundColor: COLORS.card2, borderColor: COLORS.border, opacity: 0.6 },
  icon: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  iconActive: { backgroundColor: COLORS.brand + '22' },
  iconPaused: { backgroundColor: COLORS.card2 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, fontWeight: '600', color: COLORS.text, flexShrink: 1 },
  titlePaused: { color: COLORS.muted },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card2, flexShrink: 0 },
  badgeText: { fontSize: 9, fontWeight: '700', color: COLORS.muted },
  subtitle: { fontSize: 11, color: COLORS.muted, marginTop: 2 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  iconBtn: {
    width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.card2,
  },
})
