-- Schema inicial para Supabase (Postgres)
-- Aplicar no SQL Editor do Supabase.

-- =============================
-- UP
-- =============================
create extension if not exists pgcrypto; -- para gen_random_uuid()

create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  size_bytes bigint,
  uploaded_at timestamptz not null default now()
);

create table if not exists orders (
  id bigserial primary key,
  status text,
  pedido text,
  cliente text,
  nr_pedido text,
  data_implant date,
  data_entrega date,
  data_ult_fat date,
  produto text,
  ferramenta text,
  un_at text,
  pedido_kg numeric,
  pedido_pc numeric,
  saldo_kg numeric,
  saldo_pc numeric,
  empenho_kg numeric,
  empenho_pc numeric,
  produzido_kg numeric,
  produzido_pc numeric,
  embalado_kg numeric,
  embalado_pc numeric,
  romaneio_kg numeric,
  romaneio_pc numeric,
  faturado_kg numeric,
  faturado_pc numeric,
  valor_pedido numeric,
  representante text,
  cidade_entrega text,
  condicoes_especiais text,
  upload_id uuid references uploads(id) on delete cascade
);

create index if not exists idx_orders_cliente on orders (cliente);
create index if not exists idx_orders_ferramenta on orders (ferramenta);
create index if not exists idx_orders_data_entrega on orders (data_entrega);

-- =============================
-- DOWN (rollback)
-- =============================
-- Atenção: rollback remove tabelas e dados.

drop index if exists idx_orders_data_entrega;
drop index if exists idx_orders_ferramenta;
drop index if exists idx_orders_cliente;
drop table if exists orders;
drop table if exists uploads;
