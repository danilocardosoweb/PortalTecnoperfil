-- Portal TecnoPerfil - Schema para Ingestão Estruturada de Dados
-- Criado em: 17/10/2025
-- Objetivo: Permitir consultas determinísticas sobre carteira de encomendas, ferramentas, etc.

-- ==========================================
-- TABELA: carteira_encomendas
-- ==========================================
-- Armazena dados estruturados extraídos de planilhas Excel/CSV
-- Permite consultas SQL precisas sobre clientes, pedidos, status, etc.

CREATE TABLE IF NOT EXISTS carteira_encomendas (
    id BIGSERIAL PRIMARY KEY,
    
    -- Identificação do pedido
    pedido VARCHAR(50) NOT NULL,
    item VARCHAR(20),
    cliente VARCHAR(200) NOT NULL,
    
    -- Produto e especificações
    produto VARCHAR(100),
    descricao TEXT,
    quantidade DECIMAL(12,3),
    unidade VARCHAR(10) DEFAULT 'kg',
    
    -- Datas e prazos
    data_pedido DATE,
    data_entrega_original DATE,
    data_entrega_atual DATE,
    
    -- Status e controle
    status VARCHAR(50) DEFAULT 'Aberto',
    prioridade VARCHAR(20) DEFAULT 'Normal',
    
    -- Produção
    ferramenta VARCHAR(50),
    linha_producao VARCHAR(50),
    tempo_estimado_horas DECIMAL(8,2),
    
    -- Valores (opcional)
    valor_unitario DECIMAL(12,2),
    valor_total DECIMAL(12,2),
    
    -- Controle de origem
    arquivo_origem VARCHAR(255),
    planilha_aba VARCHAR(100),
    linha_origem INTEGER,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para performance
    CONSTRAINT uk_carteira_pedido_item UNIQUE (pedido, item)
);

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_carteira_cliente ON carteira_encomendas(cliente);
CREATE INDEX IF NOT EXISTS idx_carteira_status ON carteira_encomendas(status);
CREATE INDEX IF NOT EXISTS idx_carteira_data_entrega ON carteira_encomendas(data_entrega_atual);
CREATE INDEX IF NOT EXISTS idx_carteira_produto ON carteira_encomendas(produto);
CREATE INDEX IF NOT EXISTS idx_carteira_ferramenta ON carteira_encomendas(ferramenta);
CREATE INDEX IF NOT EXISTS idx_carteira_arquivo ON carteira_encomendas(arquivo_origem);

-- ==========================================
-- TABELA: ferramentas_dados
-- ==========================================
-- Dados estruturados sobre ferramentas/matrizes

CREATE TABLE IF NOT EXISTS ferramentas_dados (
    id BIGSERIAL PRIMARY KEY,
    
    -- Identificação
    codigo_ferramenta VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(200),
    tipo VARCHAR(50), -- 'Matriz', 'Punção', etc.
    
    -- Capacidade e performance
    capacidade_kg_hora DECIMAL(8,2),
    eficiencia_real DECIMAL(5,2), -- %
    vida_util_total DECIMAL(12,2),
    vida_util_restante DECIMAL(12,2),
    percentual_vida_restante DECIMAL(5,2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'Ativa', -- 'Ativa', 'Manutenção', 'Inativa'
    localizacao VARCHAR(100),
    
    -- Manutenção
    ultima_manutencao DATE,
    proxima_manutencao DATE,
    custo_manutencao_medio DECIMAL(10,2),
    
    -- Controle
    arquivo_origem VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ferramentas_codigo ON ferramentas_dados(codigo_ferramenta);
CREATE INDEX IF NOT EXISTS idx_ferramentas_status ON ferramentas_dados(status);
CREATE INDEX IF NOT EXISTS idx_ferramentas_eficiencia ON ferramentas_dados(eficiencia_real);

-- ==========================================
-- FUNÇÕES DETERMINÍSTICAS
-- ==========================================

-- Função: Listar todos os clientes distintos
CREATE OR REPLACE FUNCTION listar_clientes_carteira()
RETURNS TABLE(
    cliente VARCHAR(200),
    total_pedidos BIGINT,
    valor_total DECIMAL(12,2),
    status_predominante VARCHAR(50)
) 
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        c.cliente,
        COUNT(*) as total_pedidos,
        COALESCE(SUM(c.valor_total), 0) as valor_total,
        MODE() WITHIN GROUP (ORDER BY c.status) as status_predominante
    FROM carteira_encomendas c
    GROUP BY c.cliente
    ORDER BY total_pedidos DESC, c.cliente;
$$;

-- Função: Listar pedidos por status
CREATE OR REPLACE FUNCTION listar_pedidos_por_status(status_filtro VARCHAR DEFAULT NULL)
RETURNS TABLE(
    pedido VARCHAR(50),
    item VARCHAR(20),
    cliente VARCHAR(200),
    produto VARCHAR(100),
    quantidade DECIMAL(12,3),
    status VARCHAR(50),
    data_entrega_atual DATE,
    dias_atraso INTEGER
) 
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        c.pedido,
        c.item,
        c.cliente,
        c.produto,
        c.quantidade,
        c.status,
        c.data_entrega_atual,
        CASE 
            WHEN c.data_entrega_atual < CURRENT_DATE THEN 
                CURRENT_DATE - c.data_entrega_atual
            ELSE 0
        END as dias_atraso
    FROM carteira_encomendas c
    WHERE (status_filtro IS NULL OR c.status ILIKE '%' || status_filtro || '%')
    ORDER BY 
        CASE WHEN c.data_entrega_atual < CURRENT_DATE THEN 0 ELSE 1 END,
        c.data_entrega_atual ASC,
        c.cliente,
        c.pedido;
$$;

-- Função: Análise de ferramentas
CREATE OR REPLACE FUNCTION analise_ferramentas()
RETURNS TABLE(
    codigo_ferramenta VARCHAR(50),
    nome VARCHAR(200),
    status VARCHAR(50),
    eficiencia_real DECIMAL(5,2),
    vida_util_restante DECIMAL(12,2),
    percentual_vida DECIMAL(5,2),
    necessita_manutencao BOOLEAN
) 
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        f.codigo_ferramenta,
        f.nome,
        f.status,
        f.eficiencia_real,
        f.vida_util_restante,
        f.percentual_vida_restante,
        CASE 
            WHEN f.percentual_vida_restante < 20 OR f.proxima_manutencao <= CURRENT_DATE + INTERVAL '7 days'
            THEN TRUE
            ELSE FALSE
        END as necessita_manutencao
    FROM ferramentas_dados f
    ORDER BY f.percentual_vida_restante ASC, f.eficiencia_real DESC;
$$;

-- Função: Resumo executivo da carteira
CREATE OR REPLACE FUNCTION resumo_carteira()
RETURNS TABLE(
    total_pedidos BIGINT,
    total_clientes BIGINT,
    valor_total DECIMAL(12,2),
    pedidos_em_atraso BIGINT,
    pedidos_abertos BIGINT,
    pedidos_em_producao BIGINT,
    maior_cliente VARCHAR(200),
    produto_mais_demandado VARCHAR(100)
) 
LANGUAGE SQL
STABLE
AS $$
    WITH stats AS (
        SELECT 
            COUNT(*) as total_pedidos,
            COUNT(DISTINCT cliente) as total_clientes,
            COALESCE(SUM(valor_total), 0) as valor_total,
            COUNT(*) FILTER (WHERE data_entrega_atual < CURRENT_DATE) as pedidos_em_atraso,
            COUNT(*) FILTER (WHERE status ILIKE '%aberto%') as pedidos_abertos,
            COUNT(*) FILTER (WHERE status ILIKE '%produ%') as pedidos_em_producao
        FROM carteira_encomendas
    ),
    maior_cliente AS (
        SELECT cliente
        FROM carteira_encomendas
        GROUP BY cliente
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ),
    produto_top AS (
        SELECT produto
        FROM carteira_encomendas
        WHERE produto IS NOT NULL
        GROUP BY produto
        ORDER BY SUM(quantidade) DESC
        LIMIT 1
    )
    SELECT 
        s.total_pedidos,
        s.total_clientes,
        s.valor_total,
        s.pedidos_em_atraso,
        s.pedidos_abertos,
        s.pedidos_em_producao,
        mc.cliente as maior_cliente,
        pt.produto as produto_mais_demandado
    FROM stats s
    CROSS JOIN maior_cliente mc
    CROSS JOIN produto_top pt;
$$;

-- ==========================================
-- TRIGGERS PARA UPDATED_AT
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_carteira_updated_at 
    BEFORE UPDATE ON carteira_encomendas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ferramentas_updated_at 
    BEFORE UPDATE ON ferramentas_dados 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ==========================================

COMMENT ON TABLE carteira_encomendas IS 'Dados estruturados da carteira de encomendas extraídos de planilhas Excel/CSV';
COMMENT ON TABLE ferramentas_dados IS 'Dados estruturados sobre ferramentas e matrizes de produção';

COMMENT ON FUNCTION listar_clientes_carteira() IS 'Lista todos os clientes com estatísticas agregadas';
COMMENT ON FUNCTION listar_pedidos_por_status(VARCHAR) IS 'Lista pedidos filtrados por status, ordenados por urgência';
COMMENT ON FUNCTION analise_ferramentas() IS 'Análise completa do status das ferramentas';
COMMENT ON FUNCTION resumo_carteira() IS 'Resumo executivo da carteira de encomendas';

-- ==========================================
-- ROLLBACK QUERIES (para segurança)
-- ==========================================

/*
-- ROLLBACK: Remover tabelas e funções criadas
DROP TRIGGER IF EXISTS update_carteira_updated_at ON carteira_encomendas;
DROP TRIGGER IF EXISTS update_ferramentas_updated_at ON ferramentas_dados;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS listar_clientes_carteira();
DROP FUNCTION IF EXISTS listar_pedidos_por_status(VARCHAR);
DROP FUNCTION IF EXISTS analise_ferramentas();
DROP FUNCTION IF EXISTS resumo_carteira();
DROP TABLE IF EXISTS ferramentas_dados;
DROP TABLE IF EXISTS carteira_encomendas;
*/
