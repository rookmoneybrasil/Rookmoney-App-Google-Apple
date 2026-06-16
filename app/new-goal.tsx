import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS, GOAL_COLORS } from '@/lib/constants'
import { goalsApi } from '@/lib/api'

const EMOJI_OPTIONS = [
  '🎯', '🏠', '✈️', '🚗', '💰', '📚', '💍', '🎓', '🏋️', '🌴',
  '🎸', '💻', '👶', '🏦', '🎁', '🌟', '🏆', '❤️', '🌿', '🔑',
]

export default function NewGoalScreen() {
  const router = useRouter()
  const qc     = useQueryClient()

  const [name, setName]         = useState('')
  const [target, setTarget]     = useState('')
  const [current, setCurrent]   = useState('')
  const [deadline, setDeadline] = useState('')
  const [description, setDesc]  = useState('')
  const [icon, setIcon]         = useState('🎯')
  const [color, setColor]       = useState(GOAL_COLORS[0])

  const mutation = useMutation({
    mutationFn: () => {
      const targetAmount = parseFloat(target.replace(',', '.'))
      if (!name.trim())                     throw new Error('Nome é obrigatório')
      if (isNaN(targetAmount) || targetAmount <= 0) throw new Error('Valor meta inválido')

      const currentAmount = current.trim() ? parseFloat(current.replace(',', '.')) : undefined

      return goalsApi.create({
        name:        name.trim(),
        targetAmount,
        currentAmount,
        icon,
        color,
        description: description.trim() || undefined,
        deadline:    deadline.trim() || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
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
        <Text style={styles.title}>Nova Meta</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Icon picker */}
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

        <Text style={styles.label}>Nome da meta *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Viagem para Europa"
          placeholderTextColor={COLORS.muted}
          value={name}
          onChangeText={setName}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Valor alvo (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              value={target}
              onChangeText={setTarget}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Já tenho (R$)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              value={current}
              onChangeText={setCurrent}
            />
          </View>
        </View>

        <Text style={styles.label}>Prazo (AAAA-MM-DD, opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="2026-12-31"
          placeholderTextColor={COLORS.muted}
          value={deadline}
          onChangeText={setDeadline}
        />

        <Text style={styles.label}>Cor</Text>
        <View style={styles.colorRow}>
          {GOAL_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchActive]}
            />
          ))}
        </View>

        <Text style={styles.label}>Descrição (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descreva sua meta..."
          placeholderTextColor={COLORS.muted}
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDesc}
        />

        <TouchableOpacity
          style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          <Text style={styles.saveBtnText}>
            {mutation.isPending ? 'Salvando...' : 'Criar Meta'}
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

  row: { flexDirection: 'row', gap: 12 },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },
  textArea: { height: 80, textAlignVertical: 'top' },

  colorRow: { flexDirection: 'row', gap: 10 },
  colorSwatch: { width: 32, height: 32, borderRadius: 9, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchActive: { borderColor: 'rgba(255,255,255,0.5)' },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.card,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  emojiBtnActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  emojiText:      { fontSize: 22 },

  saveBtn: {
    backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 32,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
