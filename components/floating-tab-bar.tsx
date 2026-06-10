import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Text } from '@/components/text'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { useBadgeStore } from '@/lib/badge-store'

type FeatherName = React.ComponentProps<typeof Feather>['name']

const TABS = [
  { name: 'index',  label: 'Início',  icon: 'home'        },
  { name: 'income', label: 'Rendas',  icon: 'trending-up' },
  { name: 'bills',  label: 'Contas',  icon: 'file-text'   },
  { name: 'people', label: 'Pessoas', icon: 'users'       },
  { name: 'more',   label: 'Mais',    icon: 'grid'        },
] as const

interface Props {
  state:      { index: number; routes: { key: string; name: string }[] }
  navigation: { navigate: (name: string) => void; emit: (opts: { type: string; data: { tabName: string }; canPreventDefault: boolean }) => { defaultPrevented: boolean } }
}

export function FloatingTabBar({ state, navigation }: Props) {
  const billsBadge  = useBadgeStore((s) => s.billsBadge)
  const peopleBadge = useBadgeStore((s) => s.peopleBadge)

  const badges: Partial<Record<string, number>> = {
    bills:  billsBadge,
    people: peopleBadge,
  }

  return (
    <View style={styles.outer}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const routeIdx = state.routes.findIndex((r) => r.name === tab.name)
          const focused  = routeIdx === state.index
          const badge    = badges[tab.name] ?? 0

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              activeOpacity={0.7}
              onPress={() => {
                if (routeIdx < 0) return
                const event = navigation.emit({
                  type: 'tabPress',
                  data: { tabName: tab.name },
                  canPreventDefault: true,
                })
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(tab.name)
                }
              }}
            >
              {focused && <View style={styles.activePill} />}
              <View style={styles.iconWrap}>
                <Feather
                  name={tab.icon as FeatherName}
                  size={21}
                  color={focused ? COLORS.brand : COLORS.muted}
                />
                {badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : String(badge)}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const PB = Platform.OS === 'android' ? 10 : 24

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 16,
    paddingBottom: PB,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 0, bottom: 0,
    left: 4, right: 4,
    borderRadius: 18,
    backgroundColor: COLORS.brand + '18',
  },
  iconWrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -5, right: -8,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 16, height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.card,
  },
  badgeText:   { fontSize: 9,  fontWeight: '800', color: '#fff' },
  label:       { fontSize: 9,  fontWeight: '500', color: COLORS.muted },
  labelActive: { color: COLORS.brand, fontWeight: '700' },
})
