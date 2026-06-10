import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Linking } from 'react-native'
import { Text, TextInput } from '@/components/text'
import Svg, { Path } from 'react-native-svg'
import { Link, useRouter } from 'expo-router'
import { COLORS, API_BASE_URL } from '@/lib/constants'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'
import { RookMoneyLogo } from '@/lib/logo'

function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <Path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <Path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <Path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </Svg>
  )
}

export default function RegisterScreen() {
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const router  = useRouter()

  async function handleRegister() {
    if (!name || !email || !password) { setError('Preencha todos os campos.'); return }
    if (password.length < 8)          { setError('Senha mínima de 8 caracteres.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await authApi.register(name.trim(), email.trim(), password)
      setAuth(res.token, res.user)
      router.replace('/(tabs)')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleLogin() {
    Linking.openURL('https://rookmoney.com/api/auth/google?mobile=1')
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.header}>
          <RookMoneyLogo width={200} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>É grátis. Comece hoje.</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Google first — quickest path */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleLogin}
            activeOpacity={0.85}
          >
            <GoogleLogo size={18} />
            <Text style={styles.googleBtnText}>Cadastrar com Google</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou cadastre com e-mail</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input} value={name} onChangeText={setName}
              placeholder="Seu nome" placeholderTextColor={COLORS.muted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input} value={email} onChangeText={setEmail}
              placeholder="voce@exemplo.com" placeholderTextColor={COLORS.muted}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input} value={password} onChangeText={setPassword}
              placeholder="Mínimo 8 caracteres" placeholderTextColor={COLORS.muted}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister} disabled={loading} activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Criar conta grátis</Text>
            }
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem conta? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Entrar</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: COLORS.border,
  },
  title:    { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  subtitle: { fontSize: 13, color: COLORS.muted, marginBottom: 20 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    padding: 12, marginBottom: 16,
  },
  errorText: { color: COLORS.danger, fontSize: 13 },
  googleBtn: {
    height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.card2, marginBottom: 4,
  },
  googleBtnText: { color: COLORS.text, fontWeight: '500', fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.muted, fontSize: 11, marginHorizontal: 10 },
  field:  { marginBottom: 14 },
  label:  { fontSize: 13, fontWeight: '500', color: COLORS.text, marginBottom: 6 },
  input: {
    height: 48, backgroundColor: COLORS.card2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, color: COLORS.text, fontSize: 15,
  },
  btn: {
    height: 50, backgroundColor: COLORS.brand, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  footerText: { color: COLORS.muted, fontSize: 14 },
  link: { color: COLORS.brand, fontWeight: '600', fontSize: 14 },
})
