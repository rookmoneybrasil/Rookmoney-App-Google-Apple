import { useEffect, useRef, useCallback, useState } from 'react'
import { Animated, Easing, type TextStyle } from 'react-native'
import { Text } from '@/components/text'
import { useFocusEffect } from 'expo-router'

interface Props {
  value: number
  format?: (n: number) => string
  duration?: number
  delay?: number
  style?: TextStyle
}

const defaultFmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

export function AnimatedNumber({ value, format = defaultFmt, duration = 800, delay = 200, style }: Props) {
  const anim = useRef(new Animated.Value(0)).current
  const [display, setDisplay] = useState(format(0))

  useFocusEffect(
    useCallback(() => {
      anim.setValue(0)
      const listener = anim.addListener(({ value: v }) => {
        setDisplay(format(v))
      })

      const timer = setTimeout(() => {
        Animated.timing(anim, {
          toValue: value,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start()
      }, delay)

      return () => {
        clearTimeout(timer)
        anim.removeListener(listener)
      }
    }, [value])
  )

  return <Text style={style}>{display}</Text>
}
