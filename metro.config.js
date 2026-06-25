const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// SVG transformer
const { transformer, resolver } = config
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
}
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
}

config.transformIgnorePatterns = [
  'node_modules/(?!(react-native|@react-native|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|expo|@expo|@react-navigation)/)',
]

module.exports = config
