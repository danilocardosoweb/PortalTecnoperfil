# Guia de Design (UX/UI)

Este documento define tokens de design, componentes e padrões visuais a serem usados no Portal Tecnoperfil (versões legacy e modern). Baseado na inspiração enviada: cartões arredondados, cores vivas e navegação simples.

## Tokens de Design

- Cores (Tailwind sugerido)
  - Primária: `#2563EB` (blue-600), hover `#1D4ED8` (blue-700)
  - Fundo app: `#F9FAFB` (gray-50)
  - Superfície: `#FFFFFF`
  - Borda: `#E5E7EB` (gray-200)
  - Texto: `#111827` (gray-900)
  - Sucesso: `#16A34A` (green-600)
  - Erro: `#DC2626` (red-600)
  - Aviso: `#D97706` (amber-600)
- Tipografia
  - Família: Inter (400/500/600)
  - Tamanhos base: 14px/16px; títulos 18–20px
- Raios
  - Cartões/Modais: 16px
  - Botões/Chips: 999px (pílula)
- Sombras
  - Cartões: `0 10px 25px rgba(0,0,0,.08)`
  - Hover: `0 12px 28px rgba(0,0,0,.12)`
- Espaçamentos
  - Grid base 4px; principais: 8/12/16/24
- Transições
  - 150–200ms, `ease-out`

## Componentes

- Botão
  - Variantes: `primary`, `secondary`, `danger`, `ghost`
  - Estados: `hover`, `active`, `focus-visible`, `disabled`, `loading`
- Input/Select
  - Borda `gray-300`, foco com `ring` primário
  - Mensagens de erro abaixo do campo
- Tabs (pílula)
  - Ativo com fundo primário e texto branco
  - Scroll horizontal em telas pequenas
- Modal
  - Overlay com blur leve; cabeçalho/rodapé `sticky`
  - Fechar com ESC e botão “X” à direita
- Toast
  - Canto inferior direito, cores por status, auto-dismiss 3–5s
- Card
  - Ícone grande, título curto; clique inteiro como ação
- Tabela (Carteira)
  - Cabeçalho com fundo primário, texto branco
  - Linhas zebradas, `sticky header`, rolagem no corpo
  - Virtualização quando > 1.000 linhas; paginação opcional

## Padrões de Navegação

- Header com busca central e ações à direita (Configurações, Análise)
- Sidebar com seções (ícone + título) e subitens como botões pílula
- Deep-link por `hash` para reabrir último dashboard

## Acessibilidade

- Contraste mínimo 4,5:1 em texto normal
- Foco visível em todos os elementos interativos
- Navegação apenas por teclado (Tab/Shift+Tab)
- Anúncio de mudanças importantes via `aria-live` quando cabível (ex.: toasts)

## Responsividade

- Breakpoints: `md` ≥ 768px, `lg` ≥ 1024px
- Sidebar recolhida em mobile; ações essenciais no Header
- Tabelas: rolagem horizontal controlada + colunas prioritárias

## Iconografia

- Font Awesome 6 (já usada). Preferir ícones sólidos em ações principais.

## Estados & Erros

- Carregando: spinners discretos; skeleton em listagens longas
- Vazios: mensagens claras com CTA (ex.: “Adicionar categoria”)
- Erros: mensagens simples, com opção de tentar novamente

## Aplicação incremental

1. Criar theme Tailwind com tokens (cores, radius, sombras)
2. Refatorar componentes base (Button/Input/Modal/Tabs/Toast)
3. Aplicar novos estilos no Header/Sidebar/Modais
4. Atualizar tabela da Carteira com TanStack Table + virtualização
5. Avaliar home com cartões de atalho (opcional)

## Referências

- Tailwind UI (padrões)
- Radix UI/Headless UI para acessibilidade
- TanStack Table/Query para dados e tabelas
