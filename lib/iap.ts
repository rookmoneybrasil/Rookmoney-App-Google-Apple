import { useState, useCallback, useRef } from 'react'
import { Platform, Alert } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { billingApi } from './api'

export const GOOGLE_PLAY_SKUS = {
  PRO_MONTHLY:      'rook_pro_monthly',
  PRO_ANNUAL:       'rook_pro_annual',
  PRO_PLUS_MONTHLY: 'rook_pro_plus_monthly',
  PRO_PLUS_ANNUAL:  'rook_pro_plus_annual',
} as const

const ALL_SKUS = Object.values(GOOGLE_PLAY_SKUS)

export const isGooglePlay = Platform.OS === 'android'

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

export function useGooglePlayIAP() {
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
      Alert.alert('Erro', 'Google Play indisponivel neste dispositivo.')
      return false
    }

    if (!connectedRef.current) {
      const ok = await ensureConnected()
      if (!ok) {
        Alert.alert('Erro', 'Nao foi possivel conectar a Google Play.')
        return false
      }
    }

    const skuMap = {
      PRO:      annual ? GOOGLE_PLAY_SKUS.PRO_ANNUAL      : GOOGLE_PLAY_SKUS.PRO_MONTHLY,
      PRO_PLUS: annual ? GOOGLE_PLAY_SKUS.PRO_PLUS_ANNUAL : GOOGLE_PLAY_SKUS.PRO_PLUS_MONTHLY,
    }
    const sku = skuMap[plan]

    const sub = subsRef.current.find((s: any) => s.productId === sku)
    const offerToken = sub?.subscriptionOfferDetails?.[0]?.offerToken
    if (!sub || !offerToken) {
      Alert.alert('Erro', 'Produto nao encontrado na Google Play.')
      return false
    }

    setLoading(true)
    try {
      return await new Promise<boolean>((resolve) => {
        const successSub = iap.purchaseUpdatedListener(async (purchaseData) => {
          successSub.remove()
          errorSub.remove()

          if (!purchaseData.purchaseToken) {
            setLoading(false)
            resolve(false)
            return
          }

          try {
            await billingApi.verifyGooglePlay(sku, purchaseData.purchaseToken)
            await iap.finishTransaction({ purchase: purchaseData, isConsumable: false })
            await queryClient.refetchQueries({ queryKey: ['me'] })
            await queryClient.refetchQueries({ queryKey: ['settings-prefs'] })

            const label = plan === 'PRO_PLUS' ? 'PRO+' : 'PRO'
            Alert.alert(
              `Bem-vindo ao ${label}!`,
              plan === 'PRO_PLUS'
                ? 'Rookinho IA ilimitado, analises ilimitadas, arquivos ilimitados, scanner ilimitado e suporte prioritario.'
                : 'Tudo ilimitado, Rookinho IA (30 msgs/mes), relatorios, projecao, orcamento e importacao CSV.',
              [{ text: 'Comecar a usar' }],
            )
            resolve(true)
          } catch (err: any) {
            console.error('[IAP] verify error:', err)
            Alert.alert('Erro', 'Compra realizada mas falha na verificacao. Tente restaurar compras.')
            resolve(false)
          } finally {
            setLoading(false)
          }
        })

        const errorSub = iap.purchaseErrorListener((error) => {
          successSub.remove()
          errorSub.remove()
          setLoading(false)

          if (error.code !== 'user-cancelled') {
            Alert.alert('Erro na compra', error.message ?? 'Tente novamente.')
          }
          resolve(false)
        })

        iap.requestPurchase({
          type: 'subs',
          request: {
            google: {
              skus: [sku],
              subscriptionOffers: [{ sku, offerToken }],
            },
          },
        }).catch((err: any) => {
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
  }, [ensureConnected, queryClient])

  return { purchase, loading, ready, ensureConnected }
}
