import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'
import { peopleApi, categoriesApi, type PersonEntry } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

type EntryType = 'THEY_OWE_ME' | 'I_OWE_THEM'

function EntryRow({ entry, onSettle }: { entry: PersonEntry; onSettle: () => void }) {
  const isOwed = entry.type === 'THEY_OWE_ME'
  const color  = isOwed ? COLORS.success : COLORS.danger

  return (
    <View style={[styles.entryRow, entry.isSettled && styles.entrySettled]}>
      <View style={[styles.entryIcon, { backgroundColor: color + '22' }]}>
        <Feather name={isOwed ? 'arrow-down-left' : 'arrow-up-right'} size={14} color={color} />
      </View>
      <View style={styles.entryInfo}>
        <Text style={styles.entryDesc} numberOfLines={1}>{entry.description}</Text>
        <Text style={styles.entryDate}>
          {format(new Date(entry.date), "d 'de' MMM yyyy", { locale: ptBR })}
          {entry.isSettled ? ' · Quitado' : ''}
        </Text>
      </View>
      <View style={styles.entryRight}>
        <Text style={[styles.entryAmount, { color }]}>
          {isOwed ? '+' : '-'}{fmt(entry.amount)}
        </Text>
        {!entry.isSettled && (
          <TouchableOpacity style={styles.settleBtn} onPress={onSettle}>
            <Text style={styles.settleBtnText}>Quitar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

function AddEntryForm({ personId, onDone }: { personId: string; onDone: () => void }) {
  const [type, setType]         = useState<EntryType>('THEY_OWE_ME')
  const [desc, setDesc]         = useState('')
  const [amount, setAmount]     = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => peopleApi.addEntry(personId, {
      type,
      description: desc.trim(),
      amount:      parseFloat(amount.replace(',', '.')),
      date:        new Date().toISOString().slice(0, 10),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['person', personId] })
      qc.invalidateQueries({ queryKey: ['people'] })
      setDesc('')
      setAmount('')
      onDone()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const canSave = desc.trim().length > 0 && parseFloat(amount.replace(',', '.')) > 0

  // Minimal inline form - full amount input
  const { TextInput } = require('react-native')

  return (
    <View style={styles.addForm}>
      <Text style={styles.addFormTitle}>Adicionar lançamento</Text>

      <View style={styles.typeToggle}>
        {(['THEY_OWE_ME', 'I_OWE_THEM'] as EntryType[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, type === t && styles.typeBtnActive]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
              {t === 'THEY_OWE_ME' ? 'Me deve' : 'Devo a ele(a)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.addInput}
        value={desc}
        onChangeText={setDesc}
        placeholder="Descrição"
        placeholderTextColor={COLORS.muted}
        maxLength={80}
      />
      <TextInput
        style={styles.addInput}
        value={amount}
        onChangeText={setAmount}
        placeholder="Valor (ex: 50,00)"
        placeholderTextColor={COLORS.muted}
        keyboardType="decimal-pad"
      />

      <View style={styles.addFormActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onDone}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={() => mutation.mutate()}
          disabled={!canSave || mutation.isPending}
        >
          {mutation.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Salvar</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function PersonDetailScreen() {
  const router       = useRouter()
  const qc           = useQueryClient()
  const { id }       = useLocalSearchParams<{ id: string }>()
  const [adding, setAdding] = useState(false)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['person', id],
    queryFn:  () => peopleApi.get(id).then(r => r.data),
    enabled:  !!id,
  })

  const settleMutation = useMutation({
    mutationFn: (entryId: string) => peopleApi.settleEntry(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['person', id] })
      qc.invalidateQueries({ queryKey: ['people'] })
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const netOwed  = (data?.theyOweMe ?? 0) - (data?.iOweThem ?? 0)
  const netColor = netOwed > 0 ? COLORS.success : netOwed < 0 ? COLORS.danger : COLORS.muted

  const openEntries   = data?.entries?.filter(e => !e.isSettled) ?? []
  const closedEntries = data?.entries?.filter(e => e.isSettled) ?? []

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{data?.name ?? '...'}</Text>
        <TouchableOpacity onPress={() => setAdding(v => !v)} hitSlop={12}>
          <Feather name="plus" size={22} color={COLORS.brand} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
        >
          {/* Balance cards */}
          <View style={styles.balanceRow}>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Te deve</Text>
              <Text style={[styles.balanceVal, { color: COLORS.success }]}>{fmt(data?.theyOweMe ?? 0)}</Text>
            </View>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Você deve</Text>
              <Text style={[styles.balanceVal, { color: COLORS.danger }]}>{fmt(data?.iOweThem ?? 0)}</Text>
            </View>
            <View style={[styles.balanceCard, styles.balanceCardNet]}>
              <Text style={styles.balanceLabel}>Líquido</Text>
              <Text style={[styles.balanceVal, { color: netColor }]}>{fmt(Math.abs(netOwed))}</Text>
            </View>
          </View>

          {/* Add entry form */}
          {adding && (
            <AddEntryForm personId={id} onDone={() => setAdding(false)} />
          )}

          {/* Open entries */}
          {openEntries.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pendentes</Text>
              <View style={styles.sectionCard}>
                {openEntries.map((entry, i) => (
                  <View key={entry.id}>
                    <EntryRow
                      entry={entry}
                      onSettle={() =>
                        Alert.alert('Quitar lançamento', 'Marcar como quitado?', [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Quitar', onPress: () => settleMutation.mutate(entry.id) },
                        ])
                      }
                    />
                    {i < openEntries.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Settled entries */}
          {closedEntries.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quitados</Text>
              <View style={styles.sectionCard}>
                {closedEntries.map((entry, i) => (
                  <View key={entry.id}>
                    <EntryRow entry={entry} onSettle={() => {}} />
                    {i < closedEntries.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            </View>
          )}

          {openEntries.length === 0 && closedEntries.length === 0 && !adding && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhum lançamento ainda.</Text>
              <TouchableOpacity onPress={() => setAdding(true)}>
                <Text style={styles.emptyLink}>Adicionar primeiro lançamento</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },

  balanceRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  balanceCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 12, alignItems: 'center',
  },
  balanceCardNet: { borderColor: COLORS.brandDim },
  balanceLabel:   { fontSize: 11, color: COLORS.muted, marginBottom: 4 },
  balanceVal:     { fontSize: 15, fontWeight: '700' },

  addForm: {
    margin: 16, marginTop: 0,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.brand + '44',
    padding: 16,
  },
  addFormTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  typeToggle: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  typeBtnActive:     { backgroundColor: COLORS.brandDim, borderColor: COLORS.brand },
  typeBtnText:       { fontSize: 13, fontWeight: '500', color: COLORS.muted },
  typeBtnTextActive: { color: COLORS.brand },
  addInput: {
    backgroundColor: COLORS.card2, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS.text, marginBottom: 8,
  },
  addFormActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: COLORS.muted },
  saveBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    backgroundColor: COLORS.brand, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText:     { fontSize: 14, fontWeight: '700', color: '#fff' },

  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  sectionCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10,
  },
  entrySettled: { opacity: 0.5 },
  entryIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  entryInfo:  { flex: 1 },
  entryDesc:  { fontSize: 14, fontWeight: '500', color: COLORS.text },
  entryDate:  { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  entryRight: { alignItems: 'flex-end', gap: 4 },
  entryAmount: { fontSize: 14, fontWeight: '700' },
  settleBtn: {
    backgroundColor: COLORS.success + '22', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  settleBtnText: { fontSize: 11, color: COLORS.success, fontWeight: '700' },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 56 },

  empty: { alignItems: 'center', paddingTop: 48 },
  emptyText: { fontSize: 14, color: COLORS.muted, marginBottom: 8 },
  emptyLink: { fontSize: 14, color: COLORS.brand, fontWeight: '600' },
})
