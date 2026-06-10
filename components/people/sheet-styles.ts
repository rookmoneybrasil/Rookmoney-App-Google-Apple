import { StyleSheet } from 'react-native'
import { COLORS } from '@/lib/constants'

export const sheetStyles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '92%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },

  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },
  row:  { flexDirection: 'row' },
  hint: { fontSize: 11, color: COLORS.muted2, marginTop: 4 },

  saveBtn: { backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  errorBox:  { backgroundColor: COLORS.danger + '1a', borderWidth: 1, borderColor: COLORS.danger + '33', borderRadius: 10, padding: 10, marginBottom: 4 },
  errorText: { color: COLORS.danger, fontSize: 12 },

  // Direction toggle (THEY_OWE_ME / I_OWE_THEM)
  dirRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  dirBtn: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 6,
    borderRadius: 12, borderWidth: 1, backgroundColor: COLORS.card2, borderColor: COLORS.border,
  },
  dirBtnActiveSuccess: { backgroundColor: COLORS.success + '1a', borderColor: COLORS.success + '55' },
  dirBtnActiveDanger:  { backgroundColor: COLORS.danger + '1a', borderColor: COLORS.danger + '55' },
  dirEmoji: { fontSize: 18 },
  dirText:  { fontSize: 11, fontWeight: '600', color: COLORS.muted, textAlign: 'center' },
  dirTextActiveSuccess: { color: COLORS.success },
  dirTextActiveDanger:  { color: COLORS.danger },

  // Mode pills (avulso / parcelado / recorrente)
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 9, borderRadius: 10, borderWidth: 1, backgroundColor: COLORS.card2, borderColor: COLORS.border,
  },
  modeBtnActive: { backgroundColor: COLORS.brandDim, borderColor: COLORS.brand },
  modeText:       { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  modeTextActive: { color: COLORS.brand },

  // Category pills
  catScroll: { marginTop: 4 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.bg, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 7, marginRight: 7,
  },
  catPillActive:     { backgroundColor: COLORS.brandDim, borderColor: COLORS.brand },
  catEmoji:          { fontSize: 14 },
  catPillText:       { fontSize: 13, color: COLORS.muted },
  catPillTextActive: { color: COLORS.brand, fontWeight: '600' },

  // Info boxes
  infoBox: {
    borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 8, marginBottom: 4,
    backgroundColor: COLORS.card2, borderColor: COLORS.border, gap: 4,
  },
  infoBoxBrand:   { backgroundColor: COLORS.brand + '0d', borderColor: COLORS.brand + '33' },
  infoBoxText:    { fontSize: 12, color: COLORS.muted, lineHeight: 17 },
  infoBoxStrong:  { color: COLORS.text, fontWeight: '700' },
  infoBoxSuccess: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
})
