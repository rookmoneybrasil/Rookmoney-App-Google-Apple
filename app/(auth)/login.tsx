import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Linking } from 'react-native'
import { Text, TextInput } from '@/components/text'
import Svg, { Path } from 'react-native-svg'
import { Link, useRouter } from 'expo-router'
import * as ExpoLinking from 'expo-linking'
import { COLORS, API_BASE_URL } from '@/lib/constants'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'
import { RookMoneyLogo } from '@/lib/logo'

/** Google multicolor G logo */
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

export default function LoginScreen() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const router  = useRouter()

  async function handleLogin() {
    if (!email || !password) { setError('Preencha todos os campos.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(email.trim(), password)
      setAuth(res.token, res.user)
      router.replace('/(tabs)')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao fazer login.')
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleLogin() {
    const redirect = ExpoLinking.createURL('auth/callback')
    console.log('[Google] redirect URL:', redirect)
    const url = `https://rookmoney.com/api/auth/google?mobile=1&redirect=${encodeURIComponent(redirect)}`
    Linking.openURL(url)
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.header}>
          <RookMoneyLogo width={220} />
          <Text style={styles.tagline}>Seu dinheiro no movimento certo.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Entrar na conta</Text>
          <Text style={styles.subtitle}>Bem-vindo de volta</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="voce@exemplo.com"
              placeholderTextColor={COLORS.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Senha</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://app.rookmoney.com/forgot-password')}>
                <Text style={styles.forgotLink}>Esqueci a senha</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Entrar</Text>
            }
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google login */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleLogin}
            activeOpacity={0.85}
          >
            <GoogleLogo size={18} />
            <Text style={styles.googleBtnText}>Continuar com Google</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Não tem conta? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Criar conta grátis</Text>
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

  header: { alignItems: 'center', marginBottom: 32, gap: 10 },
  tagline: { fontSize: 13, color: COLORS.muted },

  card: {
    backgroundColor: COLORS.card, borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: COLORS.border,
  },
  title:    { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  subtitle: { fontSize: 13, color: COLORS.muted, marginBottom: 20 },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    padding: 12, marginBottom: 16,
  },
  errorText: { color: COLORS.danger, fontSize: 13 },

  field:      { marginBottom: 16 },
  labelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label:      { fontSize: 13, fontWeight: '500', color: COLORS.text },
  forgotLink: { fontSize: 12, color: COLORS.brand },
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

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.muted, fontSize: 12, marginHorizontal: 10 },

  googleBtn: {
    height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.card2, marginBottom: 20,
  },
  googleBtnText: { color: COLORS.text, fontWeight: '500', fontSize: 14 },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: COLORS.muted, fontSize: 14 },
  link: { color: COLORS.brand, fontWeight: '600', fontSize: 14 },
})
