import { useEffect, useRef, useCallback } from 'react'
import { Animated, Easing, View, type ViewStyle } from 'react-native'
import { useFocusEffect } from 'expo-router'

interface Props {
  value: number
  max?: number
  height?: number
  color?: string
  bgColor?: string
  borderRadius?: number
  delay?: number
  duration?: number
  style?: ViewStyle
}

export function AnimatedProgress({
  value,
  max = 100,
  height = 8,
  color = '#3b82f6',
  bgColor = 'rgba(255,255,255,0.08)',
  borderRadius = 4,
  delay = 300,
  duration = 800,
  style,
}: Props) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const widthAnim = useRef(new Animated.Value(0)).current

  useFocusEffect(
    useCallback(() => {
      widthAnim.setValue(0)
      const timer = setTimeout(() => {
        Animated.timing(widthAnim, {
          toValue: pct,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start()
      }, delay)
      return () => clearTimeout(timer)
    }, [pct])
  )

  const width = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  })

  return (
    <View style={[{ height, backgroundColor: bgColor, borderRadius, overflow: 'hidden' }, style]}>
      <Animated.View style={{ height: '100%', width, backgroundColor: color, borderRadius }} />
    </View>
  )
}
