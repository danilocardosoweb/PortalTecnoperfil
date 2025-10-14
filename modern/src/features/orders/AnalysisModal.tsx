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
  const rows = useMemo(()=>{
    const ncli=normalize(fCli), nfer=normalize(fFer)
    return orders.filter((o:any)=> (!ncli || normalize(o.cliente).includes(ncli)) && (!nfer || normalize(o.ferramenta).includes(nfer)))
  },[orders,fCli,fFer])

  function fmtDate(v:any){ try{ if(!v) return ''; const dt=v.seconds? new Date(v.seconds*1000): new Date(v); return dt.toLocaleDateString('pt-BR') }catch{ return '' } }

  function exportCSV(){
    if(!rows.length) return
    const heads=["Status","Pedido","Cliente","Nr Pedido","Data Implant","Data Entrega","Data Ult Fat","Produto","Ferramenta","Un.At","Pedido Kg","Pedido Pc","Saldo Kg","Saldo Pc","Empenho Kg","Empenho Pc","Produzido Kg","Produzido Pc","Embalado Kg","Embalado Pc","Romaneio Kg","Romaneio Pc","Faturado Kg","Faturado Pc","Valor Pedido"]
    const csv=[heads.join(';')].concat(rows.map((o:any)=>[
      o.status,o.pedido,o.cliente,o.nr_pedido,fmtDate(o.data_implant),fmtDate(o.data_entrega),fmtDate(o.data_ult_fat),o.produto,o.ferramenta,o.un_at,o.pedido_kg,o.pedido_pc,o.saldo_kg,o.saldo_pc,o.empenho_kg,o.empenho_pc,o.produzido_kg,o.produzido_pc,o.embalado_kg,o.embalado_pc,o.romaneio_kg,o.romaneio_pc,o.faturado_kg,o.faturado_pc,o.valor_pedido
    ].map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(';'))).join('\n')
    const blob=new Blob(["\ufeff"+csv],{type:'text/csv;charset=utf-8;'})
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='carteira.csv'; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <Modal open={open} title="Carteira de Encomendas" onClose={onClose} size="fullscreen">
      <div className="sticky top-0 bg-white pb-3 flex items-center gap-2">
        <label className="font-semibold">Cliente:</label>
        <input value={fCli} onChange={e=>setFCli(e.target.value)} placeholder="Filtrar cliente..." className="px-3 py-2 border rounded"/>
        <label className="font-semibold ml-3">Ferramenta:</label>
        <input value={fFer} onChange={e=>setFFer(e.target.value)} placeholder="Filtrar ferramenta..." className="px-3 py-2 border rounded"/>
        <button onClick={exportCSV} className="ml-auto px-3 py-2 border rounded"><i className="fa-solid fa-file-csv mr-1"/>Exportar</button>
      </div>
      <div className="text-sm text-gray-500 mb-2">{status}</div>
      <div className="overflow-auto" style={{maxHeight: 'calc(92vh - 220px)'}}>
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
                <td className="px-2 py-1">{o.pedido_kg}</td><td className="px-2 py-1">{o.pedido_pc}</td><td className="px-2 py-1">{o.saldo_kg}</td><td className="px-2 py-1">{o.saldo_pc}</td><td className="px-2 py-1">{o.empenho_kg}</td><td className="px-2 py-1">{o.empenho_pc}</td>
                <td className="px-2 py-1">{o.produzido_kg}</td><td className="px-2 py-1">{o.produzido_pc}</td><td className="px-2 py-1">{o.embalado_kg}</td><td className="px-2 py-1">{o.embalado_pc}</td><td className="px-2 py-1">{o.romaneio_kg}</td><td className="px-2 py-1">{o.romaneio_pc}</td>
                <td className="px-2 py-1">{o.faturado_kg}</td><td className="px-2 py-1">{o.faturado_pc}</td><td className="px-2 py-1">{o.valor_pedido}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td className="px-2 py-6 text-center text-gray-500" colSpan={25}>Sem registros para os filtros aplicados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
