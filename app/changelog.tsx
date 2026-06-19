import { View, StyleSheet, ScrollView } from 'react-native'
import { Text } from '@/components/text'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { COLORS } from '@/lib/constants'
import { changelog, type ChangeCategory } from '@/lib/changelog-data'

const BADGE_COLORS: Record<ChangeCategory, { bg: string; text: string }> = {
  novo:     { bg: 'rgba(34,197,94,0.12)',  text: '#22c55e' },
  melhoria: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  fix:      { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' },
}

const BADGE_LABELS: Record<ChangeCategory, string> = {
  novo:     'Novo',
  melhoria: 'Melhoria',
  fix:      'Correção',
}

export default function ChangelogScreen() {
  const router = useRouter()

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Feather name="chevron-left" size={22} color={COLORS.text} onPress={() => router.back()} />
        <Text style={styles.title}>Atualizações</Text>
      </View>
      <Text style={styles.subtitle}>O que há de novo no Rook Money.</Text>

      {/* Timeline */}
      <View style={styles.timeline}>
        {/* Vertical line */}
        <View style={styles.line} />

        {changelog.map((entry, i) => (
          <View key={i} style={styles.entry}>
            {/* Dot */}
            <View style={styles.dot} />

            {/* Meta */}
            <View style={styles.meta}>
              <Text style={styles.date}>{entry.date}</Text>
              {entry.version && <Text style={styles.version}>{entry.version}</Text>}
            </View>

            <Text style={styles.entryTitle}>{entry.title}</Text>

            {/* Changes */}
            <View style={styles.changes}>
              {entry.changes.map((change, j) => {
                const badge = BADGE_COLORS[change.category]
                return (
                  <View key={j} style={styles.changeRow}>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>
                        {BADGE_LABELS[change.category]}
                      </Text>
                    </View>
                    <Text style={styles.changeText}>{change.text}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        Tem alguma sugestão? Envie pelo Suporte no app.
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingBottom: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 56, paddingBottom: 4,
  },
  title:    { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.muted, marginBottom: 28, marginLeft: 30 },

  timeline: { position: 'relative', paddingLeft: 20 },
  line: {
    position: 'absolute', left: 3, top: 8, bottom: 0, width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  entry: { marginBottom: 32, position: 'relative' },
  dot: {
    position: 'absolute', left: -21, top: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.muted,
    borderWidth: 2, borderColor: COLORS.bg,
  },

  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  date: { fontSize: 12, color: COLORS.muted },
  version: { fontSize: 11, color: COLORS.muted2, fontFamily: 'monospace' },

  entryTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 10 },

  changes: { gap: 8 },
  changeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  badge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    marginTop: 1,
  },
  badgeText: { fontSize: 9, fontWeight: '600' },
  changeText: { flex: 1, fontSize: 13, color: COLORS.muted, lineHeight: 19 },

  footer: { fontSize: 12, color: COLORS.muted2, textAlign: 'center', marginTop: 16 },
})
