import React, { useMemo } from 'react'
import { LMEPrice } from './useLMEData'
import { groupByWeek, calcAverage, formatNumber, MetalKey, getWeekNumber } from './lmeUtils'

export function LMETable({ prices }: { prices: LMEPrice[] }) {
  const tableData = useMemo(() => {
    // Pegar últimos 30 dias
    const sorted = [...prices].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 30)
    const weeks = groupByWeek(sorted)
    
    const rows: any[] = []
    const weekKeys = Object.keys(weeks).sort().reverse()
    
    weekKeys.forEach((weekKey, idx) => {
      const weekPrices = weeks[weekKey].sort((a, b) => a.data.localeCompare(b.data))
      
      // Adicionar dias da semana
      weekPrices.forEach(p => {
        rows.push({
          type: 'day',
          date: new Date(p.data).toLocaleDateString('pt-BR'),
          ...p
        })
      })
      
      // Adicionar média da semana
      const weekNum = weekKey.split('-W')[1]
      rows.push({
        type: 'week',
        date: `Média Semana ${weekNum}`,
        cobre: calcAverage(weekPrices, 'cobre'),
        zinco: calcAverage(weekPrices, 'zinco'),
        aluminio: calcAverage(weekPrices, 'aluminio'),
        chumbo: calcAverage(weekPrices, 'chumbo'),
        estanho: calcAverage(weekPrices, 'estanho'),
        niquel: calcAverage(weekPrices, 'niquel'),
        dolar: calcAverage(weekPrices, 'dolar')
      })
    })
    
    // Adicionar média mensal
    if (sorted.length > 0) {
      const currentMonth = sorted[0].data.substring(0, 7)
      const monthPrices = sorted.filter(p => p.data.startsWith(currentMonth))
      
      if (monthPrices.length > 0) {
        rows.push({
          type: 'month',
          date: 'Média Mensal',
          cobre: calcAverage(monthPrices, 'cobre'),
          zinco: calcAverage(monthPrices, 'zinco'),
          aluminio: calcAverage(monthPrices, 'aluminio'),
          chumbo: calcAverage(monthPrices, 'chumbo'),
          estanho: calcAverage(monthPrices, 'estanho'),
          niquel: calcAverage(monthPrices, 'niquel'),
          dolar: calcAverage(monthPrices, 'dolar')
        })
      }
    }
    
    return rows
  }, [prices])

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">
          Tabela de informações diárias de {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={handlePrint}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          <i className="fa-solid fa-print mr-2" />
          Imprimir
        </button>
      </div>

      <div className="overflow-auto" style={{ maxHeight: 'calc(96vh - 280px)' }}>
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-gray-700 text-white">
            <tr>
              <th className="px-3 py-2 text-left">Dia</th>
              <th className="px-3 py-2 text-right">Cobre USA</th>
              <th className="px-3 py-2 text-right">Zinco USA</th>
              <th className="px-3 py-2 text-right">Alumínio USA</th>
              <th className="px-3 py-2 text-right">Chumbo USA</th>
              <th className="px-3 py-2 text-right">Estanho USA</th>
              <th className="px-3 py-2 text-right">Níquel USA</th>
              <th className="px-3 py-2 text-right">Dólar R$/US$</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => {
              const bgClass = row.type === 'month' 
                ? 'bg-red-800 text-white font-bold' 
                : row.type === 'week'
                ? 'bg-orange-100 font-semibold text-orange-900'
                : idx % 2 === 0
                ? 'bg-white'
                : 'bg-gray-50'
              
              return (
                <tr key={idx} className={bgClass}>
                  <td className="px-3 py-2">{row.date}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(row.cobre)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(row.zinco)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(row.aluminio)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(row.chumbo)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(row.estanho)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(row.niquel)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(row.dolar, 4)}</td>
                </tr>
              )
            })}
            {tableData.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  Nenhum dado disponível. Clique em "Atualizar" para buscar da API.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
