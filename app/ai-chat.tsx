import { useState, useRef, useEffect } from 'react'
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { chatApi, meApi, type ChatMessage } from '@/lib/api'
import { ProGate } from '@/components/pro-gate'

interface DisplayMessage extends ChatMessage {
  navigate?: { path: string; reason: string } | null
}

const SUGGESTIONS = [
  'Ver meu resumo financeiro',
  'Registrar uma despesa',
  'Criar uma meta',
  'Adicionar uma conta a pagar',
]

const PAGE_MAP: Record<string, { label: string; path: string }> = {
  '/dashboard':    { label: 'Início',        path: '/' },
  '/transactions': { label: 'Extratos',      path: '/transactions' },
  '/goals':        { label: 'Metas',         path: '/goals' },
  '/bills':        { label: 'Contas',        path: '/bills' },
  '/budget':       { label: 'Orçamento',     path: '/budget' },
  '/reports':      { label: 'Relatórios',    path: '/reports' },
  '/people':       { label: 'Pessoas',       path: '/people' },
  '/categories':   { label: 'Categorias',    path: '/categories' },
  '/recurring':    { label: 'Recorrências',  path: '/recurring' },
  '/income':       { label: 'Rendas',        path: '/income' },
  '/settings':     { label: 'Configurações', path: '/settings' },
}

export default function AiChatScreen() {
  const router    = useRouter()
  const scrollRef = useRef<ScrollView>(null)

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then(r => r.data),
  })
  const isPro = me?.plan === 'PRO'

  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      role:    'assistant',
      content: 'Olá! 👋 Sou o Rook, seu assistente financeiro. Posso registrar transações, criar metas, adicionar contas e muito mais. Como posso ajudar?',
    },
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [messages, loading])

  async function send(text: string) {
    if (!text.trim() || loading) return

    const userMsg: DisplayMessage = { role: 'user', content: text.trim() }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    try {
      const apiMessages = history.map(m => ({ role: m.role, content: m.content }))
      const res = await chatApi.send(apiMessages)
      setMessages(prev => [...prev, { role: 'assistant', content: res.message, navigate: res.navigate }])
    } catch (e) {
      const code    = e instanceof Error ? e.message : ''
      const content = code === 'rate_limited'
        ? '⏳ Você atingiu o limite de mensagens da IA este mês. Tente novamente mais tarde.'
        : 'Ops, ocorreu um erro. Tente novamente. 😅'
      setMessages(prev => [...prev, { role: 'assistant', content }])
    } finally {
      setLoading(false)
    }
  }

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
            <Text style={styles.headerTitle}>Rook</Text>
            <Text style={styles.headerSubtitle}>Assistente financeiro</Text>
          </View>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {me && !isPro ? (
        <ProGate
          feature="Assistente Rook (IA)"
          description="Converse com o Rookinho para registrar transações, criar metas, cadastrar contas e muito mais — exclusivo do plano Pro."
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

          {/* Suggestions */}
          {messages.length === 1 && (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map(s => (
                <TouchableOpacity key={s} style={styles.suggestionBtn} onPress={() => send(s)} activeOpacity={0.8}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Digite sua mensagem..."
              placeholderTextColor={COLORS.muted}
              value={input}
              onChangeText={setInput}
              editable={!loading}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => send(input)}
              disabled={!input.trim() || loading}
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

  navigateLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  navigateLinkText: { fontSize: 12, fontWeight: '600', color: COLORS.brand },

  suggestions: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  suggestionBtn: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  suggestionText: { fontSize: 12, color: COLORS.muted },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
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
