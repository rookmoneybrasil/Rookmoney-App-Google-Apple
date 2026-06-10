import { View, StyleSheet } from 'react-native'
import { Text } from '@/components/text'

export const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#6366f1', '#64748b',
]

const SIZES = { sm: 28, md: 40, lg: 56 } as const

export function PersonAvatar({ name, color, size = 'md' }: {
  name: string; color?: string | null; size?: keyof typeof SIZES
}) {
  const initials = name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join('')
  const px = SIZES[size]
  return (
    <View style={[styles.avatar, { width: px, height: px, borderRadius: px / 2, backgroundColor: color ?? '#6366f1' }]}>
      <Text style={[styles.text, { fontSize: px * 0.4 }]}>{initials}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: { justifyContent: 'center', alignItems: 'center' },
  text:   { fontWeight: '700', color: '#fff' },
})
