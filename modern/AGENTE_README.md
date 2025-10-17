# 🤖 Agente Tecnoperfil - Guia de Configuração

## 📋 Visão Geral

O **Agente Tecnoperfil** é um assistente de IA especializado em PCP (Planejamento e Controle da Produção), Extrusão de Alumínio e Gestão Industrial.

### Funcionalidades:
- ✅ Upload de documentos (PDF, CSV, Excel, DOCX, TXT)
- ✅ Processamento e indexação vetorial
- ✅ Busca semântica nos documentos
- ✅ Respostas contextualizadas via IA
- ✅ Histórico de conversas
- ✅ Interface moderna com Glassmorphism

---

## 🚀 Configuração do Supabase

### 1️⃣ Executar o Schema SQL

Acesse o **SQL Editor** no Supabase e execute o arquivo `supabase_agent_schema.sql`:

```sql
-- Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Criar tabelas documents e chat_history
-- Criar função match_documents para busca vetorial
-- ... (veja o arquivo completo)
```

### 2️⃣ Verificar Tabelas Criadas

Após executar o SQL, verifique se as seguintes tabelas foram criadas:

- ✅ `documents` - Armazena documentos com embeddings
- ✅ `chat_history` - Histórico de conversas
- ✅ Função `match_documents` - Busca semântica

### 3️⃣ Configurar RLS (Opcional)

Se quiser habilitar Row Level Security, descomente as políticas no final do arquivo SQL.

---

## 🔑 Credenciais Configuradas

### Supabase:
- **URL:** `https://zfeywfbfagjbarpcsskn.supabase.co`
- **Anon Key:** Já configurada em `src/supabase.ts`

### OpenRouter:
- **API Key:** Já configurada em `src/features/agent/agentService.ts`
- **Modelo:** `mistralai/mistral-7b-instruct:free` (gratuito)
- **Embeddings:** `text-embedding-3-small`

---

## 📦 Dependências Instaladas

```json
{
  "@supabase/supabase-js": "^2.x",
  "langchain": "^0.x",
  "@langchain/community": "^0.x",
  "@langchain/openai": "^0.x",
  "framer-motion": "^11.x",
  "pdf-parse": "^1.x",
  "mammoth": "^1.x",
  "papaparse": "^5.x",
  "pdfjs-dist": "^4.x"
}
```

---

## 🎯 Como Usar

### 1. Acessar o Agente

Clique no botão **"Agente IA"** no header do portal (ícone de robô 🤖).

### 2. Fazer Upload de Documentos

- Arraste arquivos para a área de upload OU
- Clique para selecionar arquivos
- Formatos suportados: PDF, CSV, Excel, DOCX, TXT

### 3. Fazer Perguntas

Digite perguntas como:
- "Qual é o lead time médio da produção?"
- "Quais são os principais gargalos identificados?"
- "Analise a eficiência do processo de extrusão"

### 4. Receber Respostas Contextualizadas

O agente irá:
1. Buscar informações relevantes nos documentos
2. Consultar a IA com contexto
3. Retornar resposta técnica e prática
4. Sugerir ações aplicáveis

---

## 🧠 Prompt do Sistema

O agente utiliza o seguinte prompt:

```
Você é o **Agente Tecnoperfil**, especialista em **Planejamento e Controle da Produção (PCP)**, **Extrusão de Alumínio**, **Gestão de Estoques** e **Melhoria Contínua**.  

Analise os documentos e dados carregados pelo usuário e responda de forma técnica, prática e contextualizada com a realidade industrial da **Tecnoperfil Alumínio**.

Regras:
- Baseie suas respostas apenas nos arquivos e dados disponíveis.
- Se a informação não estiver nos dados, diga: "Não encontrei essa informação nos arquivos ou no banco de dados atual."
- Sempre traga insights aplicáveis, cálculos explicados e exemplos práticos.
- Use linguagem clara, técnica e acessível.  
- No final, conclua com uma sugestão de ação prática.
```

---

## 🔧 Estrutura de Arquivos

```
modern/
├── src/
│   ├── features/
│   │   └── agent/
│   │       ├── AgentModal.tsx       # Interface do chat
│   │       └── agentService.ts      # Lógica de processamento
│   ├── supabase.ts                  # Cliente Supabase
│   └── main.tsx                     # Integração no app
├── supabase_agent_schema.sql        # Schema do banco
└── AGENTE_README.md                 # Este arquivo
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module 'pdfjs-dist'"
```bash
npm install pdfjs-dist @types/papaparse
```

### Erro: "Failed to create embedding"
- Verifique se a API Key do OpenRouter está correta
- Verifique conexão com internet

### Erro: "match_documents function not found"
- Execute o SQL schema no Supabase
- Verifique se a extensão pgvector está habilitada

### Documentos não aparecem na busca
- Verifique se o embedding foi criado corretamente
- Teste a função `match_documents` diretamente no SQL Editor

---

## 📊 Monitoramento

### Ver Documentos Indexados:
```sql
SELECT id, filename, created_at, 
       length(content) as content_length
FROM documents
ORDER BY created_at DESC;
```

### Ver Histórico de Chat:
```sql
SELECT question, answer, created_at
FROM chat_history
ORDER BY created_at DESC
LIMIT 10;
```

### Limpar Documentos Antigos:
```sql
SELECT cleanup_old_documents(30); -- Remove docs com mais de 30 dias
```

---

## 🎨 Personalização

### Alterar Modelo da IA:
Edite `agentService.ts`:
```typescript
model: 'mistralai/mistral-7b-instruct:free' // Trocar aqui
```

Modelos gratuitos disponíveis:
- `mistralai/mistral-7b-instruct:free`
- `google/gemma-7b-it:free`
- `meta-llama/llama-3-8b-instruct:free`

### Alterar Prompt do Sistema:
Edite a constante `SYSTEM_PROMPT` em `agentService.ts`.

### Alterar Threshold de Similaridade:
Edite a função `searchDocuments`:
```typescript
match_threshold: 0.5 // Aumentar para resultados mais precisos
```

---

## 📈 Próximos Passos

- [ ] Adicionar autenticação de usuários
- [ ] Implementar rate limiting
- [ ] Adicionar suporte a imagens
- [ ] Criar dashboard de analytics
- [ ] Exportar conversas em PDF
- [ ] Integrar com banco de dados de produção

---

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console do navegador
2. Verifique os logs do Supabase
3. Teste a API do OpenRouter diretamente

---

**Desenvolvido para Tecnoperfil Alumínio** 🏭
