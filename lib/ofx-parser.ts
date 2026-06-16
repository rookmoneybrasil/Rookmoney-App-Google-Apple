export type OFXTransaction = {
  id:          string
  date:        string   // YYYY-MM-DD
  description: string
  amount:      number
  type:        'INCOME' | 'EXPENSE'
}

export type OFXParseResult =
  | { ok: true;  transactions: OFXTransaction[]; accountId?: string; currency?: string }
  | { ok: false; error: string }

// OFX dates: YYYYMMDD or YYYYMMDDHHMMSS[.mmm][±HH:MM]
function parseOFXDate(raw: string): string | null {
  const clean = raw.trim().replace(/\[.*\]/, '')
  const m = clean.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

function parseOFXAmount(raw: string): number {
  return parseFloat(raw.trim().replace(',', '.'))
}

// Map OFX TRNTYPE to INCOME/EXPENSE
function mapType(trntype: string, amount: number): 'INCOME' | 'EXPENSE' {
  const t = trntype.trim().toUpperCase()
  if (['CREDIT', 'INT', 'DIV', 'DIRECTDEP', 'XFER'].includes(t)) return 'INCOME'
  if (['DEBIT', 'PAYMENT', 'ATM', 'POS', 'FEE', 'SRVCHG', 'CHECK'].includes(t)) return 'EXPENSE'
  // Fallback: sign of amount
  return amount >= 0 ? 'INCOME' : 'EXPENSE'
}

// Extract a tag value from SGML-style OFX (non-XML variant used by most Brazilian banks)
function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}>([^<\r\n]*)`, 'i')
  const m  = block.match(re)
  return m ? m[1].trim() : ''
}

// Split SGML OFX into STMTTRN blocks
function extractBlocks(text: string, tag: string): string[] {
  const blocks: string[] = []
  const open  = new RegExp(`<${tag}>`, 'gi')
  const close = new RegExp(`<\\/${tag}>`, 'gi')

  let match: RegExpExecArray | null
  while ((match = open.exec(text)) !== null) {
    const start = match.index
    close.lastIndex = start
    const endMatch = close.exec(text)
    const end = endMatch ? endMatch.index + endMatch[0].length : text.length
    blocks.push(text.slice(start, end))
  }
  return blocks
}

// Parse XML-style OFX (newer format)
function parseXMLOFX(text: string): OFXTransaction[] {
  const txns: OFXTransaction[] = []
  const blocks = extractBlocks(text, 'STMTTRN')

  for (const block of blocks) {
    const trntype = extractTag(block, 'TRNTYPE')
    const dtposted = extractTag(block, 'DTPOSTED')
    const rawAmount = extractTag(block, 'TRNAMT')
    const memo   = extractTag(block, 'MEMO') || extractTag(block, 'NAME') || ''
    const fitid  = extractTag(block, 'FITID') || String(Math.random())

    const date   = parseOFXDate(dtposted)
    const amount = parseOFXAmount(rawAmount)

    if (!date || isNaN(amount)) continue

    txns.push({
      id:          fitid,
      date,
      description: memo,
      amount:      Math.abs(amount),
      type:        mapType(trntype, amount),
    })
  }

  return txns
}

export function parseOFX(raw: string): OFXParseResult {
  try {
    const text = raw.trim()

    if (!text) {
      return { ok: false, error: 'Arquivo vazio.' }
    }

    // Detect if it's likely an OFX file
    if (
      !text.includes('STMTTRN') &&
      !text.includes('OFX') &&
      !text.includes('ofx')
    ) {
      return { ok: false, error: 'Arquivo não parece ser um extrato OFX válido.' }
    }

    const transactions = parseXMLOFX(text)

    if (transactions.length === 0) {
      return { ok: false, error: 'Nenhuma transação encontrada no arquivo. Verifique se o arquivo está correto.' }
    }

    // Extract account info if available
    const accountId = extractTag(text, 'ACCTID') || undefined
    const currency  = extractTag(text, 'CURDEF') || 'BRL'

    return { ok: true, transactions, accountId, currency }
  } catch (err) {
    return { ok: false, error: `Erro ao processar arquivo: ${err instanceof Error ? err.message : 'desconhecido'}` }
  }
}
