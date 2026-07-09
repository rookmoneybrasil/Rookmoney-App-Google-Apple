import { useEffect } from 'react'
import { Modal, View, Image, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, Dimensions } from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { useWelcomePro } from '@/lib/welcome-pro'
import { triggerConfetti } from '@/components/confetti'

const { width } = Dimensions.get('window')
const SHEET_W = Math.min(width - 32, 380)

const PRO_PERKS = [
  'Transações, contas e metas ilimitadas',
  'Rookinho IA — 30 mensagens/mês',
  'Relatórios, projeção e orçamento',
  'Importação de extratos CSV',
]

const PRO_PLUS_PERKS = [
  'Tudo do PRO, sem nenhum limite',
  'Rookinho IA ilimitado + no WhatsApp',
  'Scanner e análises ilimitados',
  'Suporte prioritário',
]

export function WelcomeProModal() {
  const plan   = useWelcomePro((s) => s.plan)
  const hide   = useWelcomePro((s) => s.hide)
  const router = useRouter()

  const isPlus = plan === 'PRO_PLUS'
  const accent = isPlus ? COLORS.brand : COLORS.warning

  useEffect(() => {
    if (plan) triggerConfetti()
  }, [plan])

  if (!plan) return null

  const perks = isPlus ? PRO_PLUS_PERKS : PRO_PERKS

  return (
    <Modal visible transparent animationType="fade" onRequestClose={hide}>
      <TouchableWithoutFeedback onPress={hide}>
        <View style={s.backdrop}>
          <TouchableWithoutFeedback>
            <View style={s.sheet}>
              <TouchableOpacity style={s.closeBtn} onPress={hide} hitSlop={12}>
                <Feather name="x" size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>

              {/* Rookinho */}
              <View style={[s.hero, { backgroundColor: accent + '14' }]}>
                <Image source={require('../assets/rookinho.png')} style={s.rookinho} resizeMode="contain" />
              </View>

              <View style={s.body}>
                <View style={s.badgeRow}>
                  {isPlus
                    ? <Feather name="zap" size={14} color={accent} />
                    : <MaterialCommunityIcons name="crown" size={15} color={accent} />}
                  <Text style={[s.badge, { color: accent }]}>{isPlus ? 'PRO+ ATIVO' : 'PRO ATIVO'}</Text>
                </View>

                <Text style={s.title}>{isPlus ? 'Bem-vindo ao PRO+!' : 'Bem-vindo ao PRO!'} 🎉</Text>
                <Text style={s.subtitle}>
                  {isPlus
                    ? 'Agora é tudo ilimitado — sem nenhuma restrição.'
                    : 'Agora você tem acesso completo ao Rook Money.'}
                </Text>

                <View style={s.perks}>
                  {perks.map((p) => (
                    <View key={p} style={s.perkRow}>
                      <View style={[s.check, { backgroundColor: COLORS.success + '22' }]}>
                        <Feather name="check" size={12} color={COLORS.success} />
                      </View>
                      <Text style={s.perkText}>{p}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: accent }]} onPress={hide} activeOpacity={0.85}>
                  <Text style={[s.primaryBtnText, isPlus && { color: '#fff' }]}>Começar a usar</Text>
                </TouchableOpacity>

                {isPlus && (
                  <TouchableOpacity
                    style={s.secondaryBtn}
                    onPress={() => { hide(); router.push('/settings') }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="whatsapp" size={15} color={COLORS.muted} />
                    <Text style={s.secondaryBtnText}>Vincular meu WhatsApp</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  sheet: {
    width: SHEET_W, backgroundColor: COLORS.card,
    borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center',
  },
  hero: { height: 150, alignItems: 'center', justifyContent: 'flex-end' },
  rookinho: { width: 150, height: 150 },
  body: { padding: 22, paddingTop: 16 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  badge: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 4, lineHeight: 19 },
  perks: { gap: 10, marginTop: 18, marginBottom: 20 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  perkText: { flex: 1, fontSize: 13, color: COLORS.text },
  primaryBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, marginTop: 4,
  },
  secondaryBtnText: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
})
