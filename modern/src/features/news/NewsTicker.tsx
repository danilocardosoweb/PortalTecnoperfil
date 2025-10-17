import React, { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'

export function NewsTicker(){
  const [enabled,setEnabled]=useState(false)
  const [items,setItems]=useState<string[]>([])

  useEffect(()=>{
    const ref=doc(db,'news_settings','default')
    const unsub=onSnapshot(ref,(s)=>{
      const d=s.data() as any
      if(!d) { setEnabled(false); setItems([]); return }
      setEnabled(!!d.tickerEnabled)
      const list: string[] = Array.isArray(d.tickerItems)? d.tickerItems: []
      setItems(list.filter(Boolean))
    })
    return ()=>unsub()
  },[])

  if(!enabled || items.length===0) return null

  return (
    <div className="w-full bg-blue-600 text-white text-sm overflow-hidden">
      <div className="whitespace-nowrap animate-[ticker_30s_linear_infinite] py-1">
        {items.map((t, i)=> (
          <span key={i} className="mx-6">{t}</span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(100%);} to { transform: translateX(-100%);} }`}</style>
    </div>
  )
}
