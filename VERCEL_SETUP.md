# Configuração do Vercel - Portal Tecnoperfil

## Problema: Dados do Firebase não carregam no Vercel

O app não está carregando categorias e links porque as **variáveis de ambiente do Firebase** não estão configuradas no Vercel.

## Solução: Configurar Variáveis de Ambiente

### Passo 1: Acessar o Dashboard do Vercel

1. Vá para: https://vercel.com/dashboard
2. Clique no projeto **portal-tecnoperfil** (ou nome que você deu)
3. Clique em **Settings** (Configurações)
4. No menu lateral, clique em **Environment Variables**

### Passo 2: Adicionar as Variáveis do Firebase

Adicione cada uma das variáveis abaixo:

| Nome da Variável | Valor |
|------------------|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyD9JGx6gwtZ60U7BWs0xC8EK3RpCVio6HE` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `portaltecnoperfil-6440c.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `portaltecnoperfil-6440c` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `portaltecnoperfil-6440c.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `935113972102` |
| `VITE_FIREBASE_APP_ID` | `1:935113972102:web:3083eb9cbc3d49f35eb407` |

### Passo 3: Configurar para todos os ambientes

Para cada variável:
1. Clique em **Add New**
2. Digite o **Name** (ex: `VITE_FIREBASE_API_KEY`)
3. Digite o **Value** (ex: `AIzaSyD9JGx6gwtZ60U7BWs0xC8EK3RpCVio6HE`)
4. Marque as opções:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development**
5. Clique em **Save**

### Passo 4: Fazer Redeploy

Após adicionar todas as variáveis:

1. Vá para a aba **Deployments**
2. Clique nos **três pontos (...)** do último deploy
3. Clique em **Redeploy**
4. Aguarde o build completar (1-2 minutos)

## Verificação

Após o redeploy, acesse o app e:

1. Abra o **Console do navegador** (F12)
2. Veja se há erros relacionados ao Firebase
3. Clique em **Config** → **Categorias**
4. As categorias devem aparecer (se já foram cadastradas no Firestore)

## Cadastrar dados iniciais (se necessário)

Se o Firestore estiver vazio, você pode:

### Opção 1: Usar o seed (recomendado)

No seu computador local:
```bash
cd modern
npm run seed
```

Isso vai popular o Firestore com as 7 categorias e 14 links do projeto.

### Opção 2: Cadastrar manualmente

1. Acesse o app no Vercel
2. Clique em **Config** → **Categorias**
3. Adicione as categorias manualmente
4. Vá em **Links do Power BI** e adicione os links

## Troubleshooting

### Erro: "Firebase: Error (auth/invalid-api-key)"
- Verifique se todas as variáveis foram adicionadas corretamente
- Certifique-se de que não há espaços extras nos valores
- Faça redeploy após adicionar/corrigir

### Erro: "Permission denied"
- Vá ao Firebase Console: https://console.firebase.google.com/
- Selecione o projeto `portaltecnoperfil-6440c`
- Vá em **Firestore Database** → **Rules**
- Para desenvolvimento, use (⚠️ não recomendado para produção):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if true; }
  }
}
```

### Sidebar vazia após configurar
- Execute o seed localmente: `cd modern && npm run seed`
- Ou cadastre manualmente via Config → Categorias/Links
- Verifique no Firebase Console se os dados foram salvos em `categories` e `links`

## Checklist de Deploy

- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Redeploy realizado após adicionar variáveis
- [ ] Regras do Firestore configuradas (permitir leitura/escrita)
- [ ] Dados iniciais cadastrados (via seed ou manual)
- [ ] App acessível e carregando categorias/links

## Suporte

Se o problema persistir:
1. Abra o Console do navegador (F12)
2. Vá na aba **Console**
3. Copie os erros que aparecem
4. Verifique se as variáveis estão sendo lidas: `console.log(import.meta.env)`
