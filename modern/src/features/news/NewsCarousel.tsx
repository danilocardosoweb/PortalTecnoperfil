import React, { useEffect, useMemo, useRef, useState } from 'react'
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore'
import { db, storage } from '../../firebase'
import { ref as stRef, getDownloadURL } from 'firebase/storage'

export type NewsSlide = {
  id: string
  imageUrl: string
  title?: string
  subtitle?: string
  linkUrl?: string
  order?: number
  active?: boolean
  startAt?: any
  endAt?: any
  storagePath?: string
}

export function NewsCarousel(){
  const [slides,setSlides]=useState<NewsSlide[]>([])
  const [idx,setIdx]=useState(0)
  const timerRef=useRef<number|undefined>(undefined)

  useEffect(()=>{
    const q=query(collection(db,'news_slides'))
    const unsub=onSnapshot(q,(snap)=>{
      const rows = snap.docs.map(d=>({id:d.id, ...(d.data() as any)})) as NewsSlide[]
      const now=Date.now()
      rows.sort((a,b)=>(a.order||999)-(b.order||999))
      const filtered=rows.filter(s=> (s.active!==false) && (!s.startAt || +new Date(s.startAt)<=now) && (!s.endAt || +new Date(s.endAt)>=now))
      setSlides(filtered)
    })
    return ()=>unsub()
  },[])

  useEffect(()=>{
    window.clearInterval(timerRef.current)
    if(slides.length>1){
      // 7s por slide
      timerRef.current = window.setInterval(()=> setIdx(v=> (v+1)%slides.length), 7000) as any
    }
    return ()=> window.clearInterval(timerRef.current)
  },[slides.length])

  const current=slides[idx]
  if(!current){
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center glass-panel p-8 rounded-2xl">
          <i className="fas fa-images text-5xl mb-3 text-white"/>
          <p className="text-white/80 font-medium">Nenhuma notícia cadastrada.</p>
        </div>
      </div>
    )
  }

  async function handleImageError(slide: NewsSlide){
    try{
      if(slide.storagePath){
        const r = stRef(storage, slide.storagePath)
        const freshUrl = await getDownloadURL(r)
        // atualizar local
        setSlides(prev=> prev.map(s=> s.id===slide.id? {...s, imageUrl: freshUrl}: s))
        // persistir no Firestore
        await updateDoc(doc(db,'news_slides', slide.id), { imageUrl: freshUrl })
      } else {
        console.warn('Falha no carregamento do slide e storagePath ausente:', slide)
      }
    }catch(err){
      console.error('Não foi possível regenerar URL do slide:', err)
    }
  }

  return (
    <div className="relative h-full overflow-hidden rounded-xl">
      <div className="absolute inset-0">
        <img src={current.imageUrl} alt={current.title||''} className="w-full h-full object-cover" onError={()=>handleImageError(current)}/>
      </div>
      {(current.title||current.subtitle) && (
        <div className="absolute bottom-4 left-4 right-4 glass-panel rounded-xl p-4">
          {current.title && <h3 className="text-xl font-bold text-white drop-shadow-lg">{current.title}</h3>}
          {current.subtitle && <p className="text-sm text-white/90 mt-1">{current.subtitle}</p>}
          {current.linkUrl && <a href={/^https?:\/\//i.test(current.linkUrl)?current.linkUrl:`https://${current.linkUrl}`} target="_blank" rel="noreferrer" className="inline-block mt-3 px-4 py-2 glass-button rounded-lg text-white text-sm font-medium hover:scale-105 transition-all">Saiba mais</a>}
        </div>
      )}
      {slides.length>1 && (
        <div className="absolute top-4 right-4 flex gap-2 glass-panel px-3 py-2 rounded-full">
          {slides.map((_,i)=> (
            <span key={i} className={`w-2 h-2 rounded-full transition-all ${i===idx? 'bg-white w-6':'bg-white/50'}`}/>
          ))}
        </div>
      )}
    </div>
  )
}
