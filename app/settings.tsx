import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { meApi, settingsApi, type MeData } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

function EditProfileSheet({ user, onClose }: { user: MeData; onClose: () => void }) {
  const qc         = useQueryClient()
  const authUpdate = useAuthStore((s) => s.updateUser)

  const [name,       setName]       = useState(user.name)
  const [bio,        setBio]        = useState(user.bio ?? '')
  const [city,       setCity]       = useState(user.city ?? '')
  const [occupation, setOccupation] = useState(user.occupation ?? '')

  const mutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('Nome é obrigatório')
      return settingsApi.update({
        name:       name.trim(),
        bio:        bio.trim() || undefined,
        city:       city.trim() || undefined,
        occupation: occupation.trim() || undefined,
      })
    },
    onSuccess: () => {
      authUpdate({ name: name.trim() })
      qc.invalidateQueries({ queryKey: ['me'] })
      onClose()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>Editar perfil</Text>

      <Text style={styles.label}>Nome *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Seu nome"
        placeholderTextColor={COLORS.muted}
        maxLength={100}
      />

      <Text style={styles.label}>Bio (opcional)</Text>
      <TextInput
        style={styles.input}
        value={bio}
        onChangeText={setBio}
        placeholder="Uma frase sobre você"
        placeholderTextColor={COLORS.muted}
        maxLength={160}
      />

      <Text style={styles.label}>Cidade (opcional)</Text>
      <TextInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
        placeholder="Ex: São Paulo"
        placeholderTextColor={COLORS.muted}
        maxLength={80}
      />

      <Text style={styles.label}>Profissão (opcional)</Text>
      <TextInput
        style={styles.input}
        value={occupation}
        onChangeText={setOccupation}
        placeholder="Ex: Designer"
        placeholderTextColor={COLORS.muted}
        maxLength={80}
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
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next,    setNext]    = useState('')
  const [confirm, setConfirm] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      if (!current.trim())        throw new Error('Senha atual é obrigatória')
      if (next.length < 8)        throw new Error('Nova senha deve ter ao menos 8 caracteres')
      if (next !== confirm)       throw new Error('As senhas não coincidem')
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

export default function SettingsScreen() {
  const router     = useRouter()
  const qc         = useQueryClient()
  const clearAuth  = useAuthStore((s) => s.clearAuth)
  const storeUser  = useAuthStore((s) => s.user)
  const [editing,          setEditing]          = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then((r) => r.data),
  })

  const user = data ?? (storeUser as unknown as MeData | null)

  const initials = (user?.name ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const deleteMutation = useMutation({
    mutationFn: settingsApi.delete,
    onSuccess: () => {
      qc.clear()
      clearAuth()
      router.replace('/(auth)/login')
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

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

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Configurações</Text>
          <View style={{ width: 36 }} />
        </View>

        {isLoading ? (
          <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Profile */}
            <View style={styles.avatarSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              {(user as MeData)?.bio ? (
                <Text style={styles.userBio}>{(user as MeData).bio}</Text>
              ) : null}
              {user?.plan === 'PRO' ? (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>⚡ PRO</Text>
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

            {/* Account info */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PERFIL</Text>
              <View style={styles.card}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nome</Text>
                  <Text style={styles.infoValue}>{user?.name}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>E-mail</Text>
                  <Text style={styles.infoValue}>{user?.email}</Text>
                </View>
                {(user as MeData)?.city ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Cidade</Text>
                      <Text style={styles.infoValue}>{(user as MeData).city}</Text>
                    </View>
                  </>
                ) : null}
                {(user as MeData)?.occupation ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Profissão</Text>
                      <Text style={styles.infoValue}>{(user as MeData).occupation}</Text>
                    </View>
                  </>
                ) : null}
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Plano</Text>
                  <Text style={[styles.infoValue, user?.plan === 'PRO' && { color: COLORS.warning }]}>
                    {user?.plan === 'PRO' ? 'PRO ⚡' : 'Free'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Account actions */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CONTA</Text>
              <View style={styles.card}>
                <TouchableOpacity style={styles.actionRow} onPress={() => setChangingPassword(true)}>
                  <Feather name="lock" size={18} color={COLORS.text} />
                  <Text style={styles.actionText}>Alterar senha</Text>
                  <Feather name="chevron-right" size={16} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Danger zone */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: COLORS.danger }]}>ZONA DE PERIGO</Text>
              <View style={styles.card}>
                <TouchableOpacity style={styles.dangerRow} onPress={handleLogout}>
                  <Feather name="log-out" size={18} color={COLORS.danger} />
                  <Text style={styles.dangerText}>Sair da conta</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={[styles.dangerRow, deleteMutation.isPending && { opacity: 0.5 }]}
                  onPress={handleDeleteAccount}
                  disabled={deleteMutation.isPending}
                >
                  <Feather name="trash-2" size={18} color={COLORS.danger} />
                  <Text style={styles.dangerText}>
                    {deleteMutation.isPending ? 'Excluindo...' : 'Excluir minha conta'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.version}>Rook Money v1.0.0</Text>
          </>
        )}
      </ScrollView>

      {editing && data && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setEditing(false)} />
          <EditProfileSheet user={data} onClose={() => setEditing(false)} />
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
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:   { fontSize: 20, fontWeight: '700', color: COLORS.text },

  avatarSection: { alignItems: 'center', marginBottom: 28, paddingTop: 12 },
  avatar: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: COLORS.brand,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: COLORS.brand, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  avatarText:  { fontSize: 26, fontWeight: '700', color: '#fff' },
  userName:    { fontSize: 18, fontWeight: '700', color: COLORS.text },
  userEmail:   { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  userBio:     { fontSize: 13, color: COLORS.muted2, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  proBadge:    {
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

  section:      { marginBottom: 20, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  infoLabel: { fontSize: 14, color: COLORS.muted },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  divider:   { height: 1, backgroundColor: COLORS.border, marginLeft: 16 },

  actionRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  actionText: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },

  dangerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  dangerText: { fontSize: 14, fontWeight: '500', color: COLORS.danger },

  version: { textAlign: 'center', fontSize: 12, color: COLORS.muted2, marginTop: 12, paddingBottom: 20 },

  // Sheet
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
})
