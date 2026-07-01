import { useState } from 'react'
import { TouchableOpacity, StyleSheet, Platform } from 'react-native'
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

export function DateInput({ value, onChange, placeholder = 'Selecionar data' }: Props) {
  const [show, setShow] = useState(false)

  const dateObj = value ? parse(value, 'yyyy-MM-dd', new Date()) : new Date()
  const displayText = value
    ? format(dateObj, "dd 'de' MMM, yyyy", { locale: ptBR })
    : placeholder

  return (
    <>
      <TouchableOpacity style={styles.input} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Feather name="calendar" size={16} color={COLORS.brand} />
        <Text style={[styles.text, !value && styles.placeholder]}>{displayText}</Text>
        <Feather name="chevron-down" size={14} color={COLORS.muted} />
      </TouchableOpacity>

      {show && RNDateTimePicker && (
        <RNDateTimePicker
          value={dateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
          onChange={(_: any, selected?: Date) => {
            setShow(Platform.OS === 'ios')
            if (selected) onChange(format(selected, 'yyyy-MM-dd'))
          }}
          themeVariant="dark"
        />
      )}
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
})
