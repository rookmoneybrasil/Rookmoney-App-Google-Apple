import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { feedbackApi } from '@/lib/api'

const TYPES: { value: 'bug' | 'suggestion' | 'ticket'; label: string; emoji: string; desc: string }[] = [
  { value: 'bug',        label: 'Bug',       emoji: '🐛', desc: 'Algo não está funcionando' },
  { value: 'suggestion', label: 'Sugestão',  emoji: '💡', desc: 'Ideia para melhorar o app' },
  { value: 'ticket',     label: 'Suporte',   emoji: '🎫', desc: 'Preciso de ajuda' },
]

export default function FeedbackScreen() {
  const router = useRouter()

  const [type,  setType]  = useState<'bug' | 'suggestion' | 'ticket'>('ticket')
  const [title, setTitle] = useState('')
  const [body,  setBody]  = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      if (!title.trim()) throw new Error('Título obrigatório.')
      if (!body.trim())  throw new Error('Descrição obrigatória.')
      return feedbackApi.send({ type, title: title.trim(), body: body.trim() })
    },
    onSuccess: () => {
      Alert.alert(
        'Enviado!',
        'Recebemos sua mensagem. Respondemos em até 24h por e-mail.',
        [{ text: 'OK', onPress: () => router.back() }],
      )
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Suporte & Feedback</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Encontrou um bug, tem uma sugestão ou precisa de ajuda? Fale com a gente.
        </Text>

        <Text style={styles.label}>Tipo *</Text>
        <View style={styles.typeGrid}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeBtn, type === t.value && styles.typeBtnActive]}
              onPress={() => setType(t.value)}
              activeOpacity={0.8}
            >
              <Text style={styles.typeEmoji}>{t.emoji}</Text>
              <View>
                <Text style={[styles.typeLabel, type === t.value && { color: COLORS.brand }]}>
                  {t.label}
                </Text>
                <Text style={styles.typeDesc}>{t.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          placeholder="Resumo em uma linha"
          placeholderTextColor={COLORS.muted}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />

        <Text style={styles.label}>Descrição *</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder={
            type === 'bug'
              ? 'O que aconteceu? Quais passos levaram ao problema?'
              : type === 'suggestion'
              ? 'Descreva sua ideia com detalhes...'
              : 'Como podemos ajudar? Descreva o problema com detalhes...'
          }
          placeholderTextColor={COLORS.muted}
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={2000}
        />
        <Text style={styles.charCount}>{body.length}/2000</Text>

        <TouchableOpacity
          style={[styles.sendBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          <Feather name="send" size={18} color="#fff" />
          <Text style={styles.sendBtnText}>
            {mutation.isPending ? 'Enviando...' : 'Enviar'}
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
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:   { fontSize: 18, fontWeight: '700', color: COLORS.text },

  content: { padding: 20, paddingBottom: 40 },
  intro:   { fontSize: 14, color: COLORS.muted, lineHeight: 20, marginBottom: 24 },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 8, marginTop: 20 },

  typeGrid: { gap: 8 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  typeBtnActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  typeEmoji:     { fontSize: 22 },
  typeLabel:     { fontSize: 14, fontWeight: '600', color: COLORS.text },
  typeDesc:      { fontSize: 12, color: COLORS.muted, marginTop: 1 },

  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },
  textarea:  { minHeight: 140, paddingTop: 12 },
  charCount: { fontSize: 11, color: COLORS.muted2, textAlign: 'right', marginTop: 4 },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 16,
    marginTop: 32,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
