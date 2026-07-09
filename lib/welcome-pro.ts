import { create } from 'zustand'

// Popup de "Bem-vindo ao PRO/PRO+" pós-compra. Disparado de fora de componentes
// (fluxo de compra IAP em iap.ts, detecção de upgrade via AppState em billing.tsx)
// usando useWelcomePro.getState().show(plan). O modal fica montado global no
// _layout.tsx e escuta este store.
type Plan = 'PRO' | 'PRO_PLUS'

type WelcomeProState = {
  plan: Plan | null
  show: (plan: Plan) => void
  hide: () => void
}

export const useWelcomePro = create<WelcomeProState>((set) => ({
  plan: null,
  show: (plan) => set({ plan }),
  hide: () => set({ plan: null }),
}))
