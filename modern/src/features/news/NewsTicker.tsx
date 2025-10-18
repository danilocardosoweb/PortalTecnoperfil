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
    <div className="w-full bg-gradient-to-r from-primary/30 to-accent-purple/30 backdrop-blur-sm text-white text-sm overflow-hidden border-b border-white/10">
      <div className="whitespace-nowrap animate-[ticker_30s_linear_infinite] py-2 font-medium">
        {items.map((t, i)=> (
          <span key={i} className="mx-8 drop-shadow-lg">
            <i className="fas fa-bullhorn mr-2 text-accent-blue"/>
            {t}
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(100%);} to { transform: translateX(-100%);} }`}</style>
    </div>
  )
}
