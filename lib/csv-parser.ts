export type ParsedRow = {
  [key: string]: string
}

export type MappedRow = {
  date: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  categoryId: string
  _raw: ParsedRow
  _index: number
  _error?: string
}

export const COLUMN_FIELDS = ['date', 'description', 'amount', 'type'] as const
export type ColumnField = (typeof COLUMN_FIELDS)[number]

export const FIELD_LABELS: Record<ColumnField, string> = {
  date: 'Data',
  description: 'Descrição',
  amount: 'Valor',
  type: 'Tipo',
}

// Attempt to detect which CSV column maps to which field
export function autoDetect(headers: string[]): Record<ColumnField, string> {
  const lower = headers.map((h) => h.toLowerCase().trim())

  const find = (...candidates: string[]) => {
    for (const c of candidates) {
      const i = lower.findIndex((h) => h.includes(c))
      if (i !== -1) return headers[i]
    }
    return ''
  }

  return {
    date: find('data', 'date', 'dt', 'vencimento'),
    description: find('descri', 'desc', 'memo', 'hist', 'narr', 'name'),
    amount: find('valor', 'amount', 'value', 'quantia', 'total'),
    type: find('tipo', 'type', 'natureza', 'categ'),
  }
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

export function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^["']|["']$/g, '').trim())
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i])
    const row: ParsedRow = {}
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? '').replace(/^["']|["']$/g, '').trim()
    })
    rows.push(row)
  }

  return { headers, rows }
}

export function inferType(raw: string): 'INCOME' | 'EXPENSE' {
  const lower = raw.toLowerCase().trim()
  if (
    lower === 'receita' ||
    lower === 'income' ||
    lower === 'entrada' ||
    lower === '+' ||
    lower === 'credit' ||
    lower === 'crédito'
  ) {
    return 'INCOME'
  }
  return 'EXPENSE'
}

export function parseDate(raw: string): string {
  // Try ISO first
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  // DD/MM/YYYY
  const dmY = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dmY) return `${dmY[3]}-${dmY[2].padStart(2, '0')}-${dmY[1].padStart(2, '0')}`
  // MM/DD/YYYY
  const mdY = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (mdY) {
    const year = mdY[3].length === 2 ? `20${mdY[3]}` : mdY[3]
    return `${year}-${mdY[1].padStart(2, '0')}-${mdY[2].padStart(2, '0')}`
  }
  return raw
}

export function parseAmount(raw: string): number {
  // Remove currency symbols and spaces, replace comma as decimal
  const cleaned = raw.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  return Math.abs(parseFloat(cleaned))
}

export function buildMappedRows(
  rawRows: ParsedRow[],
  mapping: Record<ColumnField, string>,
  rowCategories: Record<number, string>
): MappedRow[] {
  return rawRows.map((row, i) => {
    const rawDate = mapping.date ? row[mapping.date] ?? '' : ''
    const rawDesc = mapping.description ? row[mapping.description] ?? '' : ''
    const rawAmount = mapping.amount ? row[mapping.amount] ?? '' : ''
    const rawType = mapping.type ? row[mapping.type] ?? '' : 'EXPENSE'

    const date = parseDate(rawDate)
    const amount = parseAmount(rawAmount)
    const type = inferType(rawType)
    const categoryId = rowCategories[i] ?? ''

    return {
      date,
      description: rawDesc,
      amount,
      type,
      categoryId,
      _raw: row,
      _index: i,
    }
  })
}
