// Inicialização do Firebase para o Portal Tecnoperfil
// Carregado como ES Module via CDN oficial do Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

// Config local (não versionar chaves sensíveis do seu projeto em repositórios públicos)
import { firebaseConfig } from "../config/firebase-config.js";

// Inicializa
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Opcional: feedback visual se o container de toasts existir
(function(){
  const c = document.getElementById('toast-container');
  if(!c) return;
  const t = document.createElement('div');
  t.className = 'toast success';
  t.textContent = 'Firebase inicializado';
  c.appendChild(t);
  setTimeout(()=>t.remove(), 2500);
})();
