import { db, storage } from './firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, where, getDocs, serverTimestamp, updateDoc, getDoc, limit } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { ref as stRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

document.addEventListener('DOMContentLoaded',()=>{
  const themeToggle=document.getElementById('theme-toggle');
  // Restaurar tema salvo
  const savedTheme=localStorage.getItem('theme')||'light';
  if(savedTheme==='dark'){
    document.body.classList.add('dark');
    const i=themeToggle?.querySelector('i');
    if(i){i.classList.remove('fa-moon');i.classList.add('fa-sun');}
  }

  // Remove duplicidades em Firestore e apaga menus estáticos antigos
  let cleanedOnce = false;
  async function cleanUpDuplicatesAndHideStatic(){
    if(cleanedOnce || firstCats || firstLinks) return;
    cleanedOnce = true;
    try{
      // Dedup categorias por nome (case-insensitive)
      const byName = new Map();
      for(const c of cats){
        const k=(c.name||'').trim().toLowerCase();
        if(!k) continue;
        if(!byName.has(k)) byName.set(k, c);
        else{
          // apagar duplicata
          await deleteDoc(doc(db,'categories', c.id));
        }
      }
      // Dedup links por (category,name) case-insensitive
      const byKey = new Set();
      for(const l of links){
        const k=`${(l.category||'').trim().toLowerCase()}|||${(l.name||'').trim().toLowerCase()}`;
        if(byKey.has(k)){
          await deleteDoc(doc(db,'links', l.id));
        } else byKey.add(k);
      }
    }catch(err){ console.warn('Dedup falhou:', err); }

    // Remover menus estáticos antigos (não-custom) após termos menu dinâmico
    document.querySelectorAll('.menu > .menu-item:not(.custom)').forEach(n=> n.remove());
  }

  // Listagem de uploads e exclusão
  const uploadsList = document.getElementById('uploads-list');
  const uploadsRef = query(collection(db,'uploads'), orderBy('uploadedAt','desc'));
  onSnapshot(uploadsRef, (snap)=>{
    if(!uploadsList) return;
    uploadsList.innerHTML='';
    snap.forEach(d=>{
      const u=d.data();
      const li=document.createElement('li');
      li.innerHTML=`<span class="title">${u.filename || '(sem nome)'} - ${u.sizeBytes||0} bytes</span>
        <span class="cfg-actions"><button class="btn btn-danger up-del" data-id="${d.id}" data-path="${u.storagePath||''}">Excluir</button></span>`;
      uploadsList.appendChild(li);
    });
  });

  // Acessibilidade do modal: fechar com ESC e trap de foco simples
  document.addEventListener('keydown',(ev)=>{
    if(ev.key==='Escape' && !cfgModal.hidden){ closeConfig(); }
    if(ev.key==='Tab' && !cfgModal.hidden){
      const focusables = cfgModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if(focusables.length){
        const first=focusables[0]; const last=focusables[focusables.length-1];
        if(ev.shiftKey && document.activeElement===first){ last.focus(); ev.preventDefault(); }
        else if(!ev.shiftKey && document.activeElement===last){ first.focus(); ev.preventDefault(); }
      }
    }
  });
  uploadsList?.addEventListener('click', async (e)=>{
    const btn=e.target.closest('.up-del'); if(!btn) return;
    if(!confirm('Excluir este upload e todos os pedidos relacionados?')) return;
    const id=btn.dataset.id; const path=btn.dataset.path;
    try{
      // Apagar orders relacionadas
      const snap = await getDocs(query(collection(db,'orders'), where('uploadId','==',id)));
      await Promise.all(snap.docs.map(d=> deleteDoc(doc(db,'orders', d.id))));
      // Apagar arquivo do Storage se houver
      if(path){ try{ await deleteObject(stRef(storage, path)); } catch(_){} }
      // Apagar doc de upload
      await deleteDoc(doc(db,'uploads', id));
      toast('Upload removido.','success');
    }catch(err){
      console.error(err); toast('Erro ao excluir upload.','error');
    }
  });
  themeToggle?.addEventListener('click',()=>{
    const toDark=!document.body.classList.contains('dark');
    document.body.classList.toggle('dark');
    localStorage.setItem('theme',toDark?'dark':'light');
    const i=themeToggle.querySelector('i');
    if(i){i.classList.toggle('fa-moon');i.classList.toggle('fa-sun');}
  });

  // Filtro do menu (busca no topo)
  const menuSearch = document.querySelector('.search-bar input');
  const normalize=(s)=> (s||'').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
  menuSearch?.addEventListener('input', (e)=>{
    const term = normalize(e.target.value||'').trim();
    const menuItems = document.querySelectorAll('.menu > .menu-item');
    menuItems.forEach(mi=>{
      const header = normalize(mi.querySelector('.menu-header span')?.textContent||'');
      const subItems = mi.querySelectorAll('.submenu .submenu-item');
      let any = false;
      subItems.forEach(si=>{
        const text = normalize(si.querySelector('span')?.textContent||'');
        const match = term==='' || text.includes(term) || header.includes(term);
        si.style.display = match ? '' : 'none';
        si.classList.toggle('search-match', !!(term && match));
        if(match) any = true;
      });
      // Mostrar o menu se o header combinar ou algum subitem combinar
      const showMenu = term==='' || header.includes(term) || any;
      mi.style.display = showMenu ? '' : 'none';
      // Expandir se houver termo e houver correspondência
      if(term!=='' && showMenu){ mi.classList.add('active'); }
      if(term===''){ mi.classList.remove('active'); }
    });
  });

  const container=document.querySelector('.container');
  const sidebarToggle=document.getElementById('sidebar-toggle');
  // Restaurar estado da sidebar
  const savedSidebar=localStorage.getItem('sidebarCollapsed')==='true';
  if(savedSidebar){container.classList.add('sidebar-collapsed');}
  sidebarToggle?.addEventListener('click',()=>{
    const collapsed=container.classList.toggle('sidebar-collapsed');
    localStorage.setItem('sidebarCollapsed',String(collapsed));
  });

  // Abrir/fechar submenus
  document.querySelectorAll('.menu-header').forEach(h=>{
    h.addEventListener('click',()=>{
      const item=h.closest('.menu-item');
      const wasActive=item.classList.contains('active');
      document.querySelectorAll('.menu-item.active').forEach(mi=>mi.classList.remove('active'));
      if(!wasActive) item.classList.add('active');
    });
  });

  // Abrir Power BI no iFrame, externos em nova aba
  const iframe=document.getElementById('dashboard-iframe');
  function ensureHttp(u){ return /^https?:\/\//i.test(u)?u:`https://${u}`; }
  function carregarDashboard(url){
    if(!url){ document.querySelector('.dashboard-grid').style.display='grid'; return; }
    const isPowerBi=/app\.powerbi\.com\/view/i.test(url);
    if(!isPowerBi){ window.open(ensureHttp(url), '_blank'); return; }
    const hideNavUrl=url+(url.includes('?')?'&':'?')+'navContentPaneEnabled=false';
    iframe.style.opacity='0'; iframe.src=hideNavUrl; iframe.onload=()=>{iframe.style.opacity='1';};
  }

  document.querySelectorAll('.submenu-item').forEach(btn=>{
    btn.addEventListener('click',(e)=>{
      e.preventDefault();
      const url=btn.dataset.dashboardUrl; if(!url) return;
      const kind=btn.dataset.kind||'';
      const isPowerBi = kind==='powerbi' || /app\.powerbi\.com\/view/i.test(url);
      if(isPowerBi){
        document.querySelectorAll('.submenu-item').forEach(i=>i.classList.remove('active'));
        btn.classList.add('active');
        carregarDashboard(url);
        const label=btn.querySelector('span')?.textContent?.trim().toLowerCase().replace(/\s+/g,'-')||'dashboard';
        location.hash = label;
      } else {
        window.open(ensureHttp(url), '_blank');
      }
    });
  });

  // Deep link simples via hash (opcional)
  if(location.hash){
    const target=Array.from(document.querySelectorAll('.submenu-item')).find(b=>{
      const t=b.querySelector('span')?.textContent?.trim().toLowerCase().replace(/\s+/g,'-');
      return '#'+t===location.hash;
    });
    target?.click();
  }

  // Configurações
  const cfgBtn=document.getElementById('config-btn');
  const cfgOverlay=document.getElementById('config-overlay');
  const cfgModal=document.getElementById('config-modal');
  const cfgClose=document.getElementById('config-close');
  const cfgSave=document.getElementById('config-save');
  const cbDark=document.getElementById('cfg-dark');
  const cbCollapse=document.getElementById('cfg-collapse');
  // Análise Carteira
  const analysisBtn=document.getElementById('analysis-btn');
  const analysisOverlay=document.getElementById('analysis-overlay');
  const analysisModal=document.getElementById('analysis-modal');
  const analysisClose=document.getElementById('analysis-close');
  const analysisStatus=document.getElementById('analysis-status');
  const fltCliente=document.getElementById('flt-cliente');
  const fltFerramenta=document.getElementById('flt-ferramenta');
  const analysisRefresh=document.getElementById('analysis-refresh');
  const analysisExport=document.getElementById('analysis-export');
  const ordersTable=document.getElementById('orders-table');

  function openConfig(){
    // Popular valores atuais
    cbDark.checked=document.body.classList.contains('dark');
    cbCollapse.checked=container.classList.contains('sidebar-collapsed');
    cfgOverlay.hidden=false; cfgModal.hidden=false;
    requestAnimationFrame(()=>{cfgOverlay.classList.add('show');cfgModal.classList.add('show');});
  }
  function closeConfig(){
    cfgOverlay.classList.remove('show');
    cfgModal.classList.remove('show');
    setTimeout(()=>{cfgOverlay.hidden=true;cfgModal.hidden=true;},200);
  }

  cfgBtn?.addEventListener('click',openConfig);
  cfgClose?.addEventListener('click',closeConfig);
  cfgOverlay?.addEventListener('click',closeConfig);

  // ===== Modal de Análise da Carteira =====
  let ordersCache=[]; let latestUploadId='';
  function openAnalysis(){ analysisOverlay.hidden=false; analysisModal.hidden=false; requestAnimationFrame(()=>{analysisOverlay.classList.add('show');analysisModal.classList.add('show');}); loadLatestOrders(); }
  function closeAnalysis(){ analysisOverlay.classList.remove('show'); analysisModal.classList.remove('show'); setTimeout(()=>{analysisOverlay.hidden=true;analysisModal.hidden=true;},200); }
  analysisBtn?.addEventListener('click', openAnalysis);
  analysisClose?.addEventListener('click', closeAnalysis);
  analysisOverlay?.addEventListener('click', closeAnalysis);

  function normalizePt(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,''); }
  function fit(val){ return val==null?'' : String(val); }
  function fmtDate(d){ try{ if(!d) return ''; const dt = d.seconds? new Date(d.seconds*1000) : new Date(d); return dt.toLocaleDateString('pt-BR'); }catch(_){ return ''; } }
  function renderOrders(){
    const nCli=normalizePt(fltCliente?.value||'');
    const nFer=normalizePt(fltFerramenta?.value||'');
    const tbody=ordersTable?.querySelector('tbody'); if(!tbody) return; tbody.innerHTML='';
    let shown=0;
    for(const o of ordersCache){
      if(nCli && !normalizePt(o.cliente).includes(nCli)) continue;
      if(nFer && !normalizePt(o.ferramenta).includes(nFer)) continue;
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td>${fit(o.status)}</td><td>${fit(o.pedido)}</td><td>${fit(o.cliente)}</td><td>${fit(o.nr_pedido)}</td>
        <td>${fmtDate(o.data_implant)}</td><td>${fmtDate(o.data_entrega)}</td><td>${fmtDate(o.data_ult_fat)}</td>
        <td>${fit(o.produto)}</td><td>${fit(o.ferramenta)}</td><td>${fit(o.un_at)}</td>
        <td>${fit(o.pedido_kg)}</td><td>${fit(o.pedido_pc)}</td><td>${fit(o.saldo_kg)}</td><td>${fit(o.saldo_pc)}</td><td>${fit(o.empenho_kg)}</td><td>${fit(o.empenho_pc)}</td>
        <td>${fit(o.produzido_kg)}</td><td>${fit(o.produzido_pc)}</td><td>${fit(o.embalado_kg)}</td><td>${fit(o.embalado_pc)}</td><td>${fit(o.romaneio_kg)}</td><td>${fit(o.romaneio_pc)}</td>
        <td>${fit(o.faturado_kg)}</td><td>${fit(o.faturado_pc)}</td><td>${fit(o.valor_pedido)}</td>`;
      tbody.appendChild(tr); shown++;
    }
    analysisStatus.textContent = latestUploadId ? `Exibindo ${shown} de ${ordersCache.length} linhas do upload atual.` : 'Nenhum upload encontrado.';
  }

  async function loadLatestOrders(){
    try{
      analysisStatus.textContent='Carregando últimos dados...';
      const lastUpSnap = await getDocs(query(collection(db,'uploads'), orderBy('uploadedAt','desc'), limit(1)));
      const up = lastUpSnap.docs[0];
      if(!up){ latestUploadId=''; ordersCache=[]; renderOrders(); return; }
      latestUploadId=up.id;
      const ordersSnap = await getDocs(query(collection(db,'orders'), where('uploadId','==', latestUploadId)));
      ordersCache = ordersSnap.docs.map(d=> d.data());
      renderOrders();
    }catch(err){ console.error(err); analysisStatus.textContent='Erro ao carregar dados.'; }
  }

  fltCliente?.addEventListener('input', renderOrders);
  fltFerramenta?.addEventListener('input', renderOrders);
  analysisRefresh?.addEventListener('click', loadLatestOrders);
  analysisExport?.addEventListener('click', ()=>{
    if(!ordersCache.length) return;
    const headers=["Status","Pedido","Cliente","Nr Pedido","Data Implant","Data Entrega","Data Ult Fat","Produto","Ferramenta","Un.At","Pedido Kg","Pedido Pc","Saldo Kg","Saldo Pc","Empenho Kg","Empenho Pc","Produzido Kg","Produzido Pc","Embalado Kg","Embalado Pc","Romaneio Kg","Romaneio Pc","Faturado Kg","Faturado Pc","Valor Pedido"];
    const rows=ordersCache.map(o=>[
      fit(o.status),fit(o.pedido),fit(o.cliente),fit(o.nr_pedido),fmtDate(o.data_implant),fmtDate(o.data_entrega),fmtDate(o.data_ult_fat),
      fit(o.produto),fit(o.ferramenta),fit(o.un_at),fit(o.pedido_kg),fit(o.pedido_pc),fit(o.saldo_kg),fit(o.saldo_pc),fit(o.empenho_kg),fit(o.empenho_pc),
      fit(o.produzido_kg),fit(o.produzido_pc),fit(o.embalado_kg),fit(o.embalado_pc),fit(o.romaneio_kg),fit(o.romaneio_pc),fit(o.faturado_kg),fit(o.faturado_pc),fit(o.valor_pedido)
    ]);
    const csv=[headers.join(';')].concat(rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';'))).join('\n');
    const blob=new Blob(["\ufeff"+csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='carteira.csv'; a.click(); URL.revokeObjectURL(a.href);
  });

  cfgSave?.addEventListener('click',()=>{
    // Tema
    if(cbDark.checked && !document.body.classList.contains('dark')){
      document.body.classList.add('dark');
      localStorage.setItem('theme','dark');
    } else if(!cbDark.checked && document.body.classList.contains('dark')){
      document.body.classList.remove('dark');
      localStorage.setItem('theme','light');
    }
    // Sidebar
    if(cbCollapse.checked && !container.classList.contains('sidebar-collapsed')){
      container.classList.add('sidebar-collapsed');
      localStorage.setItem('sidebarCollapsed','true');
    } else if(!cbCollapse.checked && container.classList.contains('sidebar-collapsed')){
      container.classList.remove('sidebar-collapsed');
      localStorage.setItem('sidebarCollapsed','false');
    }
    closeConfig();
  });

  // Abas do modal
  document.querySelectorAll('.config-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.config-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const key=tab.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('show'));
      document.getElementById(`tab-${key}`)?.classList.add('show');
    });
  });

  // ===== Categorias & Links (Firestore) =====
  let cats = []; // [{id,name}]
  let links = []; // [{id,category,name,url,createdAt}]

  const catListEl=document.getElementById('cat-list');
  const catNameEl=document.getElementById('cat-name');
  const catIconSel=document.getElementById('cat-icon');
  const catAddBtn=document.getElementById('cat-add');
  const linkCatSelect=document.getElementById('link-category');
  const linkNameEl=document.getElementById('link-name');
  const linkUrlEl=document.getElementById('link-url');
  const linkListEl=document.getElementById('link-list');
  const linkAddBtn=document.getElementById('link-add');

  function renderCats(){
    catListEl.innerHTML='';
    linkCatSelect.innerHTML='';
    cats.forEach((c)=>{
      const li=document.createElement('li');
      const icon = c.icon || 'fas fa-star';
      li.innerHTML=`<span class="title"><i class="${icon}"></i> ${c.name}</span><span class="cfg-actions"><button data-id="${c.id}" class="btn btn-danger cat-del">Excluir</button></span>`;
      catListEl.appendChild(li);
      const opt=document.createElement('option');opt.value=c.name;opt.textContent=c.name;linkCatSelect.appendChild(opt);
    });
  }
  function renderLinks(){
    linkListEl.innerHTML='';
    links.forEach((l)=>{
      const li=document.createElement('li');
      li.innerHTML=`<span class="title">[${l.category}] ${l.name}</span><span class="cfg-actions"><button data-id="${l.id}" class="btn btn-danger lnk-del">Excluir</button></span>`;
      linkListEl.appendChild(li);
    });
  }
  function rebuildCustomMenu(){
    // Remove seção antiga
    document.querySelectorAll('.menu .menu-item.custom').forEach(n=>n.remove());
    if(!cats.length && !links.length) return;
    const menu=document.querySelector('.menu');
    // Agrupar links por categoria
    const map={};
    links.forEach(l=>{map[l.category]=map[l.category]||[];map[l.category].push(l)});
    cats.forEach(cat=>{
      const item=document.createElement('div'); item.className='menu-item custom';
      const icon = cat.icon || 'fas fa-star';
      item.innerHTML=`<div class="menu-header"><i class="${icon}"></i><span>${cat.name}</span></div><div class="submenu"></div>`;
      const submenu=item.querySelector('.submenu');
      (map[cat.name]||[]).forEach(l=>{
        const btn=document.createElement('button');
        btn.className='submenu-item';
        btn.dataset.dashboardUrl=l.url;
        if(l.kind) btn.dataset.kind=l.kind;
        btn.innerHTML=`<i class="fas fa-link"></i><span>${l.name}</span>`;
        submenu.appendChild(btn);
      });
      menu.appendChild(item);
    });
    // Reaplicar handlers de menu/links
    document.querySelectorAll('.menu-header').forEach(h=>{
      if(!h._bound){
        h._bound=true;
        h.addEventListener('click',()=>{
          const it=h.closest('.menu-item');
          const was=it.classList.contains('active');
          document.querySelectorAll('.menu-item.active').forEach(mi=>mi.classList.remove('active'));
          if(!was) it.classList.add('active');
        });
      }
    });
    document.querySelectorAll('.submenu-item').forEach(btn=>{
      if(!btn._bound){
        btn._bound=true;
        btn.addEventListener('click',e=>{
          e.preventDefault();
          const url=btn.dataset.dashboardUrl; if(!url) return;
          const kind=btn.dataset.kind||'';
          const isPowerBi = kind==='powerbi' || /app\.powerbi\.com\/view/i.test(url);
          if(isPowerBi){
            document.querySelectorAll('.submenu-item').forEach(i=>i.classList.remove('active'));
            btn.classList.add('active');
            carregarDashboard(url);
            const label=btn.querySelector('span')?.textContent?.trim().toLowerCase().replace(/\s+/g,'-')||'dashboard';
            location.hash=label;
          } else {
            window.open(ensureHttp(url), '_blank');
          }
        });
      }
    });
  }

  catAddBtn?.addEventListener('click',async ()=>{
    const name=(catNameEl.value||'').trim();
    if(!name){ toast('Informe o nome da categoria.','error'); return; }
    if(cats.some(c=>c.name.toLowerCase()===name.toLowerCase())){ toast('Categoria já existe.','error'); return; }
    const icon = catIconSel?.value || 'fas fa-star';
    try{
      await addDoc(collection(db,'categories'), { name, icon, createdAt: serverTimestamp() });
      catNameEl.value='';
      toast('Categoria adicionada.','success');
    }catch(err){
      console.error('Erro ao salvar categoria:', err);
      toast('Erro ao salvar categoria no Firestore. Verifique regras/índices.', 'error');
    }
  });
  catListEl?.addEventListener('click',(e)=>{
    const btn=e.target.closest('.cat-del'); if(!btn) return;
    if(!confirm('Excluir esta categoria e seus links?')) return;
    const id=btn.dataset.id;
    const cat=cats.find(c=>c.id===id);
    if(!cat) return;
    (async ()=>{
      const snap = await getDocs(query(collection(db,'links'), where('category','==',cat.name)));
      await Promise.all(snap.docs.map(d=>deleteDoc(doc(db,'links', d.id))));
      await deleteDoc(doc(db,'categories', id));
      toast('Categoria excluída.','success');
    })();
  });

  linkAddBtn?.addEventListener('click',async ()=>{
    const category=linkCatSelect.value; const name=(linkNameEl.value||'').trim(); const url=(linkUrlEl.value||'').trim();
    if(!category||!name||!url){ toast('Preencha todos os campos.', 'error'); return; }
    const isHttp=/^https?:\/\//i.test(url);
    if(!isHttp){ toast('Informe uma URL válida iniciando com http:// ou https://', 'error'); return; }
    const kind = /app\.powerbi\.com\/view/i.test(url) ? 'powerbi' : 'external';
    try{
      await addDoc(collection(db,'links'), { category, name, url, kind, createdAt: serverTimestamp() });
      linkNameEl.value=''; linkUrlEl.value='';
      toast('Link adicionado.','success');
    }catch(err){
      console.error('Erro ao salvar link:', err);
      toast('Erro ao salvar link no Firestore. Verifique regras/índices.', 'error');
    }
  });
  linkListEl?.addEventListener('click',(e)=>{
    const btn=e.target.closest('.lnk-del'); if(!btn) return;
    if(!confirm('Excluir este link?')) return;
    const id=btn.dataset.id;
    deleteDoc(doc(db,'links', id));
    toast('Link excluído.','success');
  });

  // Bind em tempo real Firestore e seed se vazio
  let firstCats = true, firstLinks = true;
  const catsRef = query(collection(db,'categories'), orderBy('name'));
  const linksRef = collection(db,'links'); // sem orderBy para não exigir índice composto
  onSnapshot(catsRef, async (snap)=>{
    cats = snap.docs.map(d=>({id:d.id, ...(d.data())}));
    renderCats(); rebuildCustomMenu();
    if(firstCats){ firstCats=false; trySeedIfEmpty(); ensureStaticInFirestore(); cleanUpDuplicatesAndHideStatic(); }
  }, async (err)=>{
    console.error('Snapshot categorias:', err);
    try{
      const s = await getDocs(collection(db,'categories'));
      cats = s.docs.map(d=>({id:d.id, ...(d.data())}));
      renderCats(); rebuildCustomMenu();
      toast('Categorias carregadas (fallback sem ordenação).', 'error');
    }catch(_){ toast('Erro ao carregar categorias.', 'error'); }
  });

  onSnapshot(linksRef, async (snap)=>{
    // ordenar no cliente: category asc, name asc
    links = snap.docs.map(d=>({id:d.id, ...(d.data())}))
      .sort((a,b)=> (a.category||'').localeCompare(b.category||'') || (a.name||'').localeCompare(b.name||''));
    renderLinks(); rebuildCustomMenu();
    if(firstLinks){ firstLinks=false; trySeedIfEmpty(); ensureStaticInFirestore(); cleanUpDuplicatesAndHideStatic(); }
  });

  async function trySeedIfEmpty(){
    if(!firstCats && !firstLinks && cats.length===0 && links.length===0){
      const staticItems=[...document.querySelectorAll('.menu > .menu-item:not(.custom)')];
      for(const mi of staticItems){
        const catName=mi.querySelector('.menu-header span')?.textContent?.trim();
        if(!catName) continue;
        await addDoc(collection(db,'categories'), { name: catName, createdAt: serverTimestamp() });
        const items=mi.querySelectorAll('.submenu .submenu-item');
        for(const btn of items){
          const name=btn.querySelector('span')?.textContent?.trim();
          const url=btn.dataset.dashboardUrl||'';
          if(name && url){
            await addDoc(collection(db,'links'), { category: catName, name, url, createdAt: serverTimestamp() });
          }
        }
      }
      toast('Itens iniciais importados para o Firebase.','success');
    }
  }

  // Garante que itens do menu estático estejam no Firestore (sem duplicar)
  async function ensureStaticInFirestore(){
    if(firstCats || firstLinks) return; // aguardar snapshots iniciais
    const catMap = new Map(cats.map(c=>[c.name, c]));
    const linkKey = new Set(links.map(l=>`${l.category}|||${l.name}`));
    const staticItems=[...document.querySelectorAll('.menu > .menu-item:not(.custom)')];
    let created = 0;
    for(const mi of staticItems){
      const catName=mi.querySelector('.menu-header span')?.textContent?.trim();
      const catIcon=mi.querySelector('.menu-header i')?.className||'fas fa-star';
      if(!catName) continue;
      if(!catMap.has(catName)){
        await addDoc(collection(db,'categories'), { name: catName, icon: catIcon, createdAt: serverTimestamp() });
        catMap.set(catName, { name:catName, icon:catIcon }); created++;
      } else {
        const existing = catMap.get(catName);
        // Se não tiver icon salvo, atualiza
        if(!existing.icon){
          const qSnap = await getDocs(query(collection(db,'categories'), where('name','==',catName)));
          const d=qSnap.docs[0];
          if(d){ await updateDoc(doc(db,'categories', d.id), { icon: catIcon }); created++; }
        }
      }
      const items=mi.querySelectorAll('.submenu .submenu-item');
      for(const btn of items){
        const name=btn.querySelector('span')?.textContent?.trim();
        const url=btn.dataset.dashboardUrl||'';
        const key=`${catName}|||${name}`;
        if(name && url && !linkKey.has(key)){
          await addDoc(collection(db,'links'), { category: catName, name, url, createdAt: serverTimestamp() });
          linkKey.add(key); created++;
        }
      }
    }
    if(created>0) toast('Categorias e links base sincronizados com o Firebase.','success');
  }

  // ===== Upload da Carteira (local) =====
  const carteiraFile=document.getElementById('carteira-file');
  const carteiraStatus=document.getElementById('carteira-status');
  carteiraFile?.addEventListener('change',async (e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    carteiraStatus.textContent='Lendo arquivo...';
    const reader=new FileReader();
    reader.onload=async function(evt){
      try{
        const data=new Uint8Array(evt.target.result);
        const wb=XLSX.read(data,{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const json=XLSX.utils.sheet_to_json(ws);

        // Sobrepor: excluir tudo que existe antes de gravar novo
        carteiraStatus.textContent='Removendo dados anteriores...';
        // Apagar ORDERS em lotes
        const ordSnap = await getDocs(query(collection(db,'orders')));
        const ordIds = ordSnap.docs.map(d=>d.id);
        for(let i=0;i<ordIds.length;i+=400){
          const slice=ordIds.slice(i,i+400);
          await Promise.all(slice.map(id=> deleteDoc(doc(db,'orders', id))));
          carteiraStatus.textContent=`Removendo pedidos antigos... ${Math.min(i+400, ordIds.length)}/${ordIds.length}`;
        }
        // Apagar UPLOADS e arquivos no Storage (best-effort)
        const upSnap = await getDocs(query(collection(db,'uploads')));
        await Promise.all(upSnap.docs.map(async d=>{
          const u=d.data();
          if(u.storagePath){ try{ await deleteObject(stRef(storage, u.storagePath)); }catch(_){} }
          await deleteDoc(doc(db,'uploads', d.id));
        }));

        // Tenta enviar arquivo ao Storage (se plano permitir). Caso contrário, segue sem Storage.
        let path = '';
        let downloadURL = '';
        try{
          carteiraStatus.textContent='Enviando arquivo ao armazenamento...';
          path=`uploads/${Date.now()}-${file.name}`;
          const fileRef=stRef(storage, path);
          await uploadBytes(fileRef, new Blob([data]));
          downloadURL=await getDownloadURL(fileRef);
        }catch(storageErr){
          console.warn('Storage indisponível. Prosseguindo sem salvar arquivo.', storageErr);
          carteiraStatus.textContent='Storage indisponível. Prosseguindo sem salvar arquivo.';
          path=''; downloadURL='';
        }

        // Criar registro em uploads (mesmo sem arquivo)
        const upDoc=await addDoc(collection(db,'uploads'),{
          filename:file.name,
          sizeBytes:file.size,
          uploadedAt:serverTimestamp(),
          storagePath:path,
          downloadURL
        });

        // Mapear linhas para orders e persistir em lotes
        carteiraStatus.textContent=`Gravando ${json.length} linhas...`;
        const chunkSize=400; // limite < 500 operações por batch
        let written=0;
        const toNumber=(v)=> Number(String(v).replace(/\./g,'').replace(',', '.')) || 0;
        const excelDate=(v)=>{
          if(v==null||v==='') return null;
          if(typeof v==='number'){
            const d=new Date(Math.round((v-25569)*86400*1000));
            return d;
          }
          const d=new Date(v); return isNaN(d.getTime())?null:d;
        };

        const fieldsMap={
          'Status':'status','Pedido':'pedido','Cliente':'cliente','Nr Pedido':'nr_pedido',
          'Produto':'produto','Ferramenta':'ferramenta','Un.At':'un_at',
          'Pedido Kg':'pedido_kg','Pedido Pc':'pedido_pc','Saldo Kg':'saldo_kg','Saldo Pc':'saldo_pc',
          'Empenho Kg':'empenho_kg','Empenho Pc':'empenho_pc','Produzido Kg':'produzido_kg','Produzido Pc':'produzido_pc',
          'Embalado Kg':'embalado_kg','Embalado Pc':'embalado_pc','Romaneio Kg':'romaneio_kg','Romaneio Pc':'romaneio_pc',
          'Faturado Kg':'faturado_kg','Faturado Pc':'faturado_pc','Valor Pedido':'valor_pedido',
          'Representante':'representante','Cidade Entrega':'cidade_entrega','Condições Especiais':'condicoes_especiais'
        };

        for(let i=0;i<json.length;i+=chunkSize){
          const slice=json.slice(i, i+chunkSize);
          const batchOps=[];
          for(const row of slice){
            const payload={ uploadId: upDoc.id };
            // datas
            const di=excelDate(row['Data Implant']);
            const de=excelDate(row['Data Entrega']);
            const duf=excelDate(row['Data Ult Fat']);
            if(di) payload.data_implant=di; if(de) payload.data_entrega=de; if(duf) payload.data_ult_fat=duf;
            // campos numéricos e texto
            for(const k in fieldsMap){
              const target=fieldsMap[k];
              if(/Kg|Pc|Valor/.test(k)) payload[target]=toNumber(row[k]);
              else payload[target]= row[k] ?? null;
            }
            batchOps.push(addDoc(collection(db,'orders'), payload));
          }
          await Promise.all(batchOps);
          written += slice.length;
          carteiraStatus.textContent=`Gravado ${written}/${json.length}...`;
        }

        carteiraStatus.textContent=`Concluído. Upload ${file.name} (${json.length} linhas).`;
        toast('Carteira enviada e salva no Firebase.','success');
      }catch(err){
        console.error(err); carteiraStatus.textContent='Erro ao processar e salvar.'; toast('Erro ao processar/salvar no Firebase.','error');
      }
    };
    reader.onerror=function(){carteiraStatus.textContent='Erro ao ler o arquivo.'};
    reader.readAsArrayBuffer(file);
  });

  // Toasts
  function toast(msg,type='success'){
    const c=document.getElementById('toast-container');
    if(!c) return; const t=document.createElement('div');
    t.className=`toast ${type}`; t.textContent=msg; c.appendChild(t);
    setTimeout(()=>{t.remove();},3000);
  }
});
