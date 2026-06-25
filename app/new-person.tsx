import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { peopleApi } from '@/lib/api'

export default function NewPersonModal() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [name, setName]   = useState('')
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: () => peopleApi.create({ name: name.trim(), notes: notes.trim() || undefined }),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['people'] })
      router.back()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const canSave = name.trim().length >= 2

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.handle} />

      <View style={styles.header}>
        <Text style={styles.title}>Nova Pessoa</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={20} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ex: João Silva"
          placeholderTextColor={COLORS.muted}
          autoFocus
          maxLength={60}
        />

        <Text style={styles.label}>Observações</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notas opcionais sobre esta pessoa..."
          placeholderTextColor={COLORS.muted}
          multiline
          numberOfLines={3}
          maxLength={200}
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, !canSave && styles.btnDisabled]}
          onPress={() => mutation.mutate()}
          disabled={!canSave || mutation.isPending}
          activeOpacity={0.85}
        >
          {mutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Adicionar pessoa</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.card },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.muted2, alignSelf: 'center', marginTop: 12,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  form:  { padding: 20, gap: 4 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 6, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.card2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.text, marginBottom: 4,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  footer: { padding: 20 },
  btn: {
    backgroundColor: COLORS.brand, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },
})
