import { useState, useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Text } from '@/components/text'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { peopleApi, personRecurringApi, type PersonEntryRecurring } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

interface Props {
  item:           PersonEntryRecurring
  personId:       string
  monthEntryId:   string | null
  paidThisMonth:  boolean
  onEdit:         () => void
}

export function RecurringEntryRow({ item, personId, monthEntryId, paidThisMonth, onEdit }: Props) {
  const qc = useQueryClient()
  const [paid, setPaid] = useState(paidThisMonth)
  const isTheyOwe = item.type === 'THEY_OWE_ME'

  useEffect(() => { setPaid(paidThisMonth) }, [paidThisMonth])

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (paid) {
        if (monthEntryId) await peopleApi.unsettleEntry(monthEntryId)
      } else if (monthEntryId) {
        await peopleApi.settleEntry(monthEntryId)
      } else {
        const entry = await peopleApi.addEntry(personId, {
          type:        item.type,
          description: item.description,
          amount:      item.amount,
          date:        new Date().toISOString().split('T')[0],
          categoryId:  item.categoryId ?? undefined,
        })
        await peopleApi.settleEntry(entry.data.id)
      }
    },
    onSuccess: () => {
      setPaid(p => !p)
      qc.refetchQueries({ queryKey: ['person', personId] })
      qc.refetchQueries({ queryKey: ['people'] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const stopMutation = useMutation({
    mutationFn: () => personRecurringApi.delete(item.id),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['personRecurring', personId] })
      qc.refetchQueries({ queryKey: ['person', personId] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  function confirmStop() {
    Alert.alert('Parar recorrência', `Parar "${item.description}"? Lançamentos já gerados não serão apagados.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Parar', style: 'destructive', onPress: () => stopMutation.mutate() },
    ])
  }

  return (
    <View style={[styles.card, paid ? styles.cardPaid : styles.cardPending]}>
      <View style={[styles.icon, paid ? styles.iconPaid : styles.iconPending]}>
        <Feather name={paid ? 'check-circle' : 'refresh-cw'} size={15} color={paid ? COLORS.success : COLORS.brand} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, paid && styles.titlePaid]} numberOfLines={1}>{item.description}</Text>
          <View style={[styles.badge, paid ? styles.badgeSuccess : styles.badgeWarning]}>
            <Text style={[styles.badgeText, paid ? styles.badgeTextSuccess : styles.badgeTextWarning]}>
              {paid ? 'Pago' : 'Pendente'}
            </Text>
          </View>
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
        <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
          <Feather name="edit-2" size={14} color={COLORS.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, paid ? styles.toggleBtnUndo : styles.toggleBtnPay]}
          onPress={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
        >
          <Text style={[styles.toggleBtnText, paid ? styles.toggleBtnTextUndo : styles.toggleBtnTextPay]}>
            {toggleMutation.isPending ? '...' : paid ? 'Desfazer' : 'Pago'}
          </Text>
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
  cardPending: { backgroundColor: COLORS.brand + '14', borderColor: COLORS.brand + '33' },
  cardPaid:    { backgroundColor: COLORS.success + '0d', borderColor: COLORS.success + '33' },
  icon: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  iconPending: { backgroundColor: COLORS.brand + '22' },
  iconPaid:    { backgroundColor: COLORS.success + '22' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, fontWeight: '600', color: COLORS.text, flexShrink: 1 },
  titlePaid: { textDecorationLine: 'line-through', color: COLORS.muted },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, flexShrink: 0 },
  badgeSuccess: { backgroundColor: COLORS.success + '1a', borderColor: COLORS.success + '40' },
  badgeWarning: { backgroundColor: COLORS.warning + '1a', borderColor: COLORS.warning + '40' },
  badgeText: { fontSize: 9, fontWeight: '700' },
  badgeTextSuccess: { color: COLORS.success },
  badgeTextWarning: { color: COLORS.warning },
  subtitle: { fontSize: 11, color: COLORS.muted, marginTop: 2 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  iconBtn: {
    width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.card2,
  },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  toggleBtnPay:  { backgroundColor: COLORS.success + '1a' },
  toggleBtnUndo: { backgroundColor: COLORS.card2 },
  toggleBtnText: { fontSize: 11, fontWeight: '700' },
  toggleBtnTextPay:  { color: COLORS.success },
  toggleBtnTextUndo: { color: COLORS.muted },
})
