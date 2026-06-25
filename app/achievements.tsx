import { View, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native'
import { Text } from '@/components/text'
import { PressableScale } from '@/components/pressable-scale'
import { AnimatedProgress } from '@/components/animated-progress'
import { AnimatedNumber } from '@/components/animated-number'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { achievementsApi, type AchievementItem, type AchievementCategory } from '@/lib/api'
import { CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_COLORS, ACHIEVEMENT_TEXT } from '@/lib/achievements'
import { COLORS } from '@/lib/constants'
import { ListSkeleton } from '@/components/skeleton'
import { FadeIn } from '@/components/animated-entry'

export default function AchievementsScreen() {
  const router = useRouter()
  const { data, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn:  () => achievementsApi.list().then(r => r.data),
  })

  // Mark as seen when screen loads
  useQuery({
    queryKey: ['achievements-seen'],
    queryFn:  () => achievementsApi.markSeen(),
    staleTime: Infinity,
  })

  if (isLoading || !data) {
    return (
      <View style={styles.screen}>
        <ListSkeleton rows={6} />
      </View>
    )
  }

  const { achievements, total, done } = data
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: achievements.filter((a: AchievementItem) => a.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <FadeIn delay={0}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerRow}>
            <Feather name="chevron-left" size={22} color={COLORS.text} onPress={() => router.back()} />
            <Text style={styles.title}>Conquistas</Text>
          </View>
          <Text style={styles.subtitle}>{done} de {total} desbloqueadas</Text>
        </View>
        <View style={styles.headerRight}>
          <AnimatedNumber value={pct} format={(n) => `${Math.round(n)}%`} style={styles.pctText} />
          <View style={styles.trophyWrap}>
            <Text style={{ fontSize: 24 }}>🏆</Text>
          </View>
        </View>
      </View>
      </FadeIn>

      {/* Progress bar */}
      <FadeIn delay={80}>
      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Progresso geral</Text>
          <Text style={styles.progressCount}>{done}/{total}</Text>
        </View>
        <AnimatedProgress value={done} max={total} height={10} color="#fbbf24" bgColor={COLORS.card2} borderRadius={5} />
      </View>
      </FadeIn>

      {/* Categories */}
      {grouped.map(({ category, items }, groupIdx) => {
        const catUnlocked = items.filter((a: AchievementItem) => a.unlocked).length
        const catColor = CATEGORY_COLORS[category]
        return (
          <FadeIn key={category} delay={160 + groupIdx * 80}>
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{CATEGORY_LABELS[category]}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{catUnlocked}/{items.length}</Text>
              </View>
            </View>

            <View style={styles.grid}>
              {items.map((a: AchievementItem) => {
                const meta = ACHIEVEMENT_TEXT[a.slug]
                return (
                  <View key={a.slug} style={styles.cardWrap}>
                  <PressableScale
                    style={[
                      styles.card,
                      a.unlocked
                        ? { borderColor: catColor + '33' }
                        : { opacity: 0.5, borderColor: COLORS.border },
                    ]}
                  >
                    <Image
                      source={{ uri: `https://rookmoney.com/achievements/${a.slug}.png` }}
                      style={[styles.cardImage, !a.unlocked && { opacity: 0.4 }]}
                    />
                    <Text style={[styles.cardName, !a.unlocked && { color: COLORS.muted }]} numberOfLines={1}>
                      {meta?.name ?? a.slug}
                    </Text>
                    <Text style={[styles.cardDesc, !a.unlocked && { color: COLORS.muted2 }]} numberOfLines={2}>
                      {a.unlocked ? meta?.desc : meta?.tip}
                    </Text>
                    {a.unlocked && a.unlockedAt && (
                      <Text style={styles.cardDate}>
                        ✓ {new Date(a.unlockedAt).toLocaleDateString('pt-BR')}
                      </Text>
                    )}
                    {!a.unlocked && (
                      <View style={styles.lockIcon}>
                        <Feather name="lock" size={10} color={COLORS.muted} />
                      </View>
                    )}
                  </PressableScale>
                  </View>
                )
              })}
            </View>
          </View>
          </FadeIn>
        )
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.bg },
  center:  { justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 100 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingTop: 56, paddingBottom: 16,
  },
  headerLeft: { flex: 1 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:      { fontSize: 20, fontWeight: '700', color: COLORS.text },
  subtitle:   { fontSize: 13, color: COLORS.muted, marginTop: 4, marginLeft: 30 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pctText:    { fontSize: 24, fontWeight: '800', color: '#fbbf24' },
  trophyWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  progressCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 24,
  },
  progressRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 12, color: COLORS.muted },
  progressCount: { fontSize: 12, color: '#fbbf24', fontWeight: '700' },
  progressBar:   { height: 10, backgroundColor: COLORS.card2, borderRadius: 5, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: '#fbbf24', borderRadius: 5 },

  categorySection: { marginBottom: 24 },
  categoryHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  categoryTitle:   { fontSize: 14, fontWeight: '600', color: COLORS.text },
  categoryBadge:   { backgroundColor: COLORS.card2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  categoryBadgeText: { fontSize: 10, color: COLORS.muted, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardWrap: { width: '47%' as any },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14, padding: 12,
    borderWidth: 1,
    height: 140,
    overflow: 'hidden',
  },
  cardImage: { width: 36, height: 36, borderRadius: 8, marginBottom: 8 },
  cardInfo: {},
  cardName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  cardDesc: { fontSize: 10, color: COLORS.muted, lineHeight: 14, marginTop: 2 },
  cardDate: { fontSize: 9, color: '#34d399', marginTop: 4, fontWeight: '500' },
  lockIcon: { position: 'absolute', top: 10, right: 10 },
})
