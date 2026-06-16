import { useMemo, useState } from 'react'
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView } from 'react-native'
import { Text } from '@/components/text'
import { Feather } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { COLORS } from '@/lib/constants'
import { transactionsApi, type Category } from '@/lib/api'
import {
  COLUMN_FIELDS, FIELD_LABELS, type ColumnField, type ParsedRow,
  autoDetect, parseCSV, buildMappedRows,
} from '@/lib/csv-parser'
import { StatusBanner } from './status-banner'
import { CategoryPickerModal } from './category-picker-modal'
import { TransactionRow } from './transaction-row'

interface Props {
  categories: Category[]
}

type Status = { type: 'success' | 'error'; message: string } | null

export function CSVImporter({ categories }: Props) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [headers, setHeaders]   = useState<string[]>([])
  const [rawRows, setRawRows]   = useState<ParsedRow[]>([])
  const [mapping, setMapping]   = useState<Record<ColumnField, string>>({
    date: '', description: '', amount: '', type: '',
  })
  const [rowCategories, setRowCategories] = useState<Record<number, string>>({})
  const [status, setStatus]   = useState<Status>(null)
  const [loading, setLoading] = useState(false)
  const [catPickerTarget, setCatPickerTarget] = useState<number | 'all' | null>(null)
  const [mappingField, setMappingField] = useState<ColumnField | null>(null)

  async function handlePick() {
    setStatus(null)
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
      if (result.canceled) return
      const asset = result.assets[0]

      if (!asset.name.toLowerCase().endsWith('.csv')) {
        setStatus({ type: 'error', message: 'Por favor, selecione um arquivo .csv' })
        return
      }

      const text = await new File(asset.uri).text()
      const { headers: h, rows: r } = parseCSV(text)
      if (h.length === 0 || r.length === 0) {
        setStatus({ type: 'error', message: 'Não foi possível ler o arquivo CSV.' })
        return
      }

      setFileName(asset.name)
      setHeaders(h)
      setRawRows(r)
      setMapping(autoDetect(h))
      setRowCategories({})
    } catch {
      setStatus({ type: 'error', message: 'Erro ao ler o arquivo.' })
    }
  }

  const mappedRows = useMemo(
    () => (rawRows.length > 0 ? buildMappedRows(rawRows, mapping, rowCategories) : []),
    [rawRows, mapping, rowCategories]
  )
  const previewRows = mappedRows.slice(0, 10)
  const extraCount  = mappedRows.length - previewRows.length

  function setAllCategories(catId: string) {
    const all: Record<number, string> = {}
    rawRows.forEach((_, i) => { all[i] = catId })
    setRowCategories(all)
  }

  function reset() {
    setFileName(null)
    setHeaders([])
    setRawRows([])
    setRowCategories({})
    setMapping({ date: '', description: '', amount: '', type: '' })
  }

  async function handleImport() {
    setStatus(null)
    const missing = mappedRows.some((r) => !r.categoryId)
    if (missing) {
      setStatus({ type: 'error', message: 'Selecione uma categoria para todas as transações.' })
      return
    }

    setLoading(true)
    try {
      const result = await transactionsApi.import(
        mappedRows.map((r) => ({
          date: r.date,
          description: r.description,
          amount: r.amount,
          type: r.type,
          categoryId: r.categoryId,
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

  return (
    <View style={{ gap: 16 }}>
      {status && <StatusBanner type={status.type} message={status.message} />}

      {/* File picker / file bar */}
      {!fileName ? (
        <TouchableOpacity style={styles.dropZone} onPress={handlePick} activeOpacity={0.8}>
          <View style={styles.dropIcon}>
            <Feather name="upload" size={22} color={COLORS.brand} />
          </View>
          <Text style={styles.dropTitle}>Selecionar arquivo CSV</Text>
          <Text style={styles.dropSub}>Colunas esperadas: data, descrição, valor, tipo</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.fileBar}>
          <Feather name="file-text" size={18} color={COLORS.brand} />
          <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
          <Text style={styles.fileCount}>
            {rawRows.length} linha{rawRows.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={reset} hitSlop={8}>
            <Feather name="x" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Column mapping */}
      {headers.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mapeamento de colunas</Text>
          <View style={{ gap: 10 }}>
            {COLUMN_FIELDS.map((field) => (
              <TouchableOpacity
                key={field}
                style={styles.mapRow}
                onPress={() => setMappingField(field)}
                activeOpacity={0.8}
              >
                <Text style={styles.mapLabel}>{FIELD_LABELS[field]}</Text>
                <View style={styles.mapValue}>
                  <Text style={styles.mapValueText} numberOfLines={1}>
                    {mapping[field] || '— não mapear —'}
                  </Text>
                  <Feather name="chevron-down" size={14} color={COLORS.muted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Preview */}
      {mappedRows.length > 0 && (
        <View style={styles.card}>
          <View style={styles.previewHeader}>
            <Text style={styles.cardTitle}>Pré-visualização</Text>
            <TouchableOpacity style={styles.bulkBtn} onPress={() => setCatPickerTarget('all')} activeOpacity={0.8}>
              <Text style={styles.bulkBtnText}>Categoria p/ todas</Text>
              <Feather name="chevron-down" size={14} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10 }}>
            {previewRows.map((row) => (
              <TransactionRow
                key={row._index}
                date={row.date}
                description={row.description}
                amount={row.amount}
                type={row.type}
                categoryId={row.categoryId}
                categories={categories}
                onPickCategory={() => setCatPickerTarget(row._index)}
              />
            ))}
          </View>

          {extraCount > 0 && (
            <Text style={styles.extraText}>
              e mais {extraCount} linha{extraCount !== 1 ? 's' : ''}...
            </Text>
          )}
        </View>
      )}

      {/* Import button */}
      {mappedRows.length > 0 && (
        <TouchableOpacity
          style={[styles.importBtn, loading && styles.importBtnDisabled]}
          onPress={handleImport}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.importBtnText}>
                Importar {mappedRows.length} transaç{mappedRows.length === 1 ? 'ão' : 'ões'}
              </Text>
          }
        </TouchableOpacity>
      )}

      <CategoryPickerModal
        visible={catPickerTarget !== null}
        categories={categories}
        selectedId={typeof catPickerTarget === 'number' ? rowCategories[catPickerTarget] : undefined}
        title={catPickerTarget === 'all' ? 'Categoria para todas' : 'Selecionar categoria'}
        onSelect={(catId) => {
          if (catPickerTarget === 'all') setAllCategories(catId)
          else if (catPickerTarget !== null) setRowCategories((prev) => ({ ...prev, [catPickerTarget]: catId }))
        }}
        onClose={() => setCatPickerTarget(null)}
      />

      <Modal visible={mappingField !== null} transparent animationType="fade" onRequestClose={() => setMappingField(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setMappingField(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {mappingField ? `Coluna para "${FIELD_LABELS[mappingField]}"` : ''}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              <TouchableOpacity
                style={styles.optRow}
                onPress={() => {
                  if (mappingField) setMapping((m) => ({ ...m, [mappingField]: '' }))
                  setMappingField(null)
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.optText}>— não mapear —</Text>
                {mappingField && !mapping[mappingField] && <Feather name="check" size={16} color={COLORS.brand} />}
              </TouchableOpacity>
              {headers.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={styles.optRow}
                  onPress={() => {
                    if (mappingField) setMapping((m) => ({ ...m, [mappingField]: h }))
                    setMappingField(null)
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optText} numberOfLines={1}>{h}</Text>
                  {mappingField && mapping[mappingField] === h && <Feather name="check" size={16} color={COLORS.brand} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 12 },

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

  mapRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
  },
  mapLabel: { fontSize: 12, fontWeight: '600', color: COLORS.muted, width: 80 },
  mapValue: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6,
    backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  mapValueText: { fontSize: 12, color: COLORS.text, flex: 1 },

  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
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

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  optRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  optText: { fontSize: 13, color: COLORS.text, flex: 1 },
})
