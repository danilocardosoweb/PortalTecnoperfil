import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { collection, onSnapshot, orderBy, query, doc } from 'firebase/firestore'
import { db } from './firebase'
import { LoginModal } from './features/auth/LoginModal'
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
  const [showLogoModal,setShowLogoModal]=useState(false)
  return (
    <>
      <header className="flex items-center gap-3 px-4 h-14 bg-white border-b">
        <button title={collapsed? 'Mostrar menu':'Recolher menu'} onClick={onToggleSidebar} className="px-2 py-1 rounded border">
          <i className={`fa-solid fa-angles-${collapsed?'right':'left'}`}/>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={()=>setShowLogoModal(true)} className="hover:opacity-80 transition-opacity" title="Ver logo ampliado">
            <img src="/logo-tecno.png" alt="Logo Tecnoperfil" className="h-8 w-8 object-contain cursor-pointer" />
          </button>
          <div className="font-semibold">TECNOPERFIL</div>
        </div>
        <div className="flex-1" />
        <button title="Análise" className="px-3 py-1 rounded border" onClick={onOpenAnalysis}><i className="fa-solid fa-table-list mr-1"/>Análise</button>
        <button title="Config" className="ml-2 px-3 py-1 rounded border" onClick={onOpenSettings}><i className="fa-solid fa-gear mr-1"/>Config</button>
      </header>
      {showLogoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={()=>setShowLogoModal(false)}>
          <div className="relative bg-white p-4 md:p-8 rounded-lg shadow-2xl max-w-2xl max-h-[90vh] overflow-auto" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setShowLogoModal(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" aria-label="Fechar">
              <i className="fas fa-times text-xl"/>
            </button>
            <img src="/logo-tecno.png" alt="Logo Tecnoperfil" className="w-full h-auto object-contain" />
          </div>
        </div>
      )}
    </>
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
    <aside className="bg-white border-r p-3 flex flex-col gap-3 h-full">
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
      <div className="mt-auto pt-3 border-t flex justify-center">
        <img
          src="/logo-danilo.png"
          srcSet="/logo-danilo.png 1x, /logo-danilo@2x.png 2x"
          sizes="(max-width: 640px) 120px, 160px"
          alt="Logo Danilo"
          className="h-20 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity logo-clarity"
          decoding="async"
          loading="eager"
        />
      </div>
    </aside>
  )
}

function DashboardFrame({url,isInitialLoad}:{url:string;isInitialLoad:boolean}){
  const [src,setSrc]=useState('')
  // Recorte percentual da barra inferior (default 2%)
  const [cropPct,setCropPct]=useState<number>(()=> Number(localStorage.getItem('pbiCropPct')||'2'))
  useEffect(()=>{
    const onStorage=(e:StorageEvent)=>{ if(e.key==='pbiCropPct'){ setCropPct(Number(localStorage.getItem('pbiCropPct')||'2')) } }
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
    // Só abre links externos se NÃO for o carregamento inicial (evita abrir no F5/reload)
    if(!isPowerBi){ 
      if(!isInitialLoad){
        window.open(/^https?:\/\//i.test(url)?url:`https://${url}`,'_blank')
      }
      return 
    }
    const u=url+(url.includes('?')?'&':'?')+'navContentPaneEnabled=false'
    setSrc(u)
  },[url,isInitialLoad])
  return (
    <div className="pbi-crop-wrapper">
      <iframe
        title="dashboard"
        src={src}
        className="pbi-crop-iframe"
        style={{
          height: '110%',
          clipPath: `inset(0 0 ${cropPct}% 0)`,
          transform: 'translateY(0.5%)'
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
  const [showLogin,setShowLogin]=useState(false)
  const [isInitialLoad,setIsInitialLoad]=useState(true)
  const [authUser,setAuthUser]=useState<{id:string;username:string}|null>(()=>{
    try{ const s=sessionStorage.getItem('authUser'); return s? JSON.parse(s): null }catch{ return null }
  })
  // Deep-link simples por hash
  useEffect(()=>{
    if(location.hash){
      try{ setCurrentUrl(decodeURIComponent(location.hash.slice(1))) }catch{}
    }
    // Marca que o carregamento inicial terminou após um pequeno delay
    const timer = setTimeout(()=> setIsInitialLoad(false), 100)
    return ()=> clearTimeout(timer)
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
      <Header onOpenSettings={()=>{
        if(!authUser){
          setShowLogin(true)
        }else{
          setOpenSettings(true)
        }
      }} onOpenAnalysis={()=>setOpenAnalysis(true)} onToggleSidebar={toggleSidebar} collapsed={sidebarCollapsed} />
      <main className="flex h-full">
        <div style={{
          width: sidebarCollapsed ? '0px' : '280px',
          transition: 'width 300ms ease',
          overflow: 'hidden'
        }} aria-hidden={sidebarCollapsed}>
          <Sidebar onSelect={(l)=> setCurrentUrl(l.url)} />
        </div>
        <section className="flex-1 p-0">
          <DashboardFrame url={currentUrl} isInitialLoad={isInitialLoad} />
        </section>
      </main>
      <SettingsModal open={openSettings} onClose={()=>setOpenSettings(false)} />
      <LoginModal open={showLogin} onClose={()=>setShowLogin(false)} onSuccess={(u)=>{ setAuthUser(u); sessionStorage.setItem('authUser', JSON.stringify(u)); setShowLogin(false); setOpenSettings(true) }} />
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
