import { useState, useEffect } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl, Share } from 'react-native'
import { Text } from '@/components/text'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { peopleApi, personRecurringApi, type PersonEntry, type PersonEntryRecurring } from '@/lib/api'
import { PersonAvatar } from '@/components/people/avatar'
import { PersonSheet } from '@/components/people/person-sheet'
import { EntryModal } from '@/components/people/entry-modal'
import { EditEntryModal } from '@/components/people/edit-entry-modal'
import { EditRecurringModal } from '@/components/people/edit-recurring-modal'
import { EntryActions } from '@/components/people/entry-actions'
import { InstallmentGroup } from '@/components/people/installment-group'
import { RecurringEntryRow } from '@/components/people/recurring-entry-row'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

// ─── Single entry card ──────────────────────────────────────────────────────

function EntryCard({ entry, personId, settled = false }: { entry: PersonEntry; personId: string; settled?: boolean }) {
  const [editOpen, setEditOpen] = useState(false)
  const isTheyOwe = entry.type === 'THEY_OWE_ME'
  const dirColor  = isTheyOwe ? COLORS.success : COLORS.danger

  if (settled) {
    return (
      <View style={[styles.entryCard, styles.entryCardSettled]}>
        <View style={styles.entryTop}>
          <View style={[styles.entryIcon, styles.entryIconSettled]}>
            <Feather name="check-circle" size={15} color={COLORS.muted} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.entryTitle, styles.entryTitleSettled]} numberOfLines={1}>{entry.description}</Text>
            <View style={styles.entryMetaRow}>
              <Text style={styles.entrySubtitle} numberOfLines={1}>
                Acertado em {format(new Date(entry.settledAt ?? entry.date), "d 'de' MMM", { locale: ptBR })}
              </Text>
              {entry.category && (
                <Text style={styles.entrySubtitle}>· {entry.category.icon} {entry.category.name}</Text>
              )}
            </View>
          </View>
          <Text style={[styles.entryAmount, { color: COLORS.muted }]}>{fmt(entry.amount)}</Text>
        </View>
        <View style={styles.entryActions}>
          <TouchableOpacity style={styles.iconBtnSmall} onPress={() => setEditOpen(true)}>
            <Feather name="edit-2" size={12} color={COLORS.muted} />
          </TouchableOpacity>
          <EntryActions entryId={entry.id} personId={personId} isSettled />
        </View>
        <EditEntryModal visible={editOpen} entry={entry} personId={personId} onClose={() => setEditOpen(false)} />
      </View>
    )
  }

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryTop}>
        <View style={[styles.entryIcon, { backgroundColor: dirColor + '1a' }]}>
          <Feather name={isTheyOwe ? 'trending-up' : 'trending-down'} size={15} color={dirColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.entryTitle} numberOfLines={1}>{entry.description}</Text>
          <View style={styles.entryMetaRow}>
            <Text style={styles.entrySubtitle}>{format(new Date(entry.date), "d 'de' MMM yyyy", { locale: ptBR })}</Text>
            {entry.category && (
              <View style={[styles.catPill, { backgroundColor: entry.category.color + '18', borderColor: entry.category.color + '40' }]}>
                <Text style={[styles.catPillText, { color: entry.category.color }]}>{entry.category.icon} {entry.category.name}</Text>
              </View>
            )}
            {entry.notes && <Text style={styles.entrySubtitle} numberOfLines={1}>· {entry.notes}</Text>}
          </View>
        </View>
        <Text style={[styles.entryAmount, { color: dirColor }]}>
          {isTheyOwe ? '+' : '-'}{fmt(entry.amount)}
        </Text>
      </View>
      <View style={styles.entryActions}>
        <TouchableOpacity style={styles.iconBtnSmall} onPress={() => setEditOpen(true)}>
          <Feather name="edit-2" size={12} color={COLORS.muted} />
        </TouchableOpacity>
        <EntryActions entryId={entry.id} personId={personId} isSettled={false} />
      </View>
      <EditEntryModal visible={editOpen} entry={entry} personId={personId} onClose={() => setEditOpen(false)} />
    </View>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PersonDetailScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [entryModalOpen, setEntryModalOpen]   = useState(false)
  const [personSheetOpen, setPersonSheetOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<PersonEntryRecurring | null>(null)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['person', id],
    queryFn:  () => peopleApi.get(id).then(r => r.data),
    enabled:  !!id,
  })

  const { data: recurring, refetch: refetchRecurring } = useQuery({
    queryKey: ['personRecurring', id],
    queryFn:  () => personRecurringApi.list(id).then(r => r.data),
    enabled:  !!id,
  })

  const deletePersonMutation = useMutation({
    mutationFn: () => peopleApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people'] })
      router.back()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  function confirmDeletePerson() {
    Alert.alert('Excluir pessoa', `Remover ${data?.name} e todas as pendências?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deletePersonMutation.mutate() },
    ])
  }

  const allEntries   = data?.entries ?? []
  const recurringList = recurring ?? []

  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Map: recurringId → entry this month (settled or not)
  const recurringEntryMap = new Map<string, PersonEntry>()
  for (const r of recurringList) {
    const match = allEntries.find(e =>
      e.description === r.description &&
      e.type        === r.type &&
      !e.installmentGroupId &&
      new Date(e.date) >= monthStart &&
      new Date(e.date) <= monthEnd
    )
    if (match) recurringEntryMap.set(r.id, match)
  }

  const cutoff = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)

  const openEntries    = allEntries.filter(e => !e.isSettled)
  const settledEntries = allEntries.filter(e =>  e.isSettled)

  const groupSeen = new Set<string>()
  let theyOweTotal = 0
  let iOweTotal    = 0
  for (const e of openEntries) {
    const isOldRecurring = (e.installmentTotal ?? 0) >= 24
    if (isOldRecurring && new Date(e.date) > cutoff) continue

    if (e.installmentGroupId) {
      if (groupSeen.has(e.installmentGroupId)) continue
      groupSeen.add(e.installmentGroupId)
    }

    if (e.type === 'THEY_OWE_ME') theyOweTotal += e.amount
    else                           iOweTotal    += e.amount
  }

  let recurringTheyOwe = 0
  let recurringIOwe    = 0
  for (const r of recurringList) {
    if (recurringEntryMap.has(r.id)) continue
    if (r.type === 'THEY_OWE_ME') recurringTheyOwe += r.amount
    else                           recurringIOwe    += r.amount
  }

  const theyOweTotalWithRecurring = theyOweTotal + recurringTheyOwe
  const iOweTotalWithRecurring    = iOweTotal    + recurringIOwe
  const balance = theyOweTotalWithRecurring - iOweTotalWithRecurring

  const settledThisMonth = settledEntries
    .filter(e => new Date(e.date) >= monthStart && new Date(e.date) <= monthEnd)
    .reduce((s, e) => s + e.amount, 0)

  const monthLabel = format(now, 'MMMM', { locale: ptBR })
  const projection = Array.from({ length: 3 }, (_, i) => {
    const d = addMonths(now, i)
    const label = format(d, "MMM/yy", { locale: ptBR })

    const dueEntries = openEntries.filter(e => {
      const eDate = new Date(e.date)
      return eDate.getFullYear() === d.getFullYear() && eDate.getMonth() === d.getMonth()
    })

    let projTheyOwe = 0
    let projIOwe    = 0
    const seenGroups = new Set<string>()

    for (const e of dueEntries) {
      if (e.installmentGroupId) {
        if (seenGroups.has(e.installmentGroupId)) continue
        seenGroups.add(e.installmentGroupId)
      }
      if (e.type === 'THEY_OWE_ME') projTheyOwe += e.amount
      else                           projIOwe    += e.amount
    }

    const dStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const dEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

    for (const r of recurringList) {
      const alreadyHasEntry = allEntries.some(e =>
        !e.isSettled &&
        e.description === r.description &&
        e.type        === r.type &&
        !e.installmentGroupId &&
        new Date(e.date) >= dStart &&
        new Date(e.date) <= dEnd
      )
      if (alreadyHasEntry) continue

      if (r.type === 'THEY_OWE_ME') projTheyOwe += r.amount
      else                           projIOwe    += r.amount
    }

    return { label, theyOwe: projTheyOwe, iOwe: projIOwe, balance: projTheyOwe - projIOwe }
  })

  const hasOldRecurring = openEntries.some(e => (e.installmentTotal ?? 0) >= 24)

  // Show projection whenever there's something projected (recurring OR open entries due)
  const hasProjectionData = projection.some(m => m.theyOwe > 0 || m.iOwe > 0)

  // ── Share text ────────────────────────────────────────────────────────────
  const capMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  function buildShareText() {
    if (!data) return ''
    const lines: string[] = [`${data.name} — ${capMonth}/${now.getFullYear()}`, '']

    type ShareItem = { desc: string; amount: number; settled: boolean }
    const shareIOwe: ShareItem[] = []
    const shareTheyOwe: ShareItem[] = []

    // Recurring templates
    for (const r of recurringList) {
      const entry = recurringEntryMap.get(r.id)
      const settled = entry?.isSettled ?? false
      const bucket = r.type === 'I_OWE_THEM' ? shareIOwe : shareTheyOwe
      bucket.push({ desc: `${r.description} (recorrente, dia ${r.dayOfMonth})`, amount: r.amount, settled })
    }

    // Single entries this month (skip those covered by recurring)
    const recurringDescs = new Set(recurringList.map(r => `${r.description}|${r.type}`))
    const allSingles = allEntries.filter(e => {
      const d = new Date(e.date)
      return !e.installmentGroupId && d >= monthStart && d <= monthEnd
    })
    for (const e of allSingles) {
      if (recurringDescs.has(`${e.description}|${e.type}`)) continue
      const bucket = e.type === 'I_OWE_THEM' ? shareIOwe : shareTheyOwe
      bucket.push({ desc: e.description, amount: e.amount, settled: e.isSettled })
    }

    // Installment entries due this month
    for (const [, grp] of allGroupMap.entries()) {
      const due = grp.find(e => {
        const d = new Date(e.date)
        return d >= monthStart && d <= monthEnd
      })
      if (!due) continue
      const total = due.installmentTotal ?? grp.length
      const current = due.installmentCurrent ?? 1
      const remaining = total - current
      const bucket = due.type === 'I_OWE_THEM' ? shareIOwe : shareTheyOwe
      bucket.push({
        desc: `${due.description} (parcela ${current}/${total}, faltam ${remaining})`,
        amount: due.amount,
        settled: due.isSettled,
      })
    }

    function renderSection(title: string, items: ShareItem[]) {
      if (items.length === 0) return
      lines.push(title)
      let subtotal = 0
      for (const item of items) {
        const check = item.settled ? ' ✅' : ''
        lines.push(`  • ${item.desc} — ${fmt(item.amount)}${check}`)
        subtotal += item.amount
      }
      if (items.length > 1) lines.push(`  Total: ${fmt(subtotal)}`)
      lines.push('')
    }

    renderSection('Eu devo:', shareIOwe)
    renderSection('Me deve:', shareTheyOwe)

    const nextMonth = projection[1]
    if (nextMonth && (nextMonth.iOwe > 0 || nextMonth.theyOwe > 0)) {
      lines.push(`Proximo mes (${nextMonth.label}):`)
      if (nextMonth.iOwe > 0) lines.push(`  Eu devo: ${fmt(nextMonth.iOwe)}`)
      if (nextMonth.theyOwe > 0) lines.push(`  Me deve: ${fmt(nextMonth.theyOwe)}`)
      lines.push('')
    }

    lines.push('— Enviado pelo Rook Money — rookmoney.com')
    return lines.join('\n')
  }

  async function handleShare() {
    const text = buildShareText()
    if (!text) return
    try {
      await Share.share({ message: text })
    } catch {
      // user cancelled
    }
  }

  // Silent auto-migration of old-style recurring groups
  useEffect(() => {
    if (!hasOldRecurring || !id) return
    personRecurringApi.migrate()
      .then(({ data }) => {
        if (data.converted > 0) {
          qc.invalidateQueries({ queryKey: ['person', id] })
          qc.invalidateQueries({ queryKey: ['personRecurring', id] })
          qc.invalidateQueries({ queryKey: ['people'] })
        }
      })
      .catch(() => {})
  }, [hasOldRecurring, id, qc])

  const singleOpen    = openEntries.filter(e => !e.installmentGroupId)
  const singleSettled = settledEntries.filter(e => !e.installmentGroupId)

  const openGroupIds = new Set(openEntries.filter(e => e.installmentGroupId).map(e => e.installmentGroupId as string))
  const allGroupMap  = new Map<string, PersonEntry[]>()
  for (const e of allEntries) {
    if (e.installmentGroupId) {
      const arr = allGroupMap.get(e.installmentGroupId) ?? []
      arr.push(e)
      allGroupMap.set(e.installmentGroupId, arr)
    }
  }

  const activeGroups = Array.from(allGroupMap.entries())
    .filter(([gid]) => openGroupIds.has(gid))
    .map(([, g]) => g.sort((a, b) => (a.installmentCurrent ?? 0) - (b.installmentCurrent ?? 0)))

  const doneGroupIds = new Set(Array.from(allGroupMap.keys()).filter(gid => !openGroupIds.has(gid)))
  const doneGroups = Array.from(allGroupMap.entries())
    .filter(([gid]) => doneGroupIds.has(gid))
    .map(([, g]) => g.sort((a, b) => (a.installmentCurrent ?? 0) - (b.installmentCurrent ?? 0)))

  const pendingCount = singleOpen.length + activeGroups.length
  const settledCount = singleSettled.length + doneGroups.length

  function onRefresh() {
    refetch()
    refetchRecurring()
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => setEntryModalOpen(true)}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading || !data ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.brand} />}
        >
          {/* Profile */}
          <View style={styles.profileRow}>
            <PersonAvatar name={data.name} color={data.color} size="lg" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>{data.name}</Text>
              {data.notes && <Text style={styles.notes} numberOfLines={2}>{data.notes}</Text>}
              <View style={styles.profileActions}>
                <TouchableOpacity style={styles.profileActionBtn} onPress={() => setPersonSheetOpen(true)}>
                  <Feather name="edit-2" size={12} color={COLORS.muted} />
                  <Text style={styles.profileActionText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileActionBtn} onPress={confirmDeletePerson}>
                  <Feather name="trash-2" size={12} color={COLORS.danger} />
                  <Text style={[styles.profileActionText, { color: COLORS.danger }]}>Excluir</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileActionBtn} onPress={handleShare}>
                  <Feather name="share-2" size={12} color={COLORS.brand} />
                  <Text style={[styles.profileActionText, { color: COLORS.brand }]}>Compartilhar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Balance summary */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceCardHeader}>
              <View style={styles.balanceCardLabelRow}>
                <Feather name="trending-up" size={14} color={COLORS.success} />
                <Text style={styles.balanceCardLabel}>Te deve</Text>
              </View>
              <Text style={styles.balanceCardMonth}>{monthLabel}</Text>
            </View>
            <Text style={[styles.balanceCardValue, { color: COLORS.success }]}>{fmt(theyOweTotalWithRecurring)}</Text>
            {recurringTheyOwe > 0 && theyOweTotal > 0 && (
              <Text style={styles.balanceCardSub}>{fmt(theyOweTotal)} avulso + {fmt(recurringTheyOwe)} recorrente</Text>
            )}
            {recurringTheyOwe > 0 && theyOweTotal === 0 && (
              <Text style={styles.balanceCardSub}>recorrente mensal</Text>
            )}
          </View>

          <View style={styles.balanceCard}>
            <View style={styles.balanceCardHeader}>
              <View style={styles.balanceCardLabelRow}>
                <Feather name="trending-down" size={14} color={COLORS.danger} />
                <Text style={styles.balanceCardLabel}>Você deve</Text>
              </View>
              <Text style={styles.balanceCardMonth}>{monthLabel}</Text>
            </View>
            <Text style={[styles.balanceCardValue, { color: COLORS.danger }]}>{fmt(iOweTotalWithRecurring)}</Text>
            {recurringIOwe > 0 && iOweTotal > 0 && (
              <Text style={styles.balanceCardSub}>{fmt(iOweTotal)} avulso + {fmt(recurringIOwe)} recorrente</Text>
            )}
            {recurringIOwe > 0 && iOweTotal === 0 && (
              <Text style={styles.balanceCardSub}>recorrente mensal</Text>
            )}
          </View>

          <View style={[styles.balanceCard, { marginBottom: 16 }]}>
            <View style={styles.balanceCardLabelRow}>
              <Feather name="check-circle" size={14} color={balance >= 0 ? COLORS.brand : COLORS.danger} />
              <Text style={styles.balanceCardLabel}>Saldo líquido</Text>
            </View>
            <Text style={[styles.balanceCardValue, { color: balance >= 0 ? COLORS.brand : COLORS.danger }]}>
              {balance === 0
                ? 'Quitado 🎉'
                : balance > 0
                ? `${fmt(balance)} a receber`
                : `${fmt(-balance)} a pagar`}
            </Text>
            {balance === 0 && settledThisMonth > 0 && (
              <Text style={styles.balanceCardSub}>{fmt(settledThisMonth)} quitado este mês</Text>
            )}
          </View>

          {/* Projeção dos próximos meses */}
          {hasProjectionData && (
            <View style={styles.projectionCard}>
              <View style={styles.projectionHeader}>
                <Feather name="calendar" size={14} color={COLORS.brand} />
                <Text style={styles.projectionTitle}>Projeção dos próximos meses</Text>
              </View>
              <View style={styles.projectionGrid}>
                {projection.map((m, i) => (
                  <View key={m.label} style={[styles.projectionMonth, i === 0 ? styles.projectionMonthCurrent : styles.projectionMonthOther]}>
                    <View style={styles.projectionLabelRow}>
                      {i === 0 && <View style={styles.projectionDot} />}
                      <Text style={styles.projectionLabel}>{m.label}</Text>
                    </View>
                    {m.theyOwe > 0 && <Text style={styles.projectionPos}>+{fmt(m.theyOwe)}</Text>}
                    {m.iOwe > 0 && <Text style={styles.projectionNeg}>-{fmt(m.iOwe)}</Text>}
                    <Text style={[styles.projectionBalance, { color: m.balance >= 0 ? COLORS.success : COLORS.danger }]}>
                      {m.balance >= 0 ? '+' : ''}{fmt(m.balance)}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.projectionFootnote}>Baseado nos recorrentes ativos + lançamentos pendentes</Text>
            </View>
          )}

          {/* Recorrentes ativos */}
          {recurringList.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitleUpper}>Recorrentes ativos</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>
                  🔁 <Text style={styles.infoBoxStrong}>Como funciona:</Text> cada recorrente gera automaticamente uma conta pendente no dia configurado, todo mês. Toque em <Text style={styles.infoBoxStrong}>Pago</Text> para quitar o mês atual, ou acerte pelo bloco <Text style={styles.infoBoxStrong}>Pendentes</Text> abaixo. Meses não pagos acumulam em Pendentes.
                </Text>
              </View>
              <View style={styles.list}>
                {recurringList.map(item => {
                  const monthEntry = recurringEntryMap.get(item.id)
                  return (
                    <RecurringEntryRow
                      key={item.id}
                      item={item}
                      personId={id}
                      monthEntryId={monthEntry?.id ?? null}
                      paidThisMonth={monthEntry?.isSettled ?? false}
                      onEdit={() => setEditingRecurring(item)}
                    />
                  )
                })}
              </View>
            </View>
          )}

          {/* Pendentes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="clock" size={15} color={COLORS.muted} />
              <Text style={styles.sectionTitle}>Pendentes ({pendingCount})</Text>
            </View>

            {pendingCount === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyBoxText}>Nenhum lançamento pendente</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {activeGroups.map(grp => (
                  <InstallmentGroup key={grp[0].installmentGroupId} personId={id} entries={grp} />
                ))}
                {singleOpen.map(entry => (
                  <EntryCard key={entry.id} entry={entry} personId={id} />
                ))}
              </View>
            )}
          </View>

          {/* Acertados */}
          {settledCount > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="check-circle" size={15} color={COLORS.muted} />
                <Text style={styles.sectionTitleMuted}>Acertados ({settledCount})</Text>
              </View>
              <View style={styles.list}>
                {doneGroups.map(grp => (
                  <InstallmentGroup key={grp[0].installmentGroupId} personId={id} entries={grp} />
                ))}
                {singleSettled.map(entry => (
                  <EntryCard key={entry.id} entry={entry} personId={id} settled />
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <EntryModal
        visible={entryModalOpen}
        personId={id}
        personName={data?.name ?? ''}
        onClose={() => setEntryModalOpen(false)}
      />
      <PersonSheet visible={personSheetOpen} person={data} onClose={() => setPersonSheetOpen(false)} />
      <EditRecurringModal
        visible={!!editingRecurring}
        item={editingRecurring}
        personId={id}
        onClose={() => setEditingRecurring(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8,
  },
  addBtn: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },

  // Profile
  profileRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingHorizontal: 20, marginTop: 8, marginBottom: 16 },
  name:  { fontSize: 20, fontWeight: '700', color: COLORS.text },
  notes: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  profileActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  profileActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
  },
  profileActionText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },

  // Balance cards
  balanceCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
    marginHorizontal: 20, marginBottom: 8,
  },
  balanceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  balanceCardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  balanceCardLabel:  { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  balanceCardMonth:  { fontSize: 10, color: COLORS.muted2, textTransform: 'capitalize' },
  balanceCardValue:  { fontSize: 20, fontWeight: '700' },
  balanceCardSub:    { fontSize: 11, color: COLORS.muted2, marginTop: 4 },

  // Projeção
  projectionCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
    marginHorizontal: 20, marginBottom: 16,
  },
  projectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  projectionTitle:  { fontSize: 13, fontWeight: '700', color: COLORS.text },
  projectionGrid:   { flexDirection: 'row', gap: 8 },
  projectionMonth:  { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10 },
  projectionMonthCurrent: { borderColor: COLORS.brand + '40', backgroundColor: COLORS.brand + '14' },
  projectionMonthOther:   { borderColor: COLORS.border, backgroundColor: COLORS.card2 },
  projectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  projectionDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.brand },
  projectionLabel:  { fontSize: 10, color: COLORS.muted, textTransform: 'capitalize' },
  projectionPos:    { fontSize: 11, color: COLORS.success, fontWeight: '600' },
  projectionNeg:    { fontSize: 11, color: COLORS.danger, fontWeight: '600' },
  projectionBalance: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  projectionFootnote: { fontSize: 10, color: COLORS.muted2, marginTop: 10 },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle:      { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sectionTitleMuted: { fontSize: 15, fontWeight: '700', color: COLORS.muted },
  sectionTitleUpper: { fontSize: 11, fontWeight: '700', color: COLORS.muted2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },

  infoBox: {
    backgroundColor: COLORS.brand + '14', borderWidth: 1, borderColor: COLORS.brand + '33',
    borderRadius: 12, padding: 12, marginBottom: 10,
  },
  infoBoxText:   { fontSize: 11, color: COLORS.muted, lineHeight: 17 },
  infoBoxStrong: { color: COLORS.text, fontWeight: '700' },

  list: { gap: 8 },
  emptyBox: {
    paddingVertical: 32, alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  emptyBoxText: { fontSize: 13, color: COLORS.muted2 },

  // Entry card
  entryCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 12,
  },
  entryCardSettled: { opacity: 0.6 },
  entryTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  entryIconSettled: { backgroundColor: COLORS.card2 },
  entryTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  entryTitleSettled: { textDecorationLine: 'line-through', color: COLORS.muted },
  entryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  entrySubtitle: { fontSize: 11, color: COLORS.muted },
  catPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  catPillText: { fontSize: 10, fontWeight: '600' },
  entryAmount: { fontSize: 14, fontWeight: '700', flexShrink: 0 },
  entryActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 8 },
  iconBtnSmall: {
    width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.card2,
  },
})
