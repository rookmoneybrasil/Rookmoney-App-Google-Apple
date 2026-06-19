import { API_BASE_URL } from './constants'
import { useAuthStore } from './auth'

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().token

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  // 204 No Content (DELETE) — no body to parse
  if (res.status === 204) return undefined as T

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error ?? `HTTP ${res.status}`)
  }
  return data as T
}

// ── Auth ──────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string
  user: {
    id: string; name: string; email: string
    plan: string; hasOnboarded: boolean
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<LoginResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
}

// ── Dashboard ─────────────────────────────────────────────────────────

export interface DashboardProjectionItem {
  id:     string
  label:  string
  amount: number
  icon?:  string
}

export interface DashboardProjection {
  month:            string
  projectedIncome:  number
  projectedExpense: number
  projectedBalance: number
  incomeItems: {
    sources:   DashboardProjectionItem[]
    recurring: DashboardProjectionItem[]
    people:    DashboardProjectionItem[]
  }
  expenseItems: {
    bills:     DashboardProjectionItem[]
    recurring: DashboardProjectionItem[]
    people:    DashboardProjectionItem[]
  }
}

export interface DashboardData {
  monthBalance:          number
  monthIncome:           number
  monthExpense:          number
  incomeChange:          number | null
  expenseChange:         number | null
  totalReceivable:       number
  totalPeopleReceivable: number
  totalIncomeReceivable: number
  pendingBillsAmount:    number
  pendingBillsCount:     number
  personPayablesAmount:  number
  overdueCount:          number
  insight:               string
  mood:                  string
  topCategories:         { name: string; icon: string; color: string; amount: number; pct: number }[]
  monthlyHistory:        { month: string; income: number; expense: number; balance: number }[]
  futurePersonPayables:  { id: string; amount: number; description: string; date: string; person: { name: string } }[]
  recentTransactions:    Transaction[]
  upcomingBills:         Bill[]
  pendingIncomeSources:     { id: string; name: string; amount: number; isRecurring: boolean; dayOfMonth: number | null }[]
  monthIncomeTransactions:  (Transaction & { isRecurringIncome: boolean })[]
  monthPeopleReceived:      { id: string; description: string; amount: number; date: string; person: { name: string } }[]
  upcomingPersonPayables:   { id: string; description: string; amount: number; date: string; person: { name: string } }[]
  upcomingPeopleReceivable: { id: string; description: string; amount: number; date: string; person: { name: string } }[]
  projections:              DashboardProjection[]
}

export const dashboardApi = {
  get: () => request<{ data: DashboardData }>('/api/v1/dashboard'),
}

// ── Transactions ──────────────────────────────────────────────────────

export interface Transaction {
  id:          string
  amount:      number
  type:        'INCOME' | 'EXPENSE'
  description: string | null
  date:        string
  categoryId:  string
  category:    { id: string; name: string; icon: string; color: string }
}

export const transactionsApi = {
  list: (params?: { month?: string; type?: string; categoryId?: string; pageSize?: number }) => {
    // Strip undefined/null so they're not serialized as the string "undefined"
    const clean = params
      ? Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
      : {}
    const qs = Object.keys(clean).length > 0
      ? '?' + new URLSearchParams(clean as Record<string, string>).toString()
      : ''
    return request<{ data: { items: Transaction[]; total: number; page: number; totalPages: number } }>(`/api/v1/transactions${qs}`)
  },
  create: (body: { amount: number; type: string; description?: string; date: string; categoryId: string }) =>
    request<{ data: { id: string } }>('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: { amount?: number; type?: string; description?: string; date?: string; categoryId?: string }) =>
    request<{ data: Transaction }>(`/api/v1/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/transactions/${id}`, { method: 'DELETE' }),
  import: (rows: { date: string; description: string; amount: number; type: 'INCOME' | 'EXPENSE'; categoryId: string }[]) =>
    request<{ data: { success: number; skipped: number } }>('/api/v1/transactions/import', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }),
}

// ── Receipt scanner (IA) ──────────────────────────────────────────────

export interface ExtractedData {
  amount:       number
  type:         'INCOME' | 'EXPENSE'
  description:  string
  date:         string
  categoryName: string
  notes:        string | null
  confidence:   'high' | 'medium' | 'low'
  error?:       string
}

export const receiptApi = {
  scan: (imageBase64: string, mediaType: string) =>
    request<ExtractedData>('/api/v1/scan-receipt', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mediaType }),
    }),
}

// ── Categories ────────────────────────────────────────────────────────

export interface Category {
  id: string; name: string; icon: string; color: string; isDefault: boolean
}

export const categoriesApi = {
  list: () => request<{ data: Category[] }>('/api/v1/categories'),
  create: (body: { name: string; icon: string; color: string }) =>
    request<{ data: Category }>('/api/v1/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: { name?: string; icon?: string; color?: string }) =>
    request<{ data: Category }>(`/api/v1/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/categories/${id}`, { method: 'DELETE' }),
}

// ── Bills ─────────────────────────────────────────────────────────────

export interface Bill {
  id:                 string
  name:               string
  amount:             number
  dueDate:            string
  isPaid:             boolean
  isRecurring:        boolean
  installmentCurrent: number | null
  installmentTotal:   number | null
  notes:              string | null
  categoryId?:        string | null
  category?: { id?: string; name: string; icon: string; color?: string } | null
  recurringBillId?:   string | null
  installmentGroupId?: string | null
}

export const billsApi = {
  list: () => request<{ data: Bill[] }>('/api/v1/bills'),
  create: (body: { name: string; amount: number; dueDate: string; isRecurring?: boolean; categoryId?: string; installments?: number; alreadyPaid?: number; notes?: string }) =>
    request<{ data: Bill }>('/api/v1/bills', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  pay: (id: string) =>
    request<{ data: Bill }>(`/api/v1/bills/${id}?action=pay`, {
      method: 'POST',
      body: JSON.stringify({ paid: true }),
    }),
  unpay: (id: string) =>
    request<{ data: Bill }>(`/api/v1/bills/${id}?action=pay`, {
      method: 'POST',
      body: JSON.stringify({ paid: false }),
    }),
  update: (id: string, body: { name?: string; amount?: number; dueDate?: string; isRecurring?: boolean; categoryId?: string | null; notes?: string | null }) =>
    request<{ data: Bill }>(`/api/v1/bills/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/bills/${id}`, { method: 'DELETE' }),
}

// ── Recurring Bills (Contas Fixas) ──────────────────────────────────────

export interface RecurringBill {
  id:             string
  name:           string
  amount:         number
  dayOfMonth:     number
  isActive:       boolean
  lastAutoMonth:  string | null
  notes:          string | null
  categoryId:     string | null
  category?: { id: string; name: string; icon: string; color: string } | null
}

export interface RecurringBillInput {
  name:        string
  amount:      number
  dayOfMonth:  number
  categoryId?: string | null
  notes?:      string | null
  generateNow?: boolean
}

export const recurringBillsApi = {
  list: () => request<{ data: RecurringBill[] }>('/api/v1/bills/recurring'),
  create: (body: RecurringBillInput) =>
    request<{ data: RecurringBill }>('/api/v1/bills/recurring', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<RecurringBillInput> & { isActive?: boolean }) =>
    request<{ data: RecurringBill }>(`/api/v1/bills/recurring/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/bills/recurring/${id}`, { method: 'DELETE' }),
}

// ── Goals ─────────────────────────────────────────────────────────────

export interface GoalContribution {
  id:        string
  amount:    number
  note?:     string | null
  createdAt: string
}

export interface Goal {
  id:            string
  name:          string
  targetAmount:  number
  currentAmount: number
  deadline?:     string | null
  description?:  string | null
  icon?:         string | null
  color?:        string | null
  isCompleted:   boolean
  contributions?: GoalContribution[]
}

export const goalsApi = {
  list: (includeCompleted = false) =>
    request<{ data: Goal[] }>(`/api/v1/goals${includeCompleted ? '?completed=true' : ''}`),
  create: (body: { name: string; targetAmount: number; currentAmount?: number; deadline?: string; description?: string; icon?: string; color?: string }) =>
    request<{ data: Goal }>('/api/v1/goals', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: { name?: string; targetAmount?: number; deadline?: string; description?: string; icon?: string; color?: string }) =>
    request<{ data: Goal }>(`/api/v1/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  contribute: (id: string, amount: number, note?: string, categoryId?: string) =>
    request<{ data: { id: string; currentAmount: number; isCompleted: boolean } }>(`/api/v1/goals/${id}?action=contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount, note, categoryId }),
    }),
  withdraw: (id: string, amount: number, categoryId?: string) =>
    request<{ data: { withdrawn: number; newAmount: number } }>(`/api/v1/goals/${id}?action=withdraw`, {
      method: 'POST',
      body: JSON.stringify({ amount, categoryId }),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/goals/${id}`, { method: 'DELETE' }),
}

// ── Budgets ───────────────────────────────────────────────────────────

export interface Budget {
  id:         string
  categoryId: string
  category:   { id: string; name: string; icon: string; color: string }
  amount:     number
  month:      string
  spent:      number
}

export const budgetsApi = {
  list: (month?: string) => {
    const qs = month && month !== 'undefined' ? `?month=${month}` : ''
    return request<{ data: Budget[] }>(`/api/v1/budget${qs}`)
  },
  create: (body: { categoryId: string; amount: number; month: string }) =>
    request<{ data: Budget }>('/api/v1/budget', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (body: { categoryId: string; amount: number; month: string }) =>
    request<{ data: Budget }>('/api/v1/budget', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/budget/${id}`, { method: 'DELETE' }),
}

// ── Recurring Transactions ────────────────────────────────────────────

export interface Recurring {
  id:          string
  name:        string
  amount:      number
  type:        'INCOME' | 'EXPENSE'
  frequency:   'WEEKLY' | 'MONTHLY' | 'YEARLY'
  dayOfMonth:  number | null
  description: string | null
  isActive:    boolean
  category:    { id: string; name: string; icon: string }
}

export const recurringApi = {
  list: () => request<{ data: Recurring[] }>('/api/v1/recurring'),
  create: (body: { name: string; amount: number; type: string; frequency: string; dayOfMonth?: number; categoryId: string; description?: string }) =>
    request<{ data: Recurring }>('/api/v1/recurring', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: { name?: string; type?: string; amount?: number; frequency?: string; dayOfMonth?: number; categoryId?: string; description?: string | null; isActive?: boolean }) =>
    request<{ data: Recurring }>(`/api/v1/recurring/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  toggle: (id: string, isActive: boolean) =>
    request<{ data: Recurring }>(`/api/v1/recurring/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/recurring/${id}`, { method: 'DELETE' }),
}

// ── Income Sources ────────────────────────────────────────────────────

export interface IncomeSource {
  id:               string
  name:             string
  type:             'EMPLOYMENT' | 'FREELANCE' | 'RENTAL' | 'OTHER'
  amount:           number
  isRecurring:      boolean
  dayOfMonth:       number | null
  startDate:        string | null
  lastAutoPayMonth: string | null
  notes:            string | null
}

export interface IncomeHistoryEntry {
  id:       string
  amount:   number
  date:     string
  category: { id: string; name: string; icon: string; color: string } | null
}

export const incomeSourcesApi = {
  list: () => request<{ data: IncomeSource[] }>('/api/v1/income-sources'),
  history: () => request<{ data: Record<string, IncomeHistoryEntry[]> }>('/api/v1/income-sources/history'),
  create: (body: { name: string; type: string; amount: number; isRecurring?: boolean; dayOfMonth?: number; startDate?: string; notes?: string; categoryId?: string | null }) =>
    request<{ data: IncomeSource }>('/api/v1/income-sources', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: { name?: string; type?: string; amount?: number; isRecurring?: boolean; dayOfMonth?: number; startDate?: string | null; notes?: string | null; lastAutoPayMonth?: string | null }) =>
    request<{ data: IncomeSource }>(`/api/v1/income-sources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  revert: (id: string) =>
    request<{ data: IncomeSource }>(`/api/v1/income-sources/${id}?action=revert`, { method: 'POST' }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/income-sources/${id}`, { method: 'DELETE' }),
}

// ── Reports ───────────────────────────────────────────────────────────

export interface MonthlyReport {
  monthKey:    string
  monthFull:   string
  totalIncome: number
  totalExpense: number
  balance:     number
  savingsRate: number
}

export interface PeriodReport {
  totalIncome:       number
  totalExpense:      number
  balance:           number
  netBalance:        number
  savingsRate:       number
  avgMonthlyIncome:  number
  avgMonthlyExpense: number
  positiveMonths:    number
  totalMonths:       number
  bestMonth:         string | null
  worstMonth:        string | null
}

export interface CategoryTrend {
  categoryId: string
  name:       string
  icon:       string
  color:      string
  total:      number
  prevTotal:  number
  change:     number
  delta:      number
  pct:        number
}

export interface TopExpense {
  id:          string
  description: string | null
  amount:      number
  date:        string
  category:    { id: string; name: string; icon: string; color: string }
}

export interface SpendingDay {
  day:   number
  total: number
}

export interface IncomeSourceReport {
  name:  string
  total: number
}

export interface ReportsData {
  monthly:       MonthlyReport[]
  period:        PeriodReport
  categoryTrend: CategoryTrend[]
  topExpenses:   TopExpense[]
  spendingByDay: SpendingDay[]
  incomeSources: IncomeSourceReport[]
}

export const reportsApi = {
  get: (months?: number, month?: string) => {
    const params = new URLSearchParams()
    if (months) params.set('months', String(months))
    if (month)  params.set('month', month)
    const qs = params.toString()
    return request<{ data: ReportsData }>(`/api/v1/reports${qs ? `?${qs}` : ''}`)
  },
}

// ── Me ────────────────────────────────────────────────────────────────

export interface MeData {
  id:           string
  name:         string
  email:        string
  plan:         string
  hasOnboarded: boolean
  profileImage: string | null
  bio:          string | null
  city:         string | null
  occupation:   string | null
  badges:       Record<string, number>
  usage: {
    transactionsThisMonth: number
    bills:                 number
    goals:                 number
    people:                number
    customCategories:      number
    recurring:             number
  }
  limits: {
    transactionsPerMonth: number | null
    bills:                number | null
    goals:                number | null
    people:               number | null
    customCategories:     number | null
    recurring:            number | null
    budget:               boolean
    reports:              boolean
    projection:           boolean
    import:               boolean
  }
}

export const meApi = {
  get: () => request<{ data: MeData }>('/api/v1/auth/me'),
}

// ── Settings ──────────────────────────────────────────────────────────

export interface SettingsPrefs {
  notifBillReminder:  boolean
  notifCategoryLimit: boolean
  notifMonthlyEmail:  boolean
}

export interface SettingsData {
  id:                   string
  name:                 string
  email:                string
  plan:                 string
  hasOnboarded:         boolean
  whatsappPhone:        string | null
  createdAt:            string
  profileImage:         string | null
  bio:                   string | null
  city:                 string | null
  occupation:           string | null
  birthdate:            string | null
  notifBillReminder:    boolean
  notifCategoryLimit:   boolean
  notifMonthlyEmail:    boolean
  currency:             string
  dateFormat:           string
  stripeCustomerId:     string | null
  stripeSubscriptionId: string | null
  hasGoogle:            boolean
}

export const settingsApi = {
  update: (body: { name?: string; whatsappPhone?: string; profileImage?: string; bio?: string; city?: string; occupation?: string; birthdate?: string; hasOnboarded?: boolean }) =>
    request<{ data: MeData }>('/api/v1/settings', {
      method: 'PATCH',
      body:   JSON.stringify(body),
    }),
  getPrefs: () =>
    request<{ data: SettingsData }>('/api/v1/settings'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ data: { message: string } }>('/api/v1/settings?action=password', {
      method: 'PATCH',
      body:   JSON.stringify({ currentPassword, newPassword }),
    }),
  updateNotifications: (body: { notifBillReminder?: boolean; notifCategoryLimit?: boolean; notifMonthlyEmail?: boolean }) =>
    request<{ data: { message: string } }>('/api/v1/settings?action=notifications', {
      method: 'PATCH',
      body:   JSON.stringify(body),
    }),
  updatePreferences: (body: { currency?: string; dateFormat?: string }) =>
    request<{ data: { message: string } }>('/api/v1/settings?action=preferences', {
      method: 'PATCH',
      body:   JSON.stringify(body),
    }),
  disconnectGoogle: () =>
    request<{ data: { message: string } }>('/api/v1/settings?action=disconnect-google', {
      method: 'PATCH',
      body:   JSON.stringify({}),
    }),
  delete: () =>
    request<{ data: { message: string } }>('/api/v1/settings', { method: 'DELETE' }),
}

// ── Calendar ──────────────────────────────────────────────────────────

export interface CalendarEvent {
  id:     string
  day:    number
  type:   'bill' | 'income' | 'recurring'
  label:  string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'expected' | 'received'
  href:   string
  color:  'success' | 'danger' | 'warning'
}

export interface CalendarData {
  month:        string
  daysInMonth:  number
  firstWeekday: number
  events:       CalendarEvent[]
  byDay:        Record<number, CalendarEvent[]>
}

export const calendarApi = {
  get: (month?: string) => {
    const qs = month ? `?month=${month}` : ''
    return request<{ data: CalendarData }>(`/api/v1/calendar${qs}`)
  },
}

// ── Projection ────────────────────────────────────────────────────────

export interface ProjectionItem {
  id:      string
  label:   string
  amount:  number
  day:     number
  type:    string
  actual?: boolean
  overdue?: boolean
}

export interface ProjectionMonth {
  month:             string
  label:             string
  totalIncome:       number
  totalExpense:      number
  balance:           number
  cumulativeBalance: number
  isActual:          boolean
  incomeItems:       ProjectionItem[]
  expenseItems:      ProjectionItem[]
}

export const projectionApi = {
  get: (months?: number) => {
    const qs = months ? `?months=${months}` : ''
    return request<{ data: ProjectionMonth[] }>(`/api/v1/projection${qs}`)
  },
}

// ── People ────────────────────────────────────────────────────────────

export interface PersonEntry {
  id:                  string
  type:                'THEY_OWE_ME' | 'I_OWE_THEM'
  description:         string
  amount:              number
  date:                string
  notes:               string | null
  isSettled:           boolean
  settledAt?:          string | null
  settledTransactionId?: string | null
  installmentTotal:    number | null
  installmentCurrent:  number | null
  installmentGroupId?: string | null
  categoryId?:         string | null
  category?: { id: string; name: string; icon: string; color: string } | null
}

export interface Person {
  id:               string
  name:             string
  color:            string | null
  notes?:           string | null
  theyOweMe:        number
  iOweThem:         number
  balance:          number
  openEntriesCount: number
  entries?:         PersonEntry[]
}

export const peopleApi = {
  list: () => request<{ data: Person[] }>('/api/v1/people'),
  get:  (id: string) => request<{ data: Person & { entries: PersonEntry[] } }>(`/api/v1/people/${id}`),
  create: (body: { name: string; color?: string | null; notes?: string | null }) =>
    request<{ data: Person }>('/api/v1/people', {
      method: 'POST',
      body:   JSON.stringify(body),
    }),
  update: (id: string, body: { name?: string; color?: string | null; notes?: string | null }) =>
    request<{ data: Person }>(`/api/v1/people/${id}`, {
      method: 'PATCH',
      body:   JSON.stringify(body),
    }),
  addEntry: (personId: string, body: {
    type: string; description: string; amount: number; date: string
    notes?: string; categoryId?: string; installments?: number; alreadyPaid?: number
  }) =>
    request<{ data: PersonEntry }>(`/api/v1/people/${personId}?action=entry`, {
      method: 'POST',
      body:   JSON.stringify(body),
    }),
  editEntry: (entryId: string, body: {
    type?: string; description?: string; amount?: number; date?: string
    categoryId?: string | null; notes?: string | null; applyToGroup?: boolean
  }) =>
    request<{ data: PersonEntry }>(`/api/v1/people/entries/${entryId}`, {
      method: 'PATCH',
      body:   JSON.stringify(body),
    }),
  settleEntry: (entryId: string) =>
    request<{ data: PersonEntry }>(`/api/v1/people/entries/${entryId}?action=settle`, { method: 'POST' }),
  unsettleEntry: (entryId: string) =>
    request<{ data: PersonEntry }>(`/api/v1/people/entries/${entryId}?action=unsettle`, { method: 'POST' }),
  deleteEntry: (entryId: string) =>
    request<{ success: boolean }>(`/api/v1/people/entries/${entryId}`, { method: 'DELETE' }),
  deleteEntryGroup: (entryId: string) =>
    request<{ success: boolean }>(`/api/v1/people/entries/${entryId}?applyToGroup=true`, { method: 'DELETE' }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/people/${id}`, { method: 'DELETE' }),
}

// ── Person Recurring Entries (Recorrentes) ──────────────────────────────

export interface PersonEntryRecurring {
  id:          string
  personId:    string
  type:        'THEY_OWE_ME' | 'I_OWE_THEM'
  description: string
  amount:      number
  dayOfMonth:  number
  isActive:    boolean
  lastMonth:   string | null
  notes:       string | null
  categoryId:  string | null
  category?: { id: string; name: string; icon: string; color: string } | null
}

export interface PersonEntryRecurringInput {
  personId:    string
  type:        'THEY_OWE_ME' | 'I_OWE_THEM'
  description: string
  amount:      number
  dayOfMonth?: number
  firstDate?:  string
  notes?:      string | null
  categoryId?: string | null
}

export const personRecurringApi = {
  list: (personId: string) =>
    request<{ data: PersonEntryRecurring[] }>(`/api/v1/people/recurring?personId=${personId}`),
  create: (body: PersonEntryRecurringInput) =>
    request<{ data: PersonEntryRecurring }>('/api/v1/people/recurring', {
      method: 'POST',
      body:   JSON.stringify(body),
    }),
  update: (id: string, body: Partial<PersonEntryRecurringInput> & { isActive?: boolean }) =>
    request<{ data: PersonEntryRecurring }>(`/api/v1/people/recurring/${id}`, {
      method: 'PATCH',
      body:   JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/people/recurring/${id}`, { method: 'DELETE' }),
  migrate: () =>
    request<{ data: { converted: number; message: string } }>('/api/v1/people/migrate-recurring', { method: 'POST' }),
}

// ── Notifications ─────────────────────────────────────────────────────

export interface AppNotification {
  id:      string
  type:    'bill' | 'goal' | 'budget' | 'person' | 'income'
  title:   string
  message: string
  href:    string
  urgency: 'high' | 'medium' | 'low'
}

export const notificationsApi = {
  list: () => request<{ data: AppNotification[] }>('/api/v1/notifications'),
}

// ── Export ────────────────────────────────────────────────────────────

export const exportApi = {
  get: () => request<{ data: Record<string, unknown> }>('/api/v1/export'),
}

// ── Feedback ──────────────────────────────────────────────────────────

export const feedbackApi = {
  send: (body: { type: 'bug' | 'suggestion' | 'ticket'; title: string; body: string; imageData?: string }) =>
    request<{ data: { id: string } }>('/api/v1/feedback', {
      method: 'POST',
      body:   JSON.stringify(body),
    }),
}

// ── AI Chat ───────────────────────────────────────────────────────────

export interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  message:  string
  navigate: { path: string; reason: string } | null
}

export const chatApi = {
  send: (messages: ChatMessage[]) =>
    request<ChatResponse>('/api/v1/chat', {
      method: 'POST',
      body:   JSON.stringify({ messages }),
    }),
}

// ── Push token ────────────────────────────────────────────────────────

export const pushTokenApi = {
  register: (token: string) =>
    request<{ data: {} }>('/api/v1/push-token', {
      method: 'POST',
      body:   JSON.stringify({ token }),
    }),
  unregister: () =>
    request<{ data: {} }>('/api/v1/push-token', { method: 'DELETE' }),
}

// ── Billing ───────────────────────────────────────────────────────────

export const billingApi = {
  checkout: (annual = false) =>
    request<{ data: { url: string } }>('/api/v1/billing/checkout', {
      method: 'POST',
      body:   JSON.stringify({ annual }),
    }),
  portal: () =>
    request<{ data: { url: string } }>('/api/v1/billing/portal', { method: 'POST' }),
}

// ── Achievements ─────────────────────────────────────────────────────

export type AchievementCategory = 'onboarding' | 'organization' | 'payments' | 'goals' | 'volume' | 'financial'

export interface AchievementItem {
  slug:       string
  category:   AchievementCategory
  icon:       string
  unlocked:   boolean
  unlockedAt: string | null
  seen:       boolean
}

export interface AchievementsResponse {
  achievements: AchievementItem[]
  total:        number
  done:         number
  unseen:       number
}

export interface AchievementCheckResponse {
  newlyUnlocked: { slug: string; icon: string }[]
}

export const achievementsApi = {
  list: () =>
    request<{ data: AchievementsResponse }>('/api/v1/achievements'),
  check: (trigger: string, ctx?: Record<string, unknown>) =>
    request<{ data: AchievementCheckResponse }>('/api/v1/achievements', {
      method: 'POST',
      body:   JSON.stringify({ trigger, ctx }),
    }),
  markSeen: () =>
    request<{ data: { marked: boolean } }>('/api/v1/achievements/seen', { method: 'POST' }),
}
