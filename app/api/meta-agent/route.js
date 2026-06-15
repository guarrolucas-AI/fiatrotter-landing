import Anthropic from '@anthropic-ai/sdk';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return n.toLocaleString('es-AR');
}

function varSign(v) {
  if (v === null || v === undefined) return 'sin dato previo';
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function buildSystemPrompt(ctx) {
  const { sucursales = [], recentTrend = [], variations = {}, currentRange, prevRange } = ctx;

  const sucursalLines = sucursales
    .map(s => `  • ${s.sucursal} (${s.supervisor}): ${s.leads} leads | CPL $${fmt(s.cpl)} ARS | Gasto $${fmt(s.spend)} ARS`)
    .join('\n') || '  Sin datos de sucursales';

  const trendLines = recentTrend
    .map(d => `  ${d.date}: ${d.totalLeads} leads (WA:${d.waLeads} Form:${d.formLeads}) | Gasto $${fmt(d.spend)} | CPL $${fmt(d.cpl)}`)
    .join('\n') || '  Sin datos recientes';

  return `Sos un experto en Meta Ads especializado en concesionarias de autos en Argentina.
Tu cliente es Rotter, concesionaria oficial con sucursales en GBA/CABA.
Trabajás con los datos reales de su cuenta de Meta Ads. Sos directo, práctico y orientado a resultados.

══ MÉTRICAS MES ACTUAL — ${currentRange || 'mes en curso'} ══
Leads totales : ${ctx.totalLeads} (${varSign(variations.totalLeads)} vs ${prevRange || 'mes anterior'})
  └ WhatsApp  : ${ctx.waLeads} (${varSign(variations.waLeads)})
  └ Formulario: ${ctx.formLeads} (${varSign(variations.formLeads)})
Gasto total   : $${fmt(ctx.spend)} ARS (${varSign(variations.spend)})
CPL promedio  : $${fmt(ctx.cpl)} ARS (${varSign(variations.cpl)} — para CPL, menor es mejor)
Impresiones   : ${fmt(ctx.impressions)} | Clics: ${fmt(ctx.clicks)} | CTR: ${ctx.ctr ? ctx.ctr.toFixed(2) : '—'}%

══ MES ANTERIOR — ${prevRange || '—'} ══
Leads: ${ctx.prevTotalLeads} | Gasto: $${fmt(ctx.prevSpend)} ARS | CPL: $${fmt(ctx.prevCpl)} ARS

══ RENDIMIENTO POR SUCURSAL (mes actual) ══
${sucursalLines}

══ TENDENCIA RECIENTE (últimos días) ══
${trendLines}

══ INSTRUCCIONES ══
- Respondé en español argentino, de forma clara y concisa
- Basate ONLY en los datos que te doy — no inventes números
- Cuando hagas recomendaciones: indicá sucursal específica, monto sugerido y acción concreta
- Si detectás un CPL anómalo, fatiga o caída de leads, señalalo proactivamente
- Moneda: pesos argentinos (ARS) siempre con $
- Podés usar **negrita** y listas con - para estructurar la respuesta
- Máximo 4-5 párrafos por respuesta; priorizá lo accionable`;
}

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY no configurada en las variables de entorno.', { status: 500 });
  }

  const { messages, metaContext } = await req.json();

  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: buildSystemPrompt(metaContext),
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\nError: ${err.message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
