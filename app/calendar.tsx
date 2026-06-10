import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { calendarApi, type CalendarEvent } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const EVENT_COLORS: Record<string, string> = {
  success: COLORS.success,
  danger:  COLORS.danger,
  warning: COLORS.warning,
}

const STATUS_LABELS: Record<string, string> = {
  paid:     'Pago',
  received: 'Recebido',
  overdue:  'Vencido',
  pending:  'Pendente',
  expected: 'Previsto',
}

function EventDot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: EVENT_COLORS[color] ?? COLORS.muted }]} />
}

function DayCell({
  day,
  events,
  isToday,
  isSelected,
  onPress,
}: {
  day: number | null
  events: CalendarEvent[]
  isToday: boolean
  isSelected: boolean
  onPress: () => void
}) {
  if (!day) return <View style={styles.dayCell} />

  const dotColors = [...new Set(events.map(e => e.color))].slice(0, 3)

  return (
    <TouchableOpacity style={styles.dayCell} onPress={onPress} activeOpacity={0.75}>
      <View style={[
        styles.dayCircle,
        isToday    && styles.dayToday,
        isSelected && styles.daySelected,
      ]}>
        <Text style={[
          styles.dayNum,
          isToday    && styles.dayNumToday,
          isSelected && styles.dayNumSelected,
        ]}>
          {day}
        </Text>
      </View>
      <View style={styles.dotRow}>
        {dotColors.map((c, i) => <EventDot key={i} color={c} />)}
      </View>
    </TouchableOpacity>
  )
}

export default function CalendarScreen() {
  const router        = useRouter()
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState<number | null>(null)

  const monthStr = format(current, 'yyyy-MM')

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', monthStr],
    queryFn:  () => calendarApi.get(monthStr).then(r => r.data),
  })

  const today      = new Date()
  const todayMonth = format(today, 'yyyy-MM')
  const todayDay   = today.getDate()

  const daysInMonth   = data?.daysInMonth ?? 0
  const firstWeekday  = data?.firstWeekday ?? 0
  const byDay         = data?.byDay ?? {}

  // Build grid rows: leading empty cells + day cells
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedEvents = selected ? (byDay[selected] ?? []) : []

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendário</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => { setCurrent(subMonths(current, 1)); setSelected(null) }} hitSlop={12}>
            <Feather name="chevron-left" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {format(current, 'MMMM yyyy', { locale: ptBR })}
          </Text>
          <TouchableOpacity onPress={() => { setCurrent(addMonths(current, 1)); setSelected(null) }} hitSlop={12}>
            <Feather name="chevron-right" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Weekday labels */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map(d => (
            <Text key={d} style={styles.weekLabel}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        {isLoading ? (
          <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {cells.map((day, i) => (
              <DayCell
                key={i}
                day={day}
                events={day ? (byDay[day] ?? []) : []}
                isToday={monthStr === todayMonth && day === todayDay}
                isSelected={day === selected}
                onPress={() => day && setSelected(day === selected ? null : day)}
              />
            ))}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <LegendItem color={COLORS.success} label="Renda / Pago" />
          <LegendItem color={COLORS.warning} label="Conta pendente" />
          <LegendItem color={COLORS.danger}  label="Vencido" />
        </View>

        {/* Selected day events */}
        {selected && (
          <View style={styles.eventsSection}>
            <Text style={styles.eventsSectionTitle}>
              {format(new Date(current.getFullYear(), current.getMonth(), selected), "d 'de' MMMM", { locale: ptBR })}
            </Text>
            {selectedEvents.length === 0 ? (
              <Text style={styles.empty}>Nenhum evento neste dia</Text>
            ) : (
              selectedEvents.map(ev => (
                <EventRow key={ev.id} event={ev} onPress={() => router.push(ev.href as any)} />
              ))
            )}
          </View>
        )}

        {/* Monthly summary */}
        {data && (
          <MonthlySummary events={data.events} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  )
}

function EventRow({ event, onPress }: { event: CalendarEvent; onPress: () => void }) {
  const color = EVENT_COLORS[event.color] ?? COLORS.muted
  const icon  = event.type === 'income' ? 'trending-up'
              : event.type === 'bill'   ? 'file-text'
              : 'refresh-cw'
  return (
    <TouchableOpacity style={styles.eventRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.eventIcon, { backgroundColor: color + '22' }]}>
        <Feather name={icon as any} size={15} color={color} />
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventLabel} numberOfLines={1}>{event.label}</Text>
        <Text style={[styles.eventStatus, { color }]}>
          {STATUS_LABELS[event.status] ?? event.status}
        </Text>
      </View>
      <Text style={[styles.eventAmount, { color }]}>
        {event.type === 'income' || event.status === 'received' ? '+' : '-'}{fmt(event.amount)}
      </Text>
      <Feather name="chevron-right" size={16} color={COLORS.muted} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  )
}

function MonthlySummary({ events }: { events: CalendarEvent[] }) {
  const totalExpense = events
    .filter(e => e.type !== 'income' && e.status !== 'received')
    .reduce((s, e) => s + e.amount, 0)
  const totalIncome = events
    .filter(e => e.type === 'income' || e.status === 'received')
    .reduce((s, e) => s + e.amount, 0)
  const paid = events.filter(e => e.status === 'paid' || e.status === 'received').length
  const pending = events.filter(e => e.status === 'pending' || e.status === 'expected').length

  return (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>Resumo do mês</Text>
      <View style={styles.summaryRow}>
        <SummaryCard label="Entradas previstas" value={totalIncome} positive />
        <SummaryCard label="Saídas previstas"   value={totalExpense} />
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryMini}>
          <Text style={styles.summaryMiniNum}>{paid}</Text>
          <Text style={styles.summaryMiniLabel}>pagos/recebidos</Text>
        </View>
        <View style={styles.summaryMini}>
          <Text style={styles.summaryMiniNum}>{pending}</Text>
          <Text style={styles.summaryMiniLabel}>pendentes</Text>
        </View>
      </View>
    </View>
  )
}

function SummaryCard({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color: positive ? COLORS.success : COLORS.danger }]}>
        {fmt(value)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, marginBottom: 16,
  },
  monthLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },

  weekRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 },
  weekLabel: {
    flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600',
    color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5,
  },

  grid:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 6 },
  dayCircle: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
  },
  dayToday:    { backgroundColor: COLORS.brandDim },
  daySelected: { backgroundColor: COLORS.brand },
  dayNum:      { fontSize: 14, fontWeight: '500', color: COLORS.text },
  dayNumToday: { color: COLORS.brand, fontWeight: '700' },
  dayNumSelected: { color: '#fff', fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: 20,
    marginVertical: 16, paddingHorizontal: 20,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: COLORS.muted },

  eventsSection: {
    marginHorizontal: 16, marginTop: 8,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 16,
  },
  eventsSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12, textTransform: 'capitalize' },
  empty: { fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingVertical: 8 },

  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  eventIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  eventInfo: { flex: 1 },
  eventLabel:  { fontSize: 14, fontWeight: '500', color: COLORS.text },
  eventStatus: { fontSize: 11, marginTop: 1 },
  eventAmount: { fontSize: 14, fontWeight: '700' },

  summary: {
    margin: 16, marginTop: 12,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 16,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  summaryRow:   { flexDirection: 'row', gap: 10, marginBottom: 10 },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.card2, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  summaryLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 4 },
  summaryValue: { fontSize: 15, fontWeight: '700' },
  summaryMini: {
    flex: 1, alignItems: 'center', backgroundColor: COLORS.card2,
    borderRadius: 12, padding: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  summaryMiniNum:   { fontSize: 20, fontWeight: '700', color: COLORS.text },
  summaryMiniLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
})
