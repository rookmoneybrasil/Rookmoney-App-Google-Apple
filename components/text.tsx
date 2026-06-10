import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from 'react-native'

const WEIGHT_FONT_MAP: Record<string, string> = {
  '100': 'Poppins_300Light',
  '200': 'Poppins_300Light',
  '300': 'Poppins_300Light',
  light: 'Poppins_300Light',
  '400': 'Poppins_400Regular',
  normal: 'Poppins_400Regular',
  '500': 'Poppins_500Medium',
  medium: 'Poppins_500Medium',
  '600': 'Poppins_600SemiBold',
  semibold: 'Poppins_600SemiBold',
  '700': 'Poppins_700Bold',
  bold: 'Poppins_700Bold',
  '800': 'Poppins_800ExtraBold',
  '900': 'Poppins_800ExtraBold',
}

function withPoppins(style: TextProps['style']) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle
  if (flat.fontFamily) return style

  const weight = flat.fontWeight != null ? String(flat.fontWeight) : '400'
  const fontFamily = WEIGHT_FONT_MAP[weight] ?? 'Poppins_400Regular'

  return [style, { fontFamily, fontWeight: undefined }]
}

export function Text({ style, ...props }: TextProps) {
  return <RNText style={withPoppins(style)} {...props} />
}

export function TextInput({ style, ...props }: TextInputProps) {
  return <RNTextInput style={withPoppins(style)} {...props} />
}
