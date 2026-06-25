import { useEffect, useRef, useCallback } from 'react'
import { Animated, Easing, type ViewStyle } from 'react-native'
import { useIsFocused } from '@react-navigation/native'

interface Props {
  children: React.ReactNode
  delay?: number
  duration?: number
  slideFrom?: number
  style?: ViewStyle
}

export function FadeIn({ children, delay = 0, duration = 700, slideFrom = 35, style }: Props) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(slideFrom)).current
  const isFocused = useIsFocused()

  useEffect(() => {
    if (isFocused) {
      opacity.setValue(0)
      translateY.setValue(slideFrom)

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start()
      }, delay)

      return () => clearTimeout(timer)
    }
  }, [isFocused])

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  )
}

export function FadeInScale({ children, delay = 0, duration = 500, style }: Omit<Props, 'slideFrom'>) {
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.85)).current
  const isFocused = useIsFocused()

  useEffect(() => {
    if (isFocused) {
      opacity.setValue(0)
      scale.setValue(0.85)

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, damping: 10, stiffness: 150, useNativeDriver: true }),
        ]).start()
      }, delay)

      return () => clearTimeout(timer)
    }
  }, [isFocused])

  return (
    <Animated.View style={[{ opacity, transform: [{ scale }] }, style]}>
      {children}
    </Animated.View>
  )
}

export function StaggerList({ children, stagger = 80 }: { children: React.ReactNode[]; stagger?: number }) {
  return (
    <>
      {children.map((child, i) => (
        <FadeIn key={i} delay={i * stagger} slideFrom={30}>
          {child}
        </FadeIn>
      ))}
    </>
  )
}
