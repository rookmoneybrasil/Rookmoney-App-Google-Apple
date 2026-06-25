import { useEffect, useRef } from 'react'
import { Animated, Easing, View, StyleSheet, type ViewStyle } from 'react-native'
import { COLORS } from '@/lib/constants'

function ShimmerBase({ style }: { style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [])

  return <Animated.View style={[styles.shimmer, style, { opacity }]} />
}

export function SkeletonLine({ width = '100%', height = 14, radius = 6, style }: { width?: number | string; height?: number; radius?: number; style?: ViewStyle }) {
  return <ShimmerBase style={[{ width: width as any, height, borderRadius: radius }, style]} />
}

export function SkeletonCircle({ size = 40, style }: { size?: number; style?: ViewStyle }) {
  return <ShimmerBase style={[{ width: size, height: size, borderRadius: size / 2 }, style]} />
}

export function SkeletonCard({ height = 100, style }: { height?: number; style?: ViewStyle }) {
  return <ShimmerBase style={[{ height, borderRadius: 16, width: '100%' }, style]} />
}

export function DashboardSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      {/* Header */}
      <View style={skeletonStyles.header}>
        <SkeletonCircle size={48} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonLine width="60%" height={18} />
          <SkeletonLine width="30%" height={12} />
        </View>
      </View>

      {/* Section label */}
      <SkeletonLine width="50%" height={10} style={{ marginTop: 20, marginBottom: 12 }} />

      {/* KPI grid */}
      <View style={skeletonStyles.kpiGrid}>
        <View style={skeletonStyles.kpiRow}>
          <SkeletonCard height={110} style={{ flex: 1 }} />
          <SkeletonCard height={110} style={{ flex: 1 }} />
        </View>
        <View style={skeletonStyles.kpiRow}>
          <SkeletonCard height={110} style={{ flex: 1 }} />
          <SkeletonCard height={110} style={{ flex: 1 }} />
        </View>
      </View>

      {/* Section */}
      <SkeletonLine width="30%" height={10} style={{ marginTop: 20, marginBottom: 12 }} />
      <SkeletonCard height={70} style={{ marginBottom: 8 }} />
      <SkeletonCard height={60} style={{ marginBottom: 8 }} />

      {/* Section */}
      <SkeletonLine width="25%" height={10} style={{ marginTop: 20, marginBottom: 12 }} />
      <SkeletonCard height={80} style={{ marginBottom: 8 }} />
      <SkeletonCard height={80} />
    </View>
  )
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={skeletonStyles.container}>
      {/* Header */}
      <View style={{ gap: 6, marginBottom: 16 }}>
        <SkeletonLine width="40%" height={20} />
        <SkeletonLine width="25%" height={12} />
      </View>

      {/* Summary cards */}
      <View style={skeletonStyles.kpiRow}>
        <SkeletonCard height={80} style={{ flex: 1 }} />
        <SkeletonCard height={80} style={{ flex: 1 }} />
      </View>

      {/* List rows */}
      <View style={{ gap: 8, marginTop: 16 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <View key={i} style={skeletonStyles.listRow}>
            <SkeletonCircle size={36} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonLine width="70%" height={14} />
              <SkeletonLine width="40%" height={10} />
            </View>
            <SkeletonLine width={70} height={16} />
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shimmer: {
    backgroundColor: COLORS.card2,
  },
})

const skeletonStyles = StyleSheet.create({
  container: { padding: 16, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  kpiGrid: { gap: 10 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 12, padding: 12 },
})
