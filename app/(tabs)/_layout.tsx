import { Tabs } from 'expo-router'
import { COLORS } from '@/lib/constants'
import { FloatingTabBar } from '@/components/floating-tab-bar'

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        // native tab bar hidden — FloatingTabBar replaces it
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Início' }} />
      <Tabs.Screen name="income"  options={{ title: 'Rendas' }} />
      <Tabs.Screen name="bills"   options={{ title: 'Contas' }} />
      <Tabs.Screen name="people"  options={{ title: 'Pessoas' }} />
      <Tabs.Screen name="more"    options={{ title: 'Mais'   }} />

      {/* Hidden tabs — stack screens only */}
      <Tabs.Screen name="goals" options={{ href: null }} />
    </Tabs>
  )
}
