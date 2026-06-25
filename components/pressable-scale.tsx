import { useRef } from 'react'
import { Animated, Pressable, Platform, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import { hapticLight } from '@/lib/haptics'

const ripple = Platform.OS === 'android'
  ? { android_ripple: { color: 'rgba(255,255,255,0.08)', borderless: false } }
  : {}

interface Props extends Omit<PressableProps, 'style'> {
  children: React.ReactNode
  scale?: number
  style?: StyleProp<ViewStyle>
  containerStyle?: StyleProp<ViewStyle>
}

export function PressableScale({ children, scale = 0.97, style, containerStyle, onPress, ...rest }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    hapticLight()
    Animated.spring(scaleAnim, {
      toValue: scale,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 10,
      stiffness: 200,
      useNativeDriver: true,
    }).start()
  }

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={style} {...ripple} {...rest}>
        {children}
      </Pressable>
    </Animated.View>
  )
}
