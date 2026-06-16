import { View, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native'
import { Text } from '@/components/text'
import { COLORS } from '@/lib/constants'
import type { Category } from '@/lib/api'

interface Props {
  visible:     boolean
  categories:  Category[]
  selectedId?: string
  title?:      string
  onSelect:    (categoryId: string) => void
  onClose:     () => void
}

export function CategoryPickerModal({ visible, categories, selectedId, title, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title ?? 'Selecionar categoria'}</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.cats}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.cat, selectedId === cat.id && styles.catActive]}
                  onPress={() => { onSelect(cat.id); onClose() }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  <Text style={[styles.catName, selectedId === cat.id && styles.catNameActive]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  scroll: { maxHeight: 360 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
  },
  catActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  catIcon:   { fontSize: 16 },
  catName:   { fontSize: 12, color: COLORS.muted, maxWidth: 120 },
  catNameActive: { color: COLORS.brand },
})
