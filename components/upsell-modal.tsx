import { useEffect, useRef, useState } from 'react'
import {
  Modal, View, ScrollView, TouchableOpacity,
  TouchableWithoutFeedback, StyleSheet, Dimensions,
} from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '@/lib/auth'

const STORAGE_KEY = 'rook_upsell_shown'
const DELAY_MS    = 8_000
const { width }   = Dimensions.get('window')

const COMPARISON = [
  { label: 'Transações/mês',      free: '50',  pro: 'Ilimitado', proPlus: 'Ilimitado' },
  { label: 'Contas a pagar',      free: '5',   pro: 'Ilimitado', proPlus: 'Ilimitado' },
  { label: 'Metas',               free: '2',   pro: 'Ilimitado', proPlus: 'Ilimitado' },
  { label: 'Pessoas',             free: '2',   pro: 'Ilimitado', proPlus: 'Ilimitado' },
  { label: 'Relatórios',          free: null,  pro: true,        proPlus: true         },
  { label: 'Projeção financeira', free: null,  pro: true,        proPlus: true         },
  { label: 'Orçamento',           free: null,  pro: true,        proPlus: true         },
  { label: 'Importar CSV',        free: null,  pro: true,        proPlus: true         },
  { label: 'Chat com Rookinho',   free: null,  pro: '30/mês',    proPlus: 'Ilimitado'  },
  { label: 'Análises com IA',     free: null,  pro: '4/mês',     proPlus: 'Ilimitado'  },
  { label: 'Arquivos (upload)',    free: null,  pro: '10/mês',    proPlus: 'Ilimitado'  },
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

              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* Header */}
                <View style={s.header}>
                  <Text style={s.eyebrow}>DESBLOQUEIE O POTENCIAL TOTAL</Text>
                  <Text style={s.title}>Suas finanças{'\n'}merecem mais</Text>
                  <Text style={s.subtitle}>
                    A partir de <Text style={s.price}>R$19,90/mês</Text> — cancele quando quiser.
                  </Text>
                </View>

                {/* Comparison table */}
                <View style={s.table}>
                  {/* Header row */}
                  <View style={[s.row, s.tableHeader]}>
                    <View style={s.colLabel}><Text style={s.colHead}>RECURSO</Text></View>
                    <View style={s.colFree}><Text style={s.colHead}>FREE</Text></View>
                    <View style={s.colPro}>
                      <Feather name="award" size={10} color={COLORS.warning} />
                      <Text style={[s.colHead, { color: COLORS.warning, marginLeft: 3 }]}>PRO</Text>
                    </View>
                    <View style={s.colProPlus}>
                      <Feather name="zap" size={10} color={COLORS.brand} />
                      <Text style={[s.colHead, { color: COLORS.brand, marginLeft: 3 }]}>PRO+</Text>
                    </View>
                  </View>
                  {/* Data rows */}
                  {COMPARISON.map(({ label, free, pro, proPlus }, i) => (
                    <View key={label} style={[s.row, i % 2 === 0 ? s.rowEven : null]}>
                      <View style={s.colLabel}><Text style={s.cell}>{label}</Text></View>
                      <View style={s.colFree}>
                        {free === null
                          ? <Feather name="minus" size={12} color={COLORS.muted2} />
                          : <Text style={s.cell}>{free}</Text>
                        }
                      </View>
                      <View style={s.colPro}>
                        {pro === true
                          ? <Feather name="check" size={13} color={COLORS.success} />
                          : <Text style={[s.cell, s.proValue]}>{pro as string}</Text>
                        }
                      </View>
                      <View style={s.colProPlus}>
                        {proPlus === true
                          ? <Feather name="check" size={13} color={COLORS.success} />
                          : <Text style={[s.cell, s.proValue]}>{proPlus as string}</Text>
                        }
                      </View>
                    </View>
                  ))}
                </View>

                {/* CTAs */}
                <View style={s.ctas}>
                  <TouchableOpacity style={s.primaryBtn} onPress={goToBilling} activeOpacity={0.85}>
                    <Feather name="award" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={s.primaryBtnText}>Ver planos a partir de R$19,90</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={close} activeOpacity={0.7} style={s.skipBtn}>
                    <Text style={s.skipText}>Continuar no plano gratuito</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const SHEET_W = Math.min(width - 32, 380)

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: SHEET_W,
    maxHeight: '90%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  header: { padding: 20, paddingBottom: 12 },
  eyebrow: {
    fontSize: 9, fontWeight: '700', color: COLORS.brand,
    letterSpacing: 1.2, marginBottom: 6,
  },
  title: {
    fontSize: 22, fontWeight: '700', color: COLORS.text, lineHeight: 28,
  },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 6 },
  price:    { color: COLORS.text, fontWeight: '600' },

  table: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  tableHeader: { backgroundColor: 'rgba(255,255,255,0.04)' },
  row:      { flexDirection: 'row', alignItems: 'center' },
  rowEven:  { backgroundColor: 'rgba(255,255,255,0.02)' },
  colLabel:   { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  colFree:    { width: 44, alignItems: 'center', paddingVertical: 8 },
  colPro:     { width: 48, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', paddingVertical: 8 },
  colProPlus: { width: 48, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', paddingVertical: 8 },
  colHead:  { fontSize: 9, fontWeight: '700', color: COLORS.muted, letterSpacing: 0.8 },
  cell:     { fontSize: 11, color: COLORS.muted },
  proValue: { color: COLORS.success, fontWeight: '700' },

  ctas: { padding: 16, gap: 8 },
  primaryBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 12, color: COLORS.muted },
})
