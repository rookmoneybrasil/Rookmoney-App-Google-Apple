import { useState, useCallback, useRef } from 'react'
import { Platform, Alert } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { billingApi } from './api'

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

  return { purchase, loading, ready, ensureConnected }
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

        // iOS uses jwsRepresentation (StoreKit 2); Android uses purchaseToken
        const jwsTransaction  = purchaseData.jwsRepresentation as string | undefined
        const purchaseToken   = purchaseData.purchaseToken     as string | undefined

        if (!jwsTransaction && !purchaseToken) {
          setLoading(false)
          resolve(false)
          return
        }

        try {
          if (isAppleIAP && jwsTransaction) {
            await billingApi.verifyApple(jwsTransaction)
          } else if (isGooglePlay && purchaseToken) {
            await billingApi.verifyGooglePlay(sku, purchaseToken)
          }

          await iap.finishTransaction({ purchase: purchaseData, isConsumable: false })
          await queryClient.refetchQueries({ queryKey: ['me'] })
          await queryClient.refetchQueries({ queryKey: ['settings-prefs'] })

          const label = plan === 'PRO_PLUS' ? 'PRO+' : 'PRO'
          if (plan === 'PRO_PLUS') {
            Alert.alert(
              `Bem-vindo ao ${label}!`,
              'Rookinho IA ilimitado, análises ilimitadas, arquivos ilimitados, scanner ilimitado, Rookinho no WhatsApp e suporte prioritário.',
              [{ text: 'Começar a usar' }],
            )
          } else {
            Alert.alert(
              `Bem-vindo ao ${label}!`,
              'Tudo ilimitado, Rookinho IA (30 msgs/mês), relatórios, projeção, orçamento e importação CSV.',
              [{ text: 'Começar a usar' }],
            )
          }
          resolve(true)
        } catch (err: any) {
          console.error('[IAP] verify error:', err)
          Alert.alert('Erro', 'Compra realizada mas falha na verificação. Tente restaurar compras.')
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
