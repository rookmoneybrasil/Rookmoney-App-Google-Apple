import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, Linking, ActivityIndicator, Share } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { settingsApi, exportApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function MenuItem({
  icon, label, value, onPress, danger,
}: {
  icon: IoniconsName; label: string; value?: string; onPress?: () => void; danger?: boolean
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? 'rgba(239,68,68,0.12)' : COLORS.brandDim }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.danger : COLORS.brand} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: COLORS.danger }]}>{label}</Text>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={COLORS.muted2} />
      </View>
    </TouchableOpacity>
  )
}

// ── Alterar senha ─────────────────────────────────────────────────────────────

function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      if (!current || !next || !confirm) throw new Error('Preencha todos os campos.')
      if (next.length < 8)              throw new Error('Nova senha deve ter no mínimo 8 caracteres.')
      if (next !== confirm)             throw new Error('As senhas não coincidem.')
      return settingsApi.changePassword(current, next)
    },
    onSuccess: () => {
      Alert.alert('Sucesso', 'Senha alterada com sucesso.')
      onClose()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>Alterar senha</Text>

      <Text style={styles.label}>Senha atual</Text>
      <TextInput
        style={styles.input}
        value={current}
        onChangeText={setCurrent}
        placeholder="••••••••"
        placeholderTextColor={COLORS.muted}
        secureTextEntry
      />

      <Text style={styles.label}>Nova senha</Text>
      <TextInput
        style={styles.input}
        value={next}
        onChangeText={setNext}
        placeholder="Mínimo 8 caracteres"
        placeholderTextColor={COLORS.muted}
        secureTextEntry
      />

      <Text style={styles.label}>Confirmar nova senha</Text>
      <TextInput
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Repita a nova senha"
        placeholderTextColor={COLORS.muted}
        secureTextEntry
      />

      <View style={styles.sheetActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          <Text style={styles.saveBtnText}>
            {mutation.isPending ? 'Salvando...' : 'Alterar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Notificações ──────────────────────────────────────────────────────────────

function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['settings-prefs'],
    queryFn:  () => settingsApi.getPrefs().then((r) => r.data),
  })

  const [billReminder,  setBillReminder]  = useState<boolean | null>(null)
  const [catLimit,      setCatLimit]      = useState<boolean | null>(null)
  const [monthlyEmail,  setMonthlyEmail]  = useState<boolean | null>(null)

  // Init from server once loaded
  const billVal    = billReminder  ?? data?.notifBillReminder  ?? true
  const catVal     = catLimit      ?? data?.notifCategoryLimit ?? true
  const monthlyVal = monthlyEmail  ?? data?.notifMonthlyEmail  ?? true

  const mutation = useMutation({
    mutationFn: () => settingsApi.updateNotifications({
      notifBillReminder:  billVal,
      notifCategoryLimit: catVal,
      notifMonthlyEmail:  monthlyVal,
    }),
    onSuccess: () => {
      Alert.alert('Salvo', 'Preferências de notificação atualizadas.')
      onClose()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>Notificações</Text>

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginVertical: 24 }} />
      ) : (
        <>
          <View style={styles.notifRow}>
            <View style={styles.notifInfo}>
              <Text style={styles.notifLabel}>Lembrete de conta</Text>
              <Text style={styles.notifSub}>Aviso antes do vencimento</Text>
            </View>
            <Switch
              value={billVal}
              onValueChange={setBillReminder}
              trackColor={{ false: COLORS.muted2, true: COLORS.brand }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.notifDivider} />

          <View style={styles.notifRow}>
            <View style={styles.notifInfo}>
              <Text style={styles.notifLabel}>Limite de categoria</Text>
              <Text style={styles.notifSub}>Quando o orçamento estourar</Text>
            </View>
            <Switch
              value={catVal}
              onValueChange={setCatLimit}
              trackColor={{ false: COLORS.muted2, true: COLORS.brand }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.notifDivider} />

          <View style={styles.notifRow}>
            <View style={styles.notifInfo}>
              <Text style={styles.notifLabel}>Resumo mensal</Text>
              <Text style={styles.notifSub}>Email com o resumo do mês</Text>
            </View>
            <Switch
              value={monthlyVal}
              onValueChange={setMonthlyEmail}
              trackColor={{ false: COLORS.muted2, true: COLORS.brand }}
              thumbColor="#fff"
            />
          </View>
        </>
      )}

      <View style={styles.sheetActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending || isLoading}
        >
          <Text style={styles.saveBtnText}>
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function SettingsTabScreen() {
  const user      = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const router    = useRouter()

  const [showPassword,  setShowPassword]  = useState(false)
  const [showNotif,     setShowNotif]     = useState(false)
  const [exporting,     setExporting]     = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const res = await exportApi.get()
      await Share.share({
        message: JSON.stringify(res.data, null, 2),
        title:   'Rook Money — exportação de dados',
      })
    } catch {
      // share dismissed
    } finally {
      setExporting(false)
    }
  }

  const initials = (user?.name ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  function handleLogout() {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: () => { clearAuth(); router.replace('/(auth)/login') },
      },
    ])
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {user?.plan === 'PRO' && (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>⚡ PRO</Text>
            </View>
          )}
        </View>

        {/* Conta */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CONTA</Text>
          <View style={styles.card}>
            <MenuItem
              icon="person-outline"
              label="Perfil"
              onPress={() => router.push('/settings')}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="lock-closed-outline"
              label="Alterar senha"
              onPress={() => setShowPassword(true)}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="star-outline"
              label="Plano"
              value={user?.plan === 'PRO' ? 'PRO ⚡' : 'Free'}
              onPress={() => router.push('/billing')}
            />
          </View>
        </View>

        {/* App */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>APP</Text>
          <View style={styles.card}>
            <MenuItem
              icon="notifications-outline"
              label="Notificações"
              onPress={() => setShowNotif(true)}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="help-circle-outline"
              label="Suporte & Feedback"
              onPress={() => router.push('/feedback')}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="download-outline"
              label={exporting ? 'Exportando...' : 'Exportar meus dados'}
              onPress={handleExport}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="globe-outline"
              label="Abrir versão web"
              onPress={() => Linking.openURL('https://app.rookmoney.com')}
            />
          </View>
        </View>

        {/* Sair */}
        <View style={styles.section}>
          <View style={styles.card}>
            <MenuItem icon="log-out-outline" label="Sair da conta" onPress={handleLogout} danger />
          </View>
        </View>

        <Text style={styles.version}>Rook Money v1.0.0</Text>
      </ScrollView>

      {showPassword && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setShowPassword(false)} />
          <ChangePasswordSheet onClose={() => setShowPassword(false)} />
        </View>
      )}

      {showNotif && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setShowNotif(false)} />
          <NotificationsSheet onClose={() => setShowNotif(false)} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  avatarText:  { fontSize: 26, fontWeight: '700', color: '#fff' },
  userName:    { fontSize: 18, fontWeight: '700', color: COLORS.text },
  userEmail:   { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  proBadge:    {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  proBadgeText: { color: COLORS.warning, fontSize: 12, fontWeight: '700' },

  section:      { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  menuItem:  { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuIcon:  { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { fontSize: 13, color: COLORS.muted },
  divider:   { height: 1, backgroundColor: COLORS.border, marginLeft: 62 },

  version: { textAlign: 'center', fontSize: 12, color: COLORS.muted2, marginTop: 12 },

  // Overlay + sheet
  overlay:    { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  overlayBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.muted2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:  { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 16 },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.card2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },

  sheetActions:  { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn:     { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: 15 },
  saveBtn:       { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.brand, alignItems: 'center' },
  saveBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Notifications
  notifRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  notifInfo:    { flex: 1 },
  notifLabel:   { fontSize: 14, fontWeight: '500', color: COLORS.text },
  notifSub:     { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  notifDivider: { height: 1, backgroundColor: COLORS.border },
})
