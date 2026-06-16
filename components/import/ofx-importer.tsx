import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Text } from '@/components/text'
import { Feather } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { COLORS } from '@/lib/constants'
import { transactionsApi, type Category } from '@/lib/api'
import { parseOFX, type OFXTransaction } from '@/lib/ofx-parser'
import { StatusBanner } from './status-banner'
import { CategoryPickerModal } from './category-picker-modal'
import { TransactionRow } from './transaction-row'

const BANK_GUIDES = [
  { bank: 'Itaú',            steps: 'Internet Banking → Conta Corrente → Extrato → Exportar → Formato OFX' },
  { bank: 'Bradesco',        steps: 'Internet Banking → Conta Corrente → Extrato → Salvar como → OFX' },
  { bank: 'Santander',       steps: 'Internet Banking → Extrato → Outros formatos → OFX' },
  { bank: 'Banco do Brasil', steps: 'Internet Banking → Extrato → Salvar em formato OFX' },
  { bank: 'Nubank',          steps: 'App → Perfil → Meus dados → Exportar extratos → OFX' },
  { bank: 'Inter',           steps: 'App → Extrato → Exportar → OFX' },
  { bank: 'C6 Bank',         steps: 'App → Extrato → Compartilhar → OFX' },
  { bank: 'Sicoob / Sicredi',steps: 'Internet Banking → Extrato → Exportar → OFX' },
]

interface Props {
  categories: Category[]
}

type Status = { type: 'success' | 'error'; message: string } | null

export function OFXImporter({ categories }: Props) {
  const [fileName, setFileName]         = useState<string | null>(null)
  const [transactions, setTransactions] = useState<OFXTransaction[]>([])
  const [rowCategories, setRowCategories] = useState<Record<string, string>>({})
  const [status, setStatus]   = useState<Status>(null)
  const [loading, setLoading] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<string | 'all' | null>(null)

  async function handlePick() {
    setStatus(null)
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
      if (result.canceled) return
      const asset = result.assets[0]

      if (!/\.(ofx|qfx|ofc)$/i.test(asset.name)) {
        setStatus({ type: 'error', message: 'Por favor, selecione um arquivo .ofx, .qfx ou .ofc' })
        return
      }

      const text = await new File(asset.uri).text()
      const parsed = parseOFX(text)
      if (!parsed.ok) {
        setStatus({ type: 'error', message: parsed.error })
        return
      }

      setFileName(asset.name)
      setTransactions(parsed.transactions)
      setRowCategories({})
    } catch {
      setStatus({ type: 'error', message: 'Erro ao ler o arquivo.' })
    }
  }

  function setAllCategories(catId: string) {
    const all: Record<string, string> = {}
    transactions.forEach((t) => { all[t.id] = catId })
    setRowCategories(all)
  }

  function reset() {
    setFileName(null)
    setTransactions([])
    setRowCategories({})
  }

  async function handleImport() {
    setStatus(null)
    const missing = transactions.some((t) => !rowCategories[t.id])
    if (missing) {
      setStatus({ type: 'error', message: 'Selecione uma categoria para todas as transações.' })
      return
    }

    setLoading(true)
    try {
      const result = await transactionsApi.import(
        transactions.map((t) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          categoryId: rowCategories[t.id],
        }))
      )
      const { success, skipped } = result.data
      setStatus({
        type: 'success',
        message: `${success} transaç${success === 1 ? 'ão importada' : 'ões importadas'} com sucesso!${skipped ? ` (${skipped} duplicada(s) ignorada(s))` : ''}`,
      })
      reset()
    } catch (e) {
      setStatus({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao importar.' })
    } finally {
      setLoading(false)
    }
  }

  const previewRows = transactions.slice(0, 15)
  const extraCount  = transactions.length - previewRows.length

  return (
    <View style={{ gap: 16 }}>
      {status && <StatusBanner type={status.type} message={status.message} />}

      {/* Guide */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.guideHeader} onPress={() => setShowGuide((v) => !v)} activeOpacity={0.8}>
          <Feather name="info" size={16} color={COLORS.brand} />
          <Text style={styles.guideTitle}>Como exportar o extrato do meu banco?</Text>
          <Feather name={showGuide ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
        </TouchableOpacity>
        {showGuide && (
          <View style={styles.guideBody}>
            {BANK_GUIDES.map((g) => (
              <View key={g.bank} style={styles.guideItem}>
                <Text style={styles.guideBank}>{g.bank}</Text>
                <Text style={styles.guideSteps}>{g.steps}</Text>
              </View>
            ))}
            <Text style={styles.guideFooter}>
              Não encontrou seu banco? A maioria dos internet bankings permite exportar o extrato em
              formato OFX na seção de extrato ou movimentação da conta.
            </Text>
          </View>
        )}
      </View>

      {/* File picker / file bar */}
      {!fileName ? (
        <TouchableOpacity style={styles.dropZone} onPress={handlePick} activeOpacity={0.8}>
          <View style={styles.dropIcon}>
            <Feather name="upload" size={22} color={COLORS.brand} />
          </View>
          <Text style={styles.dropTitle}>Selecionar arquivo OFX</Text>
          <Text style={styles.dropSub}>Aceita .ofx, .qfx e .ofc — exportado direto do internet banking</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.fileBar}>
          <Feather name="file-text" size={18} color={COLORS.brand} />
          <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
          <Text style={styles.fileCount}>
            {transactions.length} transaç{transactions.length !== 1 ? 'ões' : 'ão'}
          </Text>
          <TouchableOpacity onPress={reset} hitSlop={8}>
            <Feather name="x" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Preview */}
      {transactions.length > 0 && (
        <View style={styles.card}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Pré-visualização</Text>
            <TouchableOpacity style={styles.bulkBtn} onPress={() => setPickerTarget('all')} activeOpacity={0.8}>
              <Text style={styles.bulkBtnText}>Categoria p/ todas</Text>
              <Feather name="chevron-down" size={14} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10 }}>
            {previewRows.map((t) => (
              <TransactionRow
                key={t.id}
                date={t.date}
                description={t.description}
                amount={t.amount}
                type={t.type}
                categoryId={rowCategories[t.id] ?? ''}
                categories={categories}
                onPickCategory={() => setPickerTarget(t.id)}
              />
            ))}
          </View>

          {extraCount > 0 && (
            <Text style={styles.extraText}>
              e mais {extraCount} transaç{extraCount !== 1 ? 'ões' : 'ão'}...
            </Text>
          )}
        </View>
      )}

      {/* Import button */}
      {transactions.length > 0 && (
        <TouchableOpacity
          style={[styles.importBtn, loading && styles.importBtnDisabled]}
          onPress={handleImport}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.importBtnText}>
                Importar {transactions.length} transaç{transactions.length === 1 ? 'ão' : 'ões'}
              </Text>
          }
        </TouchableOpacity>
      )}

      <CategoryPickerModal
        visible={pickerTarget !== null}
        categories={categories}
        selectedId={pickerTarget && pickerTarget !== 'all' ? rowCategories[pickerTarget] : undefined}
        title={pickerTarget === 'all' ? 'Categoria para todas' : 'Selecionar categoria'}
        onSelect={(catId) => {
          if (pickerTarget === 'all') setAllCategories(catId)
          else if (pickerTarget) setRowCategories((prev) => ({ ...prev, [pickerTarget]: catId }))
        }}
        onClose={() => setPickerTarget(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },

  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guideTitle:  { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  guideBody:   { marginTop: 14, gap: 10 },
  guideItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  guideBank:  { fontSize: 12, fontWeight: '700', color: COLORS.text, width: 110 },
  guideSteps: { flex: 1, fontSize: 11, color: COLORS.muted, lineHeight: 16 },
  guideFooter: { fontSize: 11, color: COLORS.muted, lineHeight: 16, marginTop: 2 },

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

  fileBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, padding: 14,
  },
  fileName:  { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  fileCount: { fontSize: 11, color: COLORS.muted },

  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  previewTitle:  { fontSize: 13, fontWeight: '700', color: COLORS.text },
  bulkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
  },
  bulkBtnText: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  extraText: { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginTop: 12 },

  importBtn: {
    height: 50, borderRadius: 14, backgroundColor: COLORS.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  importBtnDisabled: { opacity: 0.6 },
  importBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
