import { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import { Text } from '@/components/text'
import { Rookinho } from '@/components/rookinho'
import { COLORS } from '@/lib/constants'

interface Props {
  title: string
  subtitle?: string
  mood?: 'happy' | 'sad' | 'confused' | 'determined'
}

export function EmptyState({ title, subtitle, mood = 'confused' }: Props) {
  const bounce = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 8, stiffness: 150, useNativeDriver: true }),
    ]).start()

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -8, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ scale }] }]}>
      <Animated.View style={{ transform: [{ translateY: bounce }] }}>
        <Rookinho mood={mood} size={80} />
      </Animated.View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    maxWidth: 260,
  },
})
