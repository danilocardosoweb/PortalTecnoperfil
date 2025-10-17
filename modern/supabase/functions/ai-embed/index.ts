// Supabase Edge Function: ai-embed
// Gera embeddings via OpenRouter no lado do servidor (evita CORS e protege a chave)
// Requer: variável de ambiente OPENROUTER_API_KEY configurada no projeto Supabase.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

type ReqBody = { text?: string }

denoServe(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY is not set' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const body = (await req.json().catch(() => ({}))) as ReqBody
    const input = (body.text || '').toString()
    if (!input) {
      return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Title': 'Portal Tecnoperfil'
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: input.slice(0, 8000)
      })
    })

    const contentType = response.headers.get('content-type') || ''
    if (!response.ok || !contentType.includes('application/json')) {
      const raw = await response.text().catch(() => '')
      return new Response(JSON.stringify({ error: `OpenRouter error (${response.status}): ${response.statusText}`, detail: raw.slice(0, 500) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const data = await response.json()
    const embedding = data?.data?.[0]?.embedding || []
    return new Response(JSON.stringify({ embedding }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Unhandled error', detail: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
