import { View, Modal, Pressable, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '@/components/text'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'

export interface InfoRow { label: string; value: string }

// Read-only detail bottom-sheet. Opens when the user taps an item (recurring
// bill, one-off bill, income) to see its info at a glance — no actions here, the
// existing controls (edit/pay/delete) stay on the row/menu.
export function InfoSheet({
  visible, onClose, typeLabel, title, amount, amountColor, badge, rows,
}: {
  visible:     boolean
  onClose:     () => void
  typeLabel:   string
  title:       string
  amount?:     string
  amountColor?: string
  badge?:      { label: string; color: string } | null
  rows:        InfoRow[]
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.typeLabel}>{typeLabel}</Text>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Feather name="x" size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          {!!amount && (
            <Text style={[styles.amount, amountColor ? { color: amountColor } : null]}>{amount}</Text>
          )}
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.color + '22', borderColor: badge.color + '55' }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          )}

          <View style={styles.rows}>
            {rows.filter(r => !!r.value).map((r) => (
              <View key={r.label} style={styles.row}>
                <Text style={styles.rowLabel}>{r.label}</Text>
                <Text style={styles.rowValue} numberOfLines={3}>{r.value}</Text>
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 36,
    borderTopWidth: 1, borderColor: COLORS.border,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.muted2, alignSelf: 'center', marginBottom: 14 },

  header:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  typeLabel: { fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  title:     { fontSize: 19, fontWeight: '800', color: COLORS.text },
  closeBtn:  { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.card2, justifyContent: 'center', alignItems: 'center' },

  amount: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginTop: 12 },
  badge: {
    alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },

  rows: { marginTop: 18, gap: 2 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLabel: { fontSize: 13, color: COLORS.muted },
  rowValue: { fontSize: 14, color: COLORS.text, fontWeight: '600', flex: 1, textAlign: 'right' },
})
