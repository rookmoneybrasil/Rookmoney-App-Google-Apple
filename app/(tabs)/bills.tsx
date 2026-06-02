import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { billsApi, type Bill } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

function urgencyColor(dueDate: string, isPaid: boolean) {
  if (isPaid) return COLORS.success
  const days = differenceInDays(new Date(dueDate), new Date())
  if (days < 0)  return COLORS.danger
  if (days <= 3) return COLORS.warning
  return COLORS.muted
}

function BillItem({
  item,
  onPay,
  onDelete,
}: {
  item: Bill
  onPay: () => void
  onDelete: () => void
}) {
  const color = urgencyColor(item.dueDate, item.isPaid)
  const days  = differenceInDays(new Date(item.dueDate), new Date())
  const label = item.isPaid
    ? 'Pago'
    : days < 0 ? 'Vencido'
    : days === 0 ? 'Vence hoje'
    : `${days}d`

  return (
    <TouchableOpacity
      style={[styles.item, item.isPaid && styles.itemPaid]}
      onLongPress={() =>
        Alert.alert('Opções', item.name, [
          { text: 'Cancelar', style: 'cancel' },
          ...(!item.isPaid ? [{ text: 'Marcar como pago', onPress: onPay }] : []),
          { text: 'Excluir', style: 'destructive' as const, onPress: onDelete },
        ])
      }
      activeOpacity={0.85}
    >
      <View style={styles.left}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.date}>
          {format(new Date(item.dueDate), "d 'de' MMMM", { locale: ptBR })}
          {item.isRecurring ? ' · Recorrente' : ''}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{fmt(item.amount)}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
          </View>
          {!item.isPaid && (
            <TouchableOpacity style={styles.payBtn} onPress={onPay}>
              <Feather name="check" size={14} color={COLORS.success} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function BillsScreen() {
  const router = useRouter()
  const qc     = useQueryClient()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bills'],
    queryFn:  () => billsApi.list().then((r) => r.data),
  })

  const payMutation = useMutation({
    mutationFn: (id: string) => billsApi.pay(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => billsApi.delete(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const pending = data?.filter((b) => !b.isPaid) ?? []
  const paid    = data?.filter((b) =>  b.isPaid) ?? []
  const totalPending = pending.reduce((s, b) => s + b.amount, 0)

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Contas a pagar</Text>
          {!isLoading && (
            <Text style={styles.subtitle}>{pending.length} pendente{pending.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-bill')}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Total pending */}
      {!isLoading && pending.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total pendente</Text>
          <Text style={styles.summaryValue}>{fmt(totalPending)}</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={[...pending, ...paid]}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => (
            <BillItem
              item={item}
              onPay={() => payMutation.mutate(item.id)}
              onDelete={() => deleteMutation.mutate(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="file-text" size={36} color={COLORS.muted} />
              <Text style={styles.emptyText}>Nenhuma conta cadastrada.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title:    { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  addBtn: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
    marginTop: 4,
  },

  summaryCard: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: COLORS.muted },
  summaryValue: { fontSize: 18, fontWeight: '700', color: COLORS.danger },

  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  itemPaid: { opacity: 0.5 },
  left:   { flex: 1 },
  right:  { alignItems: 'flex-end', gap: 6 },
  name:   { fontSize: 14, fontWeight: '500', color: COLORS.text },
  date:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  payBtn: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  separator: { height: 8 },
  empty:     { paddingTop: 60, alignItems: 'center', gap: 8 },
  emptyText: { color: COLORS.muted, fontSize: 14 },
})
