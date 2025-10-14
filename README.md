# Portal Tecnoperfil - App Web

Este projeto é a evolução do arquivo original `DashBoards Tecnoperfi v3.html`, reestruturado em um app web modular.

## Decisões e Funcionalidades Atuais
- **Dashboards Power BI**: “Publish to web” via iFrame com `navContentPaneEnabled=false` quando suportado.
- **Links Externos**: URLs http(s) que não sejam Power BI abrem em nova aba automaticamente.
- **Banco de Dados**: Firebase (Firestore + Storage opcional) para `categories`, `links`, `uploads`, `orders`.
- **Configurações (modal)**: abas Geral, Categorias (ícone), Links (CRUD c/ validação http/https), Carteira (upload Excel com overwrite) e Uploads (listar/excluir). Acessibilidade (ESC, foco) e responsividade com rolagem interna.
- **Menu Dinâmico**: sincroniza com Firestore. Busca com normalização (sem acentos) e destaque visual.
- **Análise da Carteira**: botão dedicado no header abre modal com filtros de Cliente/Ferramenta, tabela e Exportar CSV.

## Estrutura do Projeto
- `index.html`: página base com layout, menu e iFrame.
- `src/styles.css`: estilos globais e tema.
- `src/app.js`: lógica do front-end (navegação, carregamento de dashboards).
- `src/firebase.js`: inicialização opcional do Firebase (ES Module) usando uma config local.
- `config/firebase-config.example.js`: exemplo de arquivo de configuração (copie e preencha como `firebase-config.js`).
- `database_schema.md`: documentação do modelo de dados (coleções Firestore e objetos no Storage).
- `specs.md`: especificação funcional e roadmap.
- `change_log.md`: log de mudanças.
 - `DESIGN.md`: diretrizes de UX/UI (tokens, componentes e padrões visuais).

## Como executar localmente
1. Suba um servidor HTTP simples na raiz do projeto (necessário por usar módulos ES):
   - Python: `python -m http.server 52635`
   - Node: `npx serve -l 52635 .`
2. Acesse `http://127.0.0.1:52635`.

## Configuração do Firebase
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Habilite:
   - Firestore (modo produção)
   - Storage (bucket padrão)
3. Em Configurações do app web, copie o objeto de configuração (apiKey, authDomain, etc.).
4. Copie `config/firebase-config.example.js` para `config/firebase-config.js` e preencha seus valores.
5. No `index.html`, adicione o carregamento do módulo (quando quiser ativar a persistência real):
   
   ```html
   <script type="module" src="./src/firebase.js"></script>
   ```
   
6. Segurança: não commitar `config/firebase-config.js` (contém chaves públicas do app). Use somente em ambiente controlado.

## Notas
- O app exibe dashboards Power BI via iFrame público e diferencia automaticamente links externos (abrem em nova aba).
- O upload de Carteira sobrescreve dados anteriores para manter somente o dataset mais recente.
npm install- Há rotina de deduplicação de `categories` e `links` no carregamento inicial para evitar itens duplicados.

## Próximas melhorias de UX/UI
- Consulte `DESIGN.md` e `specs.md` (seções de UX/UI) para o plano de modernização visual, inspirado em cartões arredondados, paleta azul e componentes acessíveis.
