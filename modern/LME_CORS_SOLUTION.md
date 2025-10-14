# Solução para CORS da API LME

## Problema
A API `https://lme.gorilaxpress.com/cotacao/.../json/` não permite requisições diretas do navegador devido à política CORS (Cross-Origin Resource Sharing).

## Soluções Implementadas

### 1. Proxy CORS Público (Atual)
**Implementado em**: `useLMEData.ts`

Usa o serviço `https://api.allorigins.win/raw?url=` como proxy.

**Prós**:
- Rápido de implementar
- Sem custo
- Funciona imediatamente

**Contras**:
- Depende de serviço de terceiros
- Pode ter limite de requisições
- Menos confiável para produção

### 2. Dados de Exemplo (Fallback)
Se o proxy falhar, gera dados sintéticos para desenvolvimento.

**Função**: `generateSampleData()`
- Últimos 30 dias (exceto finais de semana)
- Valores realistas baseados nas cotações reais
- Variação aleatória de -1% a +1%

## Soluções Recomendadas para Produção

### Opção A: Firebase Cloud Function (Recomendado)
Criar uma Cloud Function que busca da API LME e retorna para o frontend.

**Passos**:
1. Criar função em `functions/src/index.ts`:
```typescript
import * as functions from 'firebase-functions'
import fetch from 'node-fetch'

export const getLMEPrices = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  
  try {
    const response = await fetch('https://lme.gorilaxpress.com/cotacao/2cf4ff0e-8a30-48a5-8add-f4a1a63fee10/json/')
    const data = await response.json()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar dados LME' })
  }
})
```

2. Deploy: `firebase deploy --only functions`

3. Atualizar `useLMEData.ts`:
```typescript
const response = await fetch('https://us-central1-portaltecnoperfil-6440c.cloudfunctions.net/getLMEPrices')
```

**Prós**:
- Controle total
- Sem limite de requisições
- Confiável
- Pode adicionar cache

**Contras**:
- Requer configuração do Firebase Functions
- Custo (mínimo, geralmente gratuito no plano Spark)

### Opção B: Backend Próprio
Criar endpoint no seu backend que faz proxy da API.

### Opção C: Scheduled Function (Melhor para histórico)
Criar uma Cloud Function agendada que busca dados diariamente e salva no Firestore.

```typescript
export const scheduledLMEUpdate = functions.pubsub
  .schedule('0 20 * * 1-5') // 20h, segunda a sexta
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const response = await fetch('https://lme.gorilaxpress.com/cotacao/.../json/')
    const data = await response.json()
    
    // Salvar no Firestore
    for (const price of data.results) {
      await db.collection('lme_prices').add({
        ...price,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
  })
```

**Prós**:
- Histórico completo no Firestore
- Não depende de API em tempo real
- Mais rápido para usuários
- Pode processar e calcular médias

**Contras**:
- Dados não são em tempo real (atualiza 1x por dia)

## Configuração Atual

Por enquanto, o sistema usa:
1. **Proxy CORS** (`api.allorigins.win`) - tenta primeiro
2. **Dados de exemplo** - fallback se falhar
3. **Cache Firestore** - sempre carrega primeiro do cache

## Próximos Passos Recomendados

1. **Curto prazo**: Usar proxy CORS atual (já implementado)
2. **Médio prazo**: Implementar Cloud Function
3. **Longo prazo**: Scheduled Function para histórico automático

## Como Testar

1. Abra o dashboard LME
2. Clique em "Atualizar"
3. Se o proxy funcionar, dados reais serão carregados
4. Se falhar, dados de exemplo serão gerados
5. Dados são salvos no Firestore para cache

## Monitoramento

Verifique o console do navegador:
- ✅ Sucesso: "Dados carregados da API"
- ⚠️ Fallback: "Erro ao buscar da API: ... Usando dados de exemplo"
- 📦 Cache: "Carregado do Firestore"
