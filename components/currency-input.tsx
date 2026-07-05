import { type TextInputProps, type StyleProp, type TextStyle } from 'react-native'
import { TextInput } from '@/components/text'
import { COLORS } from '@/lib/constants'

// Cash-register money input: the user types only digits and the punctuation
// fills itself in right-to-left (last two digits = cents), so nobody has to
// type "." or ",". Mirrors the web CurrencyInput.
//
// Drop-in for a plain <TextInput value={amount} onChangeText={setAmount} …>:
// `value` is the current decimal (string like "12.34" or a number) and
// `onChangeValue` emits a DOT-decimal string ("12.34") — so every existing
// `parseFloat(amount.replace(',', '.'))` call site keeps working unchanged.

const MAX_DIGITS = 11 // up to R$ 999.999.999,99

interface Props extends Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> {
  value:         string | number
  onChangeValue: (decimalString: string) => void
  style?:        StyleProp<TextStyle>
}

export function CurrencyInput({ value, onChangeValue, style, placeholder = '0,00', placeholderTextColor, ...rest }: Props) {
  const num   = typeof value === 'string' ? parseFloat(value) : value
  const cents = Number.isFinite(num) ? Math.round((num as number) * 100) : 0
  const display = cents === 0
    ? ''
    : (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, MAX_DIGITS)
    const nextCents = digits ? parseInt(digits, 10) : 0
    onChangeValue((nextCents / 100).toFixed(2))
  }

  return (
    <TextInput
      {...rest}
      value={display}
      onChangeText={handleChange}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor ?? COLORS.muted}
      style={style}
    />
  )
}
