import React, { useState } from 'react'
import { Modal } from '../../components/Modal'
import { useLMEData } from './useLMEData'
import { METALS, MetalKey, getDailyVariation, getWeeklyVariation, getMonthlyVariation, formatNumber } from './lmeUtils'
import { LMECharts } from './LMECharts'
import { LMETable } from './LMETable'

export function LMEDashboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prices, loading, error, refresh } = useLMEData()
  const [selectedMetal, setSelectedMetal] = useState<MetalKey>('cobre')
  const [view, setView] = useState<'charts' | 'table'>('charts')

  const dailyVar = getDailyVariation(prices, selectedMetal)
  const weeklyVar = getWeeklyVariation(prices, selectedMetal)
  const monthlyVar = getMonthlyVariation(prices, selectedMetal)

  function VariationCard({ title, current, previous, variation, dateLabel }: any) {
    const isPositive = variation >= 0
    const bgColor = isPositive ? 'bg-green-100' : 'bg-red-100'
    const textColor = isPositive ? 'text-green-700' : 'text-red-700'
    
    return (
      <div className={`${bgColor} rounded-lg p-4`}>
        <div className="font-bold text-gray-800 mb-2">{title}</div>
        <div className="flex justify-between items-center text-sm mb-1">
          <span>{dateLabel.split(' - ')[0]}</span>
          <span className="font-semibold">{formatNumber(previous)}</span>
        </div>
        <div className="flex justify-between items-center text-sm mb-2">
          <span>{dateLabel.split(' - ')[1]}</span>
          <span className="font-semibold">{formatNumber(current)}</span>
        </div>
        <div className={`flex items-center justify-center gap-2 ${textColor} font-bold text-lg`}>
          <i className={`fa-solid fa-arrow-${isPositive ? 'up' : 'down'}`} />
          {variation >= 0 ? '+' : ''}{formatNumber(variation, 2)} %
        </div>
      </div>
    )
  }

  return (
    <Modal open={open} title="Cotações LME - London Metal Exchange" onClose={onClose} size="fullscreen">
      <div className="space-y-4">
        {/* Abas de metais */}
        <div className="flex gap-2 flex-wrap">
          {METALS.map(m => (
            <button
              key={m.key}
              onClick={() => setSelectedMetal(m.key)}
              className={`px-4 py-2 rounded font-semibold text-white transition-all ${
                selectedMetal === m.key ? m.color + ' scale-105' : 'bg-gray-400 hover:bg-gray-500'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setView('charts')}
            className={`px-4 py-2 rounded border ${view === 'charts' ? 'bg-blue-600 text-white' : 'bg-white'}`}
          >
            <i className="fa-solid fa-chart-line mr-2" />
            Gráficos
          </button>
          <button
            onClick={() => setView('table')}
            className={`px-4 py-2 rounded border ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-white'}`}
          >
            <i className="fa-solid fa-table mr-2" />
            Tabela
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="ml-auto px-4 py-2 rounded border bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
          >
            <i className={`fa-solid fa-sync ${loading ? 'fa-spin' : ''} mr-2`} />
            Atualizar
          </button>
        </div>

        {error && <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">{error}</div>}

        {view === 'charts' ? (
          <>
            {/* Cards de variação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <VariationCard
                title={`Variação Diária do ${METALS.find(m => m.key === selectedMetal)?.label}`}
                current={dailyVar.current}
                previous={dailyVar.previous}
                variation={dailyVar.variation}
                dateLabel={`Em ${new Date(dailyVar.previousDate).toLocaleDateString('pt-BR')} - Em ${new Date(dailyVar.currentDate).toLocaleDateString('pt-BR')}`}
              />
              <VariationCard
                title={`Variação Semanal do ${METALS.find(m => m.key === selectedMetal)?.label}`}
                current={weeklyVar.current}
                previous={weeklyVar.previous}
                variation={weeklyVar.variation}
                dateLabel={`Semana ${weeklyVar.previousWeek} - Semana ${weeklyVar.currentWeek}`}
              />
              <VariationCard
                title={`Variação Mensal do ${METALS.find(m => m.key === selectedMetal)?.label}`}
                current={monthlyVar.current}
                previous={monthlyVar.previous}
                variation={monthlyVar.variation}
                dateLabel={`Em ${monthlyVar.previousMonth} - Em ${monthlyVar.currentMonth}`}
              />
            </div>

            {/* Gráficos */}
            <LMECharts prices={prices} metal={selectedMetal} />
          </>
        ) : (
          <LMETable prices={prices} />
        )}
      </div>
    </Modal>
  )
}
