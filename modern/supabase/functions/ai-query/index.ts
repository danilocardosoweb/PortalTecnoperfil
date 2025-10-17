// Supabase Edge Function: ai-query
// Executa consultas estruturadas determinísticas sobre dados da carteira/ferramentas
// Complementa o RAG com respostas exatas para intents específicos

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type QueryType = 
  | 'listar_clientes' 
  | 'listar_pedidos' 
  | 'pedidos_atrasados' 
  | 'analise_ferramentas' 
  | 'resumo_carteira'
  | 'pedidos_por_status';

type ReqBody = { 
  query_type: QueryType;
  filters?: {
    status?: string;
    cliente?: string;
    produto?: string;
  };
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
        status: 405, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const { query_type, filters = {} } = body;

    if (!query_type) {
      return new Response(JSON.stringify({ error: 'Missing query_type' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    let result: any = null;
    let error: any = null;

    switch (query_type) {
      case 'listar_clientes':
        ({ data: result, error } = await supabase.rpc('listar_clientes_carteira'));
        break;

      case 'listar_pedidos':
        ({ data: result, error } = await supabase.rpc('listar_pedidos_por_status', { 
          status_filtro: filters.status || null 
        }));
        break;

      case 'pedidos_atrasados':
        ({ data: result, error } = await supabase.rpc('listar_pedidos_por_status', { 
          status_filtro: null 
        }));
        if (!error && result) {
          result = result.filter((p: any) => p.dias_atraso > 0);
        }
        break;

      case 'pedidos_por_status':
        ({ data: result, error } = await supabase.rpc('listar_pedidos_por_status', { 
          status_filtro: filters.status || null 
        }));
        break;

      case 'analise_ferramentas':
        ({ data: result, error } = await supabase.rpc('analise_ferramentas'));
        break;

      case 'resumo_carteira':
        ({ data: result, error } = await supabase.rpc('resumo_carteira'));
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid query_type' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
    }

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ 
        error: 'Database query failed', 
        detail: error.message 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Formatar resposta baseada no tipo de consulta
    let formatted_response = '';
    
    switch (query_type) {
      case 'listar_clientes':
        if (result && result.length > 0) {
          formatted_response = `**Lista Completa de Clientes (${result.length} clientes):**\n\n`;
          result.forEach((cliente: any, index: number) => {
            formatted_response += `${index + 1}. **${cliente.cliente}**\n`;
            formatted_response += `   - Pedidos: ${cliente.total_pedidos}\n`;
            formatted_response += `   - Valor Total: R$ ${(cliente.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
            formatted_response += `   - Status Predominante: ${cliente.status_predominante}\n\n`;
          });
        } else {
          formatted_response = 'Nenhum cliente encontrado na carteira de encomendas.';
        }
        break;

      case 'pedidos_atrasados':
        if (result && result.length > 0) {
          formatted_response = `**Pedidos em Atraso (${result.length} pedidos):**\n\n`;
          result.forEach((pedido: any, index: number) => {
            formatted_response += `${index + 1}. **${pedido.pedido}${pedido.item ? '/' + pedido.item : ''}**\n`;
            formatted_response += `   - Cliente: ${pedido.cliente}\n`;
            formatted_response += `   - Produto: ${pedido.produto || 'N/A'}\n`;
            formatted_response += `   - Quantidade: ${pedido.quantidade || 'N/A'}\n`;
            formatted_response += `   - Status: ${pedido.status}\n`;
            formatted_response += `   - **Atraso: ${pedido.dias_atraso} dias**\n`;
            formatted_response += `   - Data Entrega: ${pedido.data_entrega_atual || 'N/A'}\n\n`;
          });
        } else {
          formatted_response = 'Nenhum pedido em atraso encontrado! 🎉';
        }
        break;

      case 'resumo_carteira':
        if (result && result.length > 0) {
          const resumo = result[0];
          formatted_response = `**Resumo Executivo da Carteira:**\n\n`;
          formatted_response += `📊 **Números Gerais:**\n`;
          formatted_response += `• Total de Pedidos: ${resumo.total_pedidos}\n`;
          formatted_response += `• Total de Clientes: ${resumo.total_clientes}\n`;
          formatted_response += `• Valor Total: R$ ${(resumo.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n\n`;
          formatted_response += `⚠️ **Status dos Pedidos:**\n`;
          formatted_response += `• Em Atraso: ${resumo.pedidos_em_atraso}\n`;
          formatted_response += `• Abertos: ${resumo.pedidos_abertos}\n`;
          formatted_response += `• Em Produção: ${resumo.pedidos_em_producao}\n\n`;
          formatted_response += `🏆 **Destaques:**\n`;
          formatted_response += `• Maior Cliente: ${resumo.maior_cliente || 'N/A'}\n`;
          formatted_response += `• Produto Mais Demandado: ${resumo.produto_mais_demandado || 'N/A'}\n`;
        } else {
          formatted_response = 'Não foi possível gerar o resumo da carteira.';
        }
        break;

      case 'analise_ferramentas':
        if (result && result.length > 0) {
          formatted_response = `**Análise de Ferramentas (${result.length} ferramentas):**\n\n`;
          const precisamManutencao = result.filter((f: any) => f.necessita_manutencao);
          if (precisamManutencao.length > 0) {
            formatted_response += `⚠️ **Ferramentas que Precisam de Atenção (${precisamManutencao.length}):**\n`;
            precisamManutencao.forEach((ferramenta: any, index: number) => {
              formatted_response += `${index + 1}. **${ferramenta.codigo_ferramenta}** - ${ferramenta.nome || 'N/A'}\n`;
              formatted_response += `   - Status: ${ferramenta.status}\n`;
              formatted_response += `   - Vida Útil Restante: ${ferramenta.percentual_vida}%\n`;
              formatted_response += `   - Eficiência: ${ferramenta.eficiencia_real}%\n\n`;
            });
          }
          
          const ativas = result.filter((f: any) => !f.necessita_manutencao);
          if (ativas.length > 0) {
            formatted_response += `✅ **Ferramentas em Bom Estado (${ativas.length}):**\n`;
            ativas.slice(0, 5).forEach((ferramenta: any, index: number) => {
              formatted_response += `${index + 1}. **${ferramenta.codigo_ferramenta}** - Vida: ${ferramenta.percentual_vida}%, Eficiência: ${ferramenta.eficiencia_real}%\n`;
            });
            if (ativas.length > 5) {
              formatted_response += `... e mais ${ativas.length - 5} ferramentas.\n`;
            }
          }
        } else {
          formatted_response = 'Nenhuma ferramenta encontrada na base de dados.';
        }
        break;

      default:
        // Para outros tipos, retornar dados brutos formatados
        if (result && result.length > 0) {
          formatted_response = `**Resultados encontrados (${result.length} registros):**\n\n`;
          result.slice(0, 10).forEach((item: any, index: number) => {
            formatted_response += `${index + 1}. ${JSON.stringify(item, null, 2)}\n\n`;
          });
          if (result.length > 10) {
            formatted_response += `... e mais ${result.length - 10} registros.\n`;
          }
        } else {
          formatted_response = 'Nenhum resultado encontrado.';
        }
    }

    return new Response(JSON.stringify({ 
      success: true,
      query_type,
      count: result?.length || 0,
      data: result,
      formatted_response 
    }), { 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(JSON.stringify({ 
      error: 'Unhandled error', 
      detail: String(err) 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
});
