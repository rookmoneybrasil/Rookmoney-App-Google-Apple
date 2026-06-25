import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Text } from '@/components/text'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { peopleApi, type PersonEntry } from '@/lib/api'
import { EntryActions } from './entry-actions'
import { EditEntryModal } from './edit-entry-modal'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

// Strip the " (X/Y)" suffix added automatically on creation
function baseDescription(description: string): string {
  return description.replace(/\s*\(\d+\/\d+\)$/, '')
}

interface Props {
  personId: string
  entries:  PersonEntry[]
}

export function InstallmentGroup({ personId, entries }: Props) {
  const qc = useQueryClient()
  const [open, setOpen]               = useState(false)
  const [groupEditOpen, setGroupEdit] = useState(false)
  const [entryEdit, setEntryEdit]     = useState<PersonEntry | null>(null)

  const deleteGroupMutation = useMutation({
    mutationFn: () => peopleApi.deleteEntryGroup(entries[0].id),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['person', personId] })
      qc.refetchQueries({ queryKey: ['people'] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  if (entries.length === 0) return null

  const first        = entries[0]
  const total        = first.installmentTotal ?? entries.length
  const isTheyOwe    = first.type === 'THEY_OWE_ME'
  const alreadyPaid  = Math.max(0, (first.installmentCurrent ?? 1) - 1)
  const settledInApp = entries.filter(e => e.isSettled).length
  const settledCount = alreadyPaid + settledInApp
  const remaining    = entries.filter(e => !e.isSettled).length
  const name         = baseDescription(first.description)
  const perInst      = Number(first.amount)
  const leftAmount   = perInst * remaining
  const nextDue      = entries.find(e => !e.isSettled)
  const allSettled   = remaining === 0
  const pct          = Math.round((settledCount / total) * 100)
  const dirColor     = isTheyOwe ? COLORS.success : COLORS.danger

  function confirmDeleteGroup() {
    Alert.alert('Excluir grupo', `Excluir grupo (${total} parcelas)? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteGroupMutation.mutate() },
    ])
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={() => setOpen(v => !v)} activeOpacity={0.8}>
        <View style={[styles.dirIcon, { backgroundColor: dirColor + '1a' }]}>
          <Feather name={isTheyOwe ? 'trending-up' : 'trending-down'} size={15} color={dirColor} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{name}</Text>
            <View style={[styles.pill, allSettled ? styles.pillSuccess : styles.pillBrand]}>
              <Text style={[styles.pillText, allSettled ? styles.pillTextSuccess : styles.pillTextBrand]}>
                {settledCount}/{total} pago{settledCount !== 1 ? 's' : ''}
              </Text>
            </View>
            {first.category && (
              <View style={[styles.catPill, { backgroundColor: first.category.color + '18', borderColor: first.category.color + '40' }]}>
                <Text style={[styles.catPillText, { color: first.category.color }]}>
                  {first.category.icon} {first.category.name}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: allSettled ? COLORS.success : COLORS.brand }]} />
            </View>
            <Text style={styles.progressPct}>{pct}%</Text>
            {nextDue && !allSettled && (
              <Text style={styles.progressNext} numberOfLines={1}>
                próxima: {format(new Date(nextDue.date), "d 'de' MMM", { locale: ptBR })}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.amountMain, { color: dirColor }]}>
            {isTheyOwe ? '+' : '-'}{fmt(perInst)}<Text style={styles.amountSuffix}>/mês</Text>
          </Text>
          <Text style={styles.amountSub}>{remaining} restantes · {fmt(leftAmount)} total</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setGroupEdit(true)}>
          <Feather name="edit-2" size={14} color={COLORS.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={confirmDeleteGroup} disabled={deleteGroupMutation.isPending}>
          <Feather name="trash-2" size={14} color={COLORS.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setOpen(v => !v)}>
          <Feather name={open ? 'chevron-down' : 'chevron-right'} size={16} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {open && (
        <View style={styles.installmentList}>
          {entries.map((entry, i) => (
            <View key={entry.id} style={[styles.installmentRow, i > 0 && styles.installmentRowBorder, entry.isSettled && styles.installmentRowSettled]}>
              <View style={styles.installmentTop}>
                <View style={styles.installmentIndicator}>
                  {entry.isSettled
                    ? <Feather name="check-circle" size={13} color={COLORS.success} />
                    : <Text style={styles.installmentNum}>{entry.installmentCurrent}</Text>}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.installmentTitle, entry.isSettled && styles.installmentTitleSettled]}>
                    Parcela {entry.installmentCurrent}
                  </Text>
                  <Text style={styles.installmentDate}>
                    {format(new Date(entry.date), "d 'de' MMM yyyy", { locale: ptBR })}
                    {entry.isSettled && entry.settledAt ? ` · acertada em ${format(new Date(entry.settledAt), "d 'de' MMM", { locale: ptBR })}` : ''}
                  </Text>
                </View>
                <Text style={[styles.installmentAmount, { color: entry.isSettled ? COLORS.muted : dirColor }]}>
                  {fmt(entry.amount)}
                </Text>
              </View>
              <View style={styles.installmentActions}>
                {!entry.isSettled && (
                  <TouchableOpacity style={styles.iconBtnSmall} onPress={() => setEntryEdit(entry)}>
                    <Feather name="edit-2" size={12} color={COLORS.muted} />
                  </TouchableOpacity>
                )}
                <EntryActions entryId={entry.id} personId={personId} isSettled={entry.isSettled} />
              </View>
            </View>
          ))}
        </View>
      )}

      <EditEntryModal
        visible={groupEditOpen}
        entry={first}
        personId={personId}
        isGroup
        groupSize={total}
        onClose={() => setGroupEdit(false)}
      />
      <EditEntryModal
        visible={!!entryEdit}
        entry={entryEdit}
        personId={personId}
        onClose={() => setEntryEdit(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  header: { flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 8 },
  dirIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title: { fontSize: 14, fontWeight: '600', color: COLORS.text, flexShrink: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  pillBrand:   { backgroundColor: COLORS.brandDim, borderColor: COLORS.brand + '4d' },
  pillSuccess: { backgroundColor: COLORS.success + '1a', borderColor: COLORS.success + '4d' },
  pillText:       { fontSize: 10, fontWeight: '700' },
  pillTextBrand:   { color: COLORS.brand },
  pillTextSuccess: { color: COLORS.success },
  catPill: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1,
  },
  catPillText: { fontSize: 10, fontWeight: '600' },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.muted2, overflow: 'hidden' },
  progressFill:  { height: 4, borderRadius: 2 },
  progressPct:   { fontSize: 10, color: COLORS.muted, flexShrink: 0 },
  progressNext:  { fontSize: 10, color: COLORS.muted, flexShrink: 0 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  amountMain:   { fontSize: 14, fontWeight: '700' },
  amountSuffix: { fontSize: 11, fontWeight: '400', opacity: 0.7 },
  amountSub:    { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  iconBtn: {
    width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.card2,
  },

  installmentList: { borderTopWidth: 1, borderTopColor: COLORS.border },
  installmentRow:  { paddingHorizontal: 14, paddingVertical: 10 },
  installmentRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  installmentRowSettled: { opacity: 0.5 },
  installmentTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  installmentIndicator: { width: 22, alignItems: 'center' },
  installmentNum: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
  installmentTitle: { fontSize: 13, color: COLORS.text },
  installmentTitleSettled: { textDecorationLine: 'line-through', color: COLORS.muted },
  installmentDate: { fontSize: 10, color: COLORS.muted2, marginTop: 2 },
  installmentAmount: { fontSize: 13, fontWeight: '700' },
  installmentActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 6 },
  iconBtnSmall: {
    width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.card2,
  },
})
