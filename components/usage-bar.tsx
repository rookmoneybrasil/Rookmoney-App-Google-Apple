import { View, StyleSheet } from 'react-native'
import { Text } from '@/components/text'
import { COLORS } from '@/lib/constants'

export function UsageBar({ used, limit, label }: { used: number; limit: number | null; label: string }) {
  if (limit === null) return null
  const pct   = Math.min(Math.round((used / limit) * 100), 100)
  const color = pct >= 100 ? COLORS.danger : pct >= 80 ? COLORS.warning : COLORS.brand

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.value, pct >= 80 && styles.valueWarn]}>{used}/{limit}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label:     { width: 76, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  track:     { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.card2, overflow: 'hidden' },
  fill:      { height: 6, borderRadius: 3 },
  value:     { fontSize: 12, color: COLORS.muted, minWidth: 44, textAlign: 'right' },
  valueWarn: { color: COLORS.warning, fontWeight: '700' },
})
