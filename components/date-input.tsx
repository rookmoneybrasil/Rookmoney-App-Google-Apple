import { useState } from 'react'
import { View, Modal, Pressable, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Text } from '@/components/text'
import { Feather } from '@expo/vector-icons'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COLORS } from '@/lib/constants'

let RNDateTimePicker: any = null
try {
  RNDateTimePicker = require('@react-native-community/datetimepicker').default
} catch {}

interface Props {
  value: string
  onChange: (iso: string) => void
  label?: string
  placeholder?: string
}

// Date picker that opens in a full-screen bottom-sheet modal.
// (Rendering the picker inline below the field broke when the field sat in a
// narrow 2-column row: the calendar/spinner overflowed the column and the year
// column got clipped off-screen. A modal is full width, so all three wheels —
// day, month AND year — are always visible.)
export function DateInput({ value, onChange, placeholder = 'Selecionar data' }: Props) {
  const [show, setShow] = useState(false)
  const [temp, setTemp] = useState<Date | null>(null)

  const dateObj = value ? parse(value, 'yyyy-MM-dd', new Date()) : new Date()
  const displayText = value
    ? format(dateObj, "dd 'de' MMM, yyyy", { locale: ptBR })
    : placeholder

  function open() {
    setTemp(dateObj)
    setShow(true)
  }
  function confirm() {
    if (temp) onChange(format(temp, 'yyyy-MM-dd'))
    setShow(false)
  }

  return (
    <>
      <TouchableOpacity style={styles.input} onPress={open} activeOpacity={0.7}>
        <Feather name="calendar" size={16} color={COLORS.brand} />
        <Text style={[styles.text, !value && styles.placeholder]}>{displayText}</Text>
        <Feather name="chevron-down" size={14} color={COLORS.muted} />
      </TouchableOpacity>

      {RNDateTimePicker && (Platform.OS === 'ios' ? (
        <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
          <View style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShow(false)} />
            <View style={styles.sheet}>
              <RNDateTimePicker
                value={temp ?? dateObj}
                mode="date"
                display="spinner"
                locale="pt-BR"
                themeVariant="dark"
                textColor={COLORS.text}
                style={styles.spinner}
                onChange={(_: any, selected?: Date) => { if (selected) setTemp(selected) }}
              />
              <TouchableOpacity style={styles.doneBtn} onPress={confirm} activeOpacity={0.85}>
                <Text style={styles.doneText}>Concluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : (
        show && (
          <RNDateTimePicker
            value={dateObj}
            mode="date"
            display="calendar"
            onChange={(_: any, selected?: Date) => {
              setShow(false)
              if (selected) onChange(format(selected, 'yyyy-MM-dd'))
            }}
          />
        )
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  text: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  placeholder: {
    color: COLORS.muted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 28,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  spinner: {
    alignSelf: 'stretch',
    height: 210,
  },
  doneBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  doneText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
})
