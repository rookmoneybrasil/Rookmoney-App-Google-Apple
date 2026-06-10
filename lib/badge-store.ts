import { create } from 'zustand'

interface BadgeState {
  billsBadge:     number
  peopleBadge:    number
  overdueBadge:   number
  setBillsBadge:   (n: number) => void
  setPeopleBadge:  (n: number) => void
  setOverdueBadge: (n: number) => void
}

export const useBadgeStore = create<BadgeState>((set) => ({
  billsBadge:    0,
  peopleBadge:   0,
  overdueBadge:  0,
  setBillsBadge:   (n) => set({ billsBadge:   n }),
  setPeopleBadge:  (n) => set({ peopleBadge:  n }),
  setOverdueBadge: (n) => set({ overdueBadge: n }),
}))
