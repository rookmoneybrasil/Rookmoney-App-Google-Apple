import { useRef } from 'react'
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native'
import { Swipeable, type SwipeableRef } from 'react-native-gesture-handler'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/text'
import { hapticLight } from '@/lib/haptics'

interface Action {
  icon: string
  label: string
  color: string
  bg: string
  onPress: () => void
}

interface Props {
  children: React.ReactNode
  leftAction?: Action
  rightAction?: Action
  style?: ViewStyle
}

function ActionView({ action, side, dragX }: { action: Action; side: 'left' | 'right'; dragX: Animated.AnimatedInterpolation<number> }) {
  const scale = dragX.interpolate(
    side === 'left'
      ? { inputRange: [0, 80], outputRange: [0.5, 1], extrapolate: 'clamp' }
      : { inputRange: [-80, 0], outputRange: [1, 0.5], extrapolate: 'clamp' }
  )
  const opacity = dragX.interpolate(
    side === 'left'
      ? { inputRange: [0, 60], outputRange: [0, 1], extrapolate: 'clamp' }
      : { inputRange: [-60, 0], outputRange: [1, 0], extrapolate: 'clamp' }
  )

  return (
    <Animated.View style={[styles.action, { backgroundColor: action.bg, opacity }, side === 'left' ? styles.actionLeft : styles.actionRight]}>
      <Animated.View style={[styles.actionContent, { transform: [{ scale }] }]}>
        <Feather name={action.icon as any} size={20} color={action.color} />
        <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
      </Animated.View>
    </Animated.View>
  )
}

export function SwipeableRow({ children, leftAction, rightAction, style }: Props) {
  const swipeRef = useRef<SwipeableRef>(null)

  const renderLeft = leftAction
    ? (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => (
        <ActionView action={leftAction} side="left" dragX={dragX} />
      )
    : undefined

  const renderRight = rightAction
    ? (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => (
        <ActionView action={rightAction} side="right" dragX={dragX} />
      )
    : undefined

  const handleSwipeLeft = () => {
    if (rightAction) {
      hapticLight()
      rightAction.onPress()
      swipeRef.current?.close()
    }
  }

  const handleSwipeRight = () => {
    if (leftAction) {
      hapticLight()
      leftAction.onPress()
      swipeRef.current?.close()
    }
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderLeft}
      renderRightActions={renderRight}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') handleSwipeRight()
        if (direction === 'right') handleSwipeLeft()
      }}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      leftThreshold={80}
      rightThreshold={80}
    >
      <View style={style}>{children}</View>
    </Swipeable>
  )
}

const styles = StyleSheet.create({
  action: {
    justifyContent: 'center',
    width: 90,
    borderRadius: 12,
    marginVertical: 1,
  },
  actionLeft: { alignItems: 'flex-start', paddingLeft: 20 },
  actionRight: { alignItems: 'flex-end', paddingRight: 20 },
  actionContent: { alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: 10, fontWeight: '700' },
})
