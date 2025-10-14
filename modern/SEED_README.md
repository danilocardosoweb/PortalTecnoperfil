# 🌱 Como cadastrar as categorias e links do index.html

Este guia explica como popular automaticamente o Firestore com todas as categorias e links que estavam no `index.html`.

## Pré-requisitos

1. **Configurar o Firebase** - Crie um arquivo `.env` na pasta `modern/` com suas credenciais:

```env
VITE_FIREBASE_API_KEY=sua_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

> **Dica:** Copie o `.env.example` e preencha com os valores do seu projeto Firebase.

## Executar o seed

### Opção 1: Via comando npm (recomendado)

```bash
cd modern
npm install
npm run seed
```

### Opção 2: Via npx (sem instalar)

```bash
cd modern
npx tsx seed-data.ts
```

## O que será cadastrado

### 📁 Categorias (7 no total)
- ✅ Comercial (ícone: fas fa-chart-line)
- ✅ Produção (ícone: fas fa-industry)
- ✅ Logística (ícone: fas fa-truck)
- ✅ Manutenção (ícone: fas fa-wrench)
- ✅ Ferramentaria (ícone: fas fa-tools)
- ✅ Qualidade (ícone: fas fa-clipboard-check)
- ✅ Usinagem (ícone: fas fa-cut)

### 🔗 Links do Power BI (14 no total)

**Comercial (5 links)**
- Resumo
- Carteira Encomendas
- Revenda de Estoque
- Relatório de Vendas
- Catálogo

**Produção (3 links)**
- Extrusora
- Embalagem
- Ferramentaria

**Logística (3 links)**
- Plan. Entregas
- Estoque Acabados
- Estoque de Tarugos

**Manutenção (1 link)**
- Relatórios

## Comportamento do script

- ✅ **Não duplica dados**: verifica se a categoria/link já existe antes de adicionar
- ✅ **Detecta tipo automaticamente**: identifica se é Power BI ou link externo
- ✅ **Feedback detalhado**: mostra o que foi adicionado e o que já existia
- ✅ **Seguro**: pode executar múltiplas vezes sem problemas

## Após executar

1. Acesse `http://localhost:5173` (se o servidor estiver rodando)
2. Verifique a sidebar - as categorias devem aparecer
3. Clique em uma categoria para ver os links
4. Clique em "Config" > "Categorias" ou "Links" para gerenciar

## Solução de problemas

### Erro: "Cannot find module 'firebase/app'"
```bash
npm install
```

### Erro: "Firebase: Error (auth/invalid-api-key)"
- Verifique se o arquivo `.env` está configurado corretamente
- Confirme que as variáveis começam com `VITE_`

### Erro: "Permission denied"
- Verifique as regras do Firestore no Firebase Console
- Para desenvolvimento, use regras abertas (não recomendado para produção):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if true; }
  }
}
```

## Limpar dados (se necessário)

Se quiser recomeçar do zero, vá ao Firebase Console:
1. Firestore Database
2. Selecione a coleção `categories` ou `links`
3. Delete os documentos manualmente

Depois execute o seed novamente.
