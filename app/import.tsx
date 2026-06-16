import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Text } from '@/components/text'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '@/lib/constants'
import { meApi, categoriesApi } from '@/lib/api'
import { ProGate } from '@/components/pro-gate'
import { Tabs } from '@/components/import/tabs'
import { OFXImporter } from '@/components/import/ofx-importer'
import { CSVImporter } from '@/components/import/csv-importer'
import { ReceiptScanner } from '@/components/import/receipt-scanner'

export default function ImportScreen() {
  const router = useRouter()

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => meApi.get().then((r) => r.data),
  })

  const isPro = me?.plan === 'PRO'

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then((r) => r.data),
    enabled:  isPro,
  })

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Importar transações</Text>
          <Text style={styles.subtitle}>Importe o extrato do seu banco ou escaneie comprovantes com IA.</Text>
        </View>
      </View>
      <Text style={styles.description}>
        Exporte o extrato OFX direto do internet banking e importe aqui — sem precisar de app de terceiros.
        Também é possível enviar CSV ou fotografar comprovantes.
      </Text>

      {me && !isPro ? (
        <ProGate
          feature="Importação de dados e Scanner de recibo"
          description="Importe extratos OFX, planilhas CSV ou escaneie comprovantes com IA para lançar transações automaticamente."
        />
      ) : categories ? (
        <Tabs
          tabs={[
            { id: 'ofx',     label: 'Extrato do banco (OFX)', icon: '🏦', content: <OFXImporter categories={categories} /> },
            { id: 'csv',     label: 'Importar CSV',           icon: '📊', content: <CSVImporter categories={categories} /> },
            { id: 'receipt', label: 'Comprovante / Nota',     icon: '🧾', content: <ReceiptScanner categories={categories} /> },
          ]}
        />
      ) : (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 60 }} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 20, paddingTop: 56,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginLeft: -8 },
  title:    { fontSize: 20, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  description: { fontSize: 11, color: COLORS.muted2, lineHeight: 15, paddingHorizontal: 20, marginTop: 8 },
})
