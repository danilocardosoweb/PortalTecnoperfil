import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../supabase'
import { processDocument, askAgent } from './agentService.js'

type Message = {
  id: string
  type: 'user' | 'agent'
  content: string
  timestamp: Date
}

type AgentType = 'pcp' | 'comercial' | 'producao' | 'ferramentaria'

const AGENTS = {
  pcp: {
    name: 'PCP',
    icon: 'fa-calendar-check',
    color: 'from-blue-500 to-blue-600',
    questions: [
      'Qual o volume total da carteira de encomendas?',
      'Quantos clientes estão com produção em dia?',
      'Quais pedidos estão atrasados?',
      'Qual o lead time médio de produção?',
      'Qual a taxa de ocupação da fábrica?'
    ]
  },
  comercial: {
    name: 'Comercial',
    icon: 'fa-chart-line',
    color: 'from-green-500 to-green-600',
    questions: [
      'Qual o faturamento do mês atual?',
      'Quantos clientes ativos temos?',
      'Quais são os top 5 clientes por volume?',
      'Qual a margem média de vendas?',
      'Há propostas pendentes de aprovação?'
    ]
  },
  producao: {
    name: 'Produção',
    icon: 'fa-industry',
    color: 'from-orange-500 to-orange-600',
    questions: [
      'Qual a eficiência da linha de extrusão hoje?',
      'Quantos quilos foram produzidos esta semana?',
      'Qual o índice de refugo atual?',
      'Quais perfis estão em produção agora?',
      'Há gargalos identificados na produção?'
    ]
  },
  ferramentaria: {
    name: 'Ferramentaria',
    icon: 'fa-tools',
    color: 'from-purple-500 to-purple-600',
    questions: [
      'Quantas matrizes estão em manutenção?',
      'Qual o tempo médio de correção de matriz?',
      'Há matrizes com problemas recorrentes?',
      'Quais matrizes precisam de revisão preventiva?',
      'Qual o custo médio de manutenção de matrizes?'
    ]
  }
}

export function AgentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('pcp')
  const [documents, setDocuments] = useState<any[]>([])
  const [showQuickQuestions, setShowQuickQuestions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const currentAgent = AGENTS[selectedAgent]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) {
      // Carregar histórico
      loadHistory()
      // Carregar documentos disponíveis
      loadDocuments()
    }
  }, [open])

  async function loadDocuments() {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, filename, file_type, created_at')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      console.error('Erro ao carregar documentos:', err)
    }
  }

  async function loadHistory() {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      
      if (data && data.length > 0) {
        const historyMessages: Message[] = []
        data.reverse().forEach(item => {
          historyMessages.push({
            id: `${item.id}-q`,
            type: 'user',
            content: item.question,
            timestamp: new Date(item.created_at)
          })
          historyMessages.push({
            id: `${item.id}-a`,
            type: 'agent',
            content: item.answer,
            timestamp: new Date(item.created_at)
          })
        })
        setMessages(historyMessages)
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await askAgent(input, selectedAgent)
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: response.answer,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, agentMessage])

      // Salvar no histórico
      await supabase.from('chat_history').insert({
        question: input,
        answer: response.answer,
        context_used: response.context
      })
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: `Erro: ${error.message || 'Não foi possível processar sua pergunta.'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  async function handleClearConversation(){
    try{
      // Apagar histórico no Supabase para não recarregar após reabrir
      // Usar filtro seguro (todas as linhas com created_at >= 1900-01-01)
      await supabase
        .from('chat_history')
        .delete()
        .gte('created_at', '1900-01-01')
    }catch(err){
      console.error('Falha ao limpar histórico:', err)
    }finally{
      setMessages([])
      // manter foco no input após limpar
      setTimeout(()=>{
        const el = document.querySelector('input[placeholder^="Digite sua pergunta"]') as HTMLInputElement | null
        el?.focus()
      }, 0)
    }
  }


  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${currentAgent.color} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <i className={`fas ${currentAgent.icon} text-white text-xl`}/>
              </div>
              <div className="flex items-center gap-3">
                <h2 className="text-white font-bold text-lg">Agente {currentAgent.name}</h2>
                <span className="text-white/80 text-xs italic bg-white/10 px-2 py-0.5 rounded">
                  ( Em desenvolvimento )
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearConversation}
                className="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-md text-sm border border-white/30"
                title="Limpar conversa"
              >
                <i className="fas fa-broom mr-1"/> Limpar
              </button>
              <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center transition-colors" title="Fechar">
                <i className="fas fa-times"/>
              </button>
            </div>
          </div>
          
          {/* Seleção de Agente */}
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(AGENTS) as AgentType[]).map(agentKey => (
              <button
                key={agentKey}
                onClick={() => setSelectedAgent(agentKey)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedAgent === agentKey
                    ? 'bg-white text-gray-800 font-medium'
                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                }`}
              >
                <i className={`fas ${AGENTS[agentKey].icon} mr-1`}/>
                {AGENTS[agentKey].name}
              </button>
            ))}
          </div>
        </div>

        {/* Documentos Disponíveis */}
        <div className="px-4 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <i className="fas fa-database text-blue-600"/>
              Base de Conhecimento ({documents.length} documentos)
            </p>
          </div>
          
          {documents.length === 0 ? (
            <div className="text-center py-3 text-gray-500">
              <i className="fas fa-inbox text-2xl mb-2 opacity-50"/>
              <p className="text-sm">Nenhum documento carregado ainda.</p>
              <p className="text-xs mt-1">Vá em Configurações → Documentos IA para fazer upload.</p>
            </div>
          ) : (
            <div className="max-h-24 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {documents.map((doc) => (
                  <span
                    key={doc.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-xs border border-gray-200 text-gray-700"
                    title={`Carregado em: ${new Date(doc.created_at).toLocaleString('pt-BR')}`}
                  >
                    <i className={`fas ${
                      doc.file_type?.includes('pdf') ? 'fa-file-pdf text-red-500' :
                      doc.file_type?.includes('excel') || doc.file_type?.includes('spreadsheet') ? 'fa-file-excel text-green-500' :
                      doc.file_type?.includes('word') || doc.file_type?.includes('document') ? 'fa-file-word text-blue-500' :
                      doc.file_type?.includes('csv') ? 'fa-file-csv text-orange-500' :
                      'fa-file-alt text-gray-500'
                    }`}/>
                    {doc.filename}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Perguntas Padrão */}
        <div className="px-4 py-3 bg-white border-b">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600 font-medium flex items-center gap-2">
              <span>⚡ Perguntas rápidas:</span>
            </p>
            <button
              onClick={()=>setShowQuickQuestions(v=>!v)}
              className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
              title={showQuickQuestions ? 'Recolher' : 'Expandir'}
            >
              <i className={`fas ${showQuickQuestions ? 'fa-chevron-up' : 'fa-chevron-down'}`}/>
              {showQuickQuestions ? 'Recolher' : 'Expandir'}
            </button>
          </div>
          {showQuickQuestions && (
            <div className="flex gap-2 flex-wrap mt-2">
              {currentAgent.questions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(q)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors border border-gray-300"
                  title="Clique para usar esta pergunta"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl p-4 shadow-md ${
                    msg.type === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                      : 'bg-white border border-gray-200'
                  }`}
                  style={msg.type === 'agent' ? {
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(255, 255, 255, 0.9)'
                  } : {}}
                >
                  {msg.type === 'agent' && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                      <i className="fas fa-robot"/>
                      <span className="font-medium">Agente Tecnoperfil</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-2 ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                  </div>
                  <span className="text-sm text-gray-500">Pensando...</span>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Digite sua pergunta sobre PCP, produção ou os arquivos carregados..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg"
            >
              {loading ? <i className="fas fa-spinner fa-spin"/> : <i className="fas fa-paper-plane"/>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
