import { useState, useCallback, useRef } from 'react'
import { Platform, Alert } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { billingApi } from './api'
import { useWelcomePro } from './welcome-pro'
import { requestIntegrityToken } from '../modules/play-integrity'

export const APPLE_SKUS = {
  PRO_MONTHLY:      'rook_pro_monthly',
  PRO_ANNUAL:       'rook_pro_annual',
  PRO_PLUS_MONTHLY: 'rook_pro_plus_monthly',
  PRO_PLUS_ANNUAL:  'rook_pro_plus_annual',
} as const

export const GOOGLE_PLAY_SKUS = APPLE_SKUS  // same IDs on both stores

const ALL_SKUS = Object.values(APPLE_SKUS)

export const isGooglePlay = Platform.OS === 'android'
export const isAppleIAP   = Platform.OS === 'ios'
export const isNativeIAP  = isGooglePlay || isAppleIAP

let _iap: typeof import('react-native-iap') | null = null
function getIAP() {
  if (_iap) return _iap
  try {
    _iap = require('react-native-iap')
    return _iap
  } catch {
    return null
  }
}

// Resolves `fallback` if `p` doesn't settle within `ms` — the underlying promise
// keeps running but its late result is ignored. Used so a hung Play Integrity /
// nonce call can never freeze the purchase button indefinitely.
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

// Play Integrity attestation (Android). Fetches a server-issued nonce, then asks
// the native module for an integrity token. Returns null on any failure OR if it
// takes too long — the server tolerates a missing token (fail-open on infra) but
// still blocks a device that returns a token with a failing verdict. iOS → null.
async function fetchIntegrityToken(): Promise<string | null> {
  if (!isGooglePlay) return null
  return withTimeout(
    (async () => {
      try {
        const nonce = await billingApi.integrityNonce()
        if (!nonce) return null
        return await requestIntegrityToken(nonce)
      } catch (err) {
        console.warn('[IAP] integrity token failed:', err)
        return null
      }
    })(),
    10_000,
    null,
  )
}

export function useNativeIAP() {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const connectedRef = useRef(false)
  const subsRef = useRef<any[]>([])

  const ensureConnected = useCallback(async () => {
    if (connectedRef.current) return true
    const iap = getIAP()
    if (!iap) return false

    try {
      await iap.initConnection()
      const result = await iap.fetchProducts({ skus: ALL_SKUS, type: 'subs' })
      subsRef.current = Array.isArray(result) ? result : []
      connectedRef.current = true
      setReady(true)
      return true
    } catch (err) {
      console.warn('[IAP] init failed:', err)
      return false
    }
  }, [])

  const purchase = useCallback(async (plan: 'PRO' | 'PRO_PLUS', annual: boolean): Promise<boolean> => {
    const iap = getIAP()
    if (!iap) {
      Alert.alert('Erro', isAppleIAP ? 'App Store indisponível neste dispositivo.' : 'Google Play indisponível neste dispositivo.')
      return false
    }

    if (!connectedRef.current) {
      const ok = await ensureConnected()
      if (!ok) {
        Alert.alert('Erro', isAppleIAP ? 'Não foi possível conectar à App Store.' : 'Não foi possível conectar à Google Play.')
        return false
      }
    }

    const skuMap = {
      PRO:      annual ? APPLE_SKUS.PRO_ANNUAL      : APPLE_SKUS.PRO_MONTHLY,
      PRO_PLUS: annual ? APPLE_SKUS.PRO_PLUS_ANNUAL : APPLE_SKUS.PRO_PLUS_MONTHLY,
    }
    const sku = skuMap[plan]

    // Android: need offerToken from subscription details
    if (isGooglePlay) {
      // Re-fetch if products were empty on initial connection (not yet propagated to Play)
      if (subsRef.current.length === 0) {
        try {
          const result = await iap.fetchProducts({ skus: ALL_SKUS, type: 'subs' })
          subsRef.current = Array.isArray(result) ? result : []
        } catch (err) {
          console.warn('[IAP] re-fetch failed:', err)
        }
      }

      // react-native-iap v15 renamed the fetched-product fields: the SKU is now
      // `id` (not `productId`) and offers are under `subscriptionOffers` (or the
      // deprecated `subscriptionOfferDetailsAndroid`). Using the old names made
      // `find`/`offerToken` return undefined → "Produto indisponível" on Android
      // even with active subscriptions. Match all shapes to stay version-safe.
      const sub = subsRef.current.find((s: any) => s.id === sku || s.productId === sku)
      const offerToken =
        sub?.subscriptionOffers?.[0]?.offerToken ??
        sub?.subscriptionOfferDetailsAndroid?.[0]?.offerToken ??
        sub?.subscriptionOfferDetails?.[0]?.offerToken
      if (!sub || !offerToken) {
        Alert.alert('Produto indisponível', 'O produto ainda não está disponível na sua conta. Aguarde alguns minutos e tente novamente.')
        return false
      }

      setLoading(true)

      // Pre-purchase Play Integrity gate — block a compromised device BEFORE the
      // Google Play sheet opens, so it's never charged (avoids the charge→refund
      // churn of blocking post-purchase). Only an explicit integrity denial stops
      // the flow; checkIntegrity fail-opens on any network/server error (it never
      // throws), so a flaky connection can't block a legitimate upgrade. The
      // post-purchase verify re-checks with its own fresh token as a second layer.
      const gate = await billingApi.checkIntegrity(await fetchIntegrityToken())
      if (gate.blocked) {
        setLoading(false)
        Alert.alert('Não foi possível concluir', gate.message ?? 'Seu dispositivo não passou na verificação de segurança.')
        return false
      }

      return executeNativePurchase(iap, sku, plan, {
        type: 'subs',
        request: { google: { skus: [sku], subscriptionOffers: [{ sku, offerToken }] } },
      }, queryClient, setLoading)
    }

    // iOS: no offerToken needed
    setLoading(true)
    return executeNativePurchase(iap, sku, plan, {
      type: 'subs',
      request: { apple: { sku } },
    }, queryClient, setLoading)
  }, [ensureConnected, queryClient])

  // Restore purchases — required by App Store (Guideline 3.1.1) and needed when
  // a user reinstalls / switches devices. Re-verifies active purchases with the
  // server so the plan is reactivated. (Purchase.productId is the SKU here — note
  // the fetched Product uses `id` instead, per react-native-iap v15.)
  const restore = useCallback(async (): Promise<boolean> => {
    const iap = getIAP()
    if (!iap) {
      Alert.alert('Erro', isAppleIAP ? 'App Store indisponível neste dispositivo.' : 'Google Play indisponível neste dispositivo.')
      return false
    }
    if (!connectedRef.current) {
      const ok = await ensureConnected()
      if (!ok) { Alert.alert('Erro', 'Não foi possível conectar à loja.'); return false }
    }
    setLoading(true)
    try {
      const purchases: any[] = await iap.getAvailablePurchases()
      const active = Array.isArray(purchases) ? purchases : []
      // One integrity attestation for the whole restore batch (Android).
      const integrityToken = await fetchIntegrityToken()
      let restored = false
      for (const p of active) {
        const token = (p.purchaseToken ?? p.jwsRepresentationIOS ?? p.jwsRepresentation) as string | undefined
        if (!token) continue
        try {
          if (isAppleIAP) await billingApi.verifyApple(token)
          else if (isGooglePlay) await billingApi.verifyGooglePlay(p.productId, token, integrityToken)
          restored = true
        } catch (err) {
          console.warn('[IAP] restore verify failed:', err)
        }
      }
      await queryClient.refetchQueries({ queryKey: ['me'] })
      await queryClient.refetchQueries({ queryKey: ['settings-prefs'] })
      Alert.alert(
        restored ? 'Compras restauradas' : 'Nenhuma assinatura ativa',
        restored
          ? 'Sua assinatura foi restaurada com sucesso.'
          : 'Não encontramos assinaturas ativas nesta conta da loja.',
      )
      return restored
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao restaurar compras.')
      return false
    } finally {
      setLoading(false)
    }
  }, [ensureConnected, queryClient])

  return { purchase, restore, loading, ready, ensureConnected }
}

// backward-compat alias
export const useGooglePlayIAP = useNativeIAP

async function executeNativePurchase(
  iap: any,
  sku: string,
  plan: 'PRO' | 'PRO_PLUS',
  purchaseRequest: any,
  queryClient: ReturnType<typeof useQueryClient>,
  setLoading: (v: boolean) => void,
): Promise<boolean> {
  try {
    return await new Promise<boolean>((resolve) => {
      const successSub = iap.purchaseUpdatedListener(async (purchaseData: any) => {
        successSub.remove()
        errorSub.remove()

        // react-native-iap v15 UNIFIED the token: purchaseData.purchaseToken holds
        // the iOS StoreKit 2 JWS OR the Android purchaseToken. The old
        // `jwsRepresentation` field was removed, so reading it left iOS purchases
        // unverified (user charged, plan never activated). Fallbacks kept for safety.
        const token = (purchaseData.purchaseToken
          ?? purchaseData.jwsRepresentationIOS
          ?? purchaseData.jwsRepresentation) as string | undefined

        if (!token) {
          setLoading(false)
          resolve(false)
          return
        }

        try {
          if (isAppleIAP) {
            await billingApi.verifyApple(token)
          } else if (isGooglePlay) {
            const integrityToken = await fetchIntegrityToken()
            await billingApi.verifyGooglePlay(sku, token, integrityToken)
          }

          await iap.finishTransaction({ purchase: purchaseData, isConsumable: false })
          await queryClient.refetchQueries({ queryKey: ['me'] })
          await queryClient.refetchQueries({ queryKey: ['settings-prefs'] })

          // Popup de boas-vindas com Rookinho + vantagens (montado no _layout)
          useWelcomePro.getState().show(plan)
          resolve(true)
        } catch (err: any) {
          console.error('[IAP] verify error:', err)
          // Surface the server's message when there is one (e.g. the Play Integrity
          // block explains the device was rejected) instead of a misleading generic
          // "try to restore" — a blocked device would just fail the restore too.
          Alert.alert(
            'Não foi possível concluir',
            err?.message ?? 'Compra realizada mas houve falha na verificação. Tente restaurar compras.',
          )
          resolve(false)
        } finally {
          setLoading(false)
        }
      })

      const errorSub = iap.purchaseErrorListener((error: any) => {
        successSub.remove()
        errorSub.remove()
        setLoading(false)

        if (error.code !== 'user-cancelled') {
          Alert.alert('Erro na compra', error.message ?? 'Tente novamente.')
        }
        resolve(false)
      })

      iap.requestPurchase(purchaseRequest).catch((err: any) => {
        successSub.remove()
        errorSub.remove()
        setLoading(false)

        if (err?.code !== 'user-cancelled') {
          Alert.alert('Erro', err?.message ?? 'Falha ao iniciar compra.')
        }
        resolve(false)
      })
    })
  } catch {
    setLoading(false)
    return false
  }
}
