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

export interface DashboardData {
  monthBalance:       number
  monthIncome:        number
  monthExpense:       number
  recentTransactions: Transaction[]
  upcomingBills:      Bill[]
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
  category:    { id: string; name: string; icon: string }
}

export const transactionsApi = {
  list: (params?: { month?: string; type?: string; categoryId?: string; limit?: number }) => {
    // Strip undefined/null so they're not serialized as the string "undefined"
    const clean = params
      ? Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
      : {}
    const qs = Object.keys(clean).length > 0
      ? '?' + new URLSearchParams(clean as Record<string, string>).toString()
      : ''
    return request<{ data: Transaction[] }>(`/api/v1/transactions${qs}`)
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
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/categories/${id}`, { method: 'DELETE' }),
}

// ── Bills ─────────────────────────────────────────────────────────────

export interface Bill {
  id:        string
  name:      string
  amount:    number
  dueDate:   string
  isPaid:    boolean
  isRecurring: boolean
  category?: { name: string; icon: string } | null
}

export const billsApi = {
  list: () => request<{ data: Bill[] }>('/api/v1/bills'),
  create: (body: { name: string; amount: number; dueDate: string; isRecurring?: boolean; categoryId?: string }) =>
    request<{ data: Bill }>('/api/v1/bills', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  pay: (id: string) =>
    request<{ data: Bill }>(`/api/v1/bills/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPaid: true }),
    }),
  update: (id: string, body: { isPaid?: boolean; name?: string; amount?: number; dueDate?: string }) =>
    request<{ data: Bill }>(`/api/v1/bills/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/bills/${id}`, { method: 'DELETE' }),
}

// ── Goals ─────────────────────────────────────────────────────────────

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
}

export const goalsApi = {
  list: () => request<{ data: Goal[] }>('/api/v1/goals'),
  create: (body: { name: string; targetAmount: number; deadline?: string; description?: string; icon?: string; color?: string }) =>
    request<{ data: Goal }>('/api/v1/goals', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: { name?: string; targetAmount?: number; deadline?: string; description?: string; icon?: string; color?: string }) =>
    request<{ data: Goal }>(`/api/v1/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  contribute: (id: string, amount: number, note?: string) =>
    request<{ data: { id: string; currentAmount: number; isCompleted: boolean } }>(`/api/v1/goals/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount, note }),
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
    return request<{ data: Budget[] }>(`/api/v1/budgets${qs}`)
  },
  create: (body: { categoryId: string; amount: number; month: string }) =>
    request<{ data: Budget }>('/api/v1/budgets', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: { amount: number }) =>
    request<{ data: Budget }>(`/api/v1/budgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/budgets/${id}`, { method: 'DELETE' }),
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
  update: (id: string, body: { name?: string; amount?: number; isActive?: boolean; dayOfMonth?: number }) =>
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
  id:          string
  name:        string
  type:        'EMPLOYMENT' | 'FREELANCE' | 'RENTAL' | 'OTHER'
  amount:      number
  isRecurring: boolean
  dayOfMonth:  number | null
  notes:       string | null
}

export const incomeSourcesApi = {
  list: () => request<{ data: IncomeSource[] }>('/api/v1/income-sources'),
  create: (body: { name: string; type: string; amount: number; isRecurring?: boolean; dayOfMonth?: number }) =>
    request<{ data: IncomeSource }>('/api/v1/income-sources', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: { name?: string; amount?: number; isRecurring?: boolean; dayOfMonth?: number }) =>
    request<{ data: IncomeSource }>(`/api/v1/income-sources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/income-sources/${id}`, { method: 'DELETE' }),
}

// ── Reports ───────────────────────────────────────────────────────────

export interface MonthReport {
  month:             string
  totalIncome:       number
  totalExpense:      number
  balance:           number
  categoryBreakdown: { name: string; icon: string; color: string; total: number; pct: number }[]
}

export const reportsApi = {
  get: (months?: number) => {
    const qs = months ? `?months=${months}` : ''
    return request<{ data: MonthReport[] }>(`/api/v1/reports${qs}`)
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
  get: () => request<{ data: MeData }>('/api/v1/me'),
}

// ── Settings ──────────────────────────────────────────────────────────

export const settingsApi = {
  update: (body: { name?: string; bio?: string; city?: string; occupation?: string; hasOnboarded?: boolean }) =>
    request<{ data: MeData }>('/api/v1/settings', {
      method: 'PATCH',
      body:   JSON.stringify(body),
    }),
}

// ── Calendar ──────────────────────────────────────────────────────────

export interface CalendarEvent {
  id:     string
  day:    number
  type:   'bill' | 'income' | 'recurring'
  label:  string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'expected' | 'received'
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
  id:                 string
  type:               'THEY_OWE_ME' | 'I_OWE_THEM'
  description:        string
  amount:             number
  date:               string
  notes:              string | null
  isSettled:          boolean
  installmentTotal:   number | null
  installmentCurrent: number | null
}

export interface Person {
  id:          string
  name:        string
  theyOweMe:   number
  iOweThem:    number
  openEntries: number
  entries?:    PersonEntry[]
}

export const peopleApi = {
  list: () => request<{ data: Person[] }>('/api/v1/people'),
  get:  (id: string) => request<{ data: Person & { entries: PersonEntry[] } }>(`/api/v1/people/${id}`),
  create: (body: { name: string; notes?: string }) =>
    request<{ data: Person }>('/api/v1/people', {
      method: 'POST',
      body:   JSON.stringify(body),
    }),
  addEntry: (personId: string, body: {
    type: string; description: string; amount: number; date: string
    notes?: string; categoryId?: string; installments?: number
  }) =>
    request<{ data: PersonEntry }>(`/api/v1/people/${personId}?action=entry`, {
      method: 'POST',
      body:   JSON.stringify(body),
    }),
  settleEntry: (entryId: string) =>
    request<{ data: PersonEntry }>(`/api/v1/people/entries/${entryId}?action=settle`, { method: 'POST' }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/v1/people/${id}`, { method: 'DELETE' }),
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
