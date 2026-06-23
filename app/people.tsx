import { View, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert, Modal } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { peopleApi, meApi, type Person } from '@/lib/api'
import { ProGate } from '@/components/pro-gate'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

function PersonCard({ person, onDelete, onRename }: { person: Person; onDelete: () => void; onRename: () => void }) {
  const router   = useRouter()
  const netOwed  = person.theyOweMe - person.iOweThem
  const netColor = netOwed > 0 ? COLORS.success : netOwed < 0 ? COLORS.danger : COLORS.muted
  const netLabel = netOwed > 0 ? 'te deve' : netOwed < 0 ? 'você deve' : 'quitado'

  const showOptions = () =>
    Alert.alert('Opções', person.name, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Renomear', onPress: onRename },
      { text: 'Excluir', style: 'destructive', onPress: onDelete },
    ])

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/person-detail', params: { id: person.id } })}
      onLongPress={showOptions}
      activeOpacity={0.85}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {person.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{person.name}</Text>
        <Text style={styles.entries}>
          {person.openEntriesCount} {person.openEntriesCount === 1 ? 'pendência' : 'pendências'}
        </Text>
      </View>
      <TouchableOpacity onPress={showOptions} hitSlop={8} style={{ padding: 4 }}>
        <Feather name="more-vertical" size={16} color={COLORS.muted} />
      </TouchableOpacity>
      <View style={styles.right}>
        <Text style={[styles.net, { color: netColor }]}>
          {fmt(Math.abs(netOwed))}
        </Text>
        <Text style={[styles.netLabel, { color: netColor }]}>{netLabel}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function PeopleScreen() {
  const router = useRouter()
  const qc     = useQueryClient()

  const [editing,  setEditing]  = useState<Person | null>(null)
  const [editName, setEditName] = useState('')

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then(r => r.data),
  })

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['people'],
    queryFn:  () => peopleApi.list().then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => peopleApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const renameMutation = useMutation({
    mutationFn: () => {
      if (!editName.trim()) throw new Error('Nome não pode ser vazio')
      return peopleApi.update(editing!.id, { name: editName.trim() })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people'] })
      setEditing(null)
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  function openRename(person: Person) {
    setEditName(person.name)
    setEditing(person)
  }

  const isPro     = me?.plan === 'PRO' || me?.plan === 'PRO_PLUS'
  const atLimit   = !isPro && (data?.length ?? 0) >= (me?.limits?.people ?? 2)
  const totalOwed = data?.reduce((s, p) => s + (p.theyOweMe - p.iOweThem), 0) ?? 0

  if (me && !isPro && (me.limits.people === 0)) {
    return (
      <View style={styles.screen}>
        <Header onBack={() => router.back()} />
        <ProGate
          feature="Pessoas"
          description="Controle quem te deve e o que você deve para amigos e familiares."
        />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pessoas</Text>
        {!atLimit ? (
          <TouchableOpacity onPress={() => router.push('/new-person')} hitSlop={12}>
            <Feather name="plus" size={22} color={COLORS.brand} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push('/billing')} hitSlop={12}>
            <View style={styles.limitBadge}>
              <Feather name="lock" size={12} color={COLORS.warning} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Net balance summary */}
      {(data?.length ?? 0) > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Saldo líquido</Text>
          <Text style={[styles.summaryNet, { color: totalOwed >= 0 ? COLORS.success : COLORS.danger }]}>
            {totalOwed >= 0 ? 'te devem ' : 'você deve '}
            {fmt(Math.abs(totalOwed))}
          </Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={p => p.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <PersonCard
              person={item}
              onRename={() => openRename(item)}
              onDelete={() => {
                Alert.alert(
                  'Excluir pessoa',
                  `Remover ${item.name} e todas as pendências?`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                  ]
                )
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={40} color={COLORS.muted2} />
              <Text style={styles.emptyTitle}>Nenhuma pessoa ainda</Text>
              <Text style={styles.emptyDesc}>Adicione pessoas para controlar quem te deve ou o que você deve.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/new-person')}>
                <Text style={styles.emptyBtnText}>Adicionar pessoa</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {atLimit && (
        <View style={styles.limitBanner}>
          <Feather name="info" size={14} color={COLORS.warning} />
          <Text style={styles.limitBannerText}>
            Limite de {me?.limits?.people} pessoas no plano Free.{' '}
            <Text style={styles.limitBannerLink} onPress={() => router.push('/billing')}>Fazer upgrade</Text>
          </Text>
        </View>
      )}

      <Modal
        visible={!!editing}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setEditing(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Renomear pessoa</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nome"
              placeholderTextColor={COLORS.muted}
              autoFocus
              selectTextOnFocus
              maxLength={60}
            />
            <TouchableOpacity
              style={[styles.modalSaveBtn, renameMutation.isPending && { opacity: 0.6 }]}
              onPress={() => renameMutation.mutate()}
              disabled={renameMutation.isPending}
            >
              <Text style={styles.modalSaveBtnText}>
                {renameMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={12}>
        <Feather name="arrow-left" size={22} color={COLORS.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Pessoas</Text>
      <View style={{ width: 22 }} />
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
  limitBadge: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },

  summary: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: COLORS.muted },
  summaryNet:   { fontSize: 16, fontWeight: '700' },

  list: { padding: 16, paddingTop: 8 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.brandDim,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: COLORS.brand },
  info:       { flex: 1 },
  name:       { fontSize: 15, fontWeight: '600', color: COLORS.text },
  entries:    { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  right:      { alignItems: 'flex-end' },
  net:        { fontSize: 15, fontWeight: '700' },
  netLabel:   { fontSize: 11, marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  emptyDesc:  { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 20, backgroundColor: COLORS.brand, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  limitBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
  },
  limitBannerText: { flex: 1, fontSize: 13, color: COLORS.warning },
  limitBannerLink: { fontWeight: '700', textDecorationLine: 'underline' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle:  { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalInput: {
    backgroundColor: COLORS.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  modalSaveBtn: { backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
