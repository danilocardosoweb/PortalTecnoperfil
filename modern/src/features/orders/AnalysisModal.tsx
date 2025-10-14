import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { collection, getDocs, orderBy, query, limit, where } from 'firebase/firestore'
import { db } from '../../firebase'

export function AnalysisModal({open,onClose}:{open:boolean;onClose:()=>void}){
  type Order = any
  const [orders,setOrders]=useState<Order[]>([])
  const [status,setStatus]=useState('')
  const [fCli,setFCli]=useState('')
  const [fFer,setFFer]=useState('')
  const [view,setView]=useState<'tabela'|'cards'>('cards')
  const [usinagem,setUsinagem]=useState<'ambos'|'com'|'sem'>('ambos')

  useEffect(()=>{
    if(!open) return
    (async()=>{
      try{
        setStatus('Carregando últimos dados...')
        const up = await getDocs(query(collection(db,'uploads'), orderBy('uploadedAt','desc'), limit(1)))
        const last = up.docs[0]
        if(!last){ setOrders([]); setStatus('Nenhum upload encontrado.'); return }
        const ord = await getDocs(query(collection(db,'orders'), where('uploadId','==', last.id)))
        setOrders(ord.docs.map(d=>d.data()))
        setStatus(`Carregado ${ord.size} registros.`)
      }catch{
        setStatus('Erro ao carregar dados.')
      }
    })()
  },[open])

  const normalize=(s:string)=> s? s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'') : ''
  
  // Converte valores PT-BR (string "6.598,13" ou number 6598.13) para number seguro
  function toNumberPtSafe(v:any):number{
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      // Remove pontos de milhar e troca vírgula por ponto
      const cleaned = v.trim().replace(/\./g,'').replace(',', '.');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }

  const rows = useMemo(()=>{
    const ncli=normalize(fCli), nfer=normalize(fFer)
    const isSF=(s:string)=> /^sf/i.test(String(s||''))
    return orders.filter((o:any)=> {
      const byCli = (!ncli || normalize(o.cliente).includes(ncli))
      const byFer = (!nfer || normalize(o.ferramenta).includes(nfer))
      const byUsi = (usinagem==='ambos') ? true : (usinagem==='com' ? isSF(o.ferramenta) : !isSF(o.ferramenta))
      return byCli && byFer && byUsi
    })
  },[orders,fCli,fFer,usinagem])

  function fmtDate(v:any){ try{ if(!v) return ''; const dt=v.seconds? new Date(v.seconds*1000): new Date(v); return dt.toLocaleDateString('pt-BR') }catch{ return '' } }
  function fmtNum(v:any){ try{ const n=toNumberPtSafe(v); return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2}).format(n) }catch{ return String(v??'') } }

  function exportCSV(){
    if(!rows.length) return
    const heads=["Status","Pedido","Cliente","Nr Pedido","Data Implant","Data Entrega","Data Ult Fat","Produto","Ferramenta","Un.At","Pedido Kg","Pedido Pc","Saldo Kg","Saldo Pc","Empenho Kg","Empenho Pc","Produzido Kg","Produzido Pc","Embalado Kg","Embalado Pc","Romaneio Kg","Romaneio Pc","Faturado Kg","Faturado Pc","Valor Pedido"]
    const csv=[heads.join(';')].concat(rows.map((o:any)=>[
      o.status,o.pedido,o.cliente,o.nr_pedido,fmtDate(o.data_implant),fmtDate(o.data_entrega),fmtDate(o.data_ult_fat),o.produto,o.ferramenta,o.un_at,
      toNumberPtSafe(o.pedido_kg),toNumberPtSafe(o.pedido_pc),toNumberPtSafe(o.saldo_kg),toNumberPtSafe(o.saldo_pc),toNumberPtSafe(o.empenho_kg),toNumberPtSafe(o.empenho_pc),
      toNumberPtSafe(o.produzido_kg),toNumberPtSafe(o.produzido_pc),toNumberPtSafe(o.embalado_kg),toNumberPtSafe(o.embalado_pc),toNumberPtSafe(o.romaneio_kg),toNumberPtSafe(o.romaneio_pc),
      toNumberPtSafe(o.faturado_kg),toNumberPtSafe(o.faturado_pc),toNumberPtSafe(o.valor_pedido)
    ].map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(';'))).join('\n')
    const blob=new Blob(["\ufeff"+csv],{type:'text/csv;charset=utf-8;'})
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='carteira.csv'; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <Modal open={open} title="Carteira de Encomendas" onClose={onClose} size="fullscreen">
      <div className="sticky top-0 bg-white pb-3 flex items-center gap-2 flex-wrap">
        <label className="font-semibold">Cliente:</label>
        <input value={fCli} onChange={e=>setFCli(e.target.value)} placeholder="Filtrar cliente..." className="px-3 py-2 border rounded"/>
        <label className="font-semibold ml-3">Ferramenta:</label>
        <input value={fFer} onChange={e=>setFFer(e.target.value)} placeholder="Filtrar ferramenta..." className="px-3 py-2 border rounded"/>
        {/* Filtro Usinagem (SF) */}
        <div className="flex items-center gap-1 ml-2">
          <span className="text-sm text-gray-600 mr-1">Usinagem:</span>
          <button
            className={`px-2 py-1 rounded border text-xs ${usinagem==='ambos' ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={()=>setUsinagem('ambos')}
            title="Mostrar todos"
          >Ambos</button>
          <button
            className={`px-2 py-1 rounded border text-xs ${usinagem==='com' ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={()=>setUsinagem('com')}
            title="Somente ferramentas que iniciam com SF"
          >Com Usinagem</button>
          <button
            className={`px-2 py-1 rounded border text-xs ${usinagem==='sem' ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={()=>setUsinagem('sem')}
            title="Excluir ferramentas que iniciam com SF"
          >Sem Usinagem</button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            className={`px-3 py-1.5 rounded border text-sm ${view==='cards' ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={()=>setView('cards')}
            title="Cards de Resumo"
          >
            <i className="fa-solid fa-grid-2 mr-1"/> Cards de Resumo
          </button>
          <button
            className={`px-3 py-1.5 rounded border text-sm ${view==='tabela' ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={()=>setView('tabela')}
            title="Tabela"
          >
            <i className="fa-solid fa-table mr-1"/> Tabela
          </button>
          <button onClick={exportCSV} className="px-3 py-2 border rounded"><i className="fa-solid fa-file-csv mr-1"/>Exportar</button>
        </div>
      </div>
      <div className="text-sm text-gray-500 mb-2">{status}</div>
      

      {view==='cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          {(()=>{
            const totalPos = (key:string)=> rows.reduce((acc:number,o:any)=>{
              const n = toNumberPtSafe(o?.[key])
              return acc + (n>0? n: 0)
            },0)
            const fmt = (v:number)=> new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
            const cards = [
              { title: 'Saldo da Carteira (Kg)', value: totalPos('saldo_kg') },
              { title: 'Produzido (Kg)', value: totalPos('produzido_kg') },
              { title: 'Embalado (Kg)', value: totalPos('embalado_kg') },
              { title: 'Faturado (Kg)', value: totalPos('faturado_kg') },
              { title: 'Em Romaneio (Kg)', value: totalPos('romaneio_kg') },
            ]
            return cards.map((c,idx)=> (
              <div key={idx} className="bg-white rounded-lg shadow-sm border p-4">
                <div className="text-gray-700 font-semibold mb-1">{c.title}</div>
                <div className="text-2xl font-bold text-gray-900">{fmt(c.value)}</div>
              </div>
            ))
          })()}
        </div>
      )}

      {view==='tabela' && (
        <div className="overflow-auto pr-6 pb-4" style={{maxHeight: 'calc(92vh - 220px)', scrollbarGutter: 'stable both-edges'}}>
          <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white">
              {['Status','Pedido','Cliente','Nr Pedido','Data Implant','Data Entrega','Data Ult Fat','Produto','Ferramenta','Un.At','Pedido Kg','Pedido Pc','Saldo Kg','Saldo Pc','Empenho Kg','Empenho Pc','Produzido Kg','Produzido Pc','Embalado Kg','Embalado Pc','Romaneio Kg','Romaneio Pc','Faturado Kg','Faturado Pc','Valor Pedido'].map(h=> <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((o:any,idx:number)=> (
              <tr key={idx} className="odd:bg-white even:bg-gray-50">
                <td className="px-2 py-1">{o.status}</td><td className="px-2 py-1">{o.pedido}</td><td className="px-2 py-1">{o.cliente}</td><td className="px-2 py-1">{o.nr_pedido}</td>
                <td className="px-2 py-1">{fmtDate(o.data_implant)}</td><td className="px-2 py-1">{fmtDate(o.data_entrega)}</td><td className="px-2 py-1">{fmtDate(o.data_ult_fat)}</td>
                <td className="px-2 py-1">{o.produto}</td><td className="px-2 py-1">{o.ferramenta}</td><td className="px-2 py-1">{o.un_at}</td>
                <td className="px-2 py-1 text-right">{fmtNum(o.pedido_kg)}</td><td className="px-2 py-1 text-right">{fmtNum(o.pedido_pc)}</td><td className="px-2 py-1 text-right">{fmtNum(o.saldo_kg)}</td><td className="px-2 py-1 text-right">{fmtNum(o.saldo_pc)}</td><td className="px-2 py-1 text-right">{fmtNum(o.empenho_kg)}</td><td className="px-2 py-1 text-right">{fmtNum(o.empenho_pc)}</td>
                <td className="px-2 py-1 text-right">{fmtNum(o.produzido_kg)}</td><td className="px-2 py-1 text-right">{fmtNum(o.produzido_pc)}</td><td className="px-2 py-1 text-right">{fmtNum(o.embalado_kg)}</td><td className="px-2 py-1 text-right">{fmtNum(o.embalado_pc)}</td><td className="px-2 py-1 text-right">{fmtNum(o.romaneio_kg)}</td><td className="px-2 py-1 text-right">{fmtNum(o.romaneio_pc)}</td>
                <td className="px-2 py-1 text-right">{fmtNum(o.faturado_kg)}</td><td className="px-2 py-1 text-right">{fmtNum(o.faturado_pc)}</td><td className="px-2 py-1 text-right">{fmtNum(o.valor_pedido)}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td className="px-2 py-6 text-center text-gray-500" colSpan={25}>Sem registros para os filtros aplicados.</td></tr>
            )}
          </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
