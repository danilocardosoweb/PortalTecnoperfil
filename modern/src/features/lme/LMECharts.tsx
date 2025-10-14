import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { LMEPrice } from './useLMEData'
import { MetalKey, groupByWeek, groupByMonth, calcAverage, formatNumber } from './lmeUtils'

export function LMECharts({ prices, metal }: { prices: LMEPrice[]; metal: MetalKey }) {
  // Dados diários (últimos 14 dias)
  const dailyData = useMemo(() => {
    return [...prices]
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(-14)
      .map(p => ({
        date: new Date(p.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: p[metal]
      }))
  }, [prices, metal])

  // Dados semanais
  const weeklyData = useMemo(() => {
    const weeks = groupByWeek(prices)
    return Object.keys(weeks)
      .sort()
      .slice(-8)
      .map(weekKey => ({
        week: `Sem. ${weekKey.split('-W')[1]}`,
        value: calcAverage(weeks[weekKey], metal)
      }))
  }, [prices, metal])

  // Dados mensais
  const monthlyData = useMemo(() => {
    const months = groupByMonth(prices)
    return Object.keys(months)
      .sort()
      .slice(-12)
      .map(monthKey => {
        const [year, month] = monthKey.split('-')
        return {
          month: `${month}/${year.slice(2)}`,
          value: calcAverage(months[monthKey], metal)
        }
      })
  }, [prices, metal])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-lg">
          <p className="font-semibold">{payload[0].payload.date || payload[0].payload.week || payload[0].payload.month}</p>
          <p className="text-blue-600">{formatNumber(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Gráfico Diário */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-bold text-lg mb-4">Evolução Diária do {metal.charAt(0).toUpperCase() + metal.slice(1)}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dailyData}>
            <defs>
              <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke="#f97316" fillOpacity={1} fill="url(#colorDaily)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Gráficos Semanal e Mensal lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gráfico Semanal */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-bold text-lg mb-4">Evolução Semanal do {metal.charAt(0).toUpperCase() + metal.slice(1)}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="colorWeekly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#f97316" fillOpacity={1} fill="url(#colorWeekly)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico Mensal */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-bold text-lg mb-4">Evolução Mensal do {metal.charAt(0).toUpperCase() + metal.slice(1)}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#f97316" fillOpacity={1} fill="url(#colorMonthly)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
