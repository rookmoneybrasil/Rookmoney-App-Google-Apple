import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '@/components/text'
import { useQuery } from '@tanstack/react-query'
import { COLORS } from '@/lib/constants'
import { accountsApi } from '@/lib/api'

// Reusable "Conta" selector (chip row) for money forms — bill, recurring bill,
// income. Fetches the accounts once (cached under ['accounts']). value is the
// accountId; null/'' = "nenhuma" (falls back to the default account on the API).
export function AccountPicker({ value, onChange, label = 'Conta' }: {
  value:    string | null
  onChange: (id: string | null) => void
  label?:   string
}) {
  const { data } = useQuery({
    queryKey: ['accounts'],
    queryFn:  () => accountsApi.list().then(r => r.data),
  })
  const accounts = data?.accounts.filter(a => !a.archived) ?? []
  if (accounts.length === 0) return null

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {accounts.map(a => (
          <TouchableOpacity
            key={a.id}
            style={[styles.pill, value === a.id && styles.pillActive]}
            onPress={() => onChange(a.id)}
          >
            <Text style={styles.emoji}>{a.icon}</Text>
            <Text style={[styles.pillText, value === a.id && styles.pillTextActive]} numberOfLines={1}>{a.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  label:  { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 16 },
  scroll: { marginTop: 4, marginBottom: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 7, marginRight: 7,
  },
  pillActive:     { backgroundColor: COLORS.brandDim, borderColor: COLORS.brand },
  emoji:          { fontSize: 14 },
  pillText:       { fontSize: 13, color: COLORS.muted, maxWidth: 120 },
  pillTextActive: { color: COLORS.brand, fontWeight: '600' },
})
