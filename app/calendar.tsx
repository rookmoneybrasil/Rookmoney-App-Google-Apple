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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

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
      {events[0] && (
        <Text style={styles.dayEventLabel} numberOfLines={1}>{events[0].label}</Text>
      )}
      {events.length > 1 && (
        <Text style={styles.dayMoreLabel}>+{events.length - 1}</Text>
      )}
    </TouchableOpacity>
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
        <View style={styles.eventStatusBadge}>
          <Text style={styles.eventStatusText}>
            {STATUS_LABELS[event.status] ?? event.status}
          </Text>
        </View>
      </View>
      <Text style={[styles.eventAmount, { color }]}>
        {(event.status === 'expected' || event.status === 'received') && event.type !== 'bill' ? '+' : '-'}{fmt(event.amount)}
      </Text>
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

  const totalPending = data?.events
    .filter(e => (e.status === 'pending' || e.status === 'overdue') ||
                 (e.status === 'expected' && e.type === 'bill'))
    .reduce((s, e) => s + Number(e.amount), 0) ?? 0
  const totalExpected = data?.events
    .filter(e => e.status === 'expected' && e.type === 'income')
    .reduce((s, e) => s + Number(e.amount), 0) ?? 0

  const negTotal = selectedEvents.filter(e => e.status !== 'expected').reduce((s, e) => s + Number(e.amount), 0)
  const posTotal = selectedEvents.filter(e => e.status === 'expected').reduce((s, e) => s + Number(e.amount), 0)

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Calendário financeiro</Text>
          <Text style={styles.subtitle}>Contas, rendas e recorrências do mês</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Resumo do mês */}
        {data && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.danger + '1A' }]}>
                <Feather name="file-text" size={16} color={COLORS.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>A pagar este mês</Text>
                <Text style={[styles.summaryValue, { color: COLORS.danger }]}>{fmt(totalPending)}</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.success + '1A' }]}>
                <Feather name="trending-up" size={16} color={COLORS.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>A receber este mês</Text>
                <Text style={[styles.summaryValue, { color: COLORS.success }]}>{fmt(totalExpected)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Calendário */}
        <View style={styles.calendarCard}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => { setCurrent(subMonths(current, 1)); setSelected(null) }} hitSlop={12}>
              <Feather name="chevron-left" size={20} color={COLORS.muted} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {capitalize(format(current, 'MMMM yyyy', { locale: ptBR }))}
            </Text>
            <TouchableOpacity onPress={() => { setCurrent(addMonths(current, 1)); setSelected(null) }} hitSlop={12}>
              <Feather name="chevron-right" size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          {/* Weekday labels */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map(d => (
              <Text key={d} style={styles.weekLabel}>{d}</Text>
            ))}
          </View>

          {/* Grid de dias */}
          {isLoading ? (
            <ActivityIndicator color={COLORS.brand} style={{ marginVertical: 40 }} />
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

          {/* Legenda */}
          <View style={styles.legend}>
            <LegendItem color={COLORS.danger}  label="A pagar" />
            <LegendItem color={COLORS.warning} label="Recorrência" />
            <LegendItem color={COLORS.success} label="A receber" />
          </View>
        </View>

        {/* Painel do dia selecionado */}
        <View style={styles.eventsCard}>
          <View style={styles.eventsCardHeader}>
            <Text style={styles.eventsCardTitle}>
              {selected
                ? `${selected} de ${format(current, 'MMMM', { locale: ptBR })}`
                : 'Selecione um dia'}
            </Text>
          </View>

          <View style={styles.eventsCardBody}>
            {!selected && (
              <Text style={styles.placeholder}>Clique em um dia para ver os eventos.</Text>
            )}
            {selected && selectedEvents.length === 0 && (
              <Text style={styles.placeholder}>Nenhum evento neste dia.</Text>
            )}
            {selectedEvents.map(ev => (
              <EventRow key={ev.id} event={ev} onPress={() => router.push(ev.href as any)} />
            ))}
          </View>

          {selected && selectedEvents.length > 0 && (
            <View style={styles.eventsCardFooter}>
              <Text style={styles.footerCount}>
                {selectedEvents.length} evento{selectedEvents.length !== 1 ? 's' : ''}
              </Text>
              <View style={styles.footerTotals}>
                <Text style={[styles.footerTotal, { color: COLORS.danger }]}>-{fmt(negTotal)}</Text>
                <Text style={[styles.footerTotal, { color: COLORS.success }]}>+{fmt(posTotal)}</Text>
              </View>
            </View>
          )}
        </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginLeft: -8 },
  title:    { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  content: { paddingHorizontal: 20, paddingBottom: 40 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  summaryIcon: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  summaryLabel: { fontSize: 11, color: COLORS.muted },
  summaryValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  calendarCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 16,
  },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  monthLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  weekRow: {
    flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6,
  },
  weekLabel: {
    flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600',
    color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5,
  },

  grid:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 8 },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 6, minHeight: 56 },
  dayCircle: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  dayToday:    { backgroundColor: COLORS.brandDim },
  daySelected: { backgroundColor: COLORS.brand },
  dayNum:      { fontSize: 12, fontWeight: '500', color: COLORS.text },
  dayNumToday: { color: COLORS.brand, fontWeight: '700' },
  dayNumSelected: { color: '#fff', fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, height: 6, marginTop: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dayEventLabel: { fontSize: 8, color: COLORS.muted, marginTop: 2, maxWidth: '92%', textAlign: 'center' },
  dayMoreLabel:  { fontSize: 7, color: COLORS.muted2, textAlign: 'center' },

  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: 18,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: COLORS.muted },

  eventsCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  eventsCardHeader: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  eventsCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  eventsCardBody: { padding: 12, gap: 8 },
  placeholder: { fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingVertical: 24 },

  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, padding: 10,
  },
  eventIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  eventInfo: { flex: 1, gap: 4 },
  eventLabel:  { fontSize: 13, fontWeight: '500', color: COLORS.text },
  eventStatusBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.muted2 + '60', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  eventStatusText:  { fontSize: 10, fontWeight: '600', color: COLORS.muted },
  eventAmount: { fontSize: 13, fontWeight: '700' },

  eventsCardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  footerCount:  { fontSize: 11, color: COLORS.muted },
  footerTotals: { flexDirection: 'row', gap: 12 },
  footerTotal:  { fontSize: 12, fontWeight: '700' },
})
