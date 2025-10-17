# Portal TecnoPerfil - Schema do Banco de Dados

## Visão Geral
Este documento descreve a estrutura do banco de dados do Portal TecnoPerfil, incluindo tabelas para gestão de categorias, links, documentos do agente IA e dados estruturados da carteira de encomendas.

## Tabelas Principais

### documents
- **Propósito**: Armazenar documentos processados pelo agente IA (RAG)
- **Colunas**:
  - `id`: BIGSERIAL PRIMARY KEY
  - `content`: TEXT - Conteúdo extraído do documento
  - `filename`: VARCHAR(255) - Nome do arquivo original
  - `file_type`: VARCHAR(100) - Tipo MIME do arquivo
  - `embedding`: VECTOR(1536) - Embedding vetorial para busca semântica
  - `created_at`: TIMESTAMP WITH TIME ZONE

### carteira_encomendas
- **Propósito**: Dados estruturados da carteira de encomendas (extraídos de Excel/CSV)
- **Colunas**:
  - `id`: BIGSERIAL PRIMARY KEY
  - `pedido`: VARCHAR(50) NOT NULL - Número do pedido
  - `item`: VARCHAR(20) - Item do pedido
  - `cliente`: VARCHAR(200) NOT NULL - Nome do cliente
  - `produto`: VARCHAR(100) - Código/nome do produto
  - `descricao`: TEXT - Descrição do produto
  - `quantidade`: DECIMAL(12,3) - Quantidade
  - `unidade`: VARCHAR(10) - Unidade de medida
  - `data_pedido`: DATE - Data do pedido
  - `data_entrega_original`: DATE - Data de entrega original
  - `data_entrega_atual`: DATE - Data de entrega atual
  - `status`: VARCHAR(50) - Status do pedido
  - `prioridade`: VARCHAR(20) - Prioridade
  - `ferramenta`: VARCHAR(50) - Ferramenta utilizada
  - `linha_producao`: VARCHAR(50) - Linha de produção
  - `tempo_estimado_horas`: DECIMAL(8,2) - Tempo estimado
  - `valor_unitario`: DECIMAL(12,2) - Valor unitário
  - `valor_total`: DECIMAL(12,2) - Valor total
  - `arquivo_origem`: VARCHAR(255) - Arquivo de origem
  - `planilha_aba`: VARCHAR(100) - Aba da planilha
  - `linha_origem`: INTEGER - Linha na planilha
  - `created_at`: TIMESTAMP WITH TIME ZONE
  - `updated_at`: TIMESTAMP WITH TIME ZONE

### ferramentas_dados
- **Propósito**: Dados estruturados sobre ferramentas/matrizes de produção
- **Colunas**:
  - `id`: BIGSERIAL PRIMARY KEY
  - `codigo_ferramenta`: VARCHAR(50) NOT NULL UNIQUE
  - `nome`: VARCHAR(200) - Nome da ferramenta
  - `tipo`: VARCHAR(50) - Tipo (Matriz, Punção, etc.)
  - `capacidade_kg_hora`: DECIMAL(8,2) - Capacidade em kg/hora
  - `eficiencia_real`: DECIMAL(5,2) - Eficiência real (%)
  - `vida_util_total`: DECIMAL(12,2) - Vida útil total
  - `vida_util_restante`: DECIMAL(12,2) - Vida útil restante
  - `percentual_vida_restante`: DECIMAL(5,2) - % vida restante
  - `status`: VARCHAR(50) - Status (Ativa, Manutenção, Inativa)
  - `localizacao`: VARCHAR(100) - Localização
  - `ultima_manutencao`: DATE - Última manutenção
  - `proxima_manutencao`: DATE - Próxima manutenção
  - `custo_manutencao_medio`: DECIMAL(10,2) - Custo médio manutenção
  - `arquivo_origem`: VARCHAR(255) - Arquivo de origem
  - `created_at`: TIMESTAMP WITH TIME ZONE
  - `updated_at`: TIMESTAMP WITH TIME ZONE

### chat_history
- **Propósito**: Histórico de conversas com o agente IA
- **Colunas**:
  - `id`: BIGSERIAL PRIMARY KEY
  - `question`: TEXT - Pergunta do usuário
  - `answer`: TEXT - Resposta do agente
  - `context_used`: TEXT[] - Documentos utilizados como contexto
  - `created_at`: TIMESTAMP WITH TIME ZONE

## Funções Especiais

### match_documents(query_embedding, match_threshold, match_count)
- **Propósito**: Busca semântica de documentos usando embeddings
- **Parâmetros**:
  - `query_embedding`: VECTOR(1536) - Embedding da consulta
  - `match_threshold`: FLOAT - Limiar de similaridade (0.0 a 1.0)
  - `match_count`: INTEGER - Número máximo de resultados
- **Retorna**: Documentos ordenados por similaridade

### Funções de Consulta Estruturada

#### listar_clientes_carteira()
- **Propósito**: Lista todos os clientes com estatísticas agregadas
- **Retorna**: cliente, total_pedidos, valor_total, status_predominante

#### listar_pedidos_por_status(status_filtro)
- **Propósito**: Lista pedidos filtrados por status, ordenados por urgência
- **Parâmetros**: `status_filtro` VARCHAR - Filtro de status (opcional)
- **Retorna**: pedido, item, cliente, produto, quantidade, status, data_entrega_atual, dias_atraso

#### analise_ferramentas()
- **Propósito**: Análise completa do status das ferramentas
- **Retorna**: codigo_ferramenta, nome, status, eficiencia_real, vida_util_restante, percentual_vida, necessita_manutencao

#### resumo_carteira()
- **Propósito**: Resumo executivo da carteira de encomendas
- **Retorna**: total_pedidos, total_clientes, valor_total, pedidos_em_atraso, pedidos_abertos, pedidos_em_producao, maior_cliente, produto_mais_demandado

## Edge Functions

### ai-embed
- **Propósito**: Gerar embeddings via OpenRouter no servidor
- **Endpoint**: `https://[project-id].supabase.co/functions/v1/ai-embed`
- **Método**: POST
- **Body**: `{ "text": "texto para embedding" }`
- **Resposta**: `{ "embedding": [array de números] }`

### ai-query
- **Propósito**: Executar consultas estruturadas determinísticas
- **Endpoint**: `https://[project-id].supabase.co/functions/v1/ai-query`
- **Método**: POST
- **Body**: `{ "query_type": "tipo", "filters": {...} }`
- **Tipos suportados**:
  - `listar_clientes`: Lista completa de clientes
  - `pedidos_atrasados`: Pedidos em atraso
  - `resumo_carteira`: Resumo executivo
  - `analise_ferramentas`: Status das ferramentas
  - `pedidos_por_status`: Pedidos por status específico
- **Resposta**: `{ "success": true, "formatted_response": "texto formatado", "data": [...] }`

## Índices de Performance

### carteira_encomendas
- `idx_carteira_cliente`: Índice em `cliente`
- `idx_carteira_status`: Índice em `status`
- `idx_carteira_data_entrega`: Índice em `data_entrega_atual`
- `idx_carteira_produto`: Índice em `produto`
- `idx_carteira_ferramenta`: Índice em `ferramenta`
- `idx_carteira_arquivo`: Índice em `arquivo_origem`

### ferramentas_dados
- `idx_ferramentas_codigo`: Índice em `codigo_ferramenta`
- `idx_ferramentas_status`: Índice em `status`
- `idx_ferramentas_eficiencia`: Índice em `eficiencia_real`

## Triggers

### update_updated_at_column()
- **Propósito**: Atualizar automaticamente o campo `updated_at`
- **Aplicado em**: `carteira_encomendas`, `ferramentas_dados`

## Extensões Necessárias

- **vector**: Para suporte a embeddings vetoriais (pgvector)
- **uuid-ossp**: Para geração de UUIDs (se necessário)

## Configurações Recomendadas

### Para Performance de Embeddings
```sql
-- Ajustar configurações para melhor performance com vetores
SET maintenance_work_mem = '512MB';
SET max_parallel_maintenance_workers = 7;
```

### Para Consultas Estruturadas
```sql
-- Otimizar para consultas analíticas
SET work_mem = '256MB';
SET random_page_cost = 1.1;
```

## Backup e Rollback

### Comandos de Rollback
```sql
-- Remover tabelas estruturadas (se necessário)
DROP TABLE IF EXISTS ferramentas_dados;
DROP TABLE IF EXISTS carteira_encomendas;

-- Remover funções estruturadas
DROP FUNCTION IF EXISTS listar_clientes_carteira();
DROP FUNCTION IF EXISTS listar_pedidos_por_status(VARCHAR);
DROP FUNCTION IF EXISTS analise_ferramentas();
DROP FUNCTION IF EXISTS resumo_carteira();
```

## Observações

1. **Ingestão Estruturada**: Arquivos Excel/CSV são processados automaticamente e seus dados estruturados são inseridos nas tabelas `carteira_encomendas` e `ferramentas_dados`.

2. **Consultas Híbridas**: O sistema usa tanto busca semântica (RAG) quanto consultas estruturadas (SQL) para fornecer respostas mais precisas.

3. **Edge Functions**: As funções `ai-embed` e `ai-query` executam no servidor Supabase, evitando problemas de CORS e protegendo chaves de API.

4. **Performance**: Índices otimizados para consultas frequentes sobre clientes, status, datas e ferramentas.

5. **Auditoria**: Campos `created_at` e `updated_at` em todas as tabelas para rastreamento de mudanças.
