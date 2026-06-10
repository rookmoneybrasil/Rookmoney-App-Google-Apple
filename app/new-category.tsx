import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { categoriesApi } from '@/lib/api'

const EMOJI_OPTIONS = [
  '🛒', '🍔', '🍕', '🎮', '🏋️', '📚', '🚗', '✈️', '💊', '👕',
  '🎵', '🎬', '🐾', '🌿', '🏠', '⚡', '📱', '💄', '🎁', '🍷',
]

const COLOR_OPTIONS = [
  '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
]

export default function NewCategoryScreen() {
  const router = useRouter()
  const qc     = useQueryClient()

  const [name, setName]   = useState('')
  const [icon, setIcon]   = useState('🛒')
  const [color, setColor] = useState('#3b82f6')

  const mutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('Nome é obrigatório')
      return categoriesApi.create({ name: name.trim(), icon, color })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      router.back()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Categoria</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Preview */}
        <View style={styles.preview}>
          <View style={[styles.previewIcon, { backgroundColor: color + '22' }]}>
            <Text style={styles.previewEmoji}>{icon}</Text>
          </View>
          <Text style={styles.previewName}>{name || 'Minha categoria'}</Text>
          <View style={[styles.previewDot, { backgroundColor: color }]} />
        </View>

        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Pets, Academia..."
          placeholderTextColor={COLORS.muted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Ícone</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_OPTIONS.map((e) => (
            <TouchableOpacity
              key={e}
              style={[styles.emojiBtn, icon === e && styles.emojiBtnActive]}
              onPress={() => setIcon(e)}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Cor</Text>
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorBtnActive]}
              onPress={() => setColor(c)}
            >
              {color === c && <Feather name="check" size={14} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          <Text style={styles.saveBtnText}>
            {mutation.isPending ? 'Salvando...' : 'Criar Categoria'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  closeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:    { fontSize: 18, fontWeight: '700', color: COLORS.text },

  content: { padding: 20, paddingBottom: 40 },

  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  previewIcon:  { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  previewEmoji: { fontSize: 22 },
  previewName:  { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  previewDot:   { width: 12, height: 12, borderRadius: 6 },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.card,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  emojiBtnActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  emojiText:      { fontSize: 22 },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  colorBtnActive: { borderWidth: 3, borderColor: '#fff' },

  saveBtn: {
    backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 32,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
