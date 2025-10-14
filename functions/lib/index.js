"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledLMEUpdate = exports.getLMEPrices = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
// Cloud Function para buscar dados da API LME (resolve CORS)
exports.getLMEPrices = functions.https.onRequest(async (req, res) => {
    // Configurar CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        // Buscar da API LME
        const response = await fetch('https://lme.gorilaxpress.com/cotacao/2cf4ff0e-8a30-48a5-8add-f4a1a63fee10/json/');
        if (!response.ok) {
            throw new Error(`API retornou status ${response.status}`);
        }
        const data = await response.json();
        // Retornar dados
        res.status(200).json(data);
    }
    catch (error) {
        console.error('Erro ao buscar dados LME:', error);
        res.status(500).json({
            error: 'Falha ao buscar dados da API LME',
            message: error.message
        });
    }
});
// Cloud Function agendada para atualizar dados LME diariamente
exports.scheduledLMEUpdate = functions.pubsub
    .schedule('0 20 * * 1-5') // 20h, segunda a sexta
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
    try {
        console.log('Iniciando atualização agendada LME...');
        // Buscar da API
        const response = await fetch('https://lme.gorilaxpress.com/cotacao/2cf4ff0e-8a30-48a5-8add-f4a1a63fee10/json/');
        const json = await response.json();
        const results = json.results || [];
        const db = admin.firestore();
        let saved = 0;
        // Salvar no Firestore (evitar duplicatas)
        for (const price of results) {
            const existing = await db.collection('lme_prices')
                .where('data', '==', price.data)
                .limit(1)
                .get();
            if (existing.empty) {
                await db.collection('lme_prices').add({
                    data: price.data,
                    cobre: parseFloat(String(price.cobre).replace(',', '.')),
                    zinco: parseFloat(String(price.zinco).replace(',', '.')),
                    aluminio: parseFloat(String(price.aluminio).replace(',', '.')),
                    chumbo: parseFloat(String(price.chumbo).replace(',', '.')),
                    estanho: parseFloat(String(price.estanho).replace(',', '.')),
                    niquel: parseFloat(String(price.niquel).replace(',', '.')),
                    dolar: parseFloat(String(price.dolar).replace(',', '.')),
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                saved++;
            }
        }
        console.log(`Atualização LME concluída. ${saved} novos registros salvos.`);
        return null;
    }
    catch (error) {
        console.error('Erro na atualização agendada LME:', error);
        return null;
    }
});
//# sourceMappingURL=index.js.map