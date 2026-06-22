import { useState, useEffect } from 'react'
import { View, Modal, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { COLORS } from '@/lib/constants'
import { peopleApi, personRecurringApi, categoriesApi } from '@/lib/api'
import { sheetStyles as s } from './sheet-styles'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

type EntryType = 'THEY_OWE_ME' | 'I_OWE_THEM'
type Mode = 'single' | 'parcelado' | 'recorrente'

const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'single',     label: 'Avulso',     icon: '💰' },
  { key: 'parcelado',  label: 'Parcelado',  icon: '📅' },
  { key: 'recorrente', label: 'Recorrente', icon: '🔁' },
]

interface Props {
  visible:    boolean
  personId:   string
  personName: string
  onClose:    () => void
}

export function EntryModal({ visible, personId, personName, onClose }: Props) {
  const qc = useQueryClient()
  const [entryType, setEntryType]       = useState<EntryType>('THEY_OWE_ME')
  const [mode, setMode]                 = useState<Mode>('single')
  const [description, setDescription]   = useState('')
  const [amount, setAmount]             = useState('')
  const [date, setDate]                 = useState(format(new Date(), 'yyyy-MM-dd'))
  const [installments, setInstallments] = useState('2')
  const [alreadyPaid, setAlreadyPaid]   = useState('0')
  const [dayOfMonth, setDayOfMonth]     = useState('1')
  const [categoryId, setCategoryId]     = useState<string | undefined>()
  const [notes, setNotes]               = useState('')

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then(r => r.data),
  })

  useEffect(() => {
    if (visible) {
      setEntryType('THEY_OWE_ME')
      setMode('single')
      setDescription('')
      setAmount('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setInstallments('2')
      setAlreadyPaid('0')
      setDayOfMonth('1')
      setCategoryId(undefined)
      setNotes('')
    }
  }, [visible])

  const mutation = useMutation({
    mutationFn: async (): Promise<unknown> => {
      const amt = parseFloat(amount.replace(',', '.'))
      if (!description.trim())                  throw new Error('Descrição é obrigatória')
      if (isNaN(amt) || amt <= 0)                throw new Error('Valor inválido')
      if (!date.match(/^\d{4}-\d{2}-\d{2}$/))    throw new Error('Data inválida (use AAAA-MM-DD)')

      if (mode === 'recorrente') {
        const day = Math.min(31, Math.max(1, parseInt(dayOfMonth) || 1))
        return personRecurringApi.create({
          personId,
          type:        entryType,
          description: description.trim(),
          amount:      amt,
          dayOfMonth:  day,
          firstDate:   date,
          notes:       notes.trim() || null,
          categoryId:  categoryId || null,
        })
      }

      const inst = mode === 'parcelado' ? Math.max(2, parseInt(installments) || 2) : 1
      const paid = mode === 'parcelado' ? Math.min(Math.max(0, parseInt(alreadyPaid) || 0), inst - 1) : 0

      return peopleApi.addEntry(personId, {
        type:        entryType,
        description: description.trim(),
        amount:      amt,
        date,
        notes:       notes.trim() || undefined,
        categoryId,
        installments: inst,
        alreadyPaid:  paid,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['person', personId] })
      qc.invalidateQueries({ queryKey: ['people'] })
      if (mode === 'recorrente') qc.invalidateQueries({ queryKey: ['personRecurring', personId] })
      onClose()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const amountNum = parseFloat(amount.replace(',', '.')) || 0
  const numInst    = Math.max(2, parseInt(installments) || 2)
  const numPaid    = Math.min(Math.max(0, parseInt(alreadyPaid) || 0), numInst - 1)
  const remaining  = numInst - numPaid
  const day        = Math.min(31, Math.max(1, parseInt(dayOfMonth) || 1))

  const submitLabel = mutation.isPending
    ? 'Salvando...'
    : mode === 'parcelado'  ? `Criar ${remaining} parcela${remaining !== 1 ? 's' : ''}`
    : mode === 'recorrente' ? 'Criar recorrente'
    : 'Registrar'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.modalSheet} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Lançamento — {personName}</Text>

            {mutation.isError && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{(mutation.error as Error).message}</Text>
              </View>
            )}

            {/* Direction toggle */}
            <View style={s.dirRow}>
              <TouchableOpacity
                style={[s.dirBtn, entryType === 'THEY_OWE_ME' && s.dirBtnActiveSuccess]}
                onPress={() => setEntryType('THEY_OWE_ME')}
              >
                <Text style={s.dirEmoji}>💸</Text>
                <Text style={[s.dirText, entryType === 'THEY_OWE_ME' && s.dirTextActiveSuccess]}>
                  {personName} me deve
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.dirBtn, entryType === 'I_OWE_THEM' && s.dirBtnActiveDanger]}
                onPress={() => setEntryType('I_OWE_THEM')}
              >
                <Text style={s.dirEmoji}>🤝</Text>
                <Text style={[s.dirText, entryType === 'I_OWE_THEM' && s.dirTextActiveDanger]}>
                  Eu devo a {personName}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mode selector */}
            <View style={s.modeRow}>
              {MODES.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[s.modeBtn, mode === m.key && s.modeBtnActive]}
                  onPress={() => setMode(m.key)}
                >
                  <Text>{m.icon}</Text>
                  <Text style={[s.modeText, mode === m.key && s.modeTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Descrição</Text>
            <TextInput
              style={s.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Almoço, empréstimo, pensão..."
              placeholderTextColor={COLORS.muted}
            />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>
                  {mode === 'recorrente' ? 'Valor/mês (R$)' : mode === 'parcelado' ? 'Valor por parcela (R$)' : 'Valor (R$)'}
                </Text>
                <TextInput
                  style={s.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0,00"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{mode === 'parcelado' ? 'Próxima parcela' : '1ª data'}</Text>
                <TextInput
                  style={s.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <Text style={s.hint}>Formato: AAAA-MM-DD</Text>

            {/* Parcelado options */}
            {mode === 'parcelado' && (
              <View style={s.infoBox}>
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Total de parcelas</Text>
                    <TextInput
                      style={[s.input, { textAlign: 'center' }]}
                      value={installments}
                      onChangeText={setInstallments}
                      keyboardType="number-pad"
                      placeholderTextColor={COLORS.muted}
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Já pagas</Text>
                    <TextInput
                      style={[s.input, { textAlign: 'center' }]}
                      value={alreadyPaid}
                      onChangeText={setAlreadyPaid}
                      keyboardType="number-pad"
                      placeholderTextColor={COLORS.muted}
                    />
                  </View>
                </View>
                {amountNum > 0 && (
                  <Text style={s.infoBoxText}>
                    <Text style={s.infoBoxStrong}>{remaining} parcelas restantes</Text>
                    {' '}× {fmt(amountNum)} = <Text style={s.infoBoxStrong}>{fmt(amountNum * remaining)}</Text>
                  </Text>
                )}
                {numPaid > 0 && (
                  <Text style={s.hint}>
                    {numPaid} parcela{numPaid > 1 ? 's' : ''} já paga{numPaid > 1 ? 's' : ''} não {numPaid > 1 ? 'serão' : 'será'} cadastrada{numPaid > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            )}

            {/* Recorrente options */}
            {mode === 'recorrente' && (
              <View style={[s.infoBox, s.infoBoxBrand]}>
                <Text style={[s.infoBoxText, { color: COLORS.brand, fontWeight: '600' }]}>
                  🔁 Pagamento mensal recorrente
                </Text>
                <View style={[s.row, { alignItems: 'center', gap: 8 }]}>
                  <Text style={s.infoBoxText}>Todo dia</Text>
                  <TextInput
                    style={[s.input, { width: 60, textAlign: 'center', paddingVertical: 6 }]}
                    value={dayOfMonth}
                    onChangeText={setDayOfMonth}
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.muted}
                  />
                  <Text style={s.infoBoxText}>de cada mês</Text>
                </View>
                {amountNum > 0 && (
                  <Text style={s.infoBoxSuccess}>
                    ✓ {fmt(amountNum)}/mês — cria automaticamente todo dia {day}
                  </Text>
                )}
                <Text style={s.hint}>Repete indefinidamente. Para a qualquer momento na página da pessoa.</Text>
              </View>
            )}

            {/* Categoria */}
            <Text style={s.label}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
              <TouchableOpacity
                style={[s.catPill, !categoryId && s.catPillActive]}
                onPress={() => setCategoryId(undefined)}
              >
                <Text style={[s.catPillText, !categoryId && s.catPillTextActive]}>Nenhuma</Text>
              </TouchableOpacity>
              {(categories ?? []).map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.catPill, categoryId === c.id && s.catPillActive]}
                  onPress={() => setCategoryId(c.id)}
                >
                  <Text style={s.catEmoji}>{c.icon}</Text>
                  <Text style={[s.catPillText, categoryId === c.id && s.catPillTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>Observações</Text>
            <TextInput
              style={[s.input, { minHeight: 56, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Opcional"
              placeholderTextColor={COLORS.muted}
              multiline
            />

            <TouchableOpacity
              style={[s.saveBtn, mutation.isPending && { opacity: 0.6 }]}
              onPress={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              <Text style={s.saveBtnText}>{submitLabel}</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
