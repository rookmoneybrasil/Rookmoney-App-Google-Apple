import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { CurrencyInput } from '@/components/currency-input'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { ListSkeleton } from '@/components/skeleton'
import { accountsApi, type Account, type AccountType } from '@/lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: 'CASH',        label: 'Carteira',        icon: '👛' },
  { value: 'CHECKING',    label: 'Conta corrente',  icon: '🏦' },
  { value: 'SAVINGS',     label: 'Poupança',        icon: '🐷' },
  { value: 'CREDIT_CARD', label: 'Cartão',          icon: '💳' },
]
const typeLabel = (t: AccountType) => TYPES.find(x => x.value === t)?.label ?? 'Conta'

const EMOJIS = ['👛', '🏦', '🐷', '💳', '💰', '💵', '🪙', '🧾', '🏧', '📇', '🟣', '🟢', '🟠', '🔵']
const SWATCHES = ['#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#14B8A6', '#F97316']

export default function WalletsScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Account | null | 'new'>(null)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['accounts'],
    queryFn:  () => accountsApi.list().then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => qc.refetchQueries({ queryKey: ['accounts'] }),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  function confirmDelete(a: Account) {
    Alert.alert('Excluir conta', `Excluir "${a.name}"? O saldo e os lançamentos dela vão para outra conta — nada é perdido.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(a.id) },
    ])
  }

  const accounts = data?.accounts ?? []
  const total = data?.total ?? 0

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Carteiras</Text>
        <TouchableOpacity onPress={() => setEditing('new')} hitSlop={12}>
          <Feather name="plus" size={22} color={COLORS.brand} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
        >
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Saldo total</Text>
            <Text style={[styles.totalValue, { color: total < 0 ? COLORS.danger : COLORS.text }]}>{fmt(total)}</Text>
            <Text style={styles.totalSub}>{accounts.filter(a => !a.archived).length} conta(s)</Text>
          </View>

          {accounts.filter(a => !a.archived).map(a => (
            <TouchableOpacity
              key={a.id}
              style={styles.accCard}
              onPress={() => setEditing(a)}
              onLongPress={() => confirmDelete(a)}
              activeOpacity={0.8}
            >
              <View style={[styles.accIcon, { backgroundColor: a.color + '22' }]}>
                <Text style={styles.accEmoji}>{a.icon}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.accNameRow}>
                  <Text style={styles.accName} numberOfLines={1}>{a.name}</Text>
                  {a.isDefault && <View style={styles.defBadge}><Text style={styles.defBadgeText}>Padrão</Text></View>}
                </View>
                <Text style={styles.accType}>{typeLabel(a.type)}</Text>
              </View>
              <Text style={[styles.accBalance, { color: a.balance < 0 ? COLORS.danger : COLORS.text }]}>{fmt(a.balance)}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addCard} onPress={() => setEditing('new')}>
            <Feather name="plus" size={18} color={COLORS.muted} />
            <Text style={styles.addCardText}>Nova carteira</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>O saldo é o valor inicial + tudo que entrou − tudo que saiu daquela conta.</Text>
        </ScrollView>
      )}

      {editing !== null && (
        <AccountSheet
          account={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  )
}

function AccountSheet({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName]       = useState(account?.name ?? '')
  const [type, setType]       = useState<AccountType>(account?.type ?? 'CASH')
  const [icon, setIcon]       = useState(account?.icon ?? '👛')
  const [color, setColor]     = useState(account?.color ?? '#22C55E')
  const [initial, setInitial] = useState(account ? String(account.initialBalance) : '')

  const mutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('Nome é obrigatório')
      const body = { name: name.trim(), type, icon, color, initialBalance: parseFloat(initial || '0') }
      return account ? accountsApi.update(account.id, body) : accountsApi.create(body)
    },
    onSuccess: () => { qc.refetchQueries({ queryKey: ['accounts'] }); onClose() },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{account ? 'Editar carteira' : 'Nova carteira'}</Text>

            <Text style={styles.label}>Nome *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Carteira, Nubank, Itaú…" placeholderTextColor={COLORS.muted} />

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.chipRow}>
              {TYPES.map(t => (
                <TouchableOpacity key={t.value} style={[styles.chip, type === t.value && styles.chipActive]} onPress={() => { setType(t.value); setIcon(t.icon) }}>
                  <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>{t.icon} {t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Saldo inicial</Text>
            <CurrencyInput style={styles.input} value={initial} onChangeValue={setInitial} placeholder="0,00" />

            <Text style={styles.label}>Ícone</Text>
            <View style={styles.emojiGrid}>
              {EMOJIS.map(e => (
                <TouchableOpacity key={e} style={[styles.emojiBtn, icon === e && styles.emojiBtnActive]} onPress={() => setIcon(e)}>
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Cor</Text>
            <View style={styles.colorRow}>
              {SWATCHES.map(c => (
                <TouchableOpacity key={c} style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorBtnActive]} onPress={() => setColor(c)}>
                  {color === c && <Feather name="check" size={13} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
              <Text style={styles.saveBtnText}>{mutation.isPending ? 'Salvando...' : 'Salvar'}</Text>
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  content: { padding: 20, paddingBottom: 60 },

  totalCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  totalLabel: { fontSize: 12, color: COLORS.muted },
  totalValue: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  totalSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  accCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  accIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  accEmoji: { fontSize: 20 },
  accNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  accType: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  accBalance: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  defBadge: { backgroundColor: COLORS.brandDim, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  defBadgeText: { fontSize: 10, color: COLORS.brand, fontWeight: '700' },

  addCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, paddingVertical: 18, marginTop: 4 },
  addCardText: { fontSize: 14, color: COLORS.muted, fontWeight: '600' },
  hint: { fontSize: 11, color: COLORS.muted2, marginTop: 16, lineHeight: 16, textAlign: 'center' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: COLORS.border },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.muted2, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 4 },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: COLORS.card2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.brandDim, borderColor: COLORS.brand },
  chipText: { fontSize: 13, color: COLORS.muted },
  chipTextActive: { color: COLORS.brand, fontWeight: '600' },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.card2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emojiBtnActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  emojiText: { fontSize: 20 },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  colorBtnActive: { borderWidth: 3, borderColor: '#fff' },

  saveBtn: { backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
