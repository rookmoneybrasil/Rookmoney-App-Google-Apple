import { useEffect, useRef, useState } from 'react'
import {
  Modal, View, TouchableOpacity,
  TouchableWithoutFeedback, StyleSheet, Dimensions,
} from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '@/lib/auth'

const STORAGE_KEY = 'rook_upsell_shown'
const DELAY_MS    = 8_000
const { width }   = Dimensions.get('window')

const PERKS = [
  'Transações, contas e metas ilimitadas',
  'Rookinho IA — seu assistente financeiro',
  'Relatórios e projeção financeira',
  'Orçamento por categoria e importação CSV',
]

export function UpsellModal() {
  const [visible, setVisible] = useState(false)
  const router  = useRouter()
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const user    = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user || user.plan === 'PRO' || user.plan === 'PRO_PLUS') return
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) return
      timer.current = setTimeout(() => {
        setVisible(true)
        AsyncStorage.setItem(STORAGE_KEY, '1')
      }, DELAY_MS)
    })
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [user])

  function close() { setVisible(false) }

  function goToBilling() {
    close()
    router.push('/billing')
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <TouchableWithoutFeedback onPress={close}>
        <View style={s.backdrop}>
          <TouchableWithoutFeedback>
            <View style={s.sheet}>
              {/* Close button */}
              <TouchableOpacity style={s.closeBtn} onPress={close} hitSlop={12}>
                <Feather name="x" size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>

              {/* Header */}
              <View style={s.header}>
                <View style={s.eyebrowRow}>
                  <MaterialCommunityIcons name="crown" size={14} color={COLORS.warning} />
                  <Text style={s.eyebrow}>ROOK MONEY PRO</Text>
                </View>
                <Text style={s.title}>Suas finanças{'\n'}sem limites</Text>
                <Text style={s.subtitle}>
                  A partir de <Text style={s.price}>R$19,90/mês</Text> — cancele quando quiser.
                </Text>
              </View>

              {/* Perks */}
              <View style={s.perks}>
                {PERKS.map((p) => (
                  <View key={p} style={s.perkRow}>
                    <View style={s.check}>
                      <Feather name="check" size={12} color={COLORS.success} />
                    </View>
                    <Text style={s.perkText}>{p}</Text>
                  </View>
                ))}
              </View>

              {/* CTAs */}
              <View style={s.ctas}>
                <TouchableOpacity style={s.primaryBtn} onPress={goToBilling} activeOpacity={0.85}>
                  <MaterialCommunityIcons name="crown" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={s.primaryBtnText}>Ver planos</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={close} activeOpacity={0.7} style={s.skipBtn}>
                  <Text style={s.skipText}>Continuar no plano gratuito</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const SHEET_W = Math.min(width - 48, 340)

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: SHEET_W,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    padding: 22,
    paddingTop: 26,
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  header: { marginBottom: 18 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  eyebrow: {
    fontSize: 10, fontWeight: '800', color: COLORS.warning, letterSpacing: 1.2,
  },
  title: {
    fontSize: 22, fontWeight: '800', color: COLORS.text, lineHeight: 28,
  },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 6 },
  price:    { color: COLORS.text, fontWeight: '600' },

  perks: { gap: 12, marginBottom: 20 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.success + '22',
    justifyContent: 'center', alignItems: 'center',
  },
  perkText: { flex: 1, fontSize: 13, color: COLORS.text },

  ctas: { gap: 6 },
  primaryBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipText: { fontSize: 12, color: COLORS.muted },
})
