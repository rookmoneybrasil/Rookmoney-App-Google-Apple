import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '@/components/text'
import Svg, { Path } from 'react-native-svg'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'

export interface HealthComponent {
  key:    string
  label:  string
  score:  number
  max:    number
  detail: string
  status: 'good' | 'ok' | 'warn' | 'bad' | 'neutral'
}

export interface FinancialHealth {
  score:      number
  grade:      'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  label:      string
  color:      string
  components: HealthComponent[]
}

const GRADE_COLORS: Record<string, string> = {
  S: COLORS.success,
  A: COLORS.success,
  B: COLORS.brand,
  C: COLORS.warning,
  D: COLORS.danger,
  F: COLORS.danger,
}

const STATUS_COLORS: Record<HealthComponent['status'], string> = {
  good:    COLORS.success,
  ok:      COLORS.brand,
  warn:    COLORS.warning,
  bad:     COLORS.danger,
  neutral: COLORS.muted,
}

// ── Arc gauge ──────────────────────────────────────────────────────────────
const ARC_R = 52
const ARC_CX = 64
const ARC_CY = 68
const ARC_START = -210
const ARC_SWEEP = 240
const ARC_W = 144
const ARC_H = 99

function polar(angle: number) {
  const rad = (angle * Math.PI) / 180
  return { x: ARC_CX + ARC_R * Math.cos(rad), y: ARC_CY + ARC_R * Math.sin(rad) }
}

function arcPath(from: number, to: number) {
  const s = polar(from)
  const e = polar(to)
  const large = Math.abs(to - from) > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${ARC_R} ${ARC_R} 0 ${large} 1 ${e.x} ${e.y}`
}

function ScoreArc({ score }: { score: number }) {
  const sweepFill   = (score / 100) * ARC_SWEEP
  const strokeColor = score >= 75 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.danger

  return (
    <View style={styles.arcWrap}>
      <Svg width={ARC_W} height={ARC_H} viewBox="0 0 128 88">
        <Path d={arcPath(ARC_START, ARC_START + ARC_SWEEP)} fill="none" stroke="#1e293b" strokeWidth={10} strokeLinecap="round" />
        {score > 0 && (
          <Path d={arcPath(ARC_START, ARC_START + sweepFill)} fill="none" stroke={strokeColor} strokeWidth={10} strokeLinecap="round" />
        )}
      </Svg>
      <View style={styles.arcTextWrap} pointerEvents="none">
        <Text style={[styles.arcScore, { color: strokeColor }]}>{score}</Text>
        <Text style={styles.arcScoreSub}>/100</Text>
      </View>
    </View>
  )
}

// ── Component breakdown row ──────────────────────────────────────────────
function ComponentRow({ comp }: { comp: HealthComponent }) {
  const pct   = Math.round((comp.score / comp.max) * 100)
  const color = STATUS_COLORS[comp.status]

  return (
    <View style={styles.compRow}>
      <View style={styles.compTop}>
        <Text style={styles.compLabel} numberOfLines={1}>{comp.label}</Text>
        <View style={styles.compBarTrack}>
          <View style={[styles.compBarFill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.compScore}>{comp.score}/{comp.max}</Text>
      </View>
      <Text style={styles.compDetail}>{comp.detail}</Text>
    </View>
  )
}

// ── Main card ────────────────────────────────────────────────────────────
export function FinancialHealthCard({ health }: { health: FinancialHealth }) {
  const [expanded, setExpanded] = useState(false)
  const gradeColor = GRADE_COLORS[health.grade] ?? COLORS.muted

  return (
    <View style={styles.card}>
      <View style={styles.mainRow}>
        <ScoreArc score={health.score} />
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Saúde financeira</Text>
            <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '22', borderColor: gradeColor + '60' }]}>
              <Text style={[styles.gradeText, { color: gradeColor }]}>{health.grade}</Text>
            </View>
          </View>
          <Text style={[styles.label, { color: health.color }]}>{health.label}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.toggle} onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
        <Text style={styles.toggleText}>Ver detalhes por categoria</Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.muted} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.details}>
          {health.components.map((comp) => <ComponentRow key={comp.key} comp={comp} />)}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },

  arcWrap:     { width: ARC_W, height: ARC_H, alignItems: 'center', justifyContent: 'center' },
  arcTextWrap: { position: 'absolute', alignItems: 'center', top: 56 },
  arcScore:    { fontSize: 22, fontWeight: '800' },
  arcScoreSub: { fontSize: 9, color: COLORS.muted },

  info:     { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  title:    { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  gradeBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, borderWidth: 1 },
  gradeText:  { fontSize: 11, fontWeight: '800' },
  label:      { fontSize: 17, fontWeight: '700' },

  toggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  toggleText: { fontSize: 12, color: COLORS.muted },

  details: {
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  compRow:      { gap: 3 },
  compTop:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compLabel:    { fontSize: 12, color: COLORS.muted, width: 116 },
  compBarTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' },
  compBarFill:  { height: 5, borderRadius: 3 },
  compScore:    { fontSize: 11, color: COLORS.muted, width: 38, textAlign: 'right' },
  compDetail:   { fontSize: 10.5, color: '#475569', marginLeft: 126 },
})
