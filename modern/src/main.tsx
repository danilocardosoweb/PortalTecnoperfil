import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { collection, onSnapshot, orderBy, query, doc } from 'firebase/firestore'
import { db } from './firebase'
import { SettingsModal } from './features/settings/SettingsModal'
import { AnalysisModal } from './features/orders/AnalysisModal'

type Category = { id: string; name: string; icon?: string }
type Link = { id: string; category: string; name: string; url: string; kind?: 'powerbi'|'external' }

const qc = new QueryClient()

function useCategories(){
  const [data,setData]=useState<Category[]>([])
  useEffect(()=>{
    const q=query(collection(db,'categories'), orderBy('name'))
    const unsub=onSnapshot(q,(snap)=>{
      setData(snap.docs.map(d=>({id:d.id, ...(d.data() as any)})))
    })
    return ()=>unsub()
  },[])
  return data
}
function useLinks(){
  const [data,setData]=useState<Link[]>([])
  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'links'),(snap)=>{
      const rows=snap.docs.map(d=>({id:d.id, ...(d.data() as any)})) as Link[]
      rows.sort((a,b)=>(a.category||'').localeCompare(b.category||'')||a.name.localeCompare(b.name))
      setData(rows)
    })
    return ()=>unsub()
  },[])
  return data
}

const normalize=(s:string)=> s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'')

function Header({onOpenSettings,onOpenAnalysis,onToggleSidebar,collapsed}:{onOpenSettings:()=>void;onOpenAnalysis:()=>void;onToggleSidebar:()=>void;collapsed:boolean}){
  return (
    <header className="flex items-center gap-3 px-4 h-14 bg-white border-b">
      <button title={collapsed? 'Mostrar menu':'Recolher menu'} onClick={onToggleSidebar} className="px-2 py-1 rounded border">
        <i className={`fa-solid fa-angles-${collapsed?'right':'left'}`}/>
      </button>
      <div className="font-semibold">TECNOPERFIL</div>
      <div className="flex-1" />
      <button title="Análise" className="px-3 py-1 rounded border" onClick={onOpenAnalysis}><i className="fa-solid fa-table-list mr-1"/>Análise</button>
      <button title="Config" className="ml-2 px-3 py-1 rounded border" onClick={onOpenSettings}><i className="fa-solid fa-gear mr-1"/>Config</button>
    </header>
  )
}

function Collapsible({open,children}:{open:boolean;children:React.ReactNode}){
  const ref=useRef<HTMLDivElement>(null)
  const [h,setH]=useState(0)
  useEffect(()=>{ if(ref.current) setH(ref.current.scrollHeight) },[children])
  useEffect(()=>{
    const ro=new ResizeObserver(()=>{ if(ref.current) setH(ref.current.scrollHeight) })
    if(ref.current) ro.observe(ref.current)
    return ()=>ro.disconnect()
  },[])
  return (
    <div style={{maxHeight: open? h: 0, transition:'max-height 400ms cubic-bezier(0.22, 1, 0.36, 1)', overflow:'hidden'}}>
      <div ref={ref}>{children}</div>
    </div>
  )
}

function Sidebar({onSelect}:{onSelect:(link:Link)=>void}){
  const cats=useCategories()
  const links=useLinks()
  const [q,setQ]=useState('')
  const [openName,setOpenName]=useState<string|undefined>(undefined)
  useEffect(()=>{
    if(!openName && cats.length){ setOpenName(cats[0].name) }
  },[cats])
  const groups=useMemo(()=>{
    const map:Record<string,Link[]>= {}
    links.forEach(l=>{ if(!map[l.category]) map[l.category]=[]; map[l.category].push(l) })
    return map
  },[links])
  const nq=normalize(q)
  return (
    <aside className="bg-white border-r p-3 flex flex-col gap-3">
      <input placeholder="Pesquisar..." value={q} onChange={e=>setQ(e.target.value)} className="w-full px-3 py-2 border rounded"/>
      <div className="flex-1 overflow-auto pr-1">
        {cats.map(c=>{
          const anyMatch = (groups[c.name]||[]).some(l=>normalize(l.name).includes(nq))
          const showHeader = nq==='' || normalize(c.name).includes(nq) || anyMatch
          if(!showHeader) return null
          const isOpen = openName===c.name
          return (
            <div key={c.id} className="mb-2">
              <button onClick={()=> setOpenName(prev=> prev===c.name? undefined : c.name)} className="w-full flex items-center justify-between font-semibold text-gray-700 px-1 py-1 hover:text-blue-700">
                <span className="flex items-center gap-2"><i className={c.icon||'fas fa-star'}/> {c.name}</span>
                <i className={`fa-solid fa-chevron-${isOpen?'up':'down'} transition-transform duration-300 ${isOpen?'rotate-0':'rotate-0'}`}/>
              </button>
              <Collapsible open={isOpen}>
                <div className="mt-2 grid gap-2">
                  {(groups[c.name]||[]).filter(l=> nq===''|| normalize(l.name).includes(nq) || normalize(c.name).includes(nq)).map(l=> (
                    <button key={l.id} className="text-left px-3 py-2 border rounded hover:bg-gray-50" onClick={()=>onSelect(l)}>
                      <i className="fas fa-link mr-2"/>{l.name}
                    </button>
                  ))}
                </div>
              </Collapsible>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

function DashboardFrame({url}:{url:string}){
  const [src,setSrc]=useState('')
  // Recorte percentual da barra inferior (default 7%)
  const [cropPct,setCropPct]=useState<number>(()=> Number(localStorage.getItem('pbiCropPct')||'7'))
  useEffect(()=>{
    const onStorage=(e:StorageEvent)=>{ if(e.key==='pbiCropPct'){ setCropPct(Number(localStorage.getItem('pbiCropPct')||'7')) } }
    window.addEventListener('storage', onStorage)
    const onCustom=(e:any)=>{ const v=Number(e?.detail); if(isFinite(v)) setCropPct(v) }
    window.addEventListener('pbi-crop-change', onCustom as any)
    // Firestore subscription para settings/app
    const unsub = onSnapshot(doc(db,'settings','app'), (s)=>{
      const v = (s.data() as any)?.pbiCropPct
      if(typeof v==='number' && isFinite(v)) setCropPct(v)
    })
    return ()=> { window.removeEventListener('storage', onStorage); window.removeEventListener('pbi-crop-change', onCustom as any); unsub() }
  },[])
  useEffect(()=>{
    if(!url){ setSrc(''); return }
    const isPowerBi=/app\.powerbi\.com\/view/i.test(url)
    if(!isPowerBi){ window.open(/^https?:\/\//i.test(url)?url:`https://${url}`,'_blank'); return }
    const u=url+(url.includes('?')?'&':'?')+'navContentPaneEnabled=false'
    setSrc(u)
  },[url])
  return (
    <div className="pbi-crop-wrapper">
      <iframe
        title="dashboard"
        src={src}
        className="pbi-crop-iframe"
        style={{
          height: '100%',
          clipPath: `inset(0 0 ${cropPct}% 0)`
        }}
      />
    </div>
  )
}

function App(){
  const [currentUrl,setCurrentUrl]=useState<string>('')
  const [openSettings,setOpenSettings]=useState(false)
  const [openAnalysis,setOpenAnalysis]=useState(false)
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false)
  // Deep-link simples por hash
  useEffect(()=>{
    if(location.hash){
      try{ setCurrentUrl(decodeURIComponent(location.hash.slice(1))) }catch{}
    }
  },[])
  useEffect(()=>{ if(currentUrl) location.hash=encodeURIComponent(currentUrl) },[currentUrl])
  useEffect(()=>{
    const saved = localStorage.getItem('sidebarCollapsed')==='true'
    setSidebarCollapsed(saved)
  },[])
  function toggleSidebar(){
    setSidebarCollapsed(v=>{ const nv=!v; localStorage.setItem('sidebarCollapsed', String(nv)); return nv })
  }

  return (
    <div className="h-screen grid grid-rows-[auto_1fr]">
      <Header onOpenSettings={()=>setOpenSettings(true)} onOpenAnalysis={()=>setOpenAnalysis(true)} onToggleSidebar={toggleSidebar} collapsed={sidebarCollapsed} />
      <main className="grid h-full" style={{gridTemplateColumns: `${sidebarCollapsed? '0px':'280px'} 1fr`, transition: 'grid-template-columns 300ms ease'}}>
        <div aria-hidden={sidebarCollapsed} className="overflow-hidden">
          <Sidebar onSelect={(l)=> setCurrentUrl(l.url)} />
        </div>
        <section className="p-2 h-full">
          <DashboardFrame url={currentUrl} />
        </section>
      </main>
      <SettingsModal open={openSettings} onClose={()=>setOpenSettings(false)} />
      <AnalysisModal open={openAnalysis} onClose={()=>setOpenAnalysis(false)} />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
