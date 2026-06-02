import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'

interface ProGateProps {
  feature: string
  description?: string
}

export function ProGate({ feature, description }: ProGateProps) {
  const router = useRouter()
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Feather name="lock" size={28} color={COLORS.warning} />
        </View>
        <Text style={styles.badge}>⚡ PRO</Text>
        <Text style={styles.title}>{feature}</Text>
        {description && <Text style={styles.desc}>{description}</Text>}
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/billing')} activeOpacity={0.85}>
          <Text style={styles.btnText}>Fazer upgrade</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.back}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.bg,
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    padding: 32, alignItems: 'center', width: '100%', maxWidth: 360,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(245,158,11,0.12)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  badge: {
    fontSize: 13, fontWeight: '700', color: COLORS.warning,
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
    marginBottom: 16, overflow: 'hidden',
  },
  title: {
    fontSize: 20, fontWeight: '700', color: COLORS.text,
    textAlign: 'center', marginBottom: 8,
  },
  desc: {
    fontSize: 14, color: COLORS.muted, textAlign: 'center',
    lineHeight: 20, marginBottom: 24,
  },
  btn: {
    backgroundColor: COLORS.brand, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32, width: '100%',
    alignItems: 'center', marginBottom: 12,
  },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  back:    { fontSize: 14, color: COLORS.muted, paddingVertical: 8 },
})
