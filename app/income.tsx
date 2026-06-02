import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { incomeSourcesApi, type IncomeSource } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const TYPE_ICON: Record<string, string> = {
  EMPLOYMENT: '💼',
  FREELANCE:  '🧑‍💻',
  RENTAL:     '🏠',
  OTHER:      '💡',
}

const TYPE_LABEL: Record<string, string> = {
  EMPLOYMENT: 'CLT / Emprego',
  FREELANCE:  'Freelance',
  RENTAL:     'Aluguel',
  OTHER:      'Outro',
}

function IncomeItem({ item, onDelete }: { item: IncomeSource; onDelete: () => void }) {
  return (
    <TouchableOpacity
      style={styles.item}
      onLongPress={() =>
        Alert.alert('Excluir renda', `Remover "${item.name}"?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: onDelete },
        ])
      }
      activeOpacity={0.8}
    >
      <View style={styles.icon}>
        <Text style={styles.emoji}>{TYPE_ICON[item.type] ?? '💰'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {TYPE_LABEL[item.type] ?? item.type}
          {item.dayOfMonth ? ` · Dia ${item.dayOfMonth}` : ''}
          {item.isRecurring ? ' · Recorrente' : ' · Pontual'}
        </Text>
      </View>
      <Text style={styles.amount}>{fmt(item.amount)}</Text>
    </TouchableOpacity>
  )
}

export default function IncomeScreen() {
  const router = useRouter()
  const qc     = useQueryClient()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['income-sources'],
    queryFn:  () => incomeSourcesApi.list().then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => incomeSourcesApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['income-sources'] }),
    onError:    (e: Error) => Alert.alert('Erro', e.message),
  })

  const recurring   = data?.filter((s) => s.isRecurring) ?? []
  const oneTime     = data?.filter((s) => !s.isRecurring) ?? []
  const totalMonthly = recurring.reduce((s, r) => s + r.amount, 0)

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Rendas</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-income')}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Renda mensal recorrente</Text>
        <Text style={styles.summaryValue}>{fmt(totalMonthly)}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
        >
          {data?.length === 0 && (
            <View style={styles.empty}>
              <Feather name="briefcase" size={40} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>Nenhuma renda cadastrada</Text>
              <Text style={styles.emptyText}>Adicione suas fontes de renda</Text>
            </View>
          )}

          {recurring.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>RECORRENTES</Text>
              {recurring.map((s) => (
                <IncomeItem key={s.id} item={s} onDelete={() => deleteMutation.mutate(s.id)} />
              ))}
            </>
          )}

          {oneTime.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>PONTUAIS</Text>
              {oneTime.map((s) => (
                <IncomeItem key={s.id} item={s} onDelete={() => deleteMutation.mutate(s.id)} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:  { fontSize: 20, fontWeight: '700', color: COLORS.text },
  addBtn: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },

  summaryCard: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: COLORS.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  summaryValue: { fontSize: 28, fontWeight: '700', color: COLORS.success },

  list: { paddingHorizontal: 20, paddingBottom: 32 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.muted,
    letterSpacing: 1, marginBottom: 8, marginTop: 4,
  },

  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  icon:   { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.card2, justifyContent: 'center', alignItems: 'center' },
  emoji:  { fontSize: 20 },
  info:   { flex: 1 },
  name:   { fontSize: 14, fontWeight: '600', color: COLORS.text },
  meta:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700', color: COLORS.success },

  empty:      { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  emptyText:  { fontSize: 13, color: COLORS.muted },
})
