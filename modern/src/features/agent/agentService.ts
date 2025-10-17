import { supabase } from '../../supabase'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import Papa from 'papaparse'

const OPENROUTER_API_KEY = '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'
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

type AgentType = 'pcp' | 'comercial' | 'producao' | 'ferramentaria'

// Limites para evitar estouro de contexto no LLM
const MAX_CONTEXT_CHARS = 12000
const PER_DOC_CHAR_LIMIT = 3000
const MAX_USER_PROMPT_CHARS = 20000

// Configurações para RAG melhorado
const RAG_MATCH_COUNT = 8
const RAG_MATCH_THRESHOLD = 0.3

const truncate = (s: string, n: number) => (s?.length || 0) > n ? s.slice(0, n) : (s || '')

const SYSTEM_PROMPTS: Record<AgentType, string> = {
  pcp: `Você é um especialista em **Planejamento e Controle da Produção (PCP)** da Tecnoperfil Alumínio.

Sua expertise:
- Gestão de carteira de encomendas
- Programação e sequenciamento de produção
- Cálculo de lead time e capacidade produtiva
- Controle de prazos e entregas
- Análise de ocupação e eficiência

Responda de forma objetiva, com dados e métricas. Se não houver informação nos arquivos, informe claramente. Sempre sugira ações práticas.`,

  comercial: `Você é um especialista em **Vendas e Comercial** da Tecnoperfil Alumínio.

Sua expertise:
- Análise de faturamento e margem
- Gestão de carteira de clientes
- Identificação de oportunidades
- Análise de performance comercial
- Propostas e negociações

Responda com foco em resultados comerciais, números e insights de vendas. Se não houver informação nos arquivos, informe claramente. Sempre sugira ações práticas.`,

  producao: `Você é um especialista em **Produção e Extrusão de Perfis de Alumínio** da Tecnoperfil.

Sua expertise:
- Processo de extrusão de alumínio
- Parâmetros de produção (temperatura, pressão, velocidade)
- Controle de qualidade e refugo
- Eficiência e produtividade
- Resolução de problemas de processo

Responda com foco técnico em extrusão, com dados de processo e qualidade. Se não houver informação nos arquivos, informe claramente. Sempre sugira ações práticas.`,

  ferramentaria: `Você é um especialista em **Ferramentaria e Matrizes de Extrusão** da Tecnoperfil Alumínio.

Sua expertise:
- Correção de matrizes de extrusão
- Desenvolvimento de novas matrizes
- Diagnóstico de problemas em matrizes
- Manutenção preventiva e corretiva
- Otimização de ferramental

Responda com foco técnico em ferramentaria, diagnósticos e soluções. Se não houver informação nos arquivos, informe claramente. Sempre sugira ações práticas.`
}

// Extrair texto de diferentes tipos de arquivo
export async function extractText(file: File): Promise<string> {
  const fileType = file.name.split('.').pop()?.toLowerCase()

  try {
    switch (fileType) {
      case 'txt':
        return await file.text()

      case 'pdf':
        return await extractPdfText(file)

      case 'docx':
        return await extractDocxText(file)

      case 'csv':
        return await extractCsvText(file)

      case 'xlsx':
      case 'xls':
        // Para Excel, vamos converter para CSV primeiro
        return await extractExcelText(file)

      default:
        throw new Error(`Tipo de arquivo não suportado: ${fileType}`)
    }
  } catch (error: any) {
    throw new Error(`Erro ao extrair texto: ${error.message}`)
  }
}

async function extractPdfText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let text = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map((item: any) => item.str).join(' ')
      text += pageText + '\n'
    }

    return text
  } catch (error: any) {
    throw new Error(`Erro ao processar PDF: ${error.message}`)
  }
}

async function extractDocxText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  } catch (error: any) {
    throw new Error(`Erro ao processar DOCX: ${error.message}`)
  }
}

async function extractCsvText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        const text = results.data.map((row: any) => 
          Array.isArray(row) ? row.join(', ') : JSON.stringify(row)
        ).join('\n')
        resolve(text)
      },
      error: (error) => reject(new Error(`Erro ao processar CSV: ${error.message}`))
    })
  })
}

async function extractExcelText(file: File): Promise<string> {
  // Usar biblioteca XLSX que já está instalada
  const XLSX = await import('xlsx')
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  
  let text = ''
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    text += `\n=== ${sheetName} ===\n${csv}\n`
  })
  
  return text
}

// Criar embeddings usando Edge Function (preferencial) com fallback OpenRouter direto
async function createEmbedding(text: string): Promise<number[]> {
  try {
    // 1) Tentar via Supabase Edge Function (recomendado)
    try {
      const { data, error } = await supabase.functions.invoke('ai-embed', {
        body: { text: text.substring(0, 8000) }
      })
      if (!error && data?.embedding && Array.isArray(data.embedding)) {
        return data.embedding as number[]
      }
      if (error) {
        console.warn('Edge Function ai-embed falhou:', error)
      }
    } catch (e) {
      console.warn('Edge Function ai-embed indisponível:', e)
    }

    // 2) Fallback: chamada direta ao OpenRouter (pode falhar por CORS em browser)
    const response = await fetch(`${OPENROUTER_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Title': 'Portal Tecnoperfil'
      },
      body: JSON.stringify({
        // OpenRouter segue o esquema OpenAI; prefixo do provedor ajuda a evitar ambiguidade
        model: 'openai/text-embedding-3-small',
        input: text.substring(0, 8000) // Limitar tamanho
      })
    })

    if (!response.ok) {
      const errText = await response.text().catch(()=> '')
      throw new Error(`Erro na API (${response.status}): ${response.statusText} ${errText?.slice(0,200)}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')){
      const raw = await response.text().catch(()=> '')
      throw new Error(`Resposta inválida do servidor (content-type=${contentType||'desconhecido'}). Corpo: ${raw.slice(0,200)}`)
    }

    const data = await response.json()
    return data?.data?.[0]?.embedding || new Array(1536).fill(0)
  } catch (error: any) {
    console.error('Erro ao criar embedding:', error)
    // Fallback: retornar embedding vazio
    return new Array(1536).fill(0)
  }
}

// Processar documento com ingestão estruturada
export async function processDocument(file: File): Promise<void> {
  try {
    // 1. Extrair texto
    const text = await extractText(file)
    
    if (!text || text.trim().length === 0) {
      throw new Error('Não foi possível extrair texto do arquivo')
    }

    // 2. Criar embedding
    const embedding = await createEmbedding(text)

    // 3. Salvar documento original (para RAG)
    const { error: docError } = await supabase.from('documents').insert({
      content: text,
      filename: file.name,
      file_type: file.type || 'unknown',
      embedding: embedding
    })

    if (docError) throw docError

    // 4. Ingestão estruturada para Excel/CSV
    if (isStructuredFile(file)) {
      await processStructuredData(file, text)
    }
  } catch (error: any) {
    throw new Error(`Erro ao processar documento: ${error.message}`)
  }
}

// Verificar se é arquivo estruturado (Excel/CSV)
function isStructuredFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ['xlsx', 'xls', 'csv'].includes(ext || '')
}

// Processar dados estruturados do Excel/CSV
async function processStructuredData(file: File, text: string): Promise<void> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase()
    let rows: any[] = []

    if (ext === 'csv') {
      rows = await parseCSVToRows(file)
    } else if (['xlsx', 'xls'].includes(ext || '')) {
      rows = await parseExcelToRows(file)
    }

    if (rows.length === 0) return

    // Detectar tipo de planilha e processar
    const sheetType = detectSheetType(rows)
    
    if (sheetType === 'carteira_encomendas') {
      await insertCarteiraData(rows, file.name)
    } else if (sheetType === 'ferramentas') {
      await insertFerramentasData(rows, file.name)
    }
  } catch (error) {
    console.warn('Erro na ingestão estruturada:', error)
    // Não falhar o upload se a ingestão estruturada falhar
  }
}

// Converter CSV para array de objetos
async function parseCSVToRows(file: File): Promise<any[]> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data || []),
      error: () => resolve([])
    })
  })
}

// Converter Excel para array de objetos
async function parseExcelToRows(file: File): Promise<any[]> {
  try {
    const XLSX = await import('xlsx')
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Pegar primeira planilha
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    
    return XLSX.utils.sheet_to_json(worksheet, { defval: '' })
  } catch (error) {
    console.error('Erro ao processar Excel:', error)
    return []
  }
}

// Detectar tipo de planilha baseado nas colunas
function detectSheetType(rows: any[]): string {
  if (rows.length === 0) return 'unknown'
  
  const firstRow = rows[0]
  const columns = Object.keys(firstRow).map(k => k.toLowerCase())
  
  // Detectar carteira de encomendas
  const carteiraKeywords = ['pedido', 'cliente', 'produto', 'quantidade', 'status', 'entrega']
  const carteiraMatches = carteiraKeywords.filter(keyword => 
    columns.some(col => col.includes(keyword))
  ).length
  
  // Detectar ferramentas
  const ferramentasKeywords = ['ferramenta', 'matriz', 'codigo', 'eficiencia', 'vida']
  const ferramentasMatches = ferramentasKeywords.filter(keyword => 
    columns.some(col => col.includes(keyword))
  ).length
  
  if (carteiraMatches >= 3) return 'carteira_encomendas'
  if (ferramentasMatches >= 2) return 'ferramentas'
  
  return 'unknown'
}

// Inserir dados da carteira de encomendas
async function insertCarteiraData(rows: any[], filename: string): Promise<void> {
  const mappedRows = rows.map(row => {
    // Mapear colunas comuns (flexível para diferentes formatos)
    const mapped: any = {
      arquivo_origem: filename,
      created_at: new Date().toISOString()
    }
    
    // Mapear campos baseado em palavras-chave
    Object.entries(row).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase()
      const strValue = String(value || '').trim()
      
      if (lowerKey.includes('pedido')) mapped.pedido = strValue
      else if (lowerKey.includes('item')) mapped.item = strValue
      else if (lowerKey.includes('cliente')) mapped.cliente = strValue
      else if (lowerKey.includes('produto')) mapped.produto = strValue
      else if (lowerKey.includes('descri')) mapped.descricao = strValue
      else if (lowerKey.includes('quantidade') || lowerKey.includes('qtd')) {
        mapped.quantidade = parseFloat(strValue.replace(/[^0-9.,]/g, '').replace(',', '.')) || null
      }
      else if (lowerKey.includes('status')) mapped.status = strValue
      else if (lowerKey.includes('ferramenta')) mapped.ferramenta = strValue
      else if (lowerKey.includes('entrega') && strValue) {
        try {
          mapped.data_entrega_atual = new Date(strValue).toISOString().split('T')[0]
        } catch {}
      }
    })
    
    return mapped
  }).filter(row => row.pedido && row.cliente) // Só inserir se tiver dados mínimos
  
  if (mappedRows.length > 0) {
    const { error } = await supabase
      .from('carteira_encomendas')
      .upsert(mappedRows, { onConflict: 'pedido,item' })
    
    if (error) {
      console.error('Erro ao inserir dados da carteira:', error)
    } else {
      console.log(`Inseridos ${mappedRows.length} registros da carteira`)
    }
  }
}

// Inserir dados de ferramentas
async function insertFerramentasData(rows: any[], filename: string): Promise<void> {
  const mappedRows = rows.map(row => {
    const mapped: any = {
      arquivo_origem: filename,
      created_at: new Date().toISOString()
    }
    
    Object.entries(row).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase()
      const strValue = String(value || '').trim()
      
      if (lowerKey.includes('codigo') || lowerKey.includes('ferramenta')) mapped.codigo_ferramenta = strValue
      else if (lowerKey.includes('nome')) mapped.nome = strValue
      else if (lowerKey.includes('eficiencia')) {
        mapped.eficiencia_real = parseFloat(strValue.replace(/[^0-9.,]/g, '').replace(',', '.')) || null
      }
      else if (lowerKey.includes('vida') && lowerKey.includes('restante')) {
        mapped.vida_util_restante = parseFloat(strValue.replace(/[^0-9.,]/g, '').replace(',', '.')) || null
      }
      else if (lowerKey.includes('capacidade')) {
        mapped.capacidade_kg_hora = parseFloat(strValue.replace(/[^0-9.,]/g, '').replace(',', '.')) || null
      }
      else if (lowerKey.includes('status')) mapped.status = strValue
    })
    
    return mapped
  }).filter(row => row.codigo_ferramenta)
  
  if (mappedRows.length > 0) {
    const { error } = await supabase
      .from('ferramentas_dados')
      .upsert(mappedRows, { onConflict: 'codigo_ferramenta' })
    
    if (error) {
      console.error('Erro ao inserir dados de ferramentas:', error)
    } else {
      console.log(`Inseridos ${mappedRows.length} registros de ferramentas`)
    }
  }
}

// Buscar documentos relevantes com RAG melhorado
async function searchDocuments(query: string, limit: number = RAG_MATCH_COUNT): Promise<{ content: string; filename: string; similarity: number }[]> {
  try {
    // Criar embedding da query
    const queryEmbedding = await createEmbedding(query)

    // Buscar documentos similares com threshold menor
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: RAG_MATCH_THRESHOLD,
      match_count: limit
    })

    if (error) {
      console.error('Erro ao buscar documentos:', error)
      return []
    }

    const primary = (data || []).map((doc: any) => ({
      content: truncate(doc.content || '', PER_DOC_CHAR_LIMIT),
      filename: doc.filename || '(sem nome)',
      similarity: Number(doc.similarity || 0)
    }))
    if (primary.length > 0) return primary

    // Fallback: pegar documentos mais recentes quando RPC não estiver disponível
    const { data: recent, error: e2 } = await supabase
      .from('documents')
      .select('content, filename, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (e2) {
      console.error('Fallback de documentos falhou:', e2)
      return []
    }
    return (recent || []).map((doc: any) => ({
      content: truncate(doc.content || '', PER_DOC_CHAR_LIMIT),
      filename: doc.filename || '(sem nome)',
      similarity: 0
    }))
  } catch (error) {
    console.error('Erro na busca semântica:', error)
    return []
  }
}

// Detectar intent da pergunta para usar consultas estruturadas
function detectQueryIntent(question: string): { intent: string; queryType?: string; filters?: any } {
  const lowerQ = question.toLowerCase()
  
  // Intents para consultas estruturadas
  if (lowerQ.includes('listar') && (lowerQ.includes('cliente') || lowerQ.includes('clientes'))) {
    return { intent: 'structured', queryType: 'listar_clientes' }
  }
  
  if (lowerQ.includes('pedidos') && (lowerQ.includes('atrasado') || lowerQ.includes('atraso'))) {
    return { intent: 'structured', queryType: 'pedidos_atrasados' }
  }
  
  if (lowerQ.includes('resumo') || (lowerQ.includes('carteira') && lowerQ.includes('total'))) {
    return { intent: 'structured', queryType: 'resumo_carteira' }
  }
  
  if (lowerQ.includes('ferramenta') && (lowerQ.includes('analise') || lowerQ.includes('status'))) {
    return { intent: 'structured', queryType: 'analise_ferramentas' }
  }
  
  if (lowerQ.includes('pedidos') && lowerQ.includes('status')) {
    // Extrair status se mencionado
    let status = null
    if (lowerQ.includes('aberto')) status = 'aberto'
    else if (lowerQ.includes('producao') || lowerQ.includes('produção')) status = 'producao'
    else if (lowerQ.includes('atendido')) status = 'atendido'
    
    return { intent: 'structured', queryType: 'pedidos_por_status', filters: { status } }
  }
  
  // Intent padrão: usar RAG + LLM
  return { intent: 'semantic' }
}

// Executar consulta estruturada via Edge Function
async function executeStructuredQuery(queryType: string, filters: any = {}): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-query', {
      body: { query_type: queryType, filters }
    })
    
    if (error) {
      console.error('Erro na consulta estruturada:', error)
      return null
    }
    
    return data?.formatted_response || null
  } catch (error) {
    console.error('Erro ao chamar ai-query:', error)
    return null
  }
}

// Perguntar ao agente com consultas híbridas (estruturadas + RAG)
export async function askAgent(question: string, agentType: AgentType = 'pcp'): Promise<{ answer: string; context: string[] }> {
  try {
    // 1. Detectar intent da pergunta
    const { intent, queryType, filters } = detectQueryIntent(question)
    
    // 2. Se for intent estruturado, tentar consulta determinística primeiro
    if (intent === 'structured' && queryType) {
      const structuredAnswer = await executeStructuredQuery(queryType, filters)
      if (structuredAnswer) {
        return { 
          answer: structuredAnswer, 
          context: ['Consulta estruturada na base de dados'] 
        }
      }
    }
    
    // 3. Fallback ou intent semântico: usar RAG + LLM
    const docs = await searchDocuments(question)

    // 4. Montar prompt com contexto melhorado
    let remaining = MAX_CONTEXT_CHARS
    const parts: string[] = []
    for (const d of docs) {
      if (remaining <= 0) break
      const snippet = truncate(d.content || '', Math.min(PER_DOC_CHAR_LIMIT, remaining))
      if (!snippet) continue
      parts.push(`Arquivo: ${d.filename}\n${snippet}`)
      remaining -= snippet.length
    }

    const contextText = parts.length
      ? `\n\nContexto dos documentos (${parts.length} trechos):\n${parts.join('\n\n---\n\n')}`
      : '\n\nNenhum documento relevante encontrado na base de conhecimento.'

    // 5. Prompt melhorado com instruções específicas
    let enhancedQuestion = question
    if (intent === 'structured') {
      enhancedQuestion += '\n\n[INSTRUÇÃO: Esta pergunta requer uma resposta completa e precisa. Se os documentos não contiverem informações suficientes, informe claramente.]'
    }
    
    const builtUserPrompt = `${truncate(enhancedQuestion, 2000)}${contextText}`
    const userPrompt = truncate(builtUserPrompt, MAX_USER_PROMPT_CHARS)

    // 6. Chamar OpenRouter
    const systemPrompt = SYSTEM_PROMPTS[agentType]
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Title': 'Portal Tecnoperfil'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4, // Mais determinístico
        max_tokens: 1000 // Mais espaço para respostas completas
      })
    })

    if (!response.ok) {
      const errText = await response.text().catch(()=> '')
      throw new Error(`Erro na API (${response.status}): ${response.statusText} ${errText?.slice(0,200)}`)
    }

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await response.json() : { choices: [{ message: { content: (await response.text()).slice(0, 2000) } }] }
    const answer = data.choices[0]?.message?.content || 'Não foi possível gerar uma resposta.'

    return { answer, context: docs.map(d => d.filename) }
  } catch (error: any) {
    throw new Error(`Erro ao consultar agente: ${error.message}`)
  }
}
