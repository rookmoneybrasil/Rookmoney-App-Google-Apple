import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '@/components/text'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import type { Category } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

interface Props {
  date:           string
  description:    string
  amount:         number
  type:           'INCOME' | 'EXPENSE'
  categoryId:     string
  categories:     Category[]
  onPickCategory: () => void
}

export function TransactionRow({ date, description, amount, type, categoryId, categories, onPickCategory }: Props) {
  const cat = categories.find((c) => c.id === categoryId)

  return (
    <View style={styles.row}>
      <View style={styles.main}>
        <View style={styles.info}>
          <Text style={styles.date}>{date || '—'}</Text>
          <Text style={styles.desc} numberOfLines={1}>
            {description || 'sem descrição'}
          </Text>
        </View>
        <View style={styles.amountWrap}>
          <Text style={[styles.amount, { color: type === 'INCOME' ? COLORS.success : COLORS.danger }]}>
            {isNaN(amount) ? 'inválido' : `${type === 'INCOME' ? '+' : '-'} ${fmt(amount)}`}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.catBtn, !categoryId && styles.catBtnEmpty]}
        onPress={onPickCategory}
        activeOpacity={0.8}
      >
        <Text style={[styles.catBtnText, !categoryId && styles.catBtnTextEmpty]} numberOfLines={1}>
          {cat ? `${cat.icon}  ${cat.name}` : 'Selecionar categoria'}
        </Text>
        <Feather name="chevron-down" size={14} color={categoryId ? COLORS.muted : COLORS.danger} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: COLORS.card2, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12, gap: 10,
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { flex: 1, gap: 2 },
  date: { fontSize: 11, color: COLORS.muted },
  desc: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  amountWrap: { alignItems: 'flex-end' },
  amount: { fontSize: 13, fontWeight: '700' },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
  },
  catBtnEmpty: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' },
  catBtnText: { fontSize: 12, color: COLORS.text, flex: 1 },
  catBtnTextEmpty: { color: COLORS.danger },
})
