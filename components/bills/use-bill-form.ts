import { useState } from 'react'
import { Alert } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billsApi, recurringBillsApi, categoriesApi } from '@/lib/api'
import { getServiceBrand } from '@/lib/service-brands'

export type BillMode = 'avulso' | 'parcelado' | 'recorrente'

export function useBillForm({ defaultDueDate, onSuccess }: { defaultDueDate: string; onSuccess: () => void }) {
  const qc = useQueryClient()

  const [mode, setMode]                 = useState<BillMode>('avulso')
  const [name, setName]                 = useState('')
  const [amount, setAmount]             = useState('')
  const [dueDate, setDueDate]           = useState(defaultDueDate)
  const [dayOfMonth, setDayOfMonth]     = useState('1')
  const [categoryId, setCategoryId]     = useState<string | undefined>()
  const [installments, setInstallments] = useState('2')
  const [alreadyPaid, setAlreadyPaid]   = useState('0')
  const [notes, setNotes]               = useState('')
  const [showNotes, setShowNotes]       = useState(false)
  const [showServices, setShowServices] = useState(false)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriesApi.list().then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount.replace(',', '.'))
      if (!name.trim())           throw new Error('Nome é obrigatório')
      if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')

      if (mode === 'recorrente') {
        const day = parseInt(dayOfMonth) || 1
        if (day < 1 || day > 31) throw new Error('Dia inválido (1-31)')
        await recurringBillsApi.create({
          name: name.trim(),
          amount: amt,
          dayOfMonth: day,
          categoryId: categoryId || null,
          notes: notes.trim() || null,
          generateNow: true,
        })
        return
      }

      const inst = parseInt(installments) || 1
      const paid = parseInt(alreadyPaid) || 0

      if (mode === 'parcelado') {
        if (inst < 2) throw new Error('Mínimo 2 parcelas')
        const remaining = inst - paid
        await billsApi.create({
          name:         name.trim(),
          amount:       amt * remaining,
          dueDate:      dueDate,
          isRecurring:  false,
          categoryId:   categoryId || undefined,
          installments: inst,
          alreadyPaid:  paid,
          notes:        notes.trim() || undefined,
        })
        return
      }

      await billsApi.create({
        name:        name.trim(),
        amount:      amt,
        dueDate:     dueDate,
        isRecurring: false,
        categoryId:  categoryId || undefined,
        notes:       notes.trim() || undefined,
      })
    },
    onSuccess: async () => {
      await Promise.all([
        qc.refetchQueries({ queryKey: ['bills'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' }),
      ])
      onSuccess()
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const numInst   = Math.max(parseInt(installments) || 2, 2)
  const numPaid   = Math.min(parseInt(alreadyPaid) || 0, numInst - 1)
  const remaining = numInst - numPaid
  const amt       = parseFloat(amount.replace(',', '.')) || 0
  const detectedBrand = getServiceBrand(name)

  const submitLabel = mode === 'parcelado'
    ? `Criar ${remaining} parcela${remaining > 1 ? 's' : ''}`
    : mode === 'recorrente' ? 'Salvar conta fixa' : 'Adicionar'

  return {
    mode, setMode,
    name, setName,
    amount, setAmount,
    dueDate, setDueDate,
    dayOfMonth, setDayOfMonth,
    categoryId, setCategoryId,
    installments, setInstallments,
    alreadyPaid, setAlreadyPaid,
    notes, setNotes,
    showNotes, setShowNotes,
    showServices, setShowServices,
    categories, detectedBrand,
    numInst, numPaid, remaining, amt,
    submitLabel, mutation,
  }
}

export type UseBillFormReturn = ReturnType<typeof useBillForm>
