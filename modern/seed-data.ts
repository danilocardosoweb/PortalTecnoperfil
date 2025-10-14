// Script para popular o Firestore com as categorias e links do index.html
// Execute uma única vez: npx tsx seed-data.ts

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const categories = [
  { name: 'Comercial', icon: 'fas fa-chart-line' },
  { name: 'Produção', icon: 'fas fa-industry' },
  { name: 'Logística', icon: 'fas fa-truck' },
  { name: 'Manutenção', icon: 'fas fa-wrench' },
  { name: 'Ferramentaria', icon: 'fas fa-tools' },
  { name: 'Qualidade', icon: 'fas fa-clipboard-check' },
  { name: 'Usinagem', icon: 'fas fa-cut' }
]

const links = [
  // Comercial
  { category: 'Comercial', name: 'Resumo', url: 'https://app.powerbi.com/view?r=eyJrIjoiMDZmZjUxZGUtNWRjMC00YzJjLWI5NjMtYTY5YWE4ZDRlMzM3IiwidCI6Ijg0NGJmOGNhLTg3M2UtNDVjMi1iZGU0LWNjNDZlZjUzOTkyOSJ9' },
  { category: 'Comercial', name: 'Carteira Encomendas', url: 'https://app.powerbi.com/view?r=eyJrIjoiZWRiNmM3YTAtNWQ3OS00OTAyLWFjOWYtMGE4NDg0MmZjNTAxIiwidCI6Ijg0NGJmOGNhLTg3M2UtNDVjMi1iZGU0LWNjNDZlZjUzOTkyOSJ9' },
  { category: 'Comercial', name: 'Revenda de Estoque', url: 'https://app.powerbi.com/view?r=eyJrIjoiYWVmYTViYzctM2QyMC00MTYwLTk5NGItZTZlZWE2NzljYThiIiwidCI6Ijg0NGJmOGNhLTg3M2UtNDVjMi1iZGU0LWNjNDZlZjUzOTkyOSJ9' },
  { category: 'Comercial', name: 'Relatório de Vendas', url: 'https://app.powerbi.com/view?r=eyJrIjoiNjBhMjY5MWQtMDY1ZS00Mjk0LTgyYTItYTkwMzIzYTc2YmNjIiwidCI6Ijg0NGJmOGNhLTg3M2UtNDVjMi1iZGU0LWNjNDZlZjUzOTkyOSJ9' },
  { category: 'Comercial', name: 'Catálogo', url: 'https://app.powerbi.com/view?r=eyJrIjoiYTM3OGQwZjMtYTFlZi00YmM2LTkxZjUtZjExZDZjODlhM2RmIiwidCI6Ijg0NGJmOGNhLTg3M2UtNDVjMi1iZGU0LWNjNDZlZjUzOTkyOSJ9' },
  
  // Produção
  { category: 'Produção', name: 'Extrusora', url: 'https://app.powerbi.com/view?r=eyJrIjoiYzZkY2UxMTEtZTk1OC00Y2YzLWJmY2UtYWU2ZTRiMzZkNDdjIiwidCI6Ijg0NGJmOGNhLTg3M2UtNDVjMi1iZGU0LWNjNDZlZjUzOTkyOSJ9' },
  { category: 'Produção', name: 'Embalagem', url: 'https://app.powerbi.com/view?r=eyJrIjoiNWFlY2NiNzgtNzQyMi00NDUxLWJkZWMtMTMxODUxMDg2ZGQzIiwidCI6Ijg0NGJmOGNhLTg3M2UtNDVjMi1iZGU0LWNjNDZlZjUzOTkyOSJ9' },
  { category: 'Produção', name: 'Ferramentaria', url: 'https://app.powerbi.com/view?r=eyJrIjoiN2FmODhlNzQtNWQ0Zi00ZTkxLTk0YTUtYjMwMjk2OWMwZmNkIiwidCI6Ijg0NGJmOGNhLTg3M2UtNDVjMi1iZGU0LWNjNDZlZjUzOTkyOSJ9' },
  
  // Logística
  { category: 'Logística', name: 'Plan. Entregas', url: 'https://app.powerbi.com/view?r=eyJrIjoiNTMzYzRlNjMtMGI0Zi00ODg3LWJmNmYtMmUwZTVjMmMxMTA3IiwidCI6Ijg0NGJmOGNhLTg3M2UtNDVjMi1iZGU0LWNjNDZlZjUzOTkyOSJ9' },
  { category: 'Logística', name: 'Estoque Acabados', url: 'https://app.powerbi.com/view?r=eyJrIjoiYWViZDZlN2ItOTFmMS00NjhmLTlhZDMtNjQ2MWJhNzgwZjBmIiwidCI6Ijg0NGJmOGNhLTg3M2UtNDVjMi1iZGU0LWNjNDZlZjUzOTkyOSJ9' },
  { category: 'Logística', name: 'Estoque de Tarugos', url: 'https://app.powerbi.com/view?r=eyJrIjoiMzc2NWNkZWYtMWM3Yy00MjZkLWE3OGEtY2I2NjRiODdmMTk3IiwidCI6Ijg0NGJmOGNhLTg3M2UtNDVjMi1iZGU0LWNjNDZlZjUzOTkyOSJ9' },
  
  // Manutenção
  { category: 'Manutenção', name: 'Relatórios', url: 'https://app.powerbi.com/view?r=eyJrIjoiMzRiYmJkZWItYTE2OS00N2M4LWI3NDYtYzE1YWFmOTY4NzlhIiwidCI6Ijg0NGJmOGNhLTg3M2UtNDVjMi1iZGU0LWNjNDZlZjUzOTkyOSJ9' }
]

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados...\n')

  // Verificar se já existem dados
  const existingCats = await getDocs(collection(db, 'categories'))
  const existingLinks = await getDocs(collection(db, 'links'))

  if (existingCats.size > 0 || existingLinks.size > 0) {
    console.log('⚠️  Já existem dados no banco:')
    console.log(`   - ${existingCats.size} categorias`)
    console.log(`   - ${existingLinks.size} links`)
    console.log('\n❓ Deseja continuar e adicionar apenas os que faltam? (Ctrl+C para cancelar)\n')
  }

  // Adicionar categorias
  console.log('📁 Adicionando categorias...')
  let catsAdded = 0
  for (const cat of categories) {
    const existing = await getDocs(query(collection(db, 'categories'), where('name', '==', cat.name)))
    if (existing.size === 0) {
      await addDoc(collection(db, 'categories'), { ...cat, createdAt: serverTimestamp() })
      console.log(`   ✅ ${cat.name}`)
      catsAdded++
    } else {
      console.log(`   ⏭️  ${cat.name} (já existe)`)
    }
  }

  // Adicionar links
  console.log('\n🔗 Adicionando links...')
  let linksAdded = 0
  for (const link of links) {
    const existing = await getDocs(
      query(
        collection(db, 'links'),
        where('category', '==', link.category),
        where('name', '==', link.name)
      )
    )
    if (existing.size === 0) {
      const kind = /app\.powerbi\.com\/view/i.test(link.url) ? 'powerbi' : 'external'
      await addDoc(collection(db, 'links'), { ...link, kind, createdAt: serverTimestamp() })
      console.log(`   ✅ [${link.category}] ${link.name}`)
      linksAdded++
    } else {
      console.log(`   ⏭️  [${link.category}] ${link.name} (já existe)`)
    }
  }

  console.log('\n✨ Seed concluído!')
  console.log(`   - ${catsAdded} categorias adicionadas`)
  console.log(`   - ${linksAdded} links adicionados`)
  console.log('\n🌐 Acesse http://localhost:5173 para ver os dados no app!\n')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Erro ao executar seed:', err)
  process.exit(1)
})
