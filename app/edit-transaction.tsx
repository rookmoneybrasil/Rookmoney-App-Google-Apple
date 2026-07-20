import { useState, useEffect } from 'react'
import { View, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { CurrencyInput } from '@/components/currency-input'
import { DateInput } from '@/components/date-input'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { transactionsApi, categoriesApi, accountsApi, type Transaction, type Category } from '@/lib/api'

export default function EditTransactionScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [tx,          setTx]          = useState<Transaction | null>(null)
  const [type,        setType]        = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [amount,      setAmount]      = useState('')
  const [description, setDescription] = useState('')
  const [categoryId,  setCategoryId]  = useState('')
  const [accountId,   setAccountId]   = useState('')
  const [date,        setDate]        = useState('')
  const [ignored,     setIgnored]     = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    // Search all cached transaction pages for this id. The ['transactions', …]
    // queries cache the paginated envelope ({ items, total, page, totalPages }),
    // NOT a bare array — so read `.items`. Calling `.find` on the envelope object
    // throws "find is not a function" and crashes the screen on open.
    const allQueries = qc.getQueriesData<{ items: Transaction[] }>({ queryKey: ['transactions'] })
    for (const [, pageData] of allQueries) {
      const found = pageData?.items?.find((t) => t.id === id)
      if (found) {
        setTx(found)
        setType(found.type)
        setAmount(String(found.amount))
        setDescription(found.description ?? '')
        setCategoryId(found.categoryId)
        setAccountId(found.accountId ?? found.account?.id ?? '')
        setDate(found.date.slice(0, 10))
        setIgnored(!!found.ignored)
        break
      }
    }
  }, [id])

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then((r) => r.data),
  })
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn:  () => accountsApi.list().then((r) => r.data),
  })
  const accounts = accountsData?.accounts.filter(a => !a.archived) ?? []

  const mutation = useMutation({
    mutationFn: () => {
      const num = parseFloat(amount.replace(',', '.'))
      if (!num || num <= 0)  { setError('Informe um valor válido.'); throw new Error('') }
      if (!categoryId)       { setError('Selecione uma categoria.'); throw new Error('') }
      setError('')
      return transactionsApi.update(id!, {
        amount: num,
        type,
        description: description.trim() || undefined,
        date,
        categoryId,
        accountId: accountId || undefined,
        ignored,
      })
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['transactions'] })
      qc.refetchQueries({ queryKey: ['dashboard'] })
      router.back()
    },
    onError: (e: Error) => { if (e.message) Alert.alert('Erro', e.message) },
  })

  const deleteMutation = useMutation({
    mutationFn: () => transactionsApi.delete(id!),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['transactions'] })
      qc.refetchQueries({ queryKey: ['dashboard'] })
      router.back()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  function confirmDelete() {
    Alert.alert('Excluir transação', 'Remover esta transação?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ])
  }

  if (!tx) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.brand} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.handle} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Editar transação</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtn}>
              <Feather name="trash-2" size={18} color={COLORS.danger} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Feather name="x" size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Type toggle */}
        <View style={styles.typeRow}>
          {(['EXPENSE', 'INCOME'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, type === t && (t === 'EXPENSE' ? styles.expenseActive : styles.incomeActive)]}
              onPress={() => setType(t)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.typeBtnText,
                type === t && { color: t === 'EXPENSE' ? COLORS.danger : COLORS.success, fontWeight: '600' }
              ]}>
                {t === 'EXPENSE' ? '💸 Despesa' : '💰 Receita'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <View style={styles.amountBox}>
          <Text style={styles.currency}>R$</Text>
          <CurrencyInput
            style={styles.amountInput}
            value={amount}
            onChangeValue={setAmount}
            placeholder="0,00"
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Supermercado, Salário..."
            placeholderTextColor={COLORS.muted}
          />
        </View>

        {/* Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Data</Text>
          <DateInput value={date} onChange={setDate} placeholder="Selecionar data" />
        </View>

        {/* Categories */}
        <View style={styles.field}>
          <Text style={styles.label}>Categoria *</Text>
          <View style={styles.cats}>
            {categories?.map((cat: Category) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.cat, categoryId === cat.id && styles.catActive]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[styles.catName, categoryId === cat.id && styles.catNameActive]} numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {accounts.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Conta</Text>
            <View style={styles.cats}>
              {accounts.map((a) => (
                <TouchableOpacity key={a.id} style={[styles.cat, accountId === a.id && styles.catActive]} onPress={() => setAccountId(a.id)}>
                  <Text style={styles.catIcon}>{a.icon}</Text>
                  <Text style={[styles.catName, accountId === a.id && styles.catNameActive]} numberOfLines={1}>{a.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Ignorar transação */}
        <TouchableOpacity style={styles.ignoreRow} onPress={() => setIgnored(v => !v)} activeOpacity={0.8}>
          <View style={[styles.checkbox, ignored && styles.checkboxOn]}>
            {ignored && <Feather name="check" size={14} color="#fff" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ignoreTitle}>Ignorar transação</Text>
            <Text style={styles.ignoreHint}>Não soma no saldo das contas nem nos totais/relatórios.</Text>
          </View>
        </TouchableOpacity>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.saveBtn,
            type === 'INCOME' ? styles.saveBtnIncome : styles.saveBtnExpense,
            mutation.isPending && styles.saveBtnDisabled,
          ]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
          activeOpacity={0.85}
        >
          {mutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Salvar alterações</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.card },
  handle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.muted2, alignSelf: 'center', marginTop: 12 },
  content: { padding: 20, paddingBottom: 40 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:       { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteBtn:   { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.1)', justifyContent: 'center', alignItems: 'center' },
  closeBtn:    { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.card2, justifyContent: 'center', alignItems: 'center' },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  expenseActive: { borderColor: COLORS.danger,  backgroundColor: 'rgba(239,68,68,0.1)' },
  incomeActive:  { borderColor: COLORS.success, backgroundColor: 'rgba(34,197,94,0.1)'  },
  typeBtnText:   { fontSize: 14, color: COLORS.muted },

  amountBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center', marginBottom: 28,
  },
  currency:    { fontSize: 28, fontWeight: '300', color: COLORS.muted },
  amountInput: { fontSize: 48, fontWeight: '700', color: COLORS.text, minWidth: 120, textAlign: 'center' },

  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '500', color: COLORS.text, marginBottom: 6 },
  input: {
    height: 46, backgroundColor: COLORS.card2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, color: COLORS.text, fontSize: 14,
  },

  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
  },
  catActive:     { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  catIcon:       { fontSize: 16 },
  catName:       { fontSize: 12, color: COLORS.muted, maxWidth: 70 },
  catNameActive: { color: COLORS.brand },

  ignoreRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 18,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: COLORS.muted, justifyContent: 'center', alignItems: 'center',
  },
  checkboxOn:  { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  ignoreTitle: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  ignoreHint:  { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    padding: 12, marginBottom: 16,
  },
  errorText: { color: COLORS.danger, fontSize: 13 },

  saveBtn: {
    height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  saveBtnExpense:  { backgroundColor: COLORS.danger },
  saveBtnIncome:   { backgroundColor: COLORS.success },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
})
