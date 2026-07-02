import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native'
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
      <TouchableOpacity style={styles.input} onPress={() => setShow((s) => !s)} activeOpacity={0.7}>
        <Feather name="calendar" size={16} color={COLORS.brand} />
        <Text style={[styles.text, !value && styles.placeholder]}>{displayText}</Text>
        <Feather name={show ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.muted} />
      </TouchableOpacity>

      {show && RNDateTimePicker && (
        Platform.OS === 'ios' ? (
          // Inline calendar (not spinner): the spinner cut off the year column,
          // making it impossible to change the year. The inline calendar lets you
          // tap the month/year header and pick any year.
          <View style={styles.iosWrap}>
            <RNDateTimePicker
              value={dateObj}
              mode="date"
              display="inline"
              locale="pt-BR"
              themeVariant="dark"
              accentColor={COLORS.brand}
              style={{ alignSelf: 'stretch' }}
              onChange={(_: any, selected?: Date) => { if (selected) onChange(format(selected, 'yyyy-MM-dd')) }}
            />
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShow(false)} activeOpacity={0.8}>
              <Text style={styles.doneText}>Concluir</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
  iosWrap: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  doneText: {
    color: COLORS.brand,
    fontWeight: '700',
    fontSize: 15,
  },
})
