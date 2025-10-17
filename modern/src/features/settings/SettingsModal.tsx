import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '../../components/Modal'
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, where, getDocs, serverTimestamp, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { ref as stRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../../firebase'
import * as XLSX from 'xlsx'
import { supabase } from '../../supabase'
import { processDocument } from '../agent/agentService.js'

type Category = { id: string; name: string; icon?: string; order?: number }
type Link = { id: string; category: string; name: string; url: string; kind?: 'powerbi'|'external'; order?: number; isFavorite?: boolean }
type Upload = { id: string; filename: string; sizeBytes: number; uploadedAt: any; storagePath?: string; downloadURL?: string }

export function SettingsModal({open,onClose}:{open:boolean;onClose:()=>void}){
  const [tab,setTab]=useState<'geral'|'categorias'|'links'|'carteira'|'uploads'|'documentos'>('geral')
  
  // Categorias
  const [cats,setCats]=useState<Category[]>([])
  const [catName,setCatName]=useState('')
  const [catIcon,setCatIcon]=useState('fas fa-star')
  
  // Links
  const [links,setLinks]=useState<Link[]>([])
  const [linkCat,setLinkCat]=useState('')
  const [linkName,setLinkName]=useState('')
  const [linkUrl,setLinkUrl]=useState('')
  
  // Carteira
  const [carteiraStatus,setCarteiraStatus]=useState('')
  const [carteiraProgress,setCarteiraProgress]=useState(0)
  
  // Uploads
  const [uploads,setUploads]=useState<Upload[]>([])

  // Geral
  const [darkMode,setDarkMode]=useState(false)
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false)
  const [pbiCropPct,setPbiCropPct]=useState<number>(Number(localStorage.getItem('pbiCropPct')||'7'))
  const [defaultLink,setDefaultLink]=useState('')
  
  // Edição inline
  const [editingCat,setEditingCat]=useState<string|null>(null)
  const [editingLink,setEditingLink]=useState<string|null>(null)
  const [editCatName,setEditCatName]=useState('')
  const [editCatIcon,setEditCatIcon]=useState('')
  const [editLinkName,setEditLinkName]=useState('')
  const [editLinkUrl,setEditLinkUrl]=useState('')
  
  // Documentos IA
  const [documents,setDocuments]=useState<any[]>([])
  const [uploadingDoc,setUploadingDoc]=useState(false)
  const [dragActive,setDragActive]=useState(false)
  const fileInputRef=useRef<HTMLInputElement>(null)

  useEffect(()=>{
    if(!open) return
    // Abrir na aba preferida, se houver
    try{
      const pref = localStorage.getItem('settingsPreferredTab')
      if(pref === 'documentos'){
        setTab('documentos')
        localStorage.removeItem('settingsPreferredTab')
      }
    }catch{}
    // Carregar preferências do Firestore (fallback localStorage)
    const settingsRef = doc(db,'settings','app')
    getDoc(settingsRef).then(s=>{
      if(s.exists()){
        const d=s.data() as any
        if(typeof d.theme==='string') setDarkMode(d.theme==='dark')
        if(typeof d.sidebarCollapsed==='boolean') setSidebarCollapsed(d.sidebarCollapsed)
        if(typeof d.pbiCropPct==='number') setPbiCropPct(d.pbiCropPct)
        if(typeof d.defaultLink==='string') setDefaultLink(d.defaultLink)
      }else{
        setDarkMode(localStorage.getItem('theme')==='dark')
        setSidebarCollapsed(localStorage.getItem('sidebarCollapsed')==='true')
        setPbiCropPct(Number(localStorage.getItem('pbiCropPct')||'7'))
        setDefaultLink(localStorage.getItem('defaultLink')||'')
      }
    })
    
    // Listener de categorias com ordenação
    const unsubCats = onSnapshot(query(collection(db,'categories'), orderBy('name')), (snap)=>{
      const rows = snap.docs.map(d=>({id:d.id, ...(d.data() as any)})) as Category[]
      // Ordenar por order (se existir) e depois por name
      rows.sort((a,b)=> (a.order||999)-(b.order||999) || a.name.localeCompare(b.name))
      setCats(rows)
    })
    // Listener de links com ordenação
    const unsubLinks = onSnapshot(collection(db,'links'), (snap)=>{
      const rows = snap.docs.map(d=>({id:d.id, ...(d.data() as any)})) as Link[]
      rows.sort((a,b)=>(a.category||'').localeCompare(b.category||'')||(a.order||0)-(b.order||0)||a.name.localeCompare(b.name))
      setLinks(rows)
    })
    // Listener de uploads
    const unsubUploads = onSnapshot(query(collection(db,'uploads'), orderBy('uploadedAt','desc')), (snap)=>{
      setUploads(snap.docs.map(d=>({id:d.id, ...(d.data() as any)})))
    })
    
    // Carregar documentos do Supabase
    if(tab==='documentos'){
      loadDocuments()
    }
    
    return ()=>{ unsubCats(); unsubLinks(); unsubUploads(); }
  },[open,tab])

  useEffect(()=>{ if(cats.length && !linkCat) setLinkCat(cats[0].name) },[cats])

  async function addCategory(){
    const name=catName.trim()
    if(!name){ alert('Informe o nome da categoria.'); return }
    if(cats.some(c=>c.name.toLowerCase()===name.toLowerCase())){ alert('Categoria já existe.'); return }
    try{
      const maxOrder = Math.max(0, ...cats.map(c => c.order || 0))
      await addDoc(collection(db,'categories'), { name, icon:catIcon, order: maxOrder + 1, createdAt: serverTimestamp() })
      setCatName('')
      toast('Categoria adicionada.','success')
    }catch(err){ console.error(err); toast('Erro ao salvar categoria.','error') }
  }

  async function deleteCategory(id:string){
    if(!confirm('Excluir esta categoria e seus links?')) return
    const cat=cats.find(c=>c.id===id)
    if(!cat) return
    try{
      const snap = await getDocs(query(collection(db,'links'), where('category','==',cat.name)))
      await Promise.all(snap.docs.map(d=>deleteDoc(doc(db,'links', d.id))))
      await deleteDoc(doc(db,'categories', id))
      toast('Categoria excluída.','success')
    }catch(err){ console.error(err); toast('Erro ao excluir categoria.','error') }
  }

  async function addLink(){
    const category=linkCat, name=linkName.trim(), url=linkUrl.trim()
    if(!category||!name||!url){ alert('Preencha todos os campos.'); return }
    if(!/^https?:\/\//i.test(url)){ alert('Informe uma URL válida iniciando com http:// ou https://'); return }
    const kind = /app\.powerbi\.com\/view/i.test(url) ? 'powerbi' : 'external'
    try{
      const categoryLinks = links.filter(l => l.category === category)
      const maxOrder = Math.max(0, ...categoryLinks.map(l => l.order || 0))
      await addDoc(collection(db,'links'), { category, name, url, kind, order: maxOrder + 1, isFavorite: false, createdAt: serverTimestamp() })
      setLinkName(''); setLinkUrl('')
      toast('Link adicionado.','success')
    }catch(err){ console.error(err); toast('Erro ao salvar link.','error') }
  }

  async function deleteLink(id:string){
    if(!confirm('Excluir este link?')) return
    try{
      await deleteDoc(doc(db,'links', id))
      toast('Link excluído.','success')
    }catch(err){ console.error(err); toast('Erro ao excluir link.','error') }
  }

  async function handleCarteiraUpload(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0]; if(!file) return
    setCarteiraStatus('Lendo arquivo...')
    setCarteiraProgress(5)
    const reader=new FileReader()
    reader.onload=async function(evt){
      try{
        const data=new Uint8Array(evt.target!.result as ArrayBuffer)
        const wb=XLSX.read(data,{type:'array'})
        const ws=wb.Sheets[wb.SheetNames[0]]
        const json=XLSX.utils.sheet_to_json(ws)
        setCarteiraProgress(10)

        // Overwrite: deletar orders e uploads anteriores
        setCarteiraStatus('Removendo dados anteriores...')
        const ordSnap = await getDocs(query(collection(db,'orders')))
        const ordIds = ordSnap.docs.map(d=>d.id)
        for(let i=0;i<ordIds.length;i+=400){
          const slice=ordIds.slice(i,i+400)
          await Promise.all(slice.map(id=> deleteDoc(doc(db,'orders', id))))
          const pct = 10 + Math.floor((i / ordIds.length) * 20)
          setCarteiraProgress(pct)
          setCarteiraStatus(`Removendo pedidos antigos... ${Math.min(i+400, ordIds.length)}/${ordIds.length}`)
        }
        setCarteiraProgress(30)
        const upSnap = await getDocs(query(collection(db,'uploads')))
        await Promise.all(upSnap.docs.map(async d=>{
          const u=d.data()
          if(u.storagePath){ try{ await deleteObject(stRef(storage, u.storagePath)) }catch(_){} }
          await deleteDoc(doc(db,'uploads', d.id))
        }))

        // Tentar enviar ao Storage (opcional, pode falhar)
        let path = '', downloadURL = ''
        setCarteiraStatus('Tentando enviar ao Storage (opcional)...')
        setCarteiraProgress(35)
        try{
          path=`uploads/${Date.now()}-${file.name}`
          const fileRef=stRef(storage, path)
          const uploadPromise = uploadBytes(fileRef, new Blob([data]))
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
          await Promise.race([uploadPromise, timeoutPromise])
          downloadURL=await getDownloadURL(fileRef)
          setCarteiraStatus('Arquivo salvo no Storage.')
        }catch(storageErr:any){
          console.warn('Storage falhou (CORS/404). Continuando sem arquivo.', storageErr)
          setCarteiraStatus('Storage indisponível (continuando sem arquivo).')
          path=''; downloadURL=''
        }
        setCarteiraProgress(40)

        // Criar registro em uploads
        const upDoc=await addDoc(collection(db,'uploads'),{
          filename:file.name,
          sizeBytes:file.size,
          uploadedAt:serverTimestamp(),
          storagePath:path,
          downloadURL
        })
        setCarteiraProgress(45)

        // Mapear linhas para orders e persistir em lotes
        setCarteiraStatus(`Gravando ${json.length} linhas...`)
        const chunkSize=400
        let written=0
        const toNumber=(v:any)=> Number(String(v).replace(/\./g,'').replace(',', '.')) || 0
        const excelDate=(v:any)=>{
          if(v==null||v==='') return null
          if(typeof v==='number'){
            const d=new Date(Math.round((v-25569)*86400*1000))
            return d
          }
          const d=new Date(v); return isNaN(d.getTime())?null:d
        }

        const fieldsMap:Record<string,string>={
          'Status':'status','Pedido':'pedido','Cliente':'cliente','Nr Pedido':'nr_pedido',
          'Produto':'produto','Ferramenta':'ferramenta','Un.At':'un_at',
          'Pedido Kg':'pedido_kg','Pedido Pc':'pedido_pc','Saldo Kg':'saldo_kg','Saldo Pc':'saldo_pc',
          'Empenho Kg':'empenho_kg','Empenho Pc':'empenho_pc','Produzido Kg':'produzido_kg','Produzido Pc':'produzido_pc',
          'Embalado Kg':'embalado_kg','Embalado Pc':'embalado_pc','Romaneio Kg':'romaneio_kg','Romaneio Pc':'romaneio_pc',
          'Faturado Kg':'faturado_kg','Faturado Pc':'faturado_pc','Valor Pedido':'valor_pedido',
          'Representante':'representante','Cidade Entrega':'cidade_entrega','Condições Especiais':'condicoes_especiais'
        }

        for(let i=0;i<json.length;i+=chunkSize){
          const slice=json.slice(i, i+chunkSize)
          const batchOps=[]
          for(const row of slice){
            const payload:any={ uploadId: upDoc.id }
            const di=excelDate((row as any)['Data Implant'])
            const de=excelDate((row as any)['Data Entrega'])
            const duf=excelDate((row as any)['Data Ult Fat'])
            if(di) payload.data_implant=di; if(de) payload.data_entrega=de; if(duf) payload.data_ult_fat=duf
            for(const k in fieldsMap){
              const target=fieldsMap[k]
              if(/Kg|Pc|Valor/.test(k)) payload[target]=toNumber((row as any)[k])
              else payload[target]= (row as any)[k] ?? null
            }
            batchOps.push(addDoc(collection(db,'orders'), payload))
          }
          await Promise.all(batchOps)
          written += slice.length
          const pct = 45 + Math.floor((written / json.length) * 50)
          setCarteiraProgress(pct)
          setCarteiraStatus(`Gravado ${written}/${json.length}...`)
        }

        setCarteiraProgress(100)
        setCarteiraStatus(`Concluído. Upload ${file.name} (${json.length} linhas).`)
        toast('Carteira enviada e salva no Firebase.','success')
        setTimeout(()=>{ setCarteiraStatus(''); setCarteiraProgress(0) }, 3000)
      }catch(err){
        console.error(err); setCarteiraStatus('Erro ao processar e salvar.'); setCarteiraProgress(0); toast('Erro ao processar/salvar no Firebase.','error')
      }
    }
    reader.onerror=function(){setCarteiraStatus('Erro ao ler o arquivo.')}
    reader.readAsArrayBuffer(file)
  }

  async function deleteUpload(id:string, path:string){
    if(!confirm('Excluir este upload e todos os pedidos relacionados?')) return
    try{
      const snap = await getDocs(query(collection(db,'orders'), where('uploadId','==',id)))
      await Promise.all(snap.docs.map(d=> deleteDoc(doc(db,'orders', d.id))))
      if(path){ try{ await deleteObject(stRef(storage, path)) } catch(_){} }
      await deleteDoc(doc(db,'uploads', id))
      toast('Upload removido.','success')
    }catch(err){ console.error(err); toast('Erro ao excluir upload.','error') }
  }

  // Funções de reordenação
  async function moveCategoryUp(id: string) {
    const index = cats.findIndex(c => c.id === id)
    if (index <= 0) return
    const current = cats[index]
    const previous = cats[index - 1]
    try {
      await updateDoc(doc(db, 'categories', current.id), { order: previous.order || 0 })
      await updateDoc(doc(db, 'categories', previous.id), { order: (current.order || 0) + 1 })
    } catch (err) { console.error(err); toast('Erro ao reordenar.', 'error') }
  }

  async function moveCategoryDown(id: string) {
    const index = cats.findIndex(c => c.id === id)
    if (index >= cats.length - 1) return
    const current = cats[index]
    const next = cats[index + 1]
    try {
      await updateDoc(doc(db, 'categories', current.id), { order: (next.order || 0) + 1 })
      await updateDoc(doc(db, 'categories', next.id), { order: current.order || 0 })
    } catch (err) { console.error(err); toast('Erro ao reordenar.', 'error') }
  }

  async function moveLinkUp(id: string) {
    const link = links.find(l => l.id === id)
    if (!link) return
    const categoryLinks = links.filter(l => l.category === link.category)
    const index = categoryLinks.findIndex(l => l.id === id)
    if (index <= 0) return
    const current = categoryLinks[index]
    const previous = categoryLinks[index - 1]
    try {
      await updateDoc(doc(db, 'links', current.id), { order: previous.order || 0 })
      await updateDoc(doc(db, 'links', previous.id), { order: (current.order || 0) + 1 })
    } catch (err) { console.error(err); toast('Erro ao reordenar.', 'error') }
  }

  async function moveLinkDown(id: string) {
    const link = links.find(l => l.id === id)
    if (!link) return
    const categoryLinks = links.filter(l => l.category === link.category)
    const index = categoryLinks.findIndex(l => l.id === id)
    if (index >= categoryLinks.length - 1) return
    const current = categoryLinks[index]
    const next = categoryLinks[index + 1]
    try {
      await updateDoc(doc(db, 'links', current.id), { order: (next.order || 0) + 1 })
      await updateDoc(doc(db, 'links', next.id), { order: current.order || 0 })
    } catch (err) { console.error(err); toast('Erro ao reordenar.', 'error') }
  }

  // Funções de edição inline
  async function saveEditCategory(id: string) {
    const name = editCatName.trim()
    if (!name) { alert('Nome não pode estar vazio.'); return }
    try {
      await updateDoc(doc(db, 'categories', id), { name })
      setEditingCat(null)
      toast('Categoria editada.', 'success')
    } catch (err) { console.error(err); toast('Erro ao editar.', 'error') }
  }

  async function saveEditLink(id: string) {
    const name = editLinkName.trim()
    const url = editLinkUrl.trim()
    if (!name) { alert('Nome não pode estar vazio.'); return }
    if (!url) { alert('URL não pode estar vazia.'); return }
    if(!/^https?:\/\//i.test(url)){ alert('Informe uma URL válida iniciando com http:// ou https://'); return }
    try {
      const kind = /app\.powerbi\.com\/view/i.test(url) ? 'powerbi' : 'external'
      await updateDoc(doc(db, 'links', id), { name, url, kind })
      setEditingLink(null)
      toast('Link editado.', 'success')
    } catch (err) { console.error(err); toast('Erro ao editar.', 'error') }
  }

  function startEditCategory(cat: Category) {
    setEditingCat(cat.id)
    setEditCatName(cat.name)
  }

  function startEditLink(link: Link) {
    setEditingLink(link.id)
    setEditLinkName(link.name)
    setEditLinkUrl(link.url)
  }

  // Funções de favoritos
  async function toggleFavorite(id: string) {
    const link = links.find(l => l.id === id)
    if (!link) return
    try {
      // Primeiro, remover favorito de todos os outros links se estamos marcando como favorito
      if (!link.isFavorite) {
        const favoriteLinks = links.filter(l => l.isFavorite)
        await Promise.all(favoriteLinks.map(l => 
          updateDoc(doc(db, 'links', l.id), { isFavorite: false })
        ))
      }
      await updateDoc(doc(db, 'links', id), { isFavorite: !link.isFavorite })
      toast(link.isFavorite ? 'Favorito removido.' : 'Favorito definido.', 'success')
    } catch (err) { console.error(err); toast('Erro ao definir favorito.', 'error') }
  }

  async function savePreferences(){
    // Persistir no Firestore
    const settingsRef = doc(db,'settings','app')
    await setDoc(settingsRef, {
      theme: darkMode? 'dark':'light',
      sidebarCollapsed: !!sidebarCollapsed,
      pbiCropPct: isFinite(pbiCropPct)? Number(pbiCropPct): 7,
      defaultLink: defaultLink
    }, { merge: true })
    // Aplicar tema imediatamente no DOM
    if(darkMode) document.body.classList.add('dark')
    else document.body.classList.remove('dark')
    // Notificar quem estiver ouvindo (ex.: DashboardFrame) para aplicar sem recarregar
    try { (window as any).dispatchEvent(new CustomEvent('pbi-crop-change', { detail: pbiCropPct })) } catch {}
    toast('Preferências salvas.','success')
  }

  // Funções de Documentos IA
  async function loadDocuments(){
    try{
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })
      
      if(error) throw error
      setDocuments(data || [])
    }catch(err){
      console.error('Erro ao carregar documentos:', err)
    }
  }

  async function handleDocumentUpload(files: FileList | null){
    if(!files || files.length === 0) return
    
    setUploadingDoc(true)
    const file = files[0]
    
    try{
      await processDocument(file)
      toast('Documento processado com sucesso!', 'success')
      await loadDocuments()
    }catch(error: any){
      toast(`Erro ao processar: ${error.message}`, 'error')
    }finally{
      setUploadingDoc(false)
      if(fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function deleteDocument(id: string){
    if(!confirm('Deseja realmente excluir este documento?')) return
    
    try{
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)
      
      if(error) throw error
      toast('Documento excluído.', 'success')
      await loadDocuments()
    }catch(err){
      console.error('Erro ao excluir:', err)
      toast('Erro ao excluir documento.', 'error')
    }
  }

  function handleDrag(e: React.DragEvent){
    e.preventDefault()
    e.stopPropagation()
    if(e.type === 'dragenter' || e.type === 'dragover'){
      setDragActive(true)
    }else if(e.type === 'dragleave'){
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent){
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if(e.dataTransfer.files && e.dataTransfer.files[0]){
      handleDocumentUpload(e.dataTransfer.files)
    }
  }

  function toast(msg:string, type:'success'|'error'){
    // Placeholder simples - pode melhorar com biblioteca de toast
    alert(`[${type.toUpperCase()}] ${msg}`)
  }

  return (
    <Modal open={open} title="Configurações" onClose={onClose}>
      <div className="sticky top-0 bg-white pb-3 z-10">
        <div className="flex gap-2 mb-3 flex-wrap">
          {(['geral','categorias','links','carteira','uploads','documentos'] as const).map(t=>
            <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1 rounded-full border ${tab===t?'bg-blue-600 text-white border-blue-600':'hover:border-blue-400'}`}>{
              t==='geral'?'Geral':t==='categorias'?'Categorias':t==='links'?'Links do Power BI':t==='carteira'?'Carteira de Encomendas':t==='uploads'?'Uploads':'Documentos IA'
            }</button>
          )}
        </div>
      </div>

      {tab==='geral' && (
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={darkMode} onChange={e=>setDarkMode(e.target.checked)}/>
            Tema escuro (black & white)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sidebarCollapsed} onChange={e=>setSidebarCollapsed(e.target.checked)}/>
            Iniciar com menu lateral recolhido
          </label>
          <div className="flex items-center gap-2">
            <label className="font-medium w-[280px]">Ocultar barra do Power BI (% da altura):</label>
            <input type="number" step="0.5" min="0" max="20" className="px-3 py-2 border rounded w-[140px]" value={pbiCropPct} onChange={e=>setPbiCropPct(Number(e.target.value))}/>
            <span className="text-sm text-gray-500">padrão: 7%</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium w-[280px]">Dashboard padrão (abrir no início):</label>
            <select value={defaultLink} onChange={e=>setDefaultLink(e.target.value)} className="px-3 py-2 border rounded flex-1">
              <option value="">Nenhum (tela em branco)</option>
              {links.map(l=> <option key={l.id} value={l.url}>[{l.category}] {l.name} {l.kind==='powerbi'?'(Power BI)':'(Externo)'}</option>)}
            </select>
          </div>
          <button onClick={savePreferences} className="px-4 py-2 bg-blue-600 text-white rounded">Salvar Preferências</button>
        </div>
      )}

      {tab==='categorias' && (
        <div className="space-y-3">
          <div className="grid md:grid-cols-[1fr_220px_auto] gap-2 sticky top-0 bg-white pb-2">
            <input value={catName} onChange={e=>setCatName(e.target.value)} placeholder="Nome da categoria" className="px-3 py-2 border rounded"/>
            <select value={catIcon} onChange={e=>setCatIcon(e.target.value)} className="px-3 py-2 border rounded text-sm">
              <option value="fas fa-star">⭐ Padrão (estrela)</option>
              <optgroup label="📊 Negócios & Comercial">
                <option value="fas fa-chart-line">📈 Gráfico de Linha</option>
                <option value="fas fa-chart-bar">📊 Gráfico de Barras</option>
                <option value="fas fa-chart-pie">🥧 Gráfico Pizza</option>
                <option value="fas fa-briefcase">💼 Maleta</option>
                <option value="fas fa-handshake">🤝 Aperto de Mão</option>
                <option value="fas fa-dollar-sign">💵 Cifrão</option>
                <option value="fas fa-coins">🪙 Moedas</option>
                <option value="fas fa-receipt">🧻 Recibo</option>
                <option value="fas fa-file-invoice-dollar">📄 Fatura</option>
              </optgroup>
              <optgroup label="🏭 Produção & Indústria">
                <option value="fas fa-industry">🏭 Indústria</option>
                <option value="fas fa-cogs">⚙️ Engrenagens</option>
                <option value="fas fa-hammer">🔨 Martelo</option>
                <option value="fas fa-hard-hat">🪠 Capacete</option>
                <option value="fas fa-tools">🛠️ Ferramentas</option>
                <option value="fas fa-boxes">📦 Caixas</option>
                <option value="fas fa-pallet">📦 Palete</option>
                <option value="fas fa-cubes">🧱 Cubos</option>
              </optgroup>
              <optgroup label="🚚 Logística & Transporte">
                <option value="fas fa-truck">🚚 Caminhão</option>
                <option value="fas fa-shipping-fast">🚀 Envio Rápido</option>
                <option value="fas fa-dolly">🛒 Carrinho</option>
                <option value="fas fa-warehouse">🏭 Armazém</option>
                <option value="fas fa-route">🗺️ Rota</option>
                <option value="fas fa-map-marked-alt">🗺️ Mapa</option>
                <option value="fas fa-plane">✈️ Avião</option>
                <option value="fas fa-ship">🚢 Navio</option>
              </optgroup>
              <optgroup label="🔧 Manutenção & Qualidade">
                <option value="fas fa-wrench">🔧 Chave Inglesa</option>
                <option value="fas fa-screwdriver">🪛 Chave de Fenda</option>
                <option value="fas fa-toolbox">🧰 Caixa de Ferramentas</option>
                <option value="fas fa-clipboard-check">✅ Checklist</option>
                <option value="fas fa-tasks">☑️ Tarefas</option>
                <option value="fas fa-certificate">🏆 Certificado</option>
                <option value="fas fa-award">🏅 Prêmio</option>
                <option value="fas fa-medal">🏅 Medalha</option>
              </optgroup>
              <optgroup label="📊 Dashboards & Relatórios">
                <option value="fas fa-tachometer-alt">📊 Dashboard</option>
                <option value="fas fa-chart-area">📉 Gráfico Área</option>
                <option value="fas fa-analytics">📊 Analytics</option>
                <option value="fas fa-file-chart-line">📈 Relatório</option>
                <option value="fas fa-clipboard-list">📋 Lista</option>
                <option value="fas fa-table">📋 Tabela</option>
              </optgroup>
              <optgroup label="📁 Arquivos & Documentos">
                <option value="fas fa-folder">📁 Pasta</option>
                <option value="fas fa-folder-open">📂 Pasta Aberta</option>
                <option value="fas fa-file">📄 Arquivo</option>
                <option value="fas fa-file-alt">📄 Documento</option>
                <option value="fas fa-file-pdf">📄 PDF</option>
                <option value="fas fa-file-excel">📄 Excel</option>
                <option value="fas fa-archive">🗃️ Arquivo</option>
              </optgroup>
              <optgroup label="👥 Pessoas & Equipe">
                <option value="fas fa-users">👥 Usuários</option>
                <option value="fas fa-user-tie">👔 Executivo</option>
                <option value="fas fa-user-cog">⚙️ Admin</option>
                <option value="fas fa-id-card">🪙 Identificação</option>
                <option value="fas fa-user-shield">🛡️ Segurança</option>
              </optgroup>
              <optgroup label="⚙️ Sistema & Configurações">
                <option value="fas fa-cog">⚙️ Configuração</option>
                <option value="fas fa-sliders-h">🎹 Controles</option>
                <option value="fas fa-database">💾 Banco de Dados</option>
                <option value="fas fa-server">💻 Servidor</option>
                <option value="fas fa-network-wired">🌐 Rede</option>
              </optgroup>
              <optgroup label="⭐ Outros">
                <option value="fas fa-bookmark">🔖 Favorito</option>
                <option value="fas fa-bell">🔔 Notificação</option>
                <option value="fas fa-calendar">📅 Calendário</option>
                <option value="fas fa-clock">⏰ Relógio</option>
                <option value="fas fa-home">🏠 Início</option>
                <option value="fas fa-building">🏛️ Prédio</option>
                <option value="fas fa-store">🏪 Loja</option>
                <option value="fas fa-shopping-cart">🛒 Carrinho</option>
              </optgroup>
            </select>
            <button onClick={addCategory} className="px-3 py-2 bg-blue-600 text-white rounded">Adicionar</button>
          </div>
          <ul className="space-y-2 max-h-[50vh] overflow-auto">
            {cats.map((c,idx)=> (
              <li key={c.id} className="px-3 py-2 border rounded flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {editingCat === c.id ? (
                    <div className="flex items-center gap-2">
                      <i className={c.icon||'fas fa-star'}/>
                      <input 
                        value={editCatName} 
                        onChange={e=>setEditCatName(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'?saveEditCategory(c.id):e.key==='Escape'?setEditingCat(null):null}
                        className="px-2 py-1 border rounded font-semibold"
                        autoFocus
                      />
                      <button onClick={()=>saveEditCategory(c.id)} className="px-2 py-1 bg-green-600 text-white rounded text-sm">Salvar</button>
                      <button onClick={()=>setEditingCat(null)} className="px-2 py-1 bg-gray-400 text-white rounded text-sm">Cancelar</button>
                    </div>
                  ) : (
                    <span className="font-semibold cursor-pointer" onClick={()=>startEditCategory(c)}><i className={c.icon||'fas fa-star'}/> {c.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={()=>moveCategoryUp(c.id)} disabled={idx===0} className="px-2 py-1 border rounded text-sm disabled:opacity-50" title="Mover para cima">↑</button>
                  <button onClick={()=>moveCategoryDown(c.id)} disabled={idx===cats.length-1} className="px-2 py-1 border rounded text-sm disabled:opacity-50" title="Mover para baixo">↓</button>
                  <button onClick={()=>deleteCategory(c.id)} className="px-2 py-1 border rounded text-red-600 hover:bg-red-600 hover:text-white">Excluir</button>
                </div>
              </li>
            ))}
            {cats.length===0 && <li className="text-gray-500 text-center py-4">Nenhuma categoria cadastrada.</li>}
          </ul>
        </div>
      )}

      {tab==='links' && (
        <div className="space-y-3">
          <div className="grid md:grid-cols-[200px_1fr_1.4fr_auto] gap-2 sticky top-0 bg-white pb-2">
            <select value={linkCat} onChange={e=>setLinkCat(e.target.value)} className="px-3 py-2 border rounded">
              {cats.map(c=> <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <input value={linkName} onChange={e=>setLinkName(e.target.value)} placeholder="Nome do link" className="px-3 py-2 border rounded"/>
            <input value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} placeholder="URL (http/https)" className="px-3 py-2 border rounded"/>
            <button onClick={addLink} className="px-3 py-2 bg-blue-600 text-white rounded">Adicionar</button>
          </div>
          <ul className="space-y-2 max-h-[50vh] overflow-auto">
            {(() => {
              const groupedLinks: Record<string, Link[]> = {}
              links.forEach(l => {
                if (!groupedLinks[l.category]) groupedLinks[l.category] = []
                groupedLinks[l.category].push(l)
              })
              return Object.entries(groupedLinks).map(([category, categoryLinks]) => (
                <div key={category}>
                  <h4 className="font-bold text-gray-700 mt-4 mb-2">{category}</h4>
                  {categoryLinks.map((l, idx) => (
                    <li key={l.id} className="px-3 py-2 border rounded ml-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          {l.isFavorite && <i className="fas fa-star text-yellow-500" title="Favorito"/>}
                          <span className={`px-1 py-0.5 rounded text-xs ${l.kind==='powerbi'?'bg-blue-100 text-blue-800':'bg-green-100 text-green-800'}`}>
                            {l.kind==='powerbi'?'Power BI':'Externo'}
                          </span>
                          {editingLink === l.id ? (
                            <div className="flex flex-col gap-2 flex-1">
                              <input 
                                value={editLinkName} 
                                onChange={e=>setEditLinkName(e.target.value)}
                                placeholder="Nome do link"
                                className="px-2 py-1 border rounded w-full"
                                autoFocus
                              />
                              <input 
                                value={editLinkUrl} 
                                onChange={e=>setEditLinkUrl(e.target.value)}
                                placeholder="URL (http/https)"
                                className="px-2 py-1 border rounded w-full text-sm"
                              />
                              <div className="flex gap-2">
                                <button onClick={()=>saveEditLink(l.id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Salvar</button>
                                <button onClick={()=>setEditingLink(null)} className="px-3 py-1 bg-gray-400 text-white rounded text-sm">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1">
                              <div className="cursor-pointer font-medium hover:text-blue-600" onClick={()=>startEditLink(l)} title="Clique para editar">{l.name}</div>
                              <div className="text-xs text-gray-500 mt-1 break-all" title={l.url}>{l.url.length > 60 ? l.url.substring(0, 60) + '...' : l.url}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={()=>toggleFavorite(l.id)} className={`px-2 py-1 border rounded text-sm ${l.isFavorite?'bg-yellow-500 text-white':'hover:bg-yellow-100'}`} title="Marcar/desmarcar favorito">
                          <i className="fas fa-star"/>
                        </button>
                        <button onClick={()=>moveLinkUp(l.id)} disabled={idx===0} className="px-2 py-1 border rounded text-sm disabled:opacity-50" title="Mover para cima">↑</button>
                        <button onClick={()=>moveLinkDown(l.id)} disabled={idx===categoryLinks.length-1} className="px-2 py-1 border rounded text-sm disabled:opacity-50" title="Mover para baixo">↓</button>
                        <button onClick={()=>deleteLink(l.id)} className="px-2 py-1 border rounded text-red-600 hover:bg-red-600 hover:text-white">Excluir</button>
                      </div>
                    </li>
                  ))}
                </div>
              ))
            })()}
            {links.length===0 && <li className="text-gray-500 text-center py-4">Nenhum link cadastrado.</li>}
          </ul>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-500">Validação: URLs Power BI serão abertas no iframe; outras em nova aba.</p>
            <p className="text-sm text-blue-600"><strong>Dica:</strong> Clique no nome para editar (nome e URL), use ★ para favorito, ↑↓ para reordenar.</p>
            <p className="text-sm text-gray-600"><i className="fas fa-info-circle"/> A URL completa é exibida abaixo do nome. Passe o mouse para ver a URL completa.</p>
          </div>
        </div>
      )}

      {tab==='carteira' && (
        <div className="space-y-3">
          <p>Carregue seu Excel da Carteira de Encomendas (.xlsx/.xls). Os dados anteriores serão sobrescritos.</p>
          <input type="file" accept=".xlsx,.xls" onChange={handleCarteiraUpload} className="block"/>
          {carteiraStatus && (
            <div className="mt-3">
              <div className="text-sm text-gray-700 mb-2">{carteiraStatus}</div>
              {carteiraProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-300 flex items-center justify-center text-xs text-white font-semibold"
                    style={{width: `${carteiraProgress}%`}}
                  >
                    {carteiraProgress}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab==='uploads' && (
        <div className="space-y-3">
          <p>Uploads salvos no Firebase:</p>
          <ul className="space-y-2 max-h-[50vh] overflow-auto">
            {uploads.map(u=> (
              <li key={u.id} className="px-3 py-2 border rounded flex justify-between items-center">
                <span>{u.filename || '(sem nome)'} - {Math.round((u.sizeBytes||0)/1024)} KB</span>
                <button onClick={()=>deleteUpload(u.id, u.storagePath||'')} className="px-2 py-1 border rounded text-red-600 hover:bg-red-600 hover:text-white">Excluir</button>
              </li>
            ))}
            {uploads.length===0 && <li className="text-gray-500 text-center py-4">Nenhum upload encontrado.</li>}
          </ul>
        </div>
      )}

      {tab==='documentos' && (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-robot text-blue-600 text-xl"/>
              <h3 className="font-semibold text-gray-800">Documentos do Agente IA</h3>
            </div>
            <p className="text-sm text-gray-600">Gerencie os documentos que serão usados como base de conhecimento pelo Agente Tecnoperfil.</p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.xlsx,.xls,.docx,.txt"
              onChange={(e) => handleDocumentUpload(e.target.files)}
              className="hidden"
            />
            <i className="fas fa-cloud-upload-alt text-4xl text-blue-500 mb-3"/>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDoc}
              className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 block mx-auto"
            >
              {uploadingDoc ? (
                <><i className="fas fa-spinner fa-spin mr-2"/>Processando documento...</>
              ) : (
                <>Arraste arquivos ou clique para selecionar</>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2">PDF, CSV, Excel, DOCX, TXT</p>
            <p className="text-xs text-gray-400 mt-1">Os documentos serão processados e indexados para busca semântica</p>
          </div>

          <div className="mt-6">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <i className="fas fa-file-alt"/>
              Documentos Carregados ({documents.length})
            </h4>
            
            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-inbox text-4xl mb-3 opacity-50"/>
                <p>Nenhum documento carregado ainda.</p>
                <p className="text-sm mt-1">Faça upload de documentos para começar.</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-[400px] overflow-auto">
                {documents.map((doc) => (
                  <li key={doc.id} className="px-4 py-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <i className={`fas ${
                            doc.file_type?.includes('pdf') ? 'fa-file-pdf text-red-500' :
                            doc.file_type?.includes('excel') || doc.file_type?.includes('spreadsheet') ? 'fa-file-excel text-green-500' :
                            doc.file_type?.includes('word') || doc.file_type?.includes('document') ? 'fa-file-word text-blue-500' :
                            doc.file_type?.includes('csv') ? 'fa-file-csv text-orange-500' :
                            'fa-file-alt text-gray-500'
                          }`}/>
                          <span className="font-medium text-gray-800">{doc.filename}</span>
                        </div>
                        <div className="text-xs text-gray-500 ml-6">
                          <span>Tamanho: {(doc.content?.length || 0).toLocaleString('pt-BR')} caracteres</span>
                          <span className="mx-2">•</span>
                          <span>Carregado em: {new Date(doc.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="ml-3 px-3 py-1 text-red-600 hover:bg-red-50 rounded border border-red-300 hover:border-red-500 transition-colors text-sm"
                        title="Excluir documento"
                      >
                        <i className="fas fa-trash"/>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <i className="fas fa-info-circle text-yellow-600 mt-0.5"/>
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Importante:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Os documentos são processados e convertidos em embeddings vetoriais</li>
                  <li>O Agente IA usará esses documentos para responder perguntas contextualizadas</li>
                  <li>Documentos maiores podem levar mais tempo para processar</li>
                  <li>Certifique-se de que o schema SQL foi executado no Supabase</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
