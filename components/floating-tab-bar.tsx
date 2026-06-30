import { useRef, useEffect, useState } from 'react'
import { View, TouchableOpacity, StyleSheet, Platform, Animated, LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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

function TabIcon({ icon, focused }: { icon: FeatherName; focused: boolean }) {
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (focused) {
      scale.setValue(0.8)
      Animated.spring(scale, {
        toValue: 1,
        damping: 8,
        stiffness: 300,
        useNativeDriver: true,
      }).start()
    }
  }, [focused])

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Feather name={icon} size={21} color={focused ? COLORS.brand : COLORS.muted} />
    </Animated.View>
  )
}

export function FloatingTabBar({ state, navigation }: Props) {
  const insets      = useSafeAreaInsets()
  const billsBadge  = useBadgeStore((s) => s.billsBadge)
  const peopleBadge = useBadgeStore((s) => s.peopleBadge)
  const pillX = useRef(new Animated.Value(0)).current
  const [tabWidth, setTabWidth] = useState(0)

  const badges: Partial<Record<string, number>> = {
    bills:  billsBadge,
    people: peopleBadge,
  }

  const activeIdx = TABS.findIndex((t) => {
    const routeIdx = state.routes.findIndex((r) => r.name === t.name)
    return routeIdx === state.index
  })

  useEffect(() => {
    if (tabWidth > 0) {
      Animated.spring(pillX, {
        toValue: activeIdx * tabWidth,
        damping: 18,
        stiffness: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [activeIdx, tabWidth])

  const handleBarLayout = (e: LayoutChangeEvent) => {
    const barW = e.nativeEvent.layout.width - 12
    setTabWidth(barW / TABS.length)
  }

  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 16)

  return (
    <View style={[styles.outer, { paddingBottom: bottomPad }]}>
      <View style={styles.bar} onLayout={handleBarLayout}>
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.activePill,
              {
                width: tabWidth - 8,
                transform: [{ translateX: Animated.add(pillX, 4 + 6) }],
              },
            ]}
          />
        )}
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
              <View style={styles.iconWrap}>
                <TabIcon icon={tab.icon as FeatherName} focused={focused} />
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

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 16,
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
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
    zIndex: 1,
  },
  activePill: {
    position: 'absolute',
    top: 4, bottom: 4,
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
