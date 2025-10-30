import fetch from 'node-fetch';

async function main() {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer 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',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Title': 'Portal Tecnoperfil'
    },
    body: JSON.stringify({
      model: 'mistralai/mistral-7b-instruct:free',
      messages: [{ role: 'user', content: 'Teste rápido' }]
    })
  });

  console.log('Status:', response.status, response.statusText);
  const text = await response.text();
  console.log('Body:', text);
}

main().catch((err) => {
  console.error('Erro ao chamar OpenRouter:', err);
});
