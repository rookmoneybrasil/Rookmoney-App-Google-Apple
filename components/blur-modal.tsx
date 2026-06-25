import { useEffect, useRef } from 'react'
import { Modal, View, StyleSheet, Animated, TouchableWithoutFeedback, type ModalProps } from 'react-native'
import { BlurView } from 'expo-blur'
import { COLORS } from '@/lib/constants'

interface Props extends Omit<ModalProps, 'animationType'> {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  position?: 'bottom' | 'center'
}

export function BlurModal({ visible, onClose, children, position = 'bottom', ...rest }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(position === 'bottom' ? 300 : 0)).current
  const scaleAnim = useRef(new Animated.Value(position === 'center' ? 0.85 : 1)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        position === 'bottom'
          ? Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true })
          : Animated.spring(scaleAnim, { toValue: 1, damping: 14, stiffness: 200, useNativeDriver: true }),
      ]).start()
    } else {
      fadeAnim.setValue(0)
      slideAnim.setValue(300)
      scaleAnim.setValue(0.85)
    }
  }, [visible])

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" {...rest}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={StyleSheet.absoluteFill} />
        </Animated.View>
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          position === 'bottom' ? styles.bottomSheet : styles.centerSheet,
          position === 'bottom'
            ? { transform: [{ translateY: slideAnim }] }
            : { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
        pointerEvents="box-none"
      >
        <TouchableWithoutFeedback>
          <View style={position === 'bottom' ? styles.bottomContent : styles.centerContent}>
            {position === 'bottom' && <View style={styles.handle} />}
            {children}
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheet: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  centerSheet: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  bottomContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '85%',
  },
  centerContent: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
})
