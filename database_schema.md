# Esquema de Banco de Dados (Firebase Firestore)

Este projeto usa Firestore (NoSQL) e, opcionalmente, Storage. Em Firestore não há criação prévia de “tabelas”; as coleções passam a existir quando inserimos documentos.

## Coleções obrigatórias

### 1) categories
- id (doc id automático)
- name: string (único por app)
- icon: string (classe do ícone FontAwesome, ex.: `fas fa-chart-line`)
- createdAt: timestamp
- [futuro] order: number (para ordenação manual)

Índice sugerido: `orderBy(name)`

### 2) links
- id (doc id automático)
- category: string (nome da categoria)
- name: string
- url: string (http/https). Se `app.powerbi.com/view` será tratado como Power BI.
- kind: string ('powerbi' | 'external') — opcional nos registros antigos (inferido por URL)
- createdAt: timestamp
- [futuro] order: number (para ordenação manual)

Índices sugeridos:
- `orderBy(category), orderBy(name)` (composite)

### 3) uploads (metadados do Excel da Carteira)
- id (doc id automático)
- filename: string
- sizeBytes: number
- uploadedAt: timestamp
- storagePath: string (pode ser vazio se Storage indisponível)
- downloadURL: string (pode ser vazio se Storage indisponível)

Índice sugerido: `orderBy(uploadedAt desc)`

### 4) orders (linhas do Excel)
- id (doc id automático)
- uploadId: string (ref para `uploads.id`)
- status, pedido, cliente, nr_pedido, produto, ferramenta, un_at: string
- datas: `data_implant`, `data_entrega`, `data_ult_fat` (timestamp)
- métricas numéricas: `pedido_kg`, `pedido_pc`, `saldo_kg`, `saldo_pc`, `empenho_kg`, `empenho_pc`,
  `produzido_kg`, `produzido_pc`, `embalado_kg`, `embalado_pc`, `romaneio_kg`, `romaneio_pc`,
  `faturado_kg`, `faturado_pc`, `valor_pedido`
- representante, cidade_entrega, condicoes_especiais: string

Índices sugeridos (criar conforme consultas):
- Por `uploadId` (filtro principal)
- Compostos envolvendo `cliente`, `ferramenta`, `data_entrega`

## Como as coleções são criadas
- `categories` e `links`: criadas pelo app através da sincronização do menu estático e do CRUD no modal de Configurações.
- `uploads` e `orders`: criadas ao enviar um novo Excel na aba “Carteira de Encomendas”.
  - Modo overwrite: ao enviar um novo arquivo, o app apaga todos os docs anteriores de `orders` e `uploads` (e os arquivos no Storage, se existirem) antes de gravar o novo dataset.

## Storage (opcional)
- Pasta `uploads/` para o arquivo bruto. No plano gratuito, o app continua funcionando sem Storage (campos vazios).

## Regras (DESENVOLVIMENTO)
Ajuste em Firestore > Regras e Storage > Regras para permitir testes (não usar em produção):

Firestore
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if true; }
  }
}
```

Storage
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} { allow read, write: if true; }
  }
}
```

## Observações
- `data_schema.sql` não se aplica a Firestore (mantido só como histórico).
- Para produção, restrinja as regras (ex.: exigir autenticação e/ou segmentar caminhos).
- Deduplicação automática: ao iniciar, o app remove duplicidades em `categories` (por `name`) e `links` (por par `category+name`).
- Análise da Carteira: a visão lê o último `upload` (mais recente por `uploadedAt`) e busca as `orders` relacionadas para filtros no cliente e exportação CSV.
