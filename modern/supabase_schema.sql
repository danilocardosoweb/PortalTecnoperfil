-- Migração do Firebase Firestore para Supabase PostgreSQL
-- Portal TecnoPerfil

-- 1. Tabela de Categorias
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'fas fa-star',
  "order" INTEGER DEFAULT 999,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para ordenação
CREATE INDEX idx_categories_order ON categories("order", name);

-- 2. Tabela de Links
CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  kind TEXT CHECK (kind IN ('powerbi', 'external')) DEFAULT 'external',
  "order" INTEGER DEFAULT 999,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category, name)
);

-- Índices para ordenação e busca
CREATE INDEX idx_links_category ON links(category, "order", name);
CREATE INDEX idx_links_favorite ON links(is_favorite) WHERE is_favorite = TRUE;

-- 3. Tabela de Uploads (metadados do Excel)
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  size_bytes BIGINT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  storage_path TEXT,
  download_url TEXT
);

-- Índice para buscar último upload
CREATE INDEX idx_uploads_uploaded_at ON uploads(uploaded_at DESC);

-- 4. Tabela de Orders (linhas do Excel da Carteira)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
  status TEXT,
  pedido TEXT,
  cliente TEXT,
  nr_pedido TEXT,
  produto TEXT,
  ferramenta TEXT,
  un_at TEXT,
  data_implant TIMESTAMP WITH TIME ZONE,
  data_entrega TIMESTAMP WITH TIME ZONE,
  data_ult_fat TIMESTAMP WITH TIME ZONE,
  pedido_kg NUMERIC(12,2),
  pedido_pc INTEGER,
  saldo_kg NUMERIC(12,2),
  saldo_pc INTEGER,
  empenho_kg NUMERIC(12,2),
  empenho_pc INTEGER,
  produzido_kg NUMERIC(12,2),
  produzido_pc INTEGER,
  embalado_kg NUMERIC(12,2),
  embalado_pc INTEGER,
  romaneio_kg NUMERIC(12,2),
  romaneio_pc INTEGER,
  faturado_kg NUMERIC(12,2),
  faturado_pc INTEGER,
  valor_pedido NUMERIC(15,2),
  representante TEXT,
  cidade_entrega TEXT,
  condicoes_especiais TEXT
);

-- Índices para consultas
CREATE INDEX idx_orders_upload_id ON orders(upload_id);
CREATE INDEX idx_orders_cliente ON orders(cliente);
CREATE INDEX idx_orders_ferramenta ON orders(ferramenta);
CREATE INDEX idx_orders_data_entrega ON orders(data_entrega);

-- 5. Tabela de Settings (configurações do app)
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'app',
  theme TEXT DEFAULT 'light',
  sidebar_collapsed BOOLEAN DEFAULT FALSE,
  pbi_crop_pct NUMERIC(5,2) DEFAULT 7,
  default_link TEXT
);

-- Inserir configuração padrão
INSERT INTO settings (id) VALUES ('app') ON CONFLICT (id) DO NOTHING;

-- 6. Storage Bucket para uploads
-- Executar no Supabase Dashboard > Storage:
-- CREATE BUCKET uploads PUBLIC;

-- 7. Políticas RLS (Row Level Security) - DESENVOLVIMENTO
-- Para produção, ajustar conforme necessário

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para desenvolvimento (AJUSTAR EM PRODUÇÃO)
CREATE POLICY "Enable all for categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for links" ON links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for uploads" ON uploads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE categories IS 'Categorias do menu lateral';
COMMENT ON TABLE links IS 'Links dos dashboards (Power BI e externos)';
COMMENT ON TABLE uploads IS 'Metadados dos arquivos Excel enviados';
COMMENT ON TABLE orders IS 'Dados da Carteira de Encomendas (linhas do Excel)';
COMMENT ON TABLE settings IS 'Configurações globais do aplicativo';
