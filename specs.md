# Especificação - Portal Tecnoperfil

## Objetivo
Centralizar dashboards Power BI e links externos, além das funcionalidades da Carteira de Encomendas (upload, análise e exportação), em um app web modular, persistido no Firebase.

## Escopo Atual (MVP concluído)
- iFrame simples com “Publish to web” para dashboards existentes (parâmetro `navContentPaneEnabled=false`).
- Links externos http(s) abrem em nova aba (não dentro do iframe).
- Layout modular (HTML+CSS+JS) com sidebar dinâmica e tema claro/escuro.
- Deep link básico via hash para reabrir o último dashboard.
- Persistência em Firestore/Storage: `categories`, `links(kind)`, `uploads`, `orders`.
- Modal de Configurações (Geral, Categorias com ícone, Links com validação, Carteira com upload overwrite e status, Uploads com exclusão).
- Modal de Análise da Carteira (filtros Cliente/Ferramenta, tabela e export CSV).

## Fora de Escopo (por enquanto)
- Autenticação e controle de acesso.
- Embed seguro do Power BI (Azure AD/Embedded) — seguimos com Publish to web.

## Roadmap (próximos)
1. Migração para stack moderna (React + Vite + TS + Tailwind ou Next.js 14) mantendo paridade.
2. Tabela performática (TanStack Table) com ordenação, paginação e virtualização na Análise.
3. KPIs e visão de calendário (datas de entrega) da Carteira.
4. Múltiplas versões da Carteira (histórico de uploads) com seletor de versão.
5. Exportação PDF/print aprimorada da tabela e relatórios.

## Regras de Formatação (PT-BR)
- Números: `1.000,50`.
- Datas: `DD/MM/AAAA` e `DD/MM/AAAA HH:MM`.

## Power BI e Links Externos
- Power BI: `Publish to web` por iFrame; usar `navContentPaneEnabled=false` quando suportado.
- Externos: abrir sempre em nova aba. Campo `kind` em `links` diferencia `powerbi` e `external` (links antigos são inferidos por URL).

## Dados (Firestore)
- Coleções e campos detalhados em `database_schema.md`.
- Overwrite: novo upload apaga `orders`/`uploads` anteriores e grava dataset mais recente. Tenta salvar arquivo bruto no Storage.
- Deduplicação automática de `categories` (por nome) e `links` (por `category+name`) no carregamento.

## UX/Acessibilidade
- Modais com ESC para fechar, foco “trapado” e cabeçalho/rodapé sticky.
- Listas com rolagem interna; formulários fixos no topo das abas longas.

## Métricas/Logs
- Erros serão documentados em `error_log.md` (criar quando necessário).

## Diretrizes de UX/UI (nova fase)
- Conceito visual inspirado em cartões arredondados, cantos 12–16px, sombras suaves e contraste alto nas ações primárias.
- Paleta base (ajustável no Tailwind):
  - Primária: azul 600/700 com estados hover/active.
  - Neutros: fundo cinza 50/100, superfícies brancas.
  - Feedback: verde (sucesso), vermelho (erro), amarelo (aviso).
- Tipografia: Inter (já usada), pesos 500/600 para headers e botões.
- Acessibilidade: contraste mínimo 4,5:1, foco visível e navegação por teclado.
- Motion: transições de 150–200ms, sem animações excessivas.

## Plano de Melhoria de Design (inspirado na imagem)
1. Header
   - Barra superior com ações visíveis (Configurações, Análise) e busca central destacada.
2. Sidebar
   - Seções com ícone e título em negrito; subitens como “chips”/botões pílula.
   - Estado ativo evidente; colapso persistente conforme preferência do usuário.
3. Cards de Acesso Rápido (opcional na home)
   - Grade de atalhos para relatórios mais usados (estilo cartões com ícones grandes).
4. Modais
   - Guias em pílulas (tabs) com realce forte no ativo; footer com botão principal destacado.
5. Tabela da Carteira
   - Cabeçalho colorido (primária), linhas zebradas, sticky header, paginação/virtualização (TanStack Table).
6. Mobile/Responsividade
   - Breakpoints: md≥768px, lg≥1024px. Em telas pequenas, sidebar recolhida e ações fundamentais no header.

## Próximos Passos de UI (execução incremental)
1. Implementar tema Tailwind com tokens (cores, radius, sombras) e utilitários personalizados.
2. Refatorar componentes base: Button, Input, Select, Tabs, Modal, Toast.
3. Aplicar novo estilo ao Header/Sidebar/Modais (modern e, quando possível, no legado).
4. Atualizar tabela da Análise para TanStack Table com virtualização.
5. Criar página/estado “Home” com cartões de atalho (opcional, controlado por feature flag).
