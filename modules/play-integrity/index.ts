import { Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo-modules-core'

interface PlayIntegrityNativeModule {
  requestIntegrityToken(nonce: string): Promise<string>
}

// requireOptionalNativeModule returns null when the native module isn't present
// (iOS, Expo Go, or a build made before this module existed) — never throws.
const PlayIntegrityModule =
  requireOptionalNativeModule<PlayIntegrityNativeModule>('PlayIntegrity')

/**
 * Requests a Play Integrity token for a high-value action (Android only).
 *
 * Returns null instead of throwing when integrity can't be produced (non-Android,
 * module missing, or a transient Play Integrity/GMS failure) — a null token means
 * the server skips the check (fail-open on infra). This does NOT open the
 * root/emulator hole: those environments still return a token here, just with a
 * failing verdict that the server blocks.
 */
export async function requestIntegrityToken(nonce: string): Promise<string | null> {
  if (Platform.OS !== 'android' || !PlayIntegrityModule) return null
  try {
    return await PlayIntegrityModule.requestIntegrityToken(nonce)
  } catch (err) {
    console.warn('[PlayIntegrity] token request failed:', err)
    return null
  }
}

export const isPlayIntegrityAvailable = Platform.OS === 'android' && !!PlayIntegrityModule
