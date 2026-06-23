import { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COLORS } from '@/lib/constants'
import { chatApi, meApi, type ChatMessage } from '@/lib/api'
import { ProGate } from '@/components/pro-gate'

interface ChatImage {
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
}

interface DisplayMessage extends ChatMessage {
  navigate?: { path: string; reason: string } | null
  image?: ChatImage | null
}

const STORAGE_KEY = 'rookinho-mobile-chat'

const SUGGESTIONS = [
  'Analisa minha renda e me ajuda a organizar',
  'Ver meu resumo financeiro',
  'Quais contas vencem essa semana?',
  'Registrar uma despesa',
]

const PAGE_MAP: Record<string, { label: string; path: string }> = {
  '/dashboard':    { label: 'Inicio',        path: '/' },
  '/transactions': { label: 'Extratos',      path: '/transactions' },
  '/goals':        { label: 'Metas',         path: '/goals' },
  '/bills':        { label: 'Contas',        path: '/bills' },
  '/budget':       { label: 'Orcamento',     path: '/budget' },
  '/reports':      { label: 'Relatorios',    path: '/reports' },
  '/people':       { label: 'Pessoas',       path: '/people' },
  '/categories':   { label: 'Categorias',    path: '/categories' },
  '/recurring':    { label: 'Recorrencias',  path: '/recurring' },
  '/income':       { label: 'Rendas',        path: '/income' },
  '/settings':     { label: 'Configuracoes', path: '/settings' },
}

const WELCOME: DisplayMessage = {
  role: 'assistant',
  content: 'Ola! \u{1F44B} Sou o Rookinho, seu assistente financeiro com IA.\n\nPosso te ajudar a:\n• Registrar transacoes e contas\n• Consultar seus gastos e metas\n• Analisar comprovantes e boletos\n• Dar dicas personalizadas\n\nO que deseja fazer?',
}

export default function AiChatScreen() {
  const router    = useRouter()
  const scrollRef = useRef<ScrollView>(null)

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then(r => r.data),
  })
  const isPro = me?.plan === 'PRO' || me?.plan === 'PRO_PLUS'

  const [messages, setMessages]     = useState<DisplayMessage[]>([WELCOME])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [remaining, setRemaining]   = useState<number | null>(null)
  const [usageUsed, setUsageUsed]   = useState<number | null>(null)
  const [usageLimit, setUsageLimit] = useState<number | null>(null)
  const [pendingImage, setPendingImage] = useState<ChatImage | null>(null)

  // Load history from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!raw) return
        try {
          const saved = JSON.parse(raw) as DisplayMessage[]
          if (Array.isArray(saved) && saved.length > 0) setMessages(saved)
        } catch { /* corrupt data — ignore */ }
      })
      .catch(() => { /* AsyncStorage unavailable — ignore */ })
  }, [])

  // Save history
  useEffect(() => {
    if (messages.length <= 1) return
    const toSave = messages.map(m => ({ role: m.role, content: m.content, navigate: m.navigate ?? null }))
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)).catch(() => {})
  }, [messages])

  // Fetch usage
  useEffect(() => {
    if (!isPro) return
    chatApi.getUsage()
      .then(res => { setUsageUsed(res.used); setUsageLimit(res.limit); setRemaining(res.remaining) })
      .catch(() => {})
  }, [isPro])

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [messages, loading])

  const clearHistory = useCallback(() => {
    Alert.alert('Limpar historico', 'Apagar todas as mensagens?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: () => {
        setMessages([WELCOME])
        AsyncStorage.removeItem(STORAGE_KEY)
      }},
    ])
  }, [])

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    })
    if (result.canceled || !result.assets[0].base64) return
    const asset = result.assets[0]
    const ext = (asset.mimeType ?? 'image/jpeg') as ChatImage['mediaType']
    setPendingImage({ base64: asset.base64!, mediaType: ext })
  }, [])

  async function send(text: string, image?: ChatImage | null) {
    if ((!text.trim() && !image) || loading) return

    const userMsg: DisplayMessage = { role: 'user', content: text.trim(), image: image ?? null }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setPendingImage(null)
    setLoading(true)

    try {
      const apiMessages = history
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => {
          if (m.role === 'user' && m.image) {
            return {
              role: m.role,
              content: [
                { type: 'image', source: { type: 'base64', media_type: m.image.mediaType, data: m.image.base64 } },
                { type: 'text', text: m.content || 'Analise esta imagem.' },
              ],
            }
          }
          return { role: m.role, content: m.content }
        })

      const res = await chatApi.send(apiMessages as ChatMessage[])
      setMessages(prev => [...prev, { role: 'assistant', content: res.message, navigate: res.navigate }])
      if (res.remaining != null) {
        setRemaining(res.remaining)
        if (usageLimit != null) setUsageUsed(usageLimit - res.remaining)
      }
    } catch (e) {
      const code = e instanceof Error ? e.message : ''
      let content = 'Ops, ocorreu um erro. Tente novamente.'
      if (code.includes('rate_limited') || code.includes('Limite de'))
        content = '⏳ Voce atingiu o limite de mensagens deste mes. O limite renova no inicio do proximo mes.'
      else if (code.includes('ai_unavailable') || code.includes('temporariamente'))
        content = 'O assistente de IA esta temporariamente indisponivel. Tente novamente em alguns minutos.'
      else if (code.includes('file_limit') || code.includes('arquivos'))
        content = 'Voce atingiu o limite de arquivos deste mes. Faca upgrade pro Pro+ para envio ilimitado.'
      else if (code.includes('pro_required'))
        content = 'O Rookinho IA e exclusivo dos planos Pro e Pro+.'
      setMessages(prev => [...prev, { role: 'assistant', content }])
    } finally {
      setLoading(false)
    }
  }

  const usageText = usageUsed != null && usageLimit != null
    ? (usageLimit === 0 ? 'Ilimitado' : `${usageUsed}/${usageLimit} mensagens`)
    : null

  const hasUserMessage = messages.some(m => m.role === 'user')

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/more')}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Image source={require('../assets/rookinho.png')} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerTitle}>Rookinho IA</Text>
            <Text style={styles.headerSubtitle}>
              {usageText ?? 'Assistente financeiro'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {hasUserMessage && (
            <>
              <TouchableOpacity onPress={() => { setMessages([WELCOME]); AsyncStorage.removeItem(STORAGE_KEY).catch(() => {}) }} hitSlop={8}>
                <Feather name="plus" size={18} color={COLORS.brand} />
              </TouchableOpacity>
              <TouchableOpacity onPress={clearHistory} hitSlop={8}>
                <Feather name="trash-2" size={18} color={COLORS.muted} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {me && !isPro ? (
        <ProGate
          feature="Assistente Rookinho (IA)"
          description="Converse com o Rookinho para registrar transacoes, criar metas, cadastrar contas e muito mais — exclusivo dos planos Pro e Pro+."
        />
      ) : (
        <>
          {/* Messages */}
          <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
            {messages.map((msg, i) => {
              const page = msg.navigate ? PAGE_MAP[msg.navigate.path] : undefined
              return (
                <View key={i} style={[styles.msgRow, msg.role === 'user' ? styles.msgRowUser : styles.msgRowAssistant]}>
                  <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
                    {msg.image && (
                      <Image
                        source={{ uri: `data:${msg.image.mediaType};base64,${msg.image.base64}` }}
                        style={styles.msgImage}
                        resizeMode="cover"
                      />
                    )}
                    <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>{msg.content}</Text>
                    {page && (
                      <TouchableOpacity style={styles.navigateLink} onPress={() => router.push(page.path as any)}>
                        <Feather name="arrow-right" size={12} color={COLORS.brand} />
                        <Text style={styles.navigateLinkText}>Ir para {page.label}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )
            })}

            {loading && (
              <View style={[styles.msgRow, styles.msgRowAssistant]}>
                <View style={[styles.bubble, styles.bubbleAssistant, styles.bubbleLoading]}>
                  <ActivityIndicator size="small" color={COLORS.muted} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Remaining counter */}
          {remaining != null && usageLimit != null && usageLimit > 0 && remaining <= 10 && (
            <View style={styles.remainingBar}>
              <Feather name="info" size={12} color={COLORS.muted} />
              <Text style={styles.remainingText}>
                {remaining > 0 ? `${remaining} mensagens restantes este mes` : 'Limite atingido este mes'}
              </Text>
            </View>
          )}

          {/* Suggestions */}
          {!hasUserMessage && (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map(s => (
                <TouchableOpacity key={s} style={styles.suggestionBtn} onPress={() => send(s)} activeOpacity={0.8}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Pending image preview */}
          {pendingImage && (
            <View style={styles.previewRow}>
              <Image source={{ uri: `data:${pendingImage.mediaType};base64,${pendingImage.base64}` }} style={styles.previewImg} />
              <TouchableOpacity onPress={() => setPendingImage(null)} style={styles.previewRemove}>
                <Feather name="x" size={14} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.imageBtn} onPress={pickImage} disabled={loading}>
              <Feather name="image" size={20} color={COLORS.muted} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder={pendingImage ? 'Descreva a imagem...' : 'Pergunte ao Rookinho...'}
              placeholderTextColor={COLORS.muted}
              value={input}
              onChangeText={setInput}
              editable={!loading}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() && !pendingImage || loading) && styles.sendBtnDisabled]}
              onPress={() => send(input, pendingImage)}
              disabled={(!input.trim() && !pendingImage) || loading}
            >
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn:        { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerInfo:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar:   { width: 36, height: 36, resizeMode: 'contain' },
  headerTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  headerActions:  { flexDirection: 'row', alignItems: 'center', gap: 14 },

  messages:        { flex: 1 },
  messagesContent: { padding: 16, gap: 10 },

  msgRow:          { flexDirection: 'row' },
  msgRowUser:      { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '85%', borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleUser:      { backgroundColor: COLORS.brand, borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  bubbleLoading:   { paddingVertical: 12, paddingHorizontal: 16 },
  bubbleText:      { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  bubbleTextUser:  { color: '#fff' },

  msgImage: { width: '100%', height: 150, borderRadius: 12, marginBottom: 8 },

  navigateLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  navigateLinkText: { fontSize: 12, fontWeight: '600', color: COLORS.brand },

  remainingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: COLORS.card,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  remainingText: { fontSize: 11, color: COLORS.muted },

  suggestions: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  suggestionBtn: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  suggestionText: { fontSize: 12, color: COLORS.muted },

  previewRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: 16, paddingTop: 8,
  },
  previewImg: { width: 60, height: 60, borderRadius: 10 },
  previewRemove: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.card2, justifyContent: 'center', alignItems: 'center',
  },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  imageBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  input: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 10,
    color: COLORS.text, fontSize: 14, maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: COLORS.brand, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
})
