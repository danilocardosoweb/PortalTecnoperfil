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
import { NewsCarousel } from './features/news/NewsCarousel'
import { NewsTicker } from './features/news/NewsTicker'

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
  const [headerExpanded, setHeaderExpanded]=useState(false)
  const [isFullscreen, setIsFullscreen]=useState(false)
  
  // Função para toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch((err) => {
        console.error('Erro ao entrar em tela cheia:', err)
      })
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      }).catch((err) => {
        console.error('Erro ao sair da tela cheia:', err)
      })
    }
  }
  
  // Listener para mudanças de fullscreen (ex: usuário pressiona ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])
  
  return (
    <>
      <div 
        className="relative"
        onMouseEnter={() => setHeaderExpanded(true)}
        onMouseLeave={() => setHeaderExpanded(false)}
      >
        {/* Ícone trigger centralizado - sempre visível */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
          <div className="glass-panel px-4 py-1 rounded-b-xl flex items-center justify-center cursor-pointer">
            <i className={`fas fa-chevron-${headerExpanded ? 'up' : 'down'} text-white/50 text-sm animate-pulse transition-transform duration-300`}/>
          </div>
        </div>
        
        {/* Header expandido - desenrola ao passar mouse */}
        <div 
          className="overflow-hidden transition-all duration-500 ease-in-out mt-8"
          style={{
            maxHeight: headerExpanded ? '80px' : '0px',
            opacity: headerExpanded ? 1 : 0
          }}
        >
          <header className="glass-panel flex items-center gap-3 px-6 h-16 mx-3 rounded-2xl relative z-10">
            <button title={collapsed? 'Mostrar menu':'Recolher menu'} onClick={onToggleSidebar} className="glass-button glass-shine px-3 py-2 rounded-xl text-white">
              <i className={`fa-solid fa-angles-${collapsed?'right':'left'}`}/>
            </button>
            <div className="flex items-center gap-3">
              <button onClick={()=>setShowLogoModal(true)} className="bg-white p-2 rounded-xl hover:scale-110 transition-all shadow-lg" title="Ver logo ampliado">
                <img src="/logo-tecno.png" alt="Logo Tecnoperfil" className="h-8 w-8 object-contain cursor-pointer" />
              </button>
              <div className="font-bold text-white text-lg drop-shadow-lg">TECNOPERFIL</div>
            </div>
            <div className="flex-1" />
            <button 
              title={isFullscreen ? 'Sair da tela cheia (ESC)' : 'Tela cheia (F11)'} 
              className="glass-button glass-shine px-3 py-2 rounded-xl text-white font-medium" 
              onClick={toggleFullscreen}
            >
              <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}/>
            </button>
            <button title="Agente IA" className="glass-button glass-shine px-4 py-2 rounded-xl text-white font-medium" onClick={onOpenAgent}>
              <i className="fa-solid fa-robot mr-2"/>Agente IA
            </button>
            <button title="Análise" className="glass-button glass-shine px-4 py-2 rounded-xl text-white font-medium" onClick={onOpenAnalysis}>
              <i className="fa-solid fa-table-list mr-2"/>Análise
            </button>
            <button title="Config" className="glass-button glass-shine ml-2 px-4 py-2 rounded-xl text-white font-medium" onClick={onOpenSettings}>
              <i className="fa-solid fa-gear mr-2"/>Config
            </button>
          </header>
        </div>
      </div>
      
      {/* Modal do logo TecnoPerfil */}
      {showLogoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setShowLogoModal(false)}>
          <div className="relative bg-white p-6 md:p-10 rounded-3xl shadow-2xl max-w-2xl max-h-[90vh] overflow-auto" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setShowLogoModal(false)} className="absolute top-3 right-3 bg-gray-200 hover:bg-gray-300 p-2 rounded-full text-gray-800 hover:scale-110 transition-all" aria-label="Fechar">
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

function Sidebar({onSelect,currentUrl,collapsed}:{onSelect:(link:Link)=>void;currentUrl:string;collapsed:boolean}){
  const cats=useCategories()
  const links=useLinks()
  const [q,setQ]=useState('')
  const [openName,setOpenName]=useState<string|undefined>(undefined)
  const [isHovered, setIsHovered]=useState(false)
  const [logoExpanded, setLogoExpanded]=useState(false)
  const [showLogoModal, setShowLogoModal]=useState(false)
  const groups=useMemo(()=>{
    const map:Record<string,Link[]>= {}
    links.forEach(l=>{ if(!map[l.category]) map[l.category]=[]; map[l.category].push(l) })
    return map
  },[links])
  const nq=normalize(q)
  
  // Mostrar sidebar quando não collapsed OU quando collapsed mas com hover
  const shouldShow = !collapsed || isHovered
  
  return (
    <aside 
      className="glass-panel m-3 mt-2 p-4 flex flex-col gap-3 h-[calc(100vh-88px)] rounded-2xl transition-all duration-300"
      style={{
        opacity: shouldShow ? 1 : 0,
        transform: shouldShow ? 'translateX(0)' : 'translateX(-100%)',
        pointerEvents: shouldShow ? 'auto' : 'none',
        position: collapsed ? 'fixed' : 'static',
        left: collapsed ? '0' : 'auto',
        top: collapsed ? '64px' : 'auto',
        width: collapsed ? '280px' : 'auto',
        zIndex: 50
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <input placeholder="Pesquisar..." value={q} onChange={e=>setQ(e.target.value)} className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-white/50 outline-none"/>
      <div className="flex-1 overflow-auto pr-1 sidebar-scroll">
        {cats.map(c=>{
          const anyMatch = (groups[c.name]||[]).some(l=>normalize(l.name).includes(nq))
          const showHeader = nq==='' || normalize(c.name).includes(nq) || anyMatch
          if(!showHeader) return null
          const isOpen = openName===c.name
          return (
            <div key={c.id} className={`relative ${isOpen ? 'mb-4' : 'mb-2'}`} style={{zIndex: isOpen ? 20 : 1}}>
              <button onClick={()=> setOpenName(prev=> prev===c.name? undefined : c.name)} className="glass-button w-full flex items-center justify-between font-semibold text-white px-3 py-2 rounded-xl mb-2">
                <span className="flex items-center gap-2"><i className={c.icon||'fas fa-star'}/> {c.name}</span>
                <i className={`fa-solid fa-chevron-${isOpen?'up':'down'} transition-transform duration-300`}/>
              </button>
              <Collapsible open={isOpen}>
                <div className="mt-2 grid gap-2 pb-4 relative" style={{zIndex: 30}}>
                  {(groups[c.name]||[]).filter(l=> nq===''|| normalize(l.name).includes(nq) || normalize(c.name).includes(nq)).map(l=> (
                    <button key={l.id} className={`text-left px-4 py-3 rounded-xl text-white relative transition-all ${currentUrl===l.url?'bg-gradient-to-r from-accent-purple/30 to-accent-blue/30 border-accent-purple/50 border':'glass-button-secondary'}`} onClick={()=>onSelect(l)}>
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
      {/* Gaveta do logo - parte inferior */}
      <div 
        className="mt-auto relative"
        onMouseEnter={() => setLogoExpanded(true)}
        onMouseLeave={() => setLogoExpanded(false)}
      >
        {/* Área de trigger - sempre visível */}
        <div className="pt-3 pb-2 border-t border-white/20 flex justify-center items-center cursor-pointer">
          <div className="text-white/40 text-xs animate-pulse">
            <i className={`fas fa-chevron-${logoExpanded ? 'down' : 'up'} transition-transform duration-300`}/>
          </div>
        </div>
        
        {/* Logo - expande/recolhe como gaveta */}
        <div 
          className="overflow-hidden transition-all duration-500 ease-in-out"
          style={{
            maxHeight: logoExpanded ? '120px' : '0px',
            opacity: logoExpanded ? 1 : 0
          }}
        >
          <div className="pb-3 flex justify-center">
            <button 
              onClick={() => setShowLogoModal(true)}
              className="glass-panel p-3 rounded-xl hover:scale-105 transition-all cursor-pointer"
              title="Clique para ampliar"
            >
              <img
                src="/logo-danilo.png"
                srcSet="/logo-danilo.png 1x, /logo-danilo@2x.png 2x"
                sizes="(max-width: 640px) 120px, 160px"
                alt="Logo Danilo"
                className="h-20 w-auto object-contain logo-clarity"
                decoding="async"
                loading="eager"
              />
            </button>
          </div>
        </div>
      </div>
      
      {/* Modal de amplificação do logo */}
      {showLogoModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-[100]" 
          onClick={() => setShowLogoModal(false)}
        >
          <div 
            className="relative bg-white p-8 md:p-12 rounded-3xl shadow-2xl max-w-3xl max-h-[90vh] overflow-auto" 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowLogoModal(false)} 
              className="absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 p-3 rounded-full text-gray-800 hover:scale-110 transition-all" 
              aria-label="Fechar"
            >
              <i className="fas fa-times text-xl"/>
            </button>
            <div className="text-center">
              <img
                src="/logo-danilo@2x.png"
                alt="Logo Danilo Cardoso - Alta Qualidade"
                className="w-full h-auto object-contain max-h-[70vh]"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
            </div>
          </div>
        </div>
      )}
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
    <div className="glass-panel m-3 mt-2 rounded-2xl overflow-hidden" style={{height: 'calc(100vh - 96px)'}}>
      {showExternalMessage && (
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-md bg-black/20 z-10">
          <div className="glass-panel text-center p-8 max-w-md rounded-2xl">
            <i className="fas fa-external-link-alt text-6xl text-white mb-4"/>
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">Link Externo Aberto</h3>
            <p className="text-white/90">O link foi aberto em uma nova aba do navegador.</p>
            <p className="text-sm text-white/70 mt-2">Se a aba não abriu, verifique se o bloqueador de pop-ups está ativo.</p>
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
    <div className="h-screen flex flex-col relative">
      <Header onOpenSettings={()=>{
        if(!authUser){
          setShowLogin(true)
        }else{
          setOpenSettings(true)
        }
      }} onOpenAnalysis={()=>setOpenAnalysis(true)} onOpenAgent={()=>setOpenAgent(true)} onToggleSidebar={toggleSidebar} collapsed={sidebarCollapsed} />
      <main className="flex flex-1 overflow-hidden relative">
        {/* Área de hover trigger quando collapsed */}
        {sidebarCollapsed && (
          <div 
            className="fixed left-0 top-16 bottom-0 w-8 z-30 sidebar-trigger-hint"
            style={{
              background: 'linear-gradient(to right, rgba(255,255,255,0.05), transparent)',
              cursor: 'pointer'
            }}
            title="Passe o mouse para mostrar o menu"
          >
            <div className="absolute left-1 top-1/2 -translate-y-1/2 text-white/40">
              <i className="fas fa-chevron-right text-xs"/>
            </div>
          </div>
        )}
        <div style={{
          width: sidebarCollapsed ? '0px' : '280px',
          transition: 'width 300ms ease',
          overflow: 'visible',
          position: 'relative',
          zIndex: 40
        }} aria-hidden={sidebarCollapsed} className="overflow-visible">
          <Sidebar onSelect={(l)=> setCurrentUrl(l.url)} currentUrl={currentUrl} collapsed={sidebarCollapsed} />
        </div>
        <section className="flex-1">
          {currentUrl
            ? <DashboardFrame url={currentUrl} isInitialLoad={isInitialLoad} />
            : (
              <div className="glass-panel m-3 mt-2 rounded-2xl h-[calc(100vh-96px)] flex flex-col overflow-hidden">
                <NewsTicker />
                <div className="flex-1 p-4">
                  <NewsCarousel />
                </div>
              </div>
            )}
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
