import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { settingsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

const { width } = Dimensions.get('window')

const STEPS = [
  {
    icon:  '🏰' as const,
    title: 'Bem-vindo ao Rook Money',
    desc:  'Seu dinheiro no movimento certo. Controle suas finanças com clareza e inteligência — sem complicação.',
  },
  {
    icon:  '💸' as const,
    title: 'Registre tudo',
    desc:  'Lançamentos de entrada e saída em segundos. Categorize, filtre por mês e veja o panorama completo.',
  },
  {
    icon:  '📅' as const,
    title: 'Contas e vencimentos',
    desc:  'Nunca mais pague multa por esquecimento. Suas contas ficam organizadas por vencimento com alertas de urgência.',
  },
  {
    icon:  '🎯' as const,
    title: 'Metas e planejamento',
    desc:  'Crie metas financeiras e acompanhe o progresso. Orçamentos por categoria, recorrências automáticas.',
  },
  {
    icon:  '⚡' as const,
    title: 'Tudo pronto',
    desc:  'Sua conta está configurada. Comece adicionando sua primeira transação ou explorando o dashboard.',
  },
]

export default function OnboardingScreen() {
  const router            = useRouter()
  const scrollRef         = useRef<ScrollView>(null)
  const [step, setStep]   = useState(0)
  const { user, setAuth, token } = useAuthStore()

  const finishMutation = useMutation({
    mutationFn: () => settingsApi.update({ hasOnboarded: true }),
    onSuccess: () => {
      if (user && token) {
        setAuth(token, { ...user, hasOnboarded: true })
      }
      router.replace('/(tabs)')
    },
  })

  function goTo(index: number) {
    setStep(index)
    scrollRef.current?.scrollTo({ x: index * width, animated: true })
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      goTo(step + 1)
    } else {
      finishMutation.mutate()
    }
  }

  const isLast = step === STEPS.length - 1

  return (
    <View style={styles.screen}>
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skip} onPress={() => finishMutation.mutate()}>
          <Text style={styles.skipText}>Pular</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.slides}
      >
        {STEPS.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <Text style={styles.slideIcon}>{s.icon}</Text>
            <Text style={styles.slideTitle}>{s.title}</Text>
            <Text style={styles.slideDesc}>{s.desc}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={8}>
            <View style={[styles.dot, i === step && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Navigation */}
      <View style={styles.footer}>
        {step > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => goTo(step - 1)}>
            <Feather name="arrow-left" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}

        <TouchableOpacity
          style={[styles.nextBtn, isLast && styles.nextBtnFinish]}
          onPress={handleNext}
          disabled={finishMutation.isPending}
          activeOpacity={0.85}
        >
          {finishMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextBtnText}>
              {isLast ? 'Começar' : 'Próximo'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingBottom: 40 },

  skip: { position: 'absolute', top: 56, right: 20, zIndex: 10, padding: 8 },
  skipText: { fontSize: 14, color: COLORS.muted },

  slides: { flex: 1, marginTop: 80 },
  slide: {
    paddingHorizontal: 40, justifyContent: 'center', alignItems: 'center',
  },
  slideIcon:  { fontSize: 72, marginBottom: 32 },
  slideTitle: {
    fontSize: 26, fontWeight: '800', color: COLORS.text,
    textAlign: 'center', marginBottom: 16,
  },
  slideDesc: {
    fontSize: 15, color: COLORS.muted, textAlign: 'center',
    lineHeight: 24,
  },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.muted2,
  },
  dotActive: {
    width: 24, backgroundColor: COLORS.brand,
  },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  nextBtn: {
    flex: 1, marginLeft: 12, height: 52, borderRadius: 14,
    backgroundColor: COLORS.brand, justifyContent: 'center', alignItems: 'center',
  },
  nextBtnFinish: { backgroundColor: COLORS.success },
  nextBtnText:   { fontSize: 16, fontWeight: '700', color: '#fff' },
})
