import React, { useState, useEffect } from 'react'
import { Modal } from '../../components/Modal'
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, where, getDocs, serverTimestamp, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { ref as stRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../../firebase'
import * as XLSX from 'xlsx'

type Category = { id: string; name: string; icon?: string }
type Link = { id: string; category: string; name: string; url: string; kind?: 'powerbi'|'external' }
type Upload = { id: string; filename: string; sizeBytes: number; uploadedAt: any; storagePath?: string; downloadURL?: string }

export function SettingsModal({open,onClose}:{open:boolean;onClose:()=>void}){
  const [tab,setTab]=useState<'geral'|'categorias'|'links'|'carteira'|'uploads'>('geral')
  
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
  
  // Uploads
  const [uploads,setUploads]=useState<Upload[]>([])

  // Geral
  const [darkMode,setDarkMode]=useState(false)
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false)
  const [pbiCropPct,setPbiCropPct]=useState<number>(Number(localStorage.getItem('pbiCropPct')||'7'))

  useEffect(()=>{
    if(!open) return
    // Carregar preferências do Firestore (fallback localStorage)
    const settingsRef = doc(db,'settings','app')
    getDoc(settingsRef).then(s=>{
      if(s.exists()){
        const d=s.data() as any
        if(typeof d.theme==='string') setDarkMode(d.theme==='dark')
        if(typeof d.sidebarCollapsed==='boolean') setSidebarCollapsed(d.sidebarCollapsed)
        if(typeof d.pbiCropPct==='number') setPbiCropPct(d.pbiCropPct)
      }else{
        setDarkMode(localStorage.getItem('theme')==='dark')
        setSidebarCollapsed(localStorage.getItem('sidebarCollapsed')==='true')
        setPbiCropPct(Number(localStorage.getItem('pbiCropPct')||'7'))
      }
    })
    
    // Listener de categorias
    const unsubCats = onSnapshot(query(collection(db,'categories'), orderBy('name')), (snap)=>{
      setCats(snap.docs.map(d=>({id:d.id, ...(d.data() as any)})))
    })
    // Listener de links
    const unsubLinks = onSnapshot(collection(db,'links'), (snap)=>{
      const rows = snap.docs.map(d=>({id:d.id, ...(d.data() as any)})) as Link[]
      rows.sort((a,b)=>(a.category||'').localeCompare(b.category||'')||a.name.localeCompare(b.name))
      setLinks(rows)
    })
    // Listener de uploads
    const unsubUploads = onSnapshot(query(collection(db,'uploads'), orderBy('uploadedAt','desc')), (snap)=>{
      setUploads(snap.docs.map(d=>({id:d.id, ...(d.data() as any)})))
    })
    return ()=>{ unsubCats(); unsubLinks(); unsubUploads(); }
  },[open])

  useEffect(()=>{ if(cats.length && !linkCat) setLinkCat(cats[0].name) },[cats])

  async function addCategory(){
    const name=catName.trim()
    if(!name){ alert('Informe o nome da categoria.'); return }
    if(cats.some(c=>c.name.toLowerCase()===name.toLowerCase())){ alert('Categoria já existe.'); return }
    try{
      await addDoc(collection(db,'categories'), { name, icon:catIcon, createdAt: serverTimestamp() })
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
      await addDoc(collection(db,'links'), { category, name, url, kind, createdAt: serverTimestamp() })
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
    const reader=new FileReader()
    reader.onload=async function(evt){
      try{
        const data=new Uint8Array(evt.target!.result as ArrayBuffer)
        const wb=XLSX.read(data,{type:'array'})
        const ws=wb.Sheets[wb.SheetNames[0]]
        const json=XLSX.utils.sheet_to_json(ws)

        // Overwrite: deletar orders e uploads anteriores
        setCarteiraStatus('Removendo dados anteriores...')
        const ordSnap = await getDocs(query(collection(db,'orders')))
        const ordIds = ordSnap.docs.map(d=>d.id)
        for(let i=0;i<ordIds.length;i+=400){
          const slice=ordIds.slice(i,i+400)
          await Promise.all(slice.map(id=> deleteDoc(doc(db,'orders', id))))
          setCarteiraStatus(`Removendo pedidos antigos... ${Math.min(i+400, ordIds.length)}/${ordIds.length}`)
        }
        const upSnap = await getDocs(query(collection(db,'uploads')))
        await Promise.all(upSnap.docs.map(async d=>{
          const u=d.data()
          if(u.storagePath){ try{ await deleteObject(stRef(storage, u.storagePath)) }catch(_){} }
          await deleteDoc(doc(db,'uploads', d.id))
        }))

        // Tentar enviar ao Storage
        let path = '', downloadURL = ''
        try{
          setCarteiraStatus('Enviando arquivo ao armazenamento...')
          path=`uploads/${Date.now()}-${file.name}`
          const fileRef=stRef(storage, path)
          await uploadBytes(fileRef, new Blob([data]))
          downloadURL=await getDownloadURL(fileRef)
        }catch(storageErr){
          console.warn('Storage indisponível. Prosseguindo sem salvar arquivo.', storageErr)
          setCarteiraStatus('Storage indisponível. Prosseguindo sem salvar arquivo.')
          path=''; downloadURL=''
        }

        // Criar registro em uploads
        const upDoc=await addDoc(collection(db,'uploads'),{
          filename:file.name,
          sizeBytes:file.size,
          uploadedAt:serverTimestamp(),
          storagePath:path,
          downloadURL
        })

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
          setCarteiraStatus(`Gravado ${written}/${json.length}...`)
        }

        setCarteiraStatus(`Concluído. Upload ${file.name} (${json.length} linhas).`)
        toast('Carteira enviada e salva no Firebase.','success')
      }catch(err){
        console.error(err); setCarteiraStatus('Erro ao processar e salvar.'); toast('Erro ao processar/salvar no Firebase.','error')
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

  async function savePreferences(){
    // Persistir no Firestore
    const settingsRef = doc(db,'settings','app')
    await setDoc(settingsRef, {
      theme: darkMode? 'dark':'light',
      sidebarCollapsed: !!sidebarCollapsed,
      pbiCropPct: isFinite(pbiCropPct)? Number(pbiCropPct): 7
    }, { merge: true })
    // Aplicar tema imediatamente no DOM
    if(darkMode) document.body.classList.add('dark')
    else document.body.classList.remove('dark')
    // Notificar quem estiver ouvindo (ex.: DashboardFrame) para aplicar sem recarregar
    try { (window as any).dispatchEvent(new CustomEvent('pbi-crop-change', { detail: pbiCropPct })) } catch {}
    toast('Preferências salvas.','success')
  }

  function toast(msg:string, type:'success'|'error'){
    // Placeholder simples - pode melhorar com biblioteca de toast
    alert(`[${type.toUpperCase()}] ${msg}`)
  }

  return (
    <Modal open={open} title="Configurações" onClose={onClose}>
      <div className="sticky top-0 bg-white pb-3 z-10">
        <div className="flex gap-2 mb-3 flex-wrap">
          {(['geral','categorias','links','carteira','uploads'] as const).map(t=>
            <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1 rounded-full border ${tab===t?'bg-blue-600 text-white border-blue-600':'hover:border-blue-400'}`}>{
              t==='geral'?'Geral':t==='categorias'?'Categorias':t==='links'?'Links do Power BI':t==='carteira'?'Carteira de Encomendas':'Uploads'
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
          <button onClick={savePreferences} className="px-4 py-2 bg-blue-600 text-white rounded">Salvar Preferências</button>
        </div>
      )}

      {tab==='categorias' && (
        <div className="space-y-3">
          <div className="grid md:grid-cols-[1fr_220px_auto] gap-2 sticky top-0 bg-white pb-2">
            <input value={catName} onChange={e=>setCatName(e.target.value)} placeholder="Nome da categoria" className="px-3 py-2 border rounded"/>
            <select value={catIcon} onChange={e=>setCatIcon(e.target.value)} className="px-3 py-2 border rounded">
              <option value="fas fa-star">Padrão (estrela)</option>
              <option value="fas fa-chart-line">Comercial</option>
              <option value="fas fa-industry">Produção</option>
              <option value="fas fa-truck">Logística</option>
              <option value="fas fa-wrench">Manutenção</option>
              <option value="fas fa-folder">Pasta</option>
              <option value="fas fa-tachometer-alt">Dashboard</option>
            </select>
            <button onClick={addCategory} className="px-3 py-2 bg-blue-600 text-white rounded">Adicionar</button>
          </div>
          <ul className="space-y-2 max-h-[50vh] overflow-auto">
            {cats.map(c=> (
              <li key={c.id} className="px-3 py-2 border rounded flex justify-between items-center">
                <span className="font-semibold"><i className={c.icon||'fas fa-star'}/> {c.name}</span>
                <button onClick={()=>deleteCategory(c.id)} className="px-2 py-1 border rounded text-red-600 hover:bg-red-600 hover:text-white">Excluir</button>
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
            {links.map(l=> (
              <li key={l.id} className="px-3 py-2 border rounded flex justify-between items-center">
                <span><strong>[{l.category}]</strong> {l.name}</span>
                <button onClick={()=>deleteLink(l.id)} className="px-2 py-1 border rounded text-red-600 hover:bg-red-600 hover:text-white">Excluir</button>
              </li>
            ))}
            {links.length===0 && <li className="text-gray-500 text-center py-4">Nenhum link cadastrado.</li>}
          </ul>
          <p className="text-sm text-gray-500">Validação: URLs Power BI serão abertas no iframe; outras em nova aba.</p>
        </div>
      )}

      {tab==='carteira' && (
        <div className="space-y-3">
          <p>Carregue seu Excel da Carteira de Encomendas (.xlsx/.xls). Os dados anteriores serão sobrescritos.</p>
          <input type="file" accept=".xlsx,.xls" onChange={handleCarteiraUpload} className="block"/>
          {carteiraStatus && <div className="text-sm text-gray-600 mt-2">{carteiraStatus}</div>}
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
    </Modal>
  )
}
