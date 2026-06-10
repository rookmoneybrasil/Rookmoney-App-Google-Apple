import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '@/components/text'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

interface Props {
  pendingBillsCount:    number
  pendingBillsAmount:   number
  personPayablesAmount: number
  overdueCount:         number
  onPress:              () => void
}

export function ThemedBillCard({ pendingBillsCount, pendingBillsAmount, personPayablesAmount, overdueCount, onPress }: Props) {
  const total = (pendingBillsAmount ?? 0) + (personPayablesAmount ?? 0)

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Feather name="arrow-up-circle" size={15} color={COLORS.danger} />
        <Text style={styles.title}>A Pagar</Text>
      </View>

      {total === 0 ? (
        <Text style={styles.emptyText}>Nenhum compromisso pendente.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {pendingBillsCount > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{pendingBillsCount} conta{pendingBillsCount !== 1 ? 's' : ''}</Text>
              <Text style={styles.rowValue}>{fmt(pendingBillsAmount)}</Text>
            </View>
          )}
          {personPayablesAmount > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Dívidas com pessoas</Text>
              <Text style={styles.rowValue}>{fmt(personPayablesAmount)}</Text>
            </View>
          )}
          {overdueCount > 0 && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueText}>⚠ {overdueCount} em atraso</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{fmt(total)}</Text>
          </View>
          <TouchableOpacity onPress={onPress}>
            <Text style={styles.link}>Ver contas →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A0505', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: COLORS.danger + '30',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title:    { fontSize: 15, fontWeight: '700', color: COLORS.text },

  emptyText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingVertical: 8 },

  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 13, color: COLORS.muted },
  rowValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },

  overdueBadge: {
    backgroundColor: COLORS.danger + '15', borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.danger + '30',
    paddingHorizontal: 10, paddingVertical: 6,
  },
  overdueText: { fontSize: 11, fontWeight: '700', color: COLORS.danger },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 2,
  },
  totalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.danger },

  link: { fontSize: 12, color: COLORS.brand, textAlign: 'center', marginTop: 4 },
})
