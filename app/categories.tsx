import { View, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { categoriesApi, type Category } from '@/lib/api'

function CustomCategoryItem({ item, onEdit, onDelete }: {
  item: Category
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <View style={styles.item}>
      <View style={[styles.icon, { backgroundColor: item.color + '22' }]}>
        <Text style={styles.emoji}>{item.icon}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
      <TouchableOpacity onPress={onEdit} style={styles.iconBtn} hitSlop={6}>
        <Feather name="edit-2" size={14} color={COLORS.muted} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.iconBtn} hitSlop={6}>
        <Feather name="trash-2" size={14} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  )
}

function DefaultCategoryItem({ item }: { item: Category }) {
  return (
    <View style={styles.item}>
      <View style={[styles.icon, { backgroundColor: item.color + '22' }]}>
        <Text style={styles.emoji}>{item.icon}</Text>
      </View>
      <Text style={styles.nameDefault} numberOfLines={1}>{item.name}</Text>
      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
      <View style={styles.badge}>
        <Feather name="lock" size={10} color={COLORS.muted} />
        <Text style={styles.badgeText}>Padrão</Text>
      </View>
    </View>
  )
}

type ListItem =
  | { type: 'header'; key: string; title: string }
  | { type: 'item'; key: string; item: Category }
  | { type: 'empty-custom'; key: string }

export default function CategoriesScreen() {
  const router = useRouter()
  const qc     = useQueryClient()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError:    (e: Error) => Alert.alert('Erro', e.message),
  })

  function confirmDelete(cat: Category) {
    Alert.alert('Excluir categoria', `Excluir "${cat.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(cat.id) },
    ])
  }

  const custom   = data?.filter((c) => !c.isDefault) ?? []
  const defaults = data?.filter((c) =>  c.isDefault) ?? []

  const listItems: ListItem[] = [
    ...(custom.length > 0 ? [
      { type: 'header' as const, key: 'h-custom', title: 'PERSONALIZADAS' },
      ...custom.map((c) => ({ type: 'item' as const, key: c.id, item: c })),
    ] : data ? [
      { type: 'header' as const, key: 'h-custom', title: 'PERSONALIZADAS' },
      { type: 'empty-custom' as const, key: 'empty-custom' },
    ] : []),
    { type: 'header' as const, key: 'h-default', title: 'PADRÃO' },
    ...defaults.map((c) => ({ type: 'item' as const, key: c.id, item: c })),
  ]

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Categorias</Text>
          <Text style={styles.subtitle}>
            {custom.length} personalizada{custom.length !== 1 ? 's' : ''} · {defaults.length} padrão
          </Text>
        </View>
      </View>
      <Text style={styles.description}>
        Crie categorias com nome, emoji e cor para organizar suas transações. As categorias padrão não podem ser removidas.
      </Text>

      <View style={styles.newBtnRow}>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/new-category')} activeOpacity={0.85}>
          <Feather name="plus" size={15} color="#fff" />
          <Text style={styles.newBtnText}>Nova categoria</Text>
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
            if (item.type === 'empty-custom') {
              return (
                <View style={styles.emptyCustom}>
                  <View style={styles.emptyIconWrap}>
                    <Feather name="tag" size={20} color={COLORS.muted} />
                  </View>
                  <Text style={styles.emptyTitle}>Nenhuma categoria personalizada</Text>
                  <Text style={styles.emptyDesc}>
                    Crie categorias com cor e emoji para organizar suas transações do seu jeito.
                  </Text>
                  <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/new-category')} activeOpacity={0.85}>
                    <Feather name="plus" size={15} color="#fff" />
                    <Text style={styles.newBtnText}>Nova categoria</Text>
                  </TouchableOpacity>
                </View>
              )
            }
            return item.item.isDefault ? (
              <DefaultCategoryItem item={item.item} />
            ) : (
              <CustomCategoryItem
                item={item.item}
                onEdit={() => router.push({ pathname: '/edit-category', params: { id: item.item.id } })}
                onDelete={() => confirmDelete(item.item)}
              />
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 20, paddingTop: 56,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginLeft: -8 },
  title:    { fontSize: 20, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  description: { fontSize: 11, color: COLORS.muted2, lineHeight: 15, paddingHorizontal: 20, marginTop: 8 },

  newBtnRow: { paddingHorizontal: 20, marginTop: 14 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.brand, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.muted,
    letterSpacing: 1, marginBottom: 8, marginTop: 16,
  },

  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    marginBottom: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  icon:        { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  emoji:       { fontSize: 18 },
  name:        { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  nameDefault: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.muted },
  colorDot:    { width: 10, height: 10, borderRadius: 5 },
  iconBtn:     { padding: 4 },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: COLORS.muted },

  emptyCustom: {
    alignItems: 'center', gap: 10, padding: 28, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16,
    borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border,
  },
  emptyIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.card2, justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  emptyDesc:  { fontSize: 11, color: COLORS.muted, textAlign: 'center', lineHeight: 16, maxWidth: 240 },
})
