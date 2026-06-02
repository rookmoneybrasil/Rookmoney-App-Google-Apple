import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { meApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

export default function SettingsScreen() {
  const router    = useRouter()
  const qc        = useQueryClient()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const storeUser = useAuthStore((s) => s.user)

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then((r) => r.data),
  })

  const user = data ?? storeUser

  const initials = (user?.name ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  function handleLogout() {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            clearAuth()
            router.replace('/(auth)/login')
          },
        },
      ]
    )
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
          onPress: () => {
            // TODO: call delete account API
            Alert.alert('Em breve', 'Esta funcionalidade estará disponível em breve.')
          },
        },
      ]
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
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
            {user?.plan === 'PRO' ? (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>⚡ PRO</Text>
              </View>
            ) : (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Plano Free</Text>
              </View>
            )}
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
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Plano</Text>
                <Text style={[styles.infoValue, user?.plan === 'PRO' && { color: COLORS.warning }]}>
                  {user?.plan === 'PRO' ? 'PRO ⚡' : 'Free'}
                </Text>
              </View>
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
              <TouchableOpacity style={styles.dangerRow} onPress={handleDeleteAccount}>
                <Feather name="trash-2" size={18} color={COLORS.danger} />
                <Text style={styles.dangerText}>Excluir minha conta</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.version}>Rook Money v1.0.0</Text>
        </>
      )}
    </ScrollView>
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

  avatarSection: { alignItems: 'center', marginBottom: 32, paddingTop: 12 },
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
  freeBadge:    {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: COLORS.card2, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  freeBadgeText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },

  section:      { marginBottom: 20, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  infoLabel: { fontSize: 14, color: COLORS.muted },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  divider:   { height: 1, backgroundColor: COLORS.border, marginLeft: 16 },

  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  dangerText: { fontSize: 14, fontWeight: '500', color: COLORS.danger },

  version: { textAlign: 'center', fontSize: 12, color: COLORS.muted2, marginTop: 12, paddingBottom: 20 },
})
