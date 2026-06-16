import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@rook_haptics_enabled'

let _enabled = true

export async function loadHapticsPreference() {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY)
    _enabled = val !== 'false'
  } catch {
    _enabled = true
  }
}

export async function setHapticsEnabled(enabled: boolean) {
  _enabled = enabled
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(enabled))
  } catch {}
}

export function isHapticsEnabled() {
  return _enabled
}

export function hapticLight() {
  if (!_enabled) return
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}

export function hapticMedium() {
  if (!_enabled) return
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
}

export function hapticSuccess() {
  if (!_enabled) return
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
}

export function hapticError() {
  if (!_enabled) return
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
}

export function hapticSelection() {
  if (!_enabled) return
  Haptics.selectionAsync().catch(() => {})
}
