-- Schema para Agente Tecnoperfil
-- Execute este SQL no Supabase SQL Editor

-- 1. Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabela de documentos com embeddings
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT,
  embedding vector(1536), -- OpenAI text-embedding-3-small usa 1536 dimensões
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca vetorial
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 3. Tabela de histórico de chat
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  context_used TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para buscar histórico por usuário
CREATE INDEX IF NOT EXISTS chat_history_user_idx ON chat_history(user_id, created_at DESC);

-- 4. Função para buscar documentos similares
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  content text,
  filename text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    documents.id,
    documents.content,
    documents.filename,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- 5. Políticas RLS (Row Level Security) - Opcional
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Permitir leitura e escrita para usuários autenticados
-- CREATE POLICY "Allow authenticated users to read documents"
--   ON documents FOR SELECT
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Allow authenticated users to insert documents"
--   ON documents FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- CREATE POLICY "Allow users to read their own chat history"
--   ON chat_history FOR SELECT
--   TO authenticated
--   USING (auth.uid() = user_id OR user_id IS NULL);

-- CREATE POLICY "Allow users to insert their own chat history"
--   ON chat_history FOR INSERT
--   TO authenticated
--   WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 6. Função para limpar documentos antigos (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_documents(days_old int DEFAULT 30)
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM documents
  WHERE created_at < NOW() - (days_old || ' days')::interval;
$$;

-- 7. Comentários para documentação
COMMENT ON TABLE documents IS 'Armazena documentos processados com embeddings vetoriais para busca semântica';
COMMENT ON TABLE chat_history IS 'Histórico de conversas com o Agente Tecnoperfil';
COMMENT ON FUNCTION match_documents IS 'Busca documentos similares usando similaridade de cosseno';
