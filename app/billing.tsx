import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { meApi, settingsApi, billingApi } from '@/lib/api'
import { UsageBar } from '@/components/usage-bar'

const PRO_FEATURES: { lib: 'feather' | 'mci'; icon: string; label: string }[] = [
  { lib: 'mci',     icon: 'infinity',       label: 'Transações, metas e contas ilimitadas' },
  { lib: 'feather', icon: 'bar-chart-2',    label: 'Relatórios avançados e projeção financeira' },
  { lib: 'feather', icon: 'message-circle', label: 'Chat com IA — Rookinho responde tudo' },
  { lib: 'feather', icon: 'upload',         label: 'Importação de extratos CSV' },
  { lib: 'feather', icon: 'star',           label: 'Orçamento por categoria' },
  { lib: 'feather', icon: 'shield',         label: 'Suporte prioritário' },
]

const FAQ = [
  { q: 'Posso cancelar quando quiser?', a: 'Sim, sem multa. Você mantém o acesso PRO até o fim do período pago.' },
  { q: 'Quais formas de pagamento?',    a: 'Cartão de crédito/débito e Pix (via Stripe).' },
  { q: 'O que acontece se eu cancelar?', a: 'Sua conta migra para o plano Free automaticamente, com os limites do plano gratuito.' },
]

export default function BillingScreen() {
  const router      = useRouter()
  const [annual,      setAnnual]      = useState(false)
  const [loadingUp,   setLoadingUp]   = useState(false)
  const [loadingPort, setLoadingPort] = useState(false)
  const [openFaq,     setOpenFaq]     = useState<number | null>(null)

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then(r => r.data),
  })

  const { data: settings } = useQuery({
    queryKey: ['settings-prefs'],
    queryFn:  () => settingsApi.getPrefs().then(r => r.data),
  })

  const isPro                 = me?.plan === 'PRO'
  const hasStripeSubscription = !!settings?.stripeCustomerId
  const cancelAtPeriodEnd     = settings?.stripeCancelAtPeriodEnd ?? false
  const currentPeriodEnd      = settings?.stripeCurrentPeriodEnd ?? null

  const monthlyPrice = 19.90
  const annualPrice  = 15.90
  const price        = annual ? annualPrice : monthlyPrice

  async function handleCheckout() {
    setLoadingUp(true)
    try {
      const res = await billingApi.checkout(annual)
      await Linking.openURL(res.data.url)
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível iniciar o checkout.')
    } finally {
      setLoadingUp(false)
    }
  }

  async function handlePortal() {
    setLoadingPort(true)
    try {
      const res = await billingApi.portal()
      await Linking.openURL(res.data.url)
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível abrir o portal de assinatura.')
    } finally {
      setLoadingPort(false)
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
        <Text style={styles.pageSubtitle}>Gerencie seu plano e acompanhe seu uso</Text>

        {/* Current plan status */}
        <View style={[styles.statusCard, isPro && styles.statusCardPro]}>
          <View style={[styles.statusIcon, isPro && styles.statusIconPro]}>
            {isPro
              ? <MaterialCommunityIcons name="crown" size={26} color={COLORS.warning} />
              : <Feather name="zap" size={24} color={COLORS.brand} />}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.statusTitleRow}>
              <Text style={styles.statusTitle}>Plano {isPro ? 'PRO' : 'Gratuito'}</Text>
              {isPro && (
                <View style={[styles.activeBadge, cancelAtPeriodEnd && styles.cancelingBadge]}>
                  <Text style={[styles.activeBadgeText, cancelAtPeriodEnd && styles.cancelingBadgeText]}>
                    {cancelAtPeriodEnd ? 'CANCELANDO' : 'ATIVO'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.statusDesc}>
              {isPro
                ? 'Você tem acesso a todos os recursos sem limitações.'
                : 'Upgrade para PRO e desbloqueie tudo.'}
            </Text>
          </View>
          {isPro && hasStripeSubscription && (
            <TouchableOpacity style={styles.manageHeaderBtn} onPress={handlePortal} disabled={loadingPort}>
              {loadingPort
                ? <ActivityIndicator size="small" color={COLORS.muted} />
                : <Text style={styles.manageHeaderBtnText}>Gerenciar</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Cancellation pending banner */}
        {isPro && cancelAtPeriodEnd && currentPeriodEnd && (
          <View style={styles.cancelBanner}>
            <View style={styles.cancelBannerIcon}>
              <Feather name="alert-triangle" size={20} color={COLORS.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelBannerTitle}>Cancelamento agendado</Text>
              <Text style={styles.cancelBannerDesc}>
                Seu plano PRO será cancelado em{' '}
                <Text style={styles.cancelBannerDate}>
                  {new Date(currentPeriodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
                . Até lá, você mantém acesso a todos os recursos.
              </Text>
              <TouchableOpacity onPress={handlePortal} disabled={loadingPort} activeOpacity={0.7} style={styles.reactivateBtn}>
                {loadingPort
                  ? <ActivityIndicator size="small" color={COLORS.warning} />
                  : <Text style={styles.reactivateBtnText}>Reativar assinatura →</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Usage (Free only) */}
        {!isPro && me?.usage && me?.limits && (
          <View style={styles.usageCard}>
            <Text style={styles.usageTitle}>Uso do plano gratuito</Text>
            <View style={{ gap: 10 }}>
              <UsageBar used={me.usage.transactionsThisMonth} limit={me.limits.transactionsPerMonth} label="Transações" />
              <UsageBar used={me.usage.bills}                 limit={me.limits.bills}                label="Contas" />
              <UsageBar used={me.usage.goals}                 limit={me.limits.goals}                label="Metas" />
              <UsageBar used={me.usage.people}                limit={me.limits.people}               label="Pessoas" />
              <UsageBar used={me.usage.recurring}             limit={me.limits.recurring}            label="Recorrentes" />
            </View>
          </View>
        )}

        {/* Upgrade section (Free only) */}
        {!isPro && (
          <View style={styles.proCard}>
            <View style={styles.proHeaderRow}>
              <View style={styles.proBadgeRow}>
                <MaterialCommunityIcons name="crown" size={16} color={COLORS.warning} />
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>

              {/* Toggle */}
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
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceValue}>
                R$ {price.toFixed(2).replace('.', ',')}
              </Text>
              <Text style={styles.pricePeriod}>/mês</Text>
            </View>
            {annual && (
              <Text style={styles.annualNote}>
                🎉 Você economiza R${((monthlyPrice - annualPrice) * 12).toFixed(0)} por ano — cobrado R$190,80/ano
              </Text>
            )}

            {/* Features */}
            <View style={styles.featureList}>
              {PRO_FEATURES.map(f => (
                <View key={f.label} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    {f.lib === 'mci'
                      ? <MaterialCommunityIcons name={f.icon as any} size={14} color={COLORS.brand} />
                      : <Feather name={f.icon as any} size={14} color={COLORS.brand} />}
                  </View>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={handleCheckout}
              disabled={loadingUp}
              activeOpacity={0.85}
            >
              {loadingUp
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.upgradeBtnText}>
                    {annual ? '⚡ Assinar anual — 2 meses grátis' : '⚡ Assinar PRO — R$19,90/mês'}
                  </Text>
              }
            </TouchableOpacity>

            <Text style={styles.cancelNote}>Cancele quando quiser · Sem multa · Cartão ou Pix</Text>
          </View>
        )}

        {/* PRO — manage subscription */}
        {isPro && (
          <View style={styles.manageCard}>
            <View style={styles.manageHeaderText}>
              <Text style={styles.manageTitle}>Gerenciar assinatura</Text>
              <Text style={styles.manageSubtitle}>
                {hasStripeSubscription
                  ? 'Tudo é gerenciado de forma segura via Stripe'
                  : 'Plano ativado manualmente pelo administrador'}
              </Text>
            </View>

            {hasStripeSubscription ? (
              <>
                <TouchableOpacity style={styles.manageRow} onPress={handlePortal} disabled={loadingPort} activeOpacity={0.7}>
                  <View style={[styles.manageRowIcon, { backgroundColor: COLORS.brandDim }]}>
                    <Feather name="credit-card" size={16} color={COLORS.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.manageRowTitle}>Atualizar forma de pagamento</Text>
                    <Text style={styles.manageRowDesc}>Trocar cartão ou adicionar novo</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={COLORS.muted2} />
                </TouchableOpacity>

                <View style={styles.manageDivider} />

                <TouchableOpacity style={styles.manageRow} onPress={handlePortal} disabled={loadingPort} activeOpacity={0.7}>
                  <View style={[styles.manageRowIcon, { backgroundColor: COLORS.card2 }]}>
                    <Feather name="file-text" size={16} color={COLORS.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.manageRowTitle}>Histórico de cobranças</Text>
                    <Text style={styles.manageRowDesc}>Ver faturas e comprovantes</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={COLORS.muted2} />
                </TouchableOpacity>

                <View style={styles.manageDivider} />

                <TouchableOpacity style={styles.manageRow} onPress={handlePortal} disabled={loadingPort} activeOpacity={0.7}>
                  <View style={[styles.manageRowIcon, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                    <Feather name="x-circle" size={16} color={COLORS.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.manageRowTitle, { color: COLORS.danger }]}>Cancelar assinatura</Text>
                    <Text style={styles.manageRowDesc}>Você mantém o PRO até o fim do período pago</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={COLORS.muted2} />
                </TouchableOpacity>

                {loadingPort && (
                  <View style={styles.portalLoading}>
                    <Text style={styles.portalLoadingText}>Abrindo portal seguro...</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.manageStatic}>
                <Text style={styles.manageStaticText}>Seu plano PRO foi ativado pela equipe Rook Money.</Text>
                <Text style={styles.manageStaticSub}>Para gerenciar cobranças, entre em contato pelo Suporte.</Text>
              </View>
            )}
          </View>
        )}

        {/* FAQ */}
        <View style={styles.faqCard}>
          <Text style={styles.faqTitle}>Dúvidas frequentes</Text>
          {FAQ.map((item, i) => (
            <View key={item.q}>
              {i > 0 && <View style={styles.faqDivider} />}
              <TouchableOpacity style={styles.faqRow} onPress={() => setOpenFaq(openFaq === i ? null : i)} activeOpacity={0.7}>
                <Text style={styles.faqQuestion}>{item.q}</Text>
                <Feather name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted2} />
              </TouchableOpacity>
              {openFaq === i && <Text style={styles.faqAnswer}>{item.a}</Text>}
            </View>
          ))}
        </View>

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
  headerTitle:  { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content:      { padding: 16 },
  pageSubtitle: { fontSize: 13, color: COLORS.muted, marginBottom: 16, marginTop: -8 },

  // Status card
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 16,
  },
  statusCardPro: { borderColor: 'rgba(245,158,11,0.25)', backgroundColor: 'rgba(245,158,11,0.05)' },
  statusIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: COLORS.brandDim,
    justifyContent: 'center', alignItems: 'center',
  },
  statusIconPro: { backgroundColor: 'rgba(245,158,11,0.15)' },
  statusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.text },
  activeBadge: {
    borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2,
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.warning, letterSpacing: 0.5 },
  cancelingBadge:     { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' },
  cancelingBadgeText: { color: '#f59e0b' },

  cancelBanner: {
    flexDirection: 'row', gap: 14, padding: 16, marginBottom: 16,
    backgroundColor: 'rgba(245,158,11,0.05)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  cancelBannerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.15)',
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  cancelBannerTitle: { fontSize: 14, fontWeight: '700', color: '#fbbf24' },
  cancelBannerDesc:  { fontSize: 13, color: COLORS.muted, marginTop: 4, lineHeight: 19 },
  cancelBannerDate:  { fontWeight: '700', color: COLORS.text },
  reactivateBtn:     { marginTop: 10 },
  reactivateBtnText: { fontSize: 13, fontWeight: '600', color: '#f59e0b' },
  statusDesc: { fontSize: 13, color: COLORS.muted, marginTop: 3 },
  manageHeaderBtn: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  manageHeaderBtnText: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },

  // Usage card
  usageCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 16, gap: 12,
  },
  usageTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text },

  // PRO upgrade card
  proCard: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 20, marginBottom: 16,
  },
  proHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  proBadgeRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proBadgeText: { fontSize: 13, fontWeight: '800', color: COLORS.warning, textTransform: 'uppercase', letterSpacing: 1 },

  priceToggle: {
    flexDirection: 'row', backgroundColor: COLORS.card2,
    borderRadius: 12, padding: 4,
  },
  toggleOption: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  toggleOptionActive: { backgroundColor: COLORS.brand },
  toggleText:         { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  toggleTextActive:   { color: '#fff' },
  saveBadge: {
    backgroundColor: COLORS.success + '33', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  saveBadgeText: { fontSize: 10, color: COLORS.success, fontWeight: '700' },

  priceRow:    { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 },
  priceValue:  { fontSize: 32, fontWeight: '800', color: COLORS.text },
  pricePeriod: { fontSize: 15, color: COLORS.muted },
  annualNote:  { fontSize: 12, color: COLORS.success, marginBottom: 12 },

  featureList: { gap: 4, marginTop: 12, marginBottom: 16 },
  featureRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  featureIcon:  { width: 26, height: 26, borderRadius: 8, backgroundColor: COLORS.brandDim, justifyContent: 'center', alignItems: 'center' },
  featureLabel: { fontSize: 13, color: COLORS.text, flex: 1 },

  upgradeBtn: {
    backgroundColor: COLORS.brand, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 8,
  },
  upgradeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelNote: { fontSize: 12, color: COLORS.muted, textAlign: 'center' },

  // PRO manage card
  manageCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 16,
  },
  manageHeaderText: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  manageTitle:    { fontSize: 14, fontWeight: '700', color: COLORS.text },
  manageSubtitle: { fontSize: 12, color: COLORS.muted2, marginTop: 2 },

  manageRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  manageRowIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  manageRowTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  manageRowDesc:  { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  manageDivider:  { height: 1, backgroundColor: COLORS.border, marginLeft: 16 },
  portalLoading:  { padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  portalLoadingText: { fontSize: 12, color: COLORS.muted, textAlign: 'center' },

  manageStatic: { padding: 24, alignItems: 'center', gap: 4 },
  manageStaticText: { fontSize: 13, color: COLORS.text, textAlign: 'center' },
  manageStaticSub:  { fontSize: 12, color: COLORS.muted2, textAlign: 'center' },

  // FAQ
  faqCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16,
  },
  faqTitle:    { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  faqDivider:  { height: 1, backgroundColor: COLORS.border },
  faqRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, gap: 10,
  },
  faqQuestion: { fontSize: 13, color: COLORS.muted, flex: 1 },
  faqAnswer:   { fontSize: 12, color: COLORS.muted2, lineHeight: 18, paddingBottom: 12 },
})
