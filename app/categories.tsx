import { useState } from 'react'
import { View, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert, Modal } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { categoriesApi, type Category } from '@/lib/api'

function CategoryItem({
  item, onDelete, onEdit,
}: {
  item: Category
  onDelete?: () => void
  onEdit?: () => void
}) {
  const isCustom = !item.isDefault

  function handleLongPress() {
    if (!isCustom) return
    Alert.alert(item.name, undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Renomear', onPress: onEdit },
      { text: 'Excluir', style: 'destructive', onPress: onDelete },
    ])
  }

  return (
    <TouchableOpacity
      style={styles.item}
      onLongPress={isCustom ? handleLongPress : undefined}
      activeOpacity={isCustom ? 0.8 : 1}
    >
      <View style={[styles.icon, { backgroundColor: (item.color ?? COLORS.brand) + '22' }]}>
        <Text style={styles.emoji}>{item.icon}</Text>
      </View>
      <Text style={styles.name}>{item.name}</Text>
      <View style={[styles.colorDot, { backgroundColor: item.color ?? COLORS.brand }]} />
      {isCustom && (
        <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
          <Feather name="edit-2" size={14} color={COLORS.muted} />
        </TouchableOpacity>
      )}
      {isCustom && onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={14} color={COLORS.danger} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

type ListItem =
  | { type: 'header'; key: string; title: string }
  | { type: 'item'; key: string; item: Category }

export default function CategoriesScreen() {
  const router = useRouter()
  const qc     = useQueryClient()

  const [editing,  setEditing]  = useState<Category | null>(null)
  const [editName, setEditName] = useState('')

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError:    (e: Error) => Alert.alert('Erro', e.message),
  })

  const renameMutation = useMutation({
    mutationFn: () => {
      if (!editName.trim()) throw new Error('Nome não pode ser vazio')
      return categoriesApi.update(editing!.id, { name: editName.trim() })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setEditing(null)
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  function openEdit(cat: Category) {
    setEditName(cat.name)
    setEditing(cat)
  }

  const custom   = data?.filter((c) => !c.isDefault) ?? []
  const defaults = data?.filter((c) =>  c.isDefault) ?? []

  const listItems: ListItem[] = [
    ...(custom.length > 0 ? [
      { type: 'header' as const, key: 'h-custom', title: 'PERSONALIZADAS' },
      ...custom.map((c) => ({ type: 'item' as const, key: c.id, item: c })),
    ] : []),
    { type: 'header' as const, key: 'h-default', title: 'PADRÃO' },
    ...defaults.map((c) => ({ type: 'item' as const, key: c.id, item: c })),
  ]

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Categorias</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-category')}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(i) => i.key}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.sectionLabel}>{item.title}</Text>
            }
            return (
              <CategoryItem
                item={item.item}
                onDelete={!item.item.isDefault ? () => deleteMutation.mutate(item.item.id) : undefined}
                onEdit={!item.item.isDefault ? () => openEdit(item.item) : undefined}
              />
            )
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="tag" size={40} color={COLORS.muted} />
              <Text style={styles.emptyText}>Nenhuma categoria encontrada.</Text>
            </View>
          }
        />
      )}

      {/* Rename modal */}
      <Modal
        visible={!!editing}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setEditing(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Renomear categoria</Text>
            {editing && (
              <View style={styles.modalIconRow}>
                <View style={[styles.modalIcon, { backgroundColor: (editing.color ?? COLORS.brand) + '22' }]}>
                  <Text style={styles.modalEmoji}>{editing.icon}</Text>
                </View>
                <Text style={styles.modalOldName}>{editing.name}</Text>
              </View>
            )}
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Novo nome"
              placeholderTextColor={COLORS.muted}
              autoFocus
              selectTextOnFocus
              maxLength={40}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:  { fontSize: 20, fontWeight: '700', color: COLORS.text },
  addBtn: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },

  list: { paddingHorizontal: 20, paddingBottom: 32 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.muted,
    letterSpacing: 1, marginBottom: 8, marginTop: 16,
  },

  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    marginBottom: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  icon:      { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  emoji:     { fontSize: 18 },
  name:      { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },
  colorDot:  { width: 10, height: 10, borderRadius: 5 },
  editBtn:   { padding: 5 },
  deleteBtn: { padding: 5 },

  empty:     { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { color: COLORS.muted, fontSize: 14 },

  // Modal
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle:    { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalIconRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  modalIcon:     { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalEmoji:    { fontSize: 22 },
  modalOldName:  { fontSize: 15, color: COLORS.muted },
  modalInput: {
    backgroundColor: COLORS.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  modalSaveBtn: {
    backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  modalSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
