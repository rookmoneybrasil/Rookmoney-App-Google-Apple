import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { Feather } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { COLORS } from '@/lib/constants'
import { transactionsApi, receiptApi, type Category, type ExtractedData } from '@/lib/api'
import { StatusBanner } from './status-banner'
import { CategoryPickerModal } from './category-picker-modal'

interface Props {
  categories: Category[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const CONFIDENCE_LABEL: Record<ExtractedData['confidence'], string> = {
  high:   '✓ Alta confiança',
  medium: '~ Confiança média',
  low:    '⚠ Baixa confiança',
}

const CONFIDENCE_COLOR: Record<ExtractedData['confidence'], string> = {
  high:   COLORS.success,
  medium: COLORS.warning,
  low:    COLORS.danger,
}

const TIPS = [
  { icon: '🧾', title: 'Notas fiscais',     desc: 'Foto do cupom fiscal ou NF-e' },
  { icon: '📱', title: 'Comprovantes Pix',  desc: 'Print do comprovante de pagamento' },
  { icon: '💳', title: 'Extratos bancários', desc: 'Captura de tela do app do banco' },
]

type EditForm = {
  amount:      string
  type:        'INCOME' | 'EXPENSE'
  description: string
  date:        string
  notes:       string | null
  categoryId:  string
}

export function ReceiptScanner({ categories }: Props) {
  const [imageUri, setImageUri]   = useState<string | null>(null)
  const [scanning, setScanning]   = useState(false)
  const [extracted, setExtracted] = useState<ExtractedData | null>(null)
  const [editForm, setEditForm]   = useState<EditForm | null>(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [catPickerOpen, setCatPickerOpen] = useState(false)

  function reset() {
    setImageUri(null)
    setExtracted(null)
    setEditForm(null)
    setSaved(false)
    setScanError(null)
  }

  async function processAsset(asset: ImagePicker.ImagePickerAsset) {
    if (!asset.base64) {
      setScanError('Não foi possível ler a imagem.')
      return
    }
    setImageUri(asset.uri)
    setExtracted(null)
    setEditForm(null)
    setSaved(false)
    setScanError(null)
    setScanning(true)

    try {
      const data = await receiptApi.scan(asset.base64, asset.mimeType ?? 'image/jpeg')
      if (data.error) {
        setScanError(data.error)
        return
      }

      // Auto-match categoryName to a real category (case-insensitive substring, both directions)
      const lowerName = data.categoryName?.toLowerCase() ?? ''
      const matched = categories.find((c) => {
        const lowerCat = c.name.toLowerCase()
        return lowerCat.includes(lowerName) || lowerName.includes(lowerCat)
      })

      setExtracted(data)
      setEditForm({
        amount:      String(data.amount ?? ''),
        type:        data.type,
        description: data.description ?? '',
        date:        data.date,
        notes:       data.notes,
        categoryId:  matched?.id ?? categories[0]?.id ?? '',
      })
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Erro ao escanear o comprovante.')
    } finally {
      setScanning(false)
    }
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      setScanError('Permissão de câmera negada.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 })
    if (result.canceled) return
    await processAsset(result.assets[0])
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setScanError('Permissão de galeria negada.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 })
    if (result.canceled) return
    await processAsset(result.assets[0])
  }

  async function handleSave() {
    if (!editForm) return
    const amount = parseFloat(editForm.amount.replace(',', '.'))
    if (!amount || amount <= 0) { setScanError('Informe um valor válido.'); return }
    if (!editForm.categoryId)   { setScanError('Selecione uma categoria.'); return }
    if (!editForm.date.match(/^\d{4}-\d{2}-\d{2}$/)) { setScanError('Data inválida (use AAAA-MM-DD).'); return }

    setScanError(null)
    setSaving(true)
    try {
      await transactionsApi.create({
        amount,
        type: editForm.type,
        description: editForm.description.trim() || undefined,
        date: editForm.date,
        categoryId: editForm.categoryId,
      })
      setSaved(true)
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Erro ao salvar transação.')
    } finally {
      setSaving(false)
    }
  }

  const selectedCategory = categories.find((c) => c.id === editForm?.categoryId)

  return (
    <View style={{ gap: 16 }}>
      {scanError && <StatusBanner type="error" message={scanError} />}

      {!imageUri ? (
        <>
          <View style={styles.dropZone}>
            <View style={styles.dropIcon}>
              <Feather name="zap" size={22} color={COLORS.brand} />
            </View>
            <Text style={styles.dropTitle}>Enviar comprovante ou nota fiscal</Text>
            <Text style={styles.dropSub}>JPG, PNG, WEBP · a IA extrai os dados automaticamente</Text>
            <View style={styles.dropActions}>
              <TouchableOpacity style={styles.dropBtn} onPress={pickFromCamera} activeOpacity={0.85}>
                <Feather name="camera" size={16} color="#fff" />
                <Text style={styles.dropBtnText}>Câmera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dropBtn, styles.dropBtnSecondary]} onPress={pickFromLibrary} activeOpacity={0.85}>
                <Feather name="image" size={16} color={COLORS.brand} />
                <Text style={[styles.dropBtnText, styles.dropBtnTextSecondary]}>Galeria</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tipsGrid}>
            {TIPS.map((tip) => (
              <View key={tip.title} style={styles.tipCard}>
                <Text style={styles.tipIcon}>{tip.icon}</Text>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDesc}>{tip.desc}</Text>
              </View>
            ))}
          </View>
        </>
      ) : saved ? (
        <View style={styles.savedCard}>
          <View style={styles.savedIcon}>
            <Feather name="check-circle" size={28} color={COLORS.success} />
          </View>
          <Text style={styles.savedTitle}>Transação adicionada!</Text>
          <TouchableOpacity style={styles.importBtn} onPress={reset} activeOpacity={0.85}>
            <Text style={styles.importBtnText}>Escanear outro comprovante</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.previewCard}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
            <TouchableOpacity style={styles.previewClose} onPress={reset} hitSlop={8}>
              <Feather name="x" size={16} color="#fff" />
            </TouchableOpacity>
            {scanning && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator color={COLORS.brand} />
                <Text style={styles.scanningText}>Analisando...</Text>
              </View>
            )}
          </View>

          {editForm && extracted && (
            <View style={styles.card}>
              <View style={[styles.confidenceBadge, { backgroundColor: CONFIDENCE_COLOR[extracted.confidence] + '1A' }]}>
                <Text style={[styles.confidenceText, { color: CONFIDENCE_COLOR[extracted.confidence] }]}>
                  {CONFIDENCE_LABEL[extracted.confidence]}
                </Text>
              </View>

              {/* Type toggle */}
              <View style={styles.typeRow}>
                {(['EXPENSE', 'INCOME'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, editForm.type === t && (t === 'EXPENSE' ? styles.expenseActive : styles.incomeActive)]}
                    onPress={() => setEditForm((f) => f && { ...f, type: t })}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.typeBtnText,
                      editForm.type === t && { color: t === 'EXPENSE' ? COLORS.danger : COLORS.success, fontWeight: '700' },
                    ]}>
                      {t === 'EXPENSE' ? '💸 Despesa' : '💰 Receita'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <View style={styles.field}>
                <Text style={styles.label}>Valor</Text>
                <View style={styles.amountBox}>
                  <Text style={styles.currency}>R$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={editForm.amount}
                    onChangeText={(v) => setEditForm((f) => f && { ...f, amount: v })}
                    placeholder="0,00"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Description */}
              <View style={styles.field}>
                <Text style={styles.label}>Descrição</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.description}
                  onChangeText={(v) => setEditForm((f) => f && { ...f, description: v })}
                  placeholder="Descrição"
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              {/* Date */}
              <View style={styles.field}>
                <Text style={styles.label}>Data</Text>
                <View style={[styles.input, styles.dateField]}>
                  <Feather name="calendar" size={16} color={COLORS.muted} />
                  <TextInput
                    style={styles.dateInput}
                    value={editForm.date}
                    onChangeText={(v) => setEditForm((f) => f && { ...f, date: v })}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Category */}
              <View style={styles.field}>
                <Text style={styles.label}>Categoria</Text>
                <TouchableOpacity style={styles.input} onPress={() => setCatPickerOpen(true)} activeOpacity={0.8}>
                  <View style={styles.catRow}>
                    <Text style={styles.catRowText}>
                      {selectedCategory ? `${selectedCategory.icon}  ${selectedCategory.name}` : 'Selecionar categoria'}
                    </Text>
                    <Feather name="chevron-down" size={14} color={COLORS.muted} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Footer: amount preview + save */}
              <View style={styles.footer}>
                <Text style={[styles.footerAmount, { color: editForm.type === 'INCOME' ? COLORS.success : COLORS.danger }]}>
                  {editForm.type === 'INCOME' ? '+' : '-'} {fmt(parseFloat(editForm.amount.replace(',', '.')) || 0)}
                </Text>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.importBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.importBtnText}>Adicionar transação</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      <CategoryPickerModal
        visible={catPickerOpen}
        categories={categories}
        selectedId={editForm?.categoryId}
        onSelect={(catId) => setEditForm((f) => f && { ...f, categoryId: catId })}
        onClose={() => setCatPickerOpen(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 14,
  },

  dropZone: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.border, borderRadius: 16,
    paddingVertical: 32, paddingHorizontal: 16, alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card,
  },
  dropIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: COLORS.brandDim, justifyContent: 'center', alignItems: 'center',
  },
  dropTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  dropSub:   { fontSize: 11, color: COLORS.muted, textAlign: 'center', lineHeight: 16 },
  dropActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dropBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.brand,
  },
  dropBtnSecondary: { backgroundColor: COLORS.brandDim, borderWidth: 1, borderColor: COLORS.brand },
  dropBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  dropBtnTextSecondary: { color: COLORS.brand },

  tipsGrid: { flexDirection: 'row', gap: 10 },
  tipCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 12, gap: 4,
  },
  tipIcon:  { fontSize: 18 },
  tipTitle: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  tipDesc:  { fontSize: 10, color: COLORS.muted, lineHeight: 14 },

  previewCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: COLORS.card },
  preview: { width: '100%', height: 220 },
  previewClose: {
    position: 'absolute', top: 10, right: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  scanningOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(8,14,29,0.7)', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  scanningText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },

  confidenceBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  confidenceText: { fontSize: 11, fontWeight: '700' },

  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  expenseActive: { borderColor: COLORS.danger,  backgroundColor: 'rgba(239,68,68,0.1)' },
  incomeActive:  { borderColor: COLORS.success, backgroundColor: 'rgba(34,197,94,0.1)' },
  typeBtnText: { fontSize: 13, color: COLORS.muted },

  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  input: {
    height: 46, backgroundColor: COLORS.card2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, color: COLORS.text, fontSize: 14, justifyContent: 'center',
  },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 0 },

  amountBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 46, backgroundColor: COLORS.card2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14,
  },
  currency: { fontSize: 14, color: COLORS.muted },
  amountInput: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },

  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  catRowText: { fontSize: 13, color: COLORS.text, flex: 1 },

  footer: { gap: 12, marginTop: 4 },
  footerAmount: { fontSize: 20, fontWeight: '700', textAlign: 'center' },

  saveBtn: {
    height: 50, borderRadius: 14, backgroundColor: COLORS.brand,
    alignItems: 'center', justifyContent: 'center',
  },

  savedCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    padding: 32, alignItems: 'center', gap: 14,
  },
  savedIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(34,197,94,0.12)', justifyContent: 'center', alignItems: 'center',
  },
  savedTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },

  importBtn: {
    height: 50, borderRadius: 14, backgroundColor: COLORS.brand,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  importBtnDisabled: { opacity: 0.6 },
  importBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
