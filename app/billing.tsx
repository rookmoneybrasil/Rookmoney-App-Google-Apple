import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { meApi, billingApi } from '@/lib/api'

const PRO_FEATURES = [
  { icon: 'trending-up', label: 'Projeção financeira (6 meses)' },
  { icon: 'bar-chart-2', label: 'Relatórios detalhados' },
  { icon: 'pie-chart',   label: 'Orçamentos por categoria' },
  { icon: 'users',       label: 'Pessoas ilimitadas' },
  { icon: 'refresh-cw',  label: 'Recorrências ilimitadas' },
  { icon: 'target',      label: 'Metas ilimitadas' },
  { icon: 'file-text',   label: 'Contas ilimitadas' },
  { icon: 'activity',    label: 'Transações ilimitadas' },
  { icon: 'upload',      label: 'Importação de extratos' },
]

const FREE_LIMITS = [
  '50 transações/mês',
  '5 contas',
  '2 metas',
  '2 pessoas',
  '3 categorias personalizadas',
  '2 recorrências',
]

export default function BillingScreen() {
  const router      = useRouter()
  const [annual, setAnnual]   = useState(false)
  const [loading, setLoading] = useState(false)

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then(r => r.data),
  })

  const isPro = me?.plan === 'PRO'

  async function handleCheckout() {
    setLoading(true)
    try {
      const res = await billingApi.checkout(annual)
      await Linking.openURL(res.data.url)
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível iniciar o checkout.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePortal() {
    setLoading(true)
    try {
      const res = await billingApi.portal()
      await Linking.openURL(res.data.url)
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível abrir o portal de assinatura.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planos</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Current plan badge */}
        {me && (
          <View style={[styles.currentPlan, isPro && styles.currentPlanPro]}>
            <Feather name={isPro ? 'zap' : 'user'} size={16} color={isPro ? COLORS.warning : COLORS.muted} />
            <Text style={[styles.currentPlanText, isPro && { color: COLORS.warning }]}>
              {isPro ? 'Você está no plano PRO' : 'Você está no plano Free'}
            </Text>
          </View>
        )}

        {!isPro ? (
          <>
            {/* PRO card */}
            <View style={styles.proCard}>
              <View style={styles.proBadgeRow}>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>⚡ PRO</Text>
                </View>
                <Text style={styles.proTagline}>Tudo ilimitado</Text>
              </View>

              {/* Price toggle */}
              <View style={styles.priceToggle}>
                <TouchableOpacity
                  style={[styles.toggleOption, !annual && styles.toggleOptionActive]}
                  onPress={() => setAnnual(false)}
                >
                  <Text style={[styles.toggleText, !annual && styles.toggleTextActive]}>Mensal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleOption, annual && styles.toggleOptionActive]}
                  onPress={() => setAnnual(true)}
                >
                  <Text style={[styles.toggleText, annual && styles.toggleTextActive]}>Anual</Text>
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>-20%</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceValue}>
                  {annual ? 'R$ 15,90' : 'R$ 19,90'}
                </Text>
                <Text style={styles.pricePeriod}>/mês</Text>
              </View>
              {annual && (
                <Text style={styles.annualNote}>Cobrado anualmente · R$ 190,80/ano</Text>
              )}

              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={handleCheckout}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.upgradeBtnText}>Assinar PRO →</Text>
                }
              </TouchableOpacity>

              <Text style={styles.cancelNote}>Cancele quando quiser</Text>
            </View>

            {/* Feature list */}
            <View style={styles.featureSection}>
              <Text style={styles.featureTitle}>Tudo do Free +</Text>
              {PRO_FEATURES.map(f => (
                <View key={f.label} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Feather name={f.icon as any} size={14} color={COLORS.brand} />
                  </View>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                </View>
              ))}
            </View>

            {/* Free plan limits */}
            <View style={styles.freeSection}>
              <Text style={styles.freeSectionTitle}>Plano Free (atual)</Text>
              {FREE_LIMITS.map(l => (
                <View key={l} style={styles.featureRow}>
                  <Feather name="minus" size={14} color={COLORS.muted} />
                  <Text style={styles.freeLimitText}>{l}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          /* PRO user — manage subscription */
          <View style={styles.proManage}>
            <View style={styles.proManageIcon}>
              <Feather name="zap" size={32} color={COLORS.warning} />
            </View>
            <Text style={styles.proManageTitle}>Assinatura ativa</Text>
            <Text style={styles.proManageDesc}>
              Você tem acesso a todos os recursos PRO do Rook Money.
            </Text>
            <TouchableOpacity
              style={styles.portalBtn}
              onPress={handlePortal}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={COLORS.brand} />
                : <Text style={styles.portalBtnText}>Gerenciar assinatura</Text>
              }
            </TouchableOpacity>
            <Text style={styles.portalNote}>Abre no navegador via Stripe</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content:     { padding: 16 },

  currentPlan: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  currentPlanPro:  { borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.06)' },
  currentPlanText: { fontSize: 14, fontWeight: '500', color: COLORS.muted },

  proCard: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.brand,
    padding: 20, marginBottom: 16,
  },
  proBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  proBadge: {
    backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  proBadgeText: { fontSize: 13, fontWeight: '700', color: COLORS.warning },
  proTagline:   { fontSize: 14, color: COLORS.muted },

  priceToggle: {
    flexDirection: 'row', backgroundColor: COLORS.card2,
    borderRadius: 12, padding: 4, marginBottom: 16,
  },
  toggleOption: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  toggleOptionActive: { backgroundColor: COLORS.brand },
  toggleText:         { fontSize: 14, fontWeight: '600', color: COLORS.muted },
  toggleTextActive:   { color: '#fff' },
  saveBadge: {
    backgroundColor: COLORS.success + '33', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  saveBadgeText: { fontSize: 10, color: COLORS.success, fontWeight: '700' },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 },
  priceValue:  { fontSize: 36, fontWeight: '800', color: COLORS.text },
  pricePeriod: { fontSize: 16, color: COLORS.muted },
  annualNote:  { fontSize: 12, color: COLORS.muted, marginBottom: 16 },

  upgradeBtn: {
    backgroundColor: COLORS.brand, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 16, marginBottom: 8,
  },
  upgradeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelNote: { fontSize: 12, color: COLORS.muted, textAlign: 'center' },

  featureSection: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 16,
  },
  featureTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  featureRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  featureIcon:  { width: 26, height: 26, borderRadius: 8, backgroundColor: COLORS.brandDim, justifyContent: 'center', alignItems: 'center' },
  featureLabel: { fontSize: 14, color: COLORS.text, flex: 1 },

  freeSection: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 16,
  },
  freeSectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  freeLimitText:    { fontSize: 13, color: COLORS.muted, flex: 1 },

  proManage: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 16 },
  proManageIcon: {
    width: 80, height: 80, borderRadius: 24, marginBottom: 20,
    backgroundColor: 'rgba(245,158,11,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  proManageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  proManageDesc: { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 21, marginBottom: 32 },
  portalBtn: {
    borderWidth: 1.5, borderColor: COLORS.brand, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32, marginBottom: 8,
  },
  portalBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.brand },
  portalNote:    { fontSize: 12, color: COLORS.muted },
})
