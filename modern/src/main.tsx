import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { collection, onSnapshot, orderBy, query, doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import { LoginModal } from './features/auth/LoginModal'
import { SettingsModal } from './features/settings/SettingsModal'
import { AnalysisModal } from './features/orders/AnalysisModal'
import { AgentModal } from './features/agent/AgentModal'

type Category = { id: string; name: string; icon?: string; order?: number }
type Link = { id: string; category: string; name: string; url: string; kind?: 'powerbi'|'external'; order?: number; isFavorite?: boolean }

const qc = new QueryClient()

function useCategories(){
  const [data,setData]=useState<Category[]>([])
  useEffect(()=>{
    const q=query(collection(db,'categories'), orderBy('name'))
    const unsub=onSnapshot(q,(snap)=>{
      const rows = snap.docs.map(d=>({id:d.id, ...(d.data() as any)})) as Category[]
      // Ordenar por order (se existir) e depois por name
      rows.sort((a,b)=> (a.order||999)-(b.order||999) || a.name.localeCompare(b.name))
      setData(rows)
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
      // Ordenar por categoria, depois por order (se existir) e depois por name
      rows.sort((a,b)=>(a.category||'').localeCompare(b.category||'')||(a.order||999)-(b.order||999)||a.name.localeCompare(b.name))
      setData(rows)
    })
    return ()=>unsub()
  },[])
  return data
}

const normalize=(s:string)=> s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'')

function Header({onOpenSettings,onOpenAnalysis,onOpenAgent,onToggleSidebar,collapsed}:{onOpenSettings:()=>void;onOpenAnalysis:()=>void;onOpenAgent:()=>void;onToggleSidebar:()=>void;collapsed:boolean}){
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
        <button title="Agente IA" className="px-3 py-1 rounded border bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-all" onClick={onOpenAgent}><i className="fa-solid fa-robot mr-1"/>Agente IA</button>
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

function Sidebar({onSelect,currentUrl}:{onSelect:(link:Link)=>void;currentUrl:string}){
  const cats=useCategories()
  const links=useLinks()
  const [q,setQ]=useState('')
  const [openName,setOpenName]=useState<string|undefined>(undefined)
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
                    <button key={l.id} className={`text-left px-3 py-2 border rounded hover:bg-gray-50 relative ${currentUrl===l.url?'bg-blue-100 border-blue-300':''}`} onClick={()=>onSelect(l)}>
                      {l.isFavorite && <i className="fas fa-star text-yellow-500 absolute top-1 right-1 text-xs" title="Favorito"/>}
                      <div className="flex items-center gap-2">
                        <i className="fas fa-link"/>
                        <span>{l.name}</span>
                        {l.kind==='external' && <i className="fas fa-external-link-alt text-xs text-gray-400"/>}
                      </div>
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
  const lastExternalUrlRef = useRef('')
  const [showExternalMessage,setShowExternalMessage]=useState(false)
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
    if(!url){ setSrc(''); lastExternalUrlRef.current=''; return }
    const isPowerBi=/app\.powerbi\.com\/view/i.test(url)
    // Links externos: sempre abrir em nova aba quando clicado (exceto no carregamento inicial)
    if(!isPowerBi){ 
      // Evitar abrir no F5/reload E permitir múltiplos cliques no mesmo link
      if(!isInitialLoad && url !== lastExternalUrlRef.current){
        window.open(/^https?:\/\//i.test(url)?url:`https://${url}`,'_blank')
        lastExternalUrlRef.current = url
        // Mostrar mensagem de feedback
        setShowExternalMessage(true)
        setTimeout(()=> setShowExternalMessage(false), 3000)
        // Resetar após um delay para permitir novo clique
        setTimeout(()=> lastExternalUrlRef.current = '', 500)
      }
      // Limpar iframe para links externos
      setSrc('')
      return 
    }
    // Power BI: carregar no iframe
    const u=url+(url.includes('?')?'&':'?')+'navContentPaneEnabled=false'
    setSrc(u)
    lastExternalUrlRef.current=''
  },[url,isInitialLoad])
  return (
    <div className="pbi-crop-wrapper">
      {showExternalMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-95 z-10">
          <div className="text-center p-8 max-w-md">
            <i className="fas fa-external-link-alt text-6xl text-blue-600 mb-4"/>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Link Externo Aberto</h3>
            <p className="text-gray-600">O link foi aberto em uma nova aba do navegador.</p>
            <p className="text-sm text-gray-500 mt-2">Se a aba não abriu, verifique se o bloqueador de pop-ups está ativo.</p>
          </div>
        </div>
      )}
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
  const [openAgent,setOpenAgent]=useState(false)
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false)
  const [showLogin,setShowLogin]=useState(false)
  const [isInitialLoad,setIsInitialLoad]=useState(true)
  const [defaultLinkLoaded,setDefaultLinkLoaded]=useState(false) // eslint-disable-line @typescript-eslint/no-unused-vars
  const [authUser,setAuthUser]=useState<{id:string;username:string}|null>(()=>{
    try{ const s=sessionStorage.getItem('authUser'); return s? JSON.parse(s): null }catch{ return null }
  })
  // Carregar link padrão e deep-link
  useEffect(()=>{
    // Marca que o carregamento inicial terminou após um pequeno delay
    const timer = setTimeout(()=> setIsInitialLoad(false), 100)
    
    if(location.hash){
      try{ setCurrentUrl(decodeURIComponent(location.hash.slice(1))) }catch{}
      setDefaultLinkLoaded(true)
    } else {
      // Tentar carregar link padrão do Firestore
      getDoc(doc(db,'settings','app')).then((s: any)=>{
        if(s.exists()){
          const defaultLink = s.data()?.defaultLink
          if(defaultLink) {
            setCurrentUrl(defaultLink)
          }
        } else {
          // Fallback para localStorage
          const savedDefault = localStorage.getItem('defaultLink')
          if(savedDefault) {
            setCurrentUrl(savedDefault)
          }
        }
        setDefaultLinkLoaded(true)
      }).catch(()=> setDefaultLinkLoaded(true))
    }
    
    return ()=> clearTimeout(timer)
  },[])
  // Salvar URL no hash apenas para Power BI (não para links externos)
  useEffect(()=>{ 
    if(currentUrl){
      const isPowerBi=/app\.powerbi\.com\/view/i.test(currentUrl)
      if(isPowerBi){
        location.hash=encodeURIComponent(currentUrl)
      } else {
        // Limpar hash para links externos
        if(location.hash) location.hash=''
      }
    }
  },[currentUrl])
  useEffect(()=>{
    const saved = localStorage.getItem('sidebarCollapsed')==='true'
    setSidebarCollapsed(saved)
    
    // Listener para abrir configurações em aba específica
    const handleOpenSettings = (e: any) => {
      try{
        if(e && typeof e.detail === 'string'){
          localStorage.setItem('settingsPreferredTab', e.detail)
        }
      }catch{}
      setOpenSettings(true)
    }
    
    window.addEventListener('openSettings', handleOpenSettings)
    return () => window.removeEventListener('openSettings', handleOpenSettings)
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
      }} onOpenAnalysis={()=>setOpenAnalysis(true)} onOpenAgent={()=>setOpenAgent(true)} onToggleSidebar={toggleSidebar} collapsed={sidebarCollapsed} />
      <main className="flex h-full">
        <div style={{
          width: sidebarCollapsed ? '0px' : '280px',
          transition: 'width 300ms ease',
          overflow: 'hidden'
        }} aria-hidden={sidebarCollapsed} className="overflow-hidden">
          <Sidebar onSelect={(l)=> setCurrentUrl(l.url)} currentUrl={currentUrl} />
        </div>
        <section className="flex-1 p-0">
          <DashboardFrame url={currentUrl} isInitialLoad={isInitialLoad} />
        </section>
      </main>
      <SettingsModal open={openSettings} onClose={()=>setOpenSettings(false)} />
      <LoginModal open={showLogin} onClose={()=>setShowLogin(false)} onSuccess={(u)=>{ setAuthUser(u); sessionStorage.setItem('authUser', JSON.stringify(u)); setShowLogin(false); setOpenSettings(true) }} />
      <AnalysisModal open={openAnalysis} onClose={()=>setOpenAnalysis(false)} />
      <AgentModal open={openAgent} onClose={()=>setOpenAgent(false)} />
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
