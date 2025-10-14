import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, getDocs, addDoc, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'

export type LMEPrice = {
  id?: string
  data: string // "2025-10-14"
  cobre: number
  zinco: number
  aluminio: number
  chumbo: number
  estanho: number
  niquel: number
  dolar: number
  createdAt?: any
}

export function useLMEData() {
  const [prices, setPrices] = useState<LMEPrice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Buscar dados do Firestore (histórico)
  async function loadFromFirestore() {
    try {
      const snap = await getDocs(query(collection(db, 'lme_prices'), orderBy('data', 'desc'), limit(90)))
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as LMEPrice))
      setPrices(data)
      return data
    } catch (err) {
      console.error('Erro ao carregar do Firestore:', err)
      return []
    }
  }

  // Buscar dados da API LME via Cloud Function ou Proxy
  async function fetchFromAPI() {
    try {
      // Tentar Cloud Function primeiro (se estiver deployada)
      const cloudFunctionUrl = 'https://us-central1-portaltecnoperfil-6440c.cloudfunctions.net/getLMEPrices'
      
      let response = await fetch(cloudFunctionUrl)
      
      // Se Cloud Function não estiver disponível (404), usar proxy CORS
      if (!response.ok && response.status === 404) {
        console.warn('Cloud Function não disponível. Usando proxy CORS...')
        const corsProxy = 'https://api.allorigins.win/raw?url='
        const apiUrl = encodeURIComponent('https://lme.gorilaxpress.com/cotacao/2cf4ff0e-8a30-48a5-8add-f4a1a63fee10/json/')
        response = await fetch(corsProxy + apiUrl)
      }
      
      if (!response.ok) {
        throw new Error(`Falha ao buscar dados: status ${response.status}`)
      }
      
      const json = await response.json()
      const results = json.results || []
      
      return results.map((r: any) => ({
        data: r.data,
        cobre: parseFloat(String(r.cobre).replace(',', '.')),
        zinco: parseFloat(String(r.zinco).replace(',', '.')),
        aluminio: parseFloat(String(r.aluminio).replace(',', '.')),
        chumbo: parseFloat(String(r.chumbo).replace(',', '.')),
        estanho: parseFloat(String(r.estanho).replace(',', '.')),
        niquel: parseFloat(String(r.niquel).replace(',', '.')),
        dolar: parseFloat(String(r.dolar).replace(',', '.'))
      })) as LMEPrice[]
    } catch (err) {
      console.error('Erro ao buscar da API:', err)
      throw err
    }
  }

  // Salvar novos dados no Firestore (evitar duplicatas)
  async function saveToFirestore(newPrices: LMEPrice[]) {
    try {
      for (const price of newPrices) {
        // Verificar se já existe
        const existing = await getDocs(query(collection(db, 'lme_prices'), where('data', '==', price.data), limit(1)))
        if (existing.empty) {
          await addDoc(collection(db, 'lme_prices'), {
            ...price,
            createdAt: serverTimestamp()
          })
        }
      }
    } catch (err) {
      console.error('Erro ao salvar no Firestore:', err)
    }
  }

  // Atualizar dados: busca da API e salva no Firestore
  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const apiData = await fetchFromAPI()
      await saveToFirestore(apiData)
      const updated = await loadFromFirestore()
      setPrices(updated)
      setError('')
    } catch (err: any) {
      setError('Falha ao atualizar dados. Usando cache local.')
      await loadFromFirestore() // Fallback para dados em cache
    } finally {
      setLoading(false)
    }
  }

  // Carregar ao montar
  useEffect(() => {
    loadFromFirestore().then(data => {
      if (data.length === 0) {
        refresh() // Se não há dados, buscar da API
      }
    })
  }, [])

  return { prices, loading, error, refresh }
}
