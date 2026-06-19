export type ChangeCategory = 'novo' | 'melhoria' | 'fix'

export interface ChangeEntry {
  category: ChangeCategory
  text: string
}

export interface ChangelogEntry {
  date: string
  version?: string
  title: string
  changes: ChangeEntry[]
}

export const changelog: ChangelogEntry[] = [
  {
    date: 'Junho 2026',
    version: 'v1.3',
    title: 'Projeção financeira e calendário',
    changes: [
      { category: 'novo', text: 'Página de projeção — veja para onde suas finanças caminham nos próximos meses' },
      { category: 'novo', text: 'Calendário financeiro com contas a pagar por dia' },
      { category: 'novo', text: 'Sistema de conquistas com 61 badges desbloqueáveis' },
      { category: 'melhoria', text: 'Dashboard com resumo semanal de gastos' },
      { category: 'fix', text: 'Correção no cálculo de saldo quando há transações do mesmo dia' },
    ],
  },
  {
    date: 'Maio 2026',
    version: 'v1.2',
    title: 'Contas recorrentes e metas',
    changes: [
      { category: 'novo', text: 'Contas recorrentes — cadastre uma vez e o sistema gera automaticamente todo mês' },
      { category: 'novo', text: 'Metas financeiras com barra de progresso' },
      { category: 'novo', text: 'Página de relatórios com gráficos por categoria' },
      { category: 'melhoria', text: 'Filtros de data nas transações (semana, mês, intervalo customizado)' },
    ],
  },
  {
    date: 'Abril 2026',
    version: 'v1.1',
    title: 'Plano Pro e melhorias de UX',
    changes: [
      { category: 'novo', text: 'Plano Pro — R$14,90/mês com limites ampliados e funcionalidades exclusivas' },
      { category: 'novo', text: 'Orçamento mensal por categoria' },
      { category: 'melhoria', text: 'Interface do dashboard redesenhada com cards de insight' },
      { category: 'melhoria', text: 'Onboarding guiado para novos usuários' },
      { category: 'fix', text: 'Correção no reset de senha em alguns provedores de e-mail' },
    ],
  },
  {
    date: 'Março 2026',
    version: 'v1.0',
    title: 'Lançamento do Rook Money',
    changes: [
      { category: 'novo', text: 'Dashboard com visão geral das finanças' },
      { category: 'novo', text: 'Cadastro e gerenciamento de transações' },
      { category: 'novo', text: 'Categorias customizáveis' },
      { category: 'novo', text: 'Contas a pagar com alertas de vencimento' },
      { category: 'novo', text: 'Fontes de renda e controle de entradas' },
    ],
  },
]
