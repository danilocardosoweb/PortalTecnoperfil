# Deploy das Cloud Functions - API LME

## ⚠️ IMPORTANTE
As Cloud Functions são necessárias para buscar dados REAIS da API LME, pois resolvem o problema de CORS.

## 📋 Pré-requisitos

1. **Firebase CLI instalado**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login no Firebase**
   ```bash
   firebase login
   ```

3. **Projeto Firebase configurado**
   - Projeto: `portaltecnoperfil-6440c`
   - Região: `us-central1`

## 🚀 Passo a Passo para Deploy

### 1. Instalar dependências das Functions
```bash
cd functions
npm install
```

### 2. Compilar TypeScript
```bash
npm run build
```

### 3. Deploy das Functions
```bash
firebase deploy --only functions
```

Ou deploy individual:
```bash
# Apenas a função de busca
firebase deploy --only functions:getLMEPrices

# Apenas a função agendada
firebase deploy --only functions:scheduledLMEUpdate
```

## 📡 Functions Criadas

### 1. `getLMEPrices` (HTTP)
**URL**: `https://us-central1-portaltecnoperfil-6440c.cloudfunctions.net/getLMEPrices`

**Descrição**: Busca dados da API LME e retorna para o frontend (resolve CORS)

**Uso**: Chamada manual pelo botão "Atualizar" no dashboard

**Teste**:
```bash
curl https://us-central1-portaltecnoperfil-6440c.cloudfunctions.net/getLMEPrices
```

### 2. `scheduledLMEUpdate` (Scheduled)
**Agendamento**: Segunda a sexta, 20h (horário de Brasília)

**Descrição**: Atualiza automaticamente os dados LME no Firestore

**Benefícios**:
- Histórico completo salvo automaticamente
- Não depende de usuário clicar "Atualizar"
- Dados sempre disponíveis offline

## 🔧 Configuração do Firebase

### Habilitar Billing (Necessário para Cloud Functions)
1. Acesse: https://console.firebase.google.com/project/portaltecnoperfil-6440c/usage
2. Clique em "Modificar plano"
3. Selecione "Blaze (Pague conforme usar)"
4. Adicione cartão de crédito

**Custo estimado**: R$ 0,00 - R$ 5,00/mês
- Plano gratuito: 2 milhões de invocações/mês
- Uso esperado: ~150 invocações/mês (muito abaixo do limite)

### Configurar Região
```bash
firebase functions:config:set region=us-central1
```

## ✅ Verificar Deploy

### 1. Listar functions ativas
```bash
firebase functions:list
```

### 2. Ver logs em tempo real
```bash
firebase functions:log
```

### 3. Testar a função HTTP
Abra no navegador:
```
https://us-central1-portaltecnoperfil-6440c.cloudfunctions.net/getLMEPrices
```

Deve retornar JSON com dados da API LME.

## 🐛 Troubleshooting

### Erro: "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### Erro: "Not logged in"
```bash
firebase login
```

### Erro: "Billing account not configured"
- Habilite o plano Blaze no Firebase Console
- Adicione cartão de crédito

### Erro: "Permission denied"
```bash
firebase login --reauth
```

### Function não aparece após deploy
- Aguarde 2-3 minutos
- Verifique logs: `firebase functions:log`
- Verifique no Console: https://console.firebase.google.com/project/portaltecnoperfil-6440c/functions

## 📊 Monitoramento

### Ver execuções e erros
https://console.firebase.google.com/project/portaltecnoperfil-6440c/functions

### Ver logs
```bash
# Logs gerais
firebase functions:log

# Logs de uma função específica
firebase functions:log --only getLMEPrices
```

### Custos
https://console.firebase.google.com/project/portaltecnoperfil-6440c/usage

## 🔄 Atualizar Functions

Após modificar o código em `functions/src/index.ts`:

```bash
cd functions
npm run build
firebase deploy --only functions
```

## 🎯 Próximos Passos

1. **Deploy das functions** (seguir passos acima)
2. **Testar** a URL da function no navegador
3. **Abrir dashboard LME** no app
4. **Clicar "Atualizar"** - deve buscar dados REAIS
5. **Aguardar 20h** - função agendada roda automaticamente

## 📝 Notas

- A função agendada só roda em dias úteis (segunda a sexta)
- Dados são salvos no Firestore automaticamente
- Cache local sempre carrega primeiro (rápido)
- Botão "Atualizar" busca dados frescos da API
