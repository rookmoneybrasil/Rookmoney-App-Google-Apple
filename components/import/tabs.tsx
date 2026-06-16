import { useState, type ReactNode } from 'react'
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { Text } from '@/components/text'
import { COLORS } from '@/lib/constants'

export interface TabItem {
  id:      string
  label:   string
  icon:    string
  content: ReactNode
}

interface Props {
  tabs: TabItem[]
}

export function Tabs({ tabs }: Props) {
  const [active, setActive] = useState(tabs[0]?.id)
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0]

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, active === tab.id && styles.tabBtnActive]}
            onPress={() => setActive(tab.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, active === tab.id && styles.tabLabelActive]} numberOfLines={2}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab?.content}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, marginTop: 16, marginBottom: 20,
  },
  tabBtn: {
    flex: 1, alignItems: 'center', gap: 4,
    paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  tabBtnActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandDim },
  tabIcon:  { fontSize: 18 },
  tabLabel: { fontSize: 10, color: COLORS.muted, textAlign: 'center', fontWeight: '600' },
  tabLabelActive: { color: COLORS.brand },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
})
