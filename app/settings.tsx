import { useState, useEffect } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Switch, Image, Share, Linking } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { meApi, settingsApi, exportApi, pushTokenApi, type MeData, type SettingsData } from '@/lib/api'
import type * as NotificationsType from 'expo-notifications'
import Constants from 'expo-constants'
import { useAuthStore } from '@/lib/auth'

const isExpoGo = Constants.appOwnership === 'expo'
const Notifications: typeof NotificationsType | null = isExpoGo
  ? null
  : (require('expo-notifications') as typeof NotificationsType)
import { isHapticsEnabled, setHapticsEnabled } from '@/lib/haptics'

const SANDBOX_NUMBER = '+1 415 523 8886'

const CURRENCIES = [
  { value: 'BRL', label: 'R$ BRL' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
]

const DATE_FORMATS = [
  { value: 'dd/MM/yyyy', label: '31/12/2025' },
  { value: 'MM/dd/yyyy', label: '12/31/2025' },
  { value: 'yyyy-MM-dd', label: '2025-12-31' },
]

function initialsOf(name?: string) {
  return (name ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// ── Limite de uso (com suporte a "ilimitado") ──────────────────────────────

function LimitRow({ used, limit, label }: { used: number; limit: number | null; label: string }) {
  if (limit === null) {
    return (
      <View style={styles.limitRow}>
        <Text style={styles.limitLabel}>{label}</Text>
        <Text style={styles.limitValue}>
          {used} <Text style={styles.limitUnlimited}>/ ilimitado</Text>
        </Text>
      </View>
    )
  }
  const pct   = Math.min(Math.round((used / limit) * 100), 100)
  const color = pct >= 90 ? COLORS.danger : pct >= 70 ? COLORS.warning : COLORS.brand

  return (
    <View style={{ gap: 4 }}>
      <View style={styles.limitRow}>
        <Text style={styles.limitLabel}>{label}</Text>
        <Text style={[styles.limitValue, pct >= 70 && { color }]}>{used} / {limit}</Text>
      </View>
      <View style={styles.limitTrack}>
        <View style={[styles.limitFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

// ── Editar perfil ───────────────────────────────────────────────────────────

function EditProfileSheet({ user, settings, onClose }: { user: MeData; settings?: SettingsData; onClose: () => void }) {
  const qc         = useQueryClient()
  const authUpdate = useAuthStore((s) => s.updateUser)

  const [name,         setName]         = useState(user.name)
  const [profileImage, setProfileImage] = useState(user.profileImage ?? '')
  const [city,         setCity]         = useState(user.city ?? '')
  const [occupation,   setOccupation]   = useState(user.occupation ?? '')
  const [birthdate,    setBirthdate]    = useState(settings?.birthdate ? settings.birthdate.split('T')[0] : '')
  const [bio,          setBio]          = useState(user.bio ?? '')

  const mutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('Nome é obrigatório')
      if (birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
        throw new Error('Data de nascimento deve estar no formato AAAA-MM-DD')
      }
      return settingsApi.update({
        name:         name.trim(),
        profileImage: profileImage.trim() || undefined,
        city:         city.trim() || undefined,
        occupation:   occupation.trim() || undefined,
        birthdate:    birthdate || undefined,
        bio:          bio.trim() || undefined,
      })
    },
    onSuccess: () => {
      authUpdate({ name: name.trim() })
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['settings-prefs'] })
      onClose()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  return (
    <View style={[styles.sheet, { maxHeight: '88%' }]}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>Editar perfil</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.avatarEditRow}>
          <View style={styles.avatarEditPreview}>
            {profileImage
              ? <Image source={{ uri: profileImage }} style={styles.avatarImg} />
              : <Text style={styles.avatarEditText}>{initialsOf(name)}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Foto de perfil (URL)</Text>
            <TextInput
              style={styles.input}
              value={profileImage}
              onChangeText={setProfileImage}
              placeholder="https://..."
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Seu nome"
          placeholderTextColor={COLORS.muted}
          maxLength={100}
        />

        <View style={styles.fieldRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Cidade (opcional)</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Ex: São Paulo"
              placeholderTextColor={COLORS.muted}
              maxLength={80}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Profissão (opcional)</Text>
            <TextInput
              style={styles.input}
              value={occupation}
              onChangeText={setOccupation}
              placeholder="Ex: Designer"
              placeholderTextColor={COLORS.muted}
              maxLength={80}
            />
          </View>
        </View>

        <Text style={styles.label}>Data de nascimento (AAAA-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={birthdate}
          onChangeText={setBirthdate}
          placeholder="1990-12-31"
          placeholderTextColor={COLORS.muted}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />

        <Text style={styles.label}>Bio (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Uma frase sobre você"
          placeholderTextColor={COLORS.muted}
          maxLength={160}
          multiline
        />
      </ScrollView>

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
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Alterar senha ─────────────────────────────────────────────────────────

function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next,    setNext]    = useState('')
  const [confirm, setConfirm] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      if (!current.trim())  throw new Error('Senha atual é obrigatória')
      if (next.length < 8)  throw new Error('Nova senha deve ter ao menos 8 caracteres')
      if (next !== confirm) throw new Error('As senhas não coincidem')
      return settingsApi.changePassword(current, next)
    },
    onSuccess: () => {
      Alert.alert('Senha alterada', 'Sua senha foi atualizada com sucesso.')
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
        placeholder="Senha atual"
        placeholderTextColor={COLORS.muted}
        secureTextEntry
        autoFocus
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
        placeholder="Repetir nova senha"
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
          <Text style={styles.saveBtnText}>{mutation.isPending ? 'Salvando...' : 'Alterar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Tela principal ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router     = useRouter()
  const qc         = useQueryClient()
  const clearAuth  = useAuthStore((s) => s.clearAuth)
  const storeUser  = useAuthStore((s) => s.user)

  const [editing,          setEditing]          = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [whatsappInput,    setWhatsappInput]    = useState('')
  const [exporting,        setExporting]        = useState(false)

  const [notifBillReminder,  setNotifBillReminder]  = useState<boolean | null>(null)
  const [notifCategoryLimit, setNotifCategoryLimit] = useState<boolean | null>(null)
  const [notifMonthlyEmail,  setNotifMonthlyEmail]  = useState<boolean | null>(null)
  const [pushEnabled,        setPushEnabled]        = useState<boolean | null>(null)
  const [currency,           setCurrency]           = useState<string | null>(null)
  const [dateFormat,         setDateFormat]         = useState<string | null>(null)
  const [hapticsOn,          setHapticsOn]          = useState(isHapticsEnabled())

  // Load push permission state on mount
  useEffect(() => {
    Notifications?.getPermissionsAsync().then((p) => setPushEnabled((p as { status: string }).status === 'granted'))
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then((r) => r.data),
  })

  const { data: settings } = useQuery({
    queryKey: ['settings-prefs'],
    queryFn:  () => settingsApi.getPrefs().then((r) => r.data),
  })

  const user = data ?? (storeUser as unknown as MeData | null)
  const isPro = user?.plan === 'PRO' || user?.plan === 'PRO_PLUS'

  const billReminderVal  = notifBillReminder  ?? settings?.notifBillReminder  ?? true
  const categoryLimitVal = notifCategoryLimit ?? settings?.notifCategoryLimit ?? true
  const monthlyEmailVal  = notifMonthlyEmail  ?? settings?.notifMonthlyEmail  ?? false
  const currencyVal      = currency   ?? settings?.currency   ?? 'BRL'
  const dateFormatVal    = dateFormat ?? settings?.dateFormat ?? 'dd/MM/yyyy'

  const hasGoogle   = settings?.hasGoogle ?? false
  const hasPassword = !hasGoogle

  const notifMutation = useMutation({
    mutationFn: (body: { notifBillReminder?: boolean; notifCategoryLimit?: boolean; notifMonthlyEmail?: boolean }) =>
      settingsApi.updateNotifications(body),
    onError: () => {
      qc.invalidateQueries({ queryKey: ['settings-prefs'] })
      Alert.alert('Erro', 'Não foi possível salvar a preferência.')
    },
  })

  const prefsMutation = useMutation({
    mutationFn: (body: { currency?: string; dateFormat?: string }) => settingsApi.updatePreferences(body),
    onError: () => {
      qc.invalidateQueries({ queryKey: ['settings-prefs'] })
      Alert.alert('Erro', 'Não foi possível salvar a preferência.')
    },
  })

  const whatsappMutation = useMutation({
    mutationFn: (phone: string) => settingsApi.update({ whatsappPhone: phone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-prefs'] })
      setWhatsappInput('')
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const disconnectGoogleMutation = useMutation({
    mutationFn: settingsApi.disconnectGoogle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-prefs'] }),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: settingsApi.delete,
    onSuccess: () => {
      qc.clear()
      clearAuth()
      router.replace('/(auth)/login')
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  function toggleNotif(key: 'notifBillReminder' | 'notifCategoryLimit' | 'notifMonthlyEmail', val: boolean) {
    if (key === 'notifBillReminder')  setNotifBillReminder(val)
    if (key === 'notifCategoryLimit') setNotifCategoryLimit(val)
    if (key === 'notifMonthlyEmail')  setNotifMonthlyEmail(val)
    notifMutation.mutate({ [key]: val })
  }

  async function togglePush(val: boolean) {
    setPushEnabled(val)
    if (val) {
      if (!Notifications) {
        Alert.alert('Indisponível', 'Notificações push não estão disponíveis neste ambiente.')
        setPushEnabled(false)
        return
      }
      const { status } = await Notifications.requestPermissionsAsync() as { status: string }
      if (status !== 'granted') {
        setPushEnabled(false)
        Alert.alert(
          'Permissão necessária',
          'Ative as notificações do app nas configurações do sistema.',
          [{ text: 'OK' }],
        )
        return
      }
      try {
        const token = (await Notifications.getExpoPushTokenAsync({
          projectId: '158da268-5531-48b4-a07f-a4e383f34a9d',
        })).data
        await pushTokenApi.register(token)
      } catch (e) {
        console.warn('[push] register failed:', e)
      }
    } else {
      await pushTokenApi.unregister().catch(() => {})
    }
  }

  function savePrefs(next: { currency?: string; dateFormat?: string }) {
    if (next.currency)   setCurrency(next.currency)
    if (next.dateFormat) setDateFormat(next.dateFormat)
    prefsMutation.mutate(next)
  }

  function handleDisconnectGoogle() {
    Alert.alert('Desconectar Google', 'Você ainda poderá entrar com e-mail e senha.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desconectar', style: 'destructive', onPress: () => disconnectGoogleMutation.mutate() },
    ])
  }

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

  function handleLogout() {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          clearAuth()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Excluir conta',
      'Esta ação é irreversível. Todos os seus dados serão removidos permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir minha conta',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    )
  }

  const displayWhatsapp = settings?.whatsappPhone
    ? settings.whatsappPhone.replace(/^\+55/, '').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
    : null

  const since = settings?.createdAt
    ? new Date(settings.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '—'

  const initials = initialsOf(user?.name)

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/more')}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Configurações</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={styles.pageSubtitle}>Gerencie sua conta e preferências</Text>

        {isLoading ? (
          <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Profile */}
            <View style={styles.avatarSection}>
              <View style={styles.avatar}>
                {user?.profileImage
                  ? <Image source={{ uri: user.profileImage }} style={styles.avatarImg} />
                  : <Text style={styles.avatarText}>{initials}</Text>}
              </View>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              {user?.bio ? <Text style={styles.userBio}>{user.bio}</Text> : null}
              {isPro ? (
                <View style={styles.proBadge}>
                  <MaterialCommunityIcons name="crown" size={12} color={COLORS.warning} />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              ) : (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>Plano Free</Text>
                </View>
              )}
              <TouchableOpacity style={styles.editProfileBtn} onPress={() => setEditing(true)}>
                <Feather name="edit-2" size={14} color={COLORS.brand} />
                <Text style={styles.editProfileText}>Editar perfil</Text>
              </TouchableOpacity>
            </View>

            {/* CONTA */}
            <Text style={styles.sectionLabel}>CONTA</Text>

            <View style={styles.section}>
              <View style={styles.cardHeader}>
                <Feather name="lock" size={15} color={COLORS.muted} />
                <Text style={styles.cardHeaderTitle}>Segurança</Text>
              </View>
              <View style={styles.card}>
                <TouchableOpacity style={styles.actionRow} onPress={() => setChangingPassword(true)}>
                  <Feather name="key" size={18} color={COLORS.text} />
                  <Text style={styles.actionText}>Alterar senha</Text>
                  <Feather name="chevron-right" size={16} color={COLORS.muted2} />
                </TouchableOpacity>

                <View style={styles.divider} />

                <View style={styles.connectionsBlock}>
                  <Text style={styles.connectionsLabel}>Conexões</Text>
                  <View style={styles.connectionRow}>
                    <View style={styles.connectionIcon}>
                      <FontAwesome name="google" size={16} color={COLORS.text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.connectionName}>Google</Text>
                      <View style={styles.connectionStatusRow}>
                        {hasGoogle ? (
                          <>
                            <Feather name="check-circle" size={11} color={COLORS.success} />
                            <Text style={[styles.connectionStatusText, { color: COLORS.success }]}>Conectado</Text>
                          </>
                        ) : (
                          <>
                            <Feather name="x-circle" size={11} color={COLORS.muted2} />
                            <Text style={styles.connectionStatusText}>Não conectado</Text>
                          </>
                        )}
                      </View>
                    </View>
                    {hasGoogle && (
                      <TouchableOpacity
                        style={[styles.disconnectBtn, !hasPassword && { opacity: 0.4 }]}
                        onPress={handleDisconnectGoogle}
                        disabled={!hasPassword || disconnectGoogleMutation.isPending}
                      >
                        <Text style={styles.disconnectBtnText}>
                          {disconnectGoogleMutation.isPending ? '...' : 'Desconectar'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {hasGoogle && !hasPassword && (
                    <Text style={styles.connectionNote}>
                      Configure uma senha acima para poder desconectar o Google.
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.cardHeader}>
                <Feather name="message-circle" size={15} color={COLORS.success} />
                <Text style={styles.cardHeaderTitle}>WhatsApp</Text>
              </View>
              <View style={styles.card}>
                <View style={{ padding: 16, gap: 12 }}>
                  {displayWhatsapp ? (
                    <>
                      <View style={styles.whatsappLinked}>
                        <Feather name="check-circle" size={16} color={COLORS.success} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.whatsappLinkedTitle}>WhatsApp vinculado</Text>
                          <Text style={styles.whatsappLinkedNumber}>{displayWhatsapp}</Text>
                        </View>
                      </View>
                      <View style={styles.whatsappBox}>
                        <Text style={styles.whatsappBoxTitle}>Como usar</Text>
                        <Text style={styles.whatsappBoxItem}>1. Abra o WhatsApp e fale com {SANDBOX_NUMBER}</Text>
                        <Text style={styles.whatsappBoxItem}>2. Tire uma foto do comprovante e envie</Text>
                        <Text style={styles.whatsappBoxItem}>3. O Rook lê e salva automaticamente ✅</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => whatsappMutation.mutate('')}
                        disabled={whatsappMutation.isPending}
                      >
                        <View style={styles.whatsappUnlinkRow}>
                          <Feather name="trash-2" size={13} color={COLORS.danger} />
                          <Text style={styles.whatsappUnlinkText}>
                            {whatsappMutation.isPending ? 'Removendo...' : 'Desvincular número'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={styles.whatsappBox}>
                        <Text style={styles.whatsappBoxTitle}>Como funciona</Text>
                        <Text style={styles.whatsappBoxItem}>1. Vincule seu número abaixo</Text>
                        <Text style={styles.whatsappBoxItem}>2. Salve o número do Rook no WhatsApp</Text>
                        <Text style={styles.whatsappBoxItem}>3. Mande foto de qualquer comprovante</Text>
                        <Text style={styles.whatsappBoxItem}>4. O Rook lê e registra automaticamente 🪄</Text>
                      </View>
                      <Text style={styles.label}>Seu número de WhatsApp</Text>
                      <TextInput
                        style={styles.input}
                        value={whatsappInput}
                        onChangeText={setWhatsappInput}
                        placeholder="(11) 99999-9999"
                        placeholderTextColor={COLORS.muted}
                        keyboardType="phone-pad"
                      />
                      <TouchableOpacity
                        style={[styles.primaryBtn, !whatsappInput.trim() && { opacity: 0.5 }]}
                        onPress={() => whatsappMutation.mutate(whatsappInput.trim())}
                        disabled={whatsappMutation.isPending || !whatsappInput.trim()}
                      >
                        {whatsappMutation.isPending
                          ? <ActivityIndicator color="#fff" />
                          : <Text style={styles.primaryBtnText}>Vincular WhatsApp</Text>}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* PREFERÊNCIAS */}
            <Text style={styles.sectionLabel}>PREFERÊNCIAS</Text>

            <View style={styles.section}>
              <View style={styles.cardHeader}>
                <Feather name="bell" size={15} color={COLORS.warning} />
                <Text style={styles.cardHeaderTitle}>Notificações</Text>
              </View>
              <View style={styles.card}>
                <View style={styles.notifRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifLabel}>Lembrete de contas</Text>
                    <Text style={styles.notifSub}>Aviso 3 dias antes do vencimento</Text>
                  </View>
                  <Switch
                    value={billReminderVal}
                    onValueChange={(v) => toggleNotif('notifBillReminder', v)}
                    trackColor={{ false: COLORS.muted2, true: COLORS.brand }}
                    thumbColor="#fff"
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.notifRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifLabel}>Limite de orçamento</Text>
                    <Text style={styles.notifSub}>Quando atingir 80% de uma categoria</Text>
                  </View>
                  <Switch
                    value={categoryLimitVal}
                    onValueChange={(v) => toggleNotif('notifCategoryLimit', v)}
                    trackColor={{ false: COLORS.muted2, true: COLORS.brand }}
                    thumbColor="#fff"
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.notifRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifLabel}>Push notifications</Text>
                    <Text style={styles.notifSub}>Alertas no celular mesmo com app fechado</Text>
                  </View>
                  <Switch
                    value={pushEnabled ?? false}
                    onValueChange={togglePush}
                    trackColor={{ false: COLORS.muted2, true: COLORS.brand }}
                    thumbColor="#fff"
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.notifRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifLabel}>Resumo mensal por e-mail</Text>
                    <Text style={styles.notifSub}>Relatório financeiro todo dia 1</Text>
                  </View>
                  <Switch
                    value={monthlyEmailVal}
                    onValueChange={(v) => toggleNotif('notifMonthlyEmail', v)}
                    trackColor={{ false: COLORS.muted2, true: COLORS.brand }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="palette" size={15} color="#a78bfa" />
                <Text style={styles.cardHeaderTitle}>Aparência e formato</Text>
              </View>
              <View style={styles.card}>
                <View style={{ padding: 16, gap: 16 }}>
                  <View>
                    <Text style={styles.label}>Moeda padrão</Text>
                    <View style={styles.chipRow}>
                      {CURRENCIES.map((c) => (
                        <TouchableOpacity
                          key={c.value}
                          style={[styles.chip, currencyVal === c.value && styles.chipActive]}
                          onPress={() => savePrefs({ currency: c.value })}
                        >
                          <Text style={[styles.chipText, currencyVal === c.value && styles.chipTextActive]}>{c.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View>
                    <Text style={styles.label}>Formato de data</Text>
                    <View style={styles.chipRow}>
                      {DATE_FORMATS.map((d) => (
                        <TouchableOpacity
                          key={d.value}
                          style={[styles.chip, dateFormatVal === d.value && styles.chipActive]}
                          onPress={() => savePrefs({ dateFormat: d.value })}
                        >
                          <Text style={[styles.chipText, dateFormatVal === d.value && styles.chipTextActive]}>{d.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.themeRow}>
                    <Feather name="moon" size={13} color={COLORS.muted} />
                    <Text style={styles.themeText}>Tema: <Text style={{ color: COLORS.muted, fontWeight: '600' }}>Escuro</Text></Text>
                    <View style={styles.themeFixedBadge}>
                      <Text style={styles.themeFixedText}>fixo</Text>
                    </View>
                  </View>

                  <View style={styles.dataDivider} />

                  <View style={styles.notifRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifLabel}>Vibração (haptics)</Text>
                      <Text style={styles.notifSub}>Feedback tátil nos botões principais</Text>
                    </View>
                    <Switch
                      value={hapticsOn}
                      onValueChange={(v) => {
                        setHapticsOn(v)
                        setHapticsEnabled(v)
                      }}
                      trackColor={{ false: COLORS.muted2, true: COLORS.brand }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* PLANO */}
            <Text style={styles.sectionLabel}>PLANO</Text>

            <View style={styles.section}>
              <View style={styles.cardHeader}>
                <Feather name="bar-chart-2" size={15} color={COLORS.brand} />
                <Text style={styles.cardHeaderTitle}>Uso e limites</Text>
              </View>
              <View style={styles.card}>
                <View style={{ padding: 16, gap: 16 }}>
                  <View style={[styles.planHeader, isPro && styles.planHeaderPro]}>
                    <View style={[styles.planHeaderIcon, isPro && styles.planHeaderIconPro]}>
                      {isPro
                        ? <MaterialCommunityIcons name="crown" size={20} color={COLORS.warning} />
                        : <Feather name="zap" size={18} color={COLORS.brand} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planHeaderTitle}>Plano {isPro ? 'PRO' : 'Gratuito'}</Text>
                      <Text style={styles.planHeaderDesc}>
                        {isPro ? 'Todos os recursos desbloqueados' : 'Até atingir os limites do plano Free'}
                      </Text>
                    </View>
                    {!isPro && (
                      <TouchableOpacity style={styles.upgradeChip} onPress={() => router.push('/billing')}>
                        <MaterialCommunityIcons name="crown" size={12} color={COLORS.warning} />
                        <Text style={styles.upgradeChipText}>Upgrade</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {user?.usage && user?.limits && (
                    <>
                      <View>
                        <Text style={styles.usageGroupLabel}>USO ESTE MÊS</Text>
                        <View style={{ gap: 10 }}>
                          <LimitRow used={user.usage.transactionsThisMonth} limit={user.limits.transactionsPerMonth} label="Transações" />
                          <LimitRow used={user.usage.bills}                 limit={user.limits.bills}                label="Contas" />
                          <LimitRow used={user.usage.goals}                 limit={user.limits.goals}                label="Metas" />
                          <LimitRow used={user.usage.people}                limit={user.limits.people}               label="Pessoas" />
                          <LimitRow used={user.usage.customCategories}      limit={user.limits.customCategories}     label="Categorias" />
                          <LimitRow used={user.usage.recurring}             limit={user.limits.recurring}            label="Recorrentes" />
                        </View>
                      </View>

                      <View>
                        <Text style={styles.usageGroupLabel}>RECURSOS</Text>
                        <View style={styles.featuresGrid}>
                          {[
                            { label: 'Relatórios',  enabled: user.limits.reports },
                            { label: 'Projeção',    enabled: user.limits.projection },
                            { label: 'Orçamento',   enabled: user.limits.budget },
                            { label: 'Importação',  enabled: user.limits.import },
                            { label: 'Chat IA',     enabled: false },
                            { label: 'Scanner',     enabled: false },
                          ].map(({ label, enabled }) => (
                            <View key={label} style={[styles.featureChip, enabled ? styles.featureChipOn : styles.featureChipOff]}>
                              <Text style={[styles.featureChipText, { color: enabled ? COLORS.success : COLORS.muted2 }]}>
                                {enabled ? '✓' : '✗'} {label}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </>
                  )}

                  {!isPro && (
                    <TouchableOpacity style={styles.viewPlansBtn} onPress={() => router.push('/billing')}>
                      <Text style={styles.viewPlansBtnText}>Ver planos e preços</Text>
                      <Feather name="arrow-right" size={15} color={COLORS.warning} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* DADOS E PRIVACIDADE */}
            <Text style={styles.sectionLabel}>DADOS E PRIVACIDADE</Text>

            <View style={styles.section}>
              <View style={styles.cardHeader}>
                <Feather name="shield" size={15} color={COLORS.muted} />
                <Text style={styles.cardHeaderTitle}>Privacidade e dados</Text>
              </View>
              <View style={styles.card}>
                <View style={{ padding: 16, gap: 16 }}>
                  <View style={styles.lgpdBox}>
                    <Feather name="shield" size={18} color={COLORS.brand} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lgpdTitle}>Seus dados, seu controle</Text>
                      <Text style={styles.lgpdText}>
                        Em conformidade com a <Text style={styles.lgpdStrong}>LGPD</Text>. Armazenamos apenas dados que você fornece.
                        Nunca vendemos informações a terceiros. Você pode exportar ou excluir tudo a qualquer momento.
                      </Text>
                    </View>
                  </View>

                  <View>
                    <Text style={styles.usageGroupLabel}>O QUE ESTÁ ARMAZENADO</Text>
                    <View style={styles.dataTable}>
                      {[
                        { label: 'Conta criada em',    value: since },
                        { label: 'Transações (mês)',    value: String(user?.usage?.transactionsThisMonth ?? 0) },
                        { label: 'Contas a pagar',      value: String(user?.usage?.bills ?? 0) },
                        { label: 'Metas ativas',        value: String(user?.usage?.goals ?? 0) },
                        { label: 'Pessoas cadastradas', value: String(user?.usage?.people ?? 0) },
                      ].map((row, i) => (
                        <View key={row.label}>
                          {i > 0 && <View style={styles.dataDivider} />}
                          <View style={styles.dataRow}>
                            <Text style={styles.dataRowLabel}>{row.label}</Text>
                            <Text style={styles.dataRowValue}>{row.value}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.privacyAction}>
                    <View style={styles.privacyActionInfo}>
                      <Feather name="file-text" size={16} color={COLORS.muted} />
                      <View>
                        <Text style={styles.privacyActionTitle}>Exportar todos os dados</Text>
                        <Text style={styles.privacyActionSub}>Backup completo em JSON</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={handleExport} disabled={exporting}>
                      {exporting
                        ? <ActivityIndicator size="small" color={COLORS.brand} />
                        : <Text style={styles.secondaryBtnText}>Exportar</Text>}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dataDivider} />

                  <View style={styles.privacyAction}>
                    <View style={styles.privacyActionInfo}>
                      <Feather name="trash-2" size={16} color={COLORS.danger} />
                      <View>
                        <Text style={[styles.privacyActionTitle, { color: COLORS.danger }]}>Excluir minha conta</Text>
                        <Text style={styles.privacyActionSub}>Remove permanentemente todos os seus dados</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount} disabled={deleteMutation.isPending}>
                      {deleteMutation.isPending
                        ? <ActivityIndicator size="small" color={COLORS.danger} />
                        : <Text style={styles.dangerBtnText}>Excluir</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={() => router.push('/changelog' as any)}>
              <Feather name="gift" size={14} color={COLORS.muted} />
              <Text style={styles.logoutText}>Atualizações</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={() => Linking.openURL('https://app.rookmoney.com')}>
              <Feather name="globe" size={14} color={COLORS.muted} />
              <Text style={styles.logoutText}>Abrir versão web</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={16} color={COLORS.muted} />
              <Text style={styles.logoutText}>Sair da conta</Text>
            </TouchableOpacity>

            <Text style={styles.version}>Rook Money v1.0.0</Text>
          </>
        )}
      </ScrollView>

      {editing && data && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setEditing(false)} />
          <EditProfileSheet user={data} settings={settings} onClose={() => setEditing(false)} />
        </View>
      )}

      {changingPassword && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setChangingPassword(false)} />
          <ChangePasswordSheet onClose={() => setChangingPassword(false)} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 40 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 4,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:   { fontSize: 20, fontWeight: '700', color: COLORS.text },
  pageSubtitle: { fontSize: 13, color: COLORS.muted, paddingHorizontal: 20, marginTop: 4, marginBottom: 8 },

  avatarSection: { alignItems: 'center', marginBottom: 24, paddingTop: 16 },
  avatar: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden',
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  avatarImg:   { width: '100%', height: '100%' },
  avatarText:  { fontSize: 26, fontWeight: '700', color: '#fff' },
  userName:    { fontSize: 18, fontWeight: '700', color: COLORS.text },
  userEmail:   { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  userBio:     { fontSize: 13, color: COLORS.muted2, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  proBadge:    {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  proBadgeText: { color: COLORS.warning, fontSize: 12, fontWeight: '700' },
  freeBadge:    {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: COLORS.card2, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  freeBadgeText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.brand,
    backgroundColor: COLORS.brandDim,
  },
  editProfileText: { fontSize: 13, color: COLORS.brand, fontWeight: '600' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, letterSpacing: 1, marginBottom: 8, marginLeft: 24, marginTop: 8 },
  section:      { marginBottom: 16, paddingHorizontal: 20 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: 4 },
  cardHeaderTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  divider:    { height: 1, backgroundColor: COLORS.border },
  dataDivider: { height: 1, backgroundColor: COLORS.border },

  actionRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  actionText: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },

  // Conexões
  connectionsBlock: { padding: 16, gap: 8 },
  connectionsLabel: { fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 4 },
  connectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  connectionIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  connectionName:  { fontSize: 14, fontWeight: '500', color: COLORS.text },
  connectionStatusRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  connectionStatusText: { fontSize: 12, color: COLORS.muted2 },
  disconnectBtn:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  disconnectBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  connectionNote: { fontSize: 11, color: COLORS.muted2, backgroundColor: COLORS.card2, borderRadius: 8, padding: 10, lineHeight: 16 },

  // WhatsApp
  whatsappLinked: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', borderRadius: 12, padding: 12 },
  whatsappLinkedTitle:  { fontSize: 13, fontWeight: '600', color: COLORS.text },
  whatsappLinkedNumber: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  whatsappBox: { backgroundColor: COLORS.card2, borderRadius: 12, padding: 12, gap: 4 },
  whatsappBoxTitle: { fontSize: 11, fontWeight: '700', color: COLORS.brand, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  whatsappBoxItem:  { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  whatsappUnlinkRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  whatsappUnlinkText: { fontSize: 12, color: COLORS.danger },

  // Inputs
  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.card2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  fieldRow: { flexDirection: 'row', gap: 12 },
  primaryBtn: {
    backgroundColor: COLORS.brand, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Aparência
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:       { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  chipTextActive: { color: '#fff' },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'flex-start' },
  themeText: { fontSize: 12, color: COLORS.muted },
  themeFixedBadge: { backgroundColor: COLORS.muted2, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  themeFixedText:  { fontSize: 9, color: COLORS.text },

  // Plano / Uso e limites
  planHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card2, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  planHeaderPro: { backgroundColor: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' },
  planHeaderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.brandDim, justifyContent: 'center', alignItems: 'center' },
  planHeaderIconPro: { backgroundColor: 'rgba(245,158,11,0.15)' },
  planHeaderTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  planHeaderDesc:  { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  upgradeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  upgradeChipText: { fontSize: 11, fontWeight: '700', color: COLORS.warning },

  usageGroupLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted2, letterSpacing: 1, marginBottom: 10 },
  limitRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  limitLabel: { fontSize: 12, color: COLORS.muted },
  limitValue: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  limitUnlimited: { fontWeight: '400', color: COLORS.muted2 },
  limitTrack: { height: 5, borderRadius: 3, backgroundColor: COLORS.card2, overflow: 'hidden' },
  limitFill:  { height: 5, borderRadius: 3 },

  featuresGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureChip:     { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, width: '47%' },
  featureChipOn:   { backgroundColor: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.2)' },
  featureChipOff:  { backgroundColor: COLORS.card2, borderColor: COLORS.border },
  featureChipText: { fontSize: 11, fontWeight: '600' },

  viewPlansBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 12, paddingVertical: 12,
  },
  viewPlansBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.warning },

  // Privacidade
  lgpdBox: { flexDirection: 'row', gap: 10, backgroundColor: COLORS.brandDim, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  lgpdTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  lgpdText:  { fontSize: 11, color: COLORS.muted, lineHeight: 16 },
  lgpdStrong: { fontWeight: '700', color: COLORS.text },

  dataTable: { backgroundColor: COLORS.card2, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  dataRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  dataRowLabel: { fontSize: 12, color: COLORS.muted },
  dataRowValue: { fontSize: 12, fontWeight: '600', color: COLORS.text },

  privacyAction:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  privacyActionInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  privacyActionTitle: { fontSize: 13, color: COLORS.text },
  privacyActionSub:   { fontSize: 11, color: COLORS.muted2, marginTop: 1 },
  secondaryBtn:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, minWidth: 80, alignItems: 'center' },
  secondaryBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  dangerBtn:        { borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, minWidth: 80, alignItems: 'center' },
  dangerBtnText:    { fontSize: 12, fontWeight: '600', color: COLORS.danger },

  logoutBtn: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24 },
  logoutText: { fontSize: 14, fontWeight: '600', color: COLORS.muted },

  version: { textAlign: 'center', fontSize: 12, color: COLORS.muted2, marginTop: 4, paddingBottom: 20 },

  // Sheet
  overlay:    { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  overlayBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.muted2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:  { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 16 },

  avatarEditRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  avatarEditPreview: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarEditText: { fontSize: 20, fontWeight: '700', color: '#fff' },

  sheetActions:  { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn:     { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: 15 },
  saveBtn:       { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.brand, alignItems: 'center' },
  saveBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Notificações
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  notifLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  notifSub:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },
})
