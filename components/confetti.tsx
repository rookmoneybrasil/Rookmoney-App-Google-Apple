import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, View, StyleSheet, Dimensions } from 'react-native'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const COLORS = ['#fbbf24', '#22c55e', '#3b82f6', '#f43f5e', '#a855f7', '#06b6d4', '#f97316']
const PARTICLE_COUNT = 40

interface Particle {
  x: Animated.Value
  y: Animated.Value
  rotate: Animated.Value
  opacity: Animated.Value
  color: string
  size: number
}

let globalTrigger: (() => void) | null = null

export function triggerConfetti() {
  globalTrigger?.()
}

export function ConfettiProvider() {
  const [active, setActive] = useState(false)
  const particles = useRef<Particle[]>([])

  useEffect(() => {
    globalTrigger = () => {
      particles.current = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: new Animated.Value(SCREEN_W * (0.3 + Math.random() * 0.4)),
        y: new Animated.Value(-20),
        rotate: new Animated.Value(0),
        opacity: new Animated.Value(1),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 6,
      }))
      setActive(true)

      const anims = particles.current.map((p) => {
        const xDrift = (Math.random() - 0.5) * SCREEN_W * 0.8
        const duration = 1800 + Math.random() * 1200
        return Animated.parallel([
          Animated.timing(p.y, {
            toValue: SCREEN_H + 50,
            duration,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.x, {
            toValue: p.x.__getValue() + xDrift,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(p.rotate, {
            toValue: 360 * (1 + Math.random() * 3),
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration,
            delay: duration * 0.6,
            useNativeDriver: true,
          }),
        ])
      })

      Animated.stagger(30, anims).start(() => setActive(false))
    }
    return () => { globalTrigger = null }
  }, [])

  if (!active) return null

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.current.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.size * (Math.random() > 0.5 ? 1 : 0.6),
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? p.size / 2 : 2,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { rotate: p.rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },
  particle: {
    position: 'absolute',
  },
})
