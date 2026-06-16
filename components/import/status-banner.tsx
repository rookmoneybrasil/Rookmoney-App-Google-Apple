import { View, StyleSheet } from 'react-native'
import { Text } from '@/components/text'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'

interface Props {
  type:    'success' | 'error'
  message: string
}

export function StatusBanner({ type, message }: Props) {
  const isSuccess = type === 'success'
  return (
    <View style={[styles.box, isSuccess ? styles.success : styles.error]}>
      <Feather
        name={isSuccess ? 'check-circle' : 'alert-circle'}
        size={16}
        color={isSuccess ? COLORS.success : COLORS.danger}
      />
      <Text style={[styles.text, { color: isSuccess ? COLORS.success : COLORS.danger }]}>
        {message}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 12,
  },
  success: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  error:   { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  text:    { fontSize: 13, flex: 1, lineHeight: 18, marginTop: 1 },
})
