import { LMEPrice } from './useLMEData'

export type MetalKey = 'cobre' | 'zinco' | 'aluminio' | 'chumbo' | 'estanho' | 'niquel' | 'dolar'

export const METALS: { key: MetalKey; label: string; color: string }[] = [
  { key: 'cobre', label: 'COBRE', color: 'bg-orange-600' },
  { key: 'zinco', label: 'ZINCO', color: 'bg-cyan-500' },
  { key: 'aluminio', label: 'ALUMÍNIO', color: 'bg-gray-500' },
  { key: 'chumbo', label: 'CHUMBO', color: 'bg-slate-600' },
  { key: 'estanho', label: 'ESTANHO', color: 'bg-amber-600' },
  { key: 'niquel', label: 'NÍQUEL', color: 'bg-blue-700' },
  { key: 'dolar', label: 'DÓLAR', color: 'bg-green-600' }
]

// Formatar número para pt-BR
export function formatNumber(value: number | undefined, decimals = 2): string {
  if (value === undefined || value === null) return '-'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

// Calcular variação percentual
export function calcVariation(current: number, previous: number): number {
  if (!previous || previous === 0) return 0
  return ((current - previous) / previous) * 100
}

// Agrupar por semana
export function groupByWeek(prices: LMEPrice[]): Record<string, LMEPrice[]> {
  const groups: Record<string, LMEPrice[]> = {}
  prices.forEach(p => {
    const date = new Date(p.data)
    const weekNum = getWeekNumber(date)
    const key = `${date.getFullYear()}-W${weekNum}`
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  })
  return groups
}

// Agrupar por mês
export function groupByMonth(prices: LMEPrice[]): Record<string, LMEPrice[]> {
  const groups: Record<string, LMEPrice[]> = {}
  prices.forEach(p => {
    const date = new Date(p.data)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  })
  return groups
}

// Calcular média de um array de preços para um metal específico
export function calcAverage(prices: LMEPrice[], metal: MetalKey): number {
  if (prices.length === 0) return 0
  const sum = prices.reduce((acc, p) => acc + (p[metal] || 0), 0)
  return sum / prices.length
}

// Obter número da semana do ano
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Obter dados para variação diária
export function getDailyVariation(prices: LMEPrice[], metal: MetalKey) {
  if (prices.length < 2) return { current: 0, previous: 0, variation: 0, currentDate: '', previousDate: '' }
  const sorted = [...prices].sort((a, b) => b.data.localeCompare(a.data))
  const current = sorted[0][metal] || 0
  const previous = sorted[1][metal] || 0
  return {
    current,
    previous,
    variation: calcVariation(current, previous),
    currentDate: sorted[0].data,
    previousDate: sorted[1].data
  }
}

// Obter dados para variação semanal
export function getWeeklyVariation(prices: LMEPrice[], metal: MetalKey) {
  const weeks = groupByWeek(prices)
  const weekKeys = Object.keys(weeks).sort().reverse()
  if (weekKeys.length < 2) return { current: 0, previous: 0, variation: 0, currentWeek: '', previousWeek: '' }
  
  const currentWeekAvg = calcAverage(weeks[weekKeys[0]], metal)
  const previousWeekAvg = calcAverage(weeks[weekKeys[1]], metal)
  
  return {
    current: currentWeekAvg,
    previous: previousWeekAvg,
    variation: calcVariation(currentWeekAvg, previousWeekAvg),
    currentWeek: weekKeys[0],
    previousWeek: weekKeys[1]
  }
}

// Obter dados para variação mensal
export function getMonthlyVariation(prices: LMEPrice[], metal: MetalKey) {
  const months = groupByMonth(prices)
  const monthKeys = Object.keys(months).sort().reverse()
  if (monthKeys.length < 2) return { current: 0, previous: 0, variation: 0, currentMonth: '', previousMonth: '' }
  
  const currentMonthAvg = calcAverage(months[monthKeys[0]], metal)
  const previousMonthAvg = calcAverage(months[monthKeys[1]], metal)
  
  return {
    current: currentMonthAvg,
    previous: previousMonthAvg,
    variation: calcVariation(currentMonthAvg, previousMonthAvg),
    currentMonth: monthKeys[0],
    previousMonth: monthKeys[1]
  }
}
