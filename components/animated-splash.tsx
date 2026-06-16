import { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Animated } from 'react-native'
import { COLORS } from '@/lib/constants'
import { RookMoneyLogo } from '@/lib/logo'
import Euphoric    from '@/assets/svg/estado-euforico.svg'
import Confused    from '@/assets/svg/estado-confuso.svg'
import Angry       from '@/assets/svg/estado-bravo.svg'
import Sad         from '@/assets/svg/estado-triste.svg'
import Happy       from '@/assets/svg/estado-feliz.svg'
import Comemorando from '@/assets/svg/comemorando.svg'

const MOODS   = [Euphoric, Confused, Angry, Sad, Happy, Comemorando]
const STEP_MS = 190

interface Props {
  onFinish: () => void
}

export function AnimatedSplash({ onFinish }: Props) {
  const [index, setIndex]       = useState(0)
  const [showLogo, setShowLogo] = useState(false)

  const scale         = useRef(new Animated.Value(0.4)).current
  const mascotOpacity = useRef(new Animated.Value(1)).current
  const logoScale     = useRef(new Animated.Value(0.6)).current
  const logoOpacity   = useRef(new Animated.Value(0)).current

  useEffect(() => {
    function bounce() {
      scale.setValue(0.4)
      Animated.spring(scale, { toValue: 1, damping: 5, stiffness: 220, useNativeDriver: true }).start()
    }

    bounce()

    let i = 0
    const timer = setInterval(() => {
      i++
      if (i >= MOODS.length) {
        clearInterval(timer)
        Animated.timing(mascotOpacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
          setShowLogo(true)
          Animated.parallel([
            Animated.timing(logoOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.spring(logoScale, { toValue: 1, damping: 6, stiffness: 180, useNativeDriver: true }),
          ]).start(() => {
            setTimeout(onFinish, 900)
          })
        })
        return
      }
      setIndex(i)
      bounce()
    }, STEP_MS)

    return () => clearInterval(timer)
  }, [])

  const Mood = MOODS[index]

  return (
    <View style={styles.screen}>
      {!showLogo ? (
        <Animated.View style={{ transform: [{ scale }], opacity: mascotOpacity }}>
          <Mood width={150} height={150} />
        </Animated.View>
      ) : (
        <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}>
          <RookMoneyLogo width={240} />
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
    justifyContent:  'center',
    alignItems:      'center',
    zIndex:          999,
  },
})
