import { View, StyleSheet } from 'react-native'
import Idle    from '@/assets/svg/contando.svg'
import Happy   from '@/assets/svg/estado-feliz.svg'
import Sad     from '@/assets/svg/estado-triste.svg'
import Angry   from '@/assets/svg/estado-bravo.svg'
import Euphoric from '@/assets/svg/estado-euforico.svg'
import Confused from '@/assets/svg/estado-confuso.svg'

export type RookinhoMood = 'idle' | 'happy' | 'sad' | 'angry' | 'euphoric' | 'confused'

const MOOD_SVG: Record<RookinhoMood, React.FC<{ width?: number; height?: number }>> = {
  idle:     Idle,
  happy:    Happy,
  sad:      Sad,
  angry:    Angry,
  euphoric: Euphoric,
  confused: Confused,
}

// Dashboard API returns 'angry' | 'sad' | 'happy' | 'idle'
export function mapApiMood(mood?: string): RookinhoMood {
  if (mood === 'angry')   return 'angry'
  if (mood === 'sad')     return 'sad'
  if (mood === 'happy')   return 'happy'
  if (mood === 'euphoric') return 'euphoric'
  if (mood === 'confused') return 'confused'
  return 'idle'
}

interface Props {
  mood?: string
  size?: number
}

export function Rookinho({ mood = 'idle', size = 80 }: Props) {
  const Svg = MOOD_SVG[mapApiMood(mood)] ?? Idle
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
})
