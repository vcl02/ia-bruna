// Webhook da WhatsApp Cloud API.
// GET  -> verificação (hub.challenge)
// POST -> valida X-Hub-Signature-256, grava mensagens e statuses, responde 200
//         e processa a resposta do bot em segundo plano.

import { assinaturaValida } from "../_shared/assinatura.ts";
import { lerEventos, enviarTexto, type ConfigWhatsApp } from "../_shared/whatsapp.ts";
import { clienteServico, exigirEnv, RepositorioSupabase } from "../_shared/db.ts";
import { processarMensagem, type DepsBot } from "../_shared/bot.ts";
import { AtendenteClaude } from "../_shared/llm.ts";
import { SALAO } from "../_shared/salao.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

function log(evento: string, dados: Record<string, unknown> = {}) {
  // Sem texto de mensagem nem telefone completo no log (LGPD).
  console.log(JSON.stringify({ evento, ...dados }));
}

function emSegundoPlano(p: Promise<unknown>) {
  const seguro = p.catch((e) => log("erro_segundo_plano", { erro: String(e) }));
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(seguro);
  return seguro;
}

export async function tratar(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const ok = url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token") === exigirEnv("WHATSAPP_VERIFY_TOKEN");
    return ok
      ? new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 })
      : new Response("forbidden", { status: 403 });
  }
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const corpo = new Uint8Array(await req.arrayBuffer());
  const valida = await assinaturaValida(corpo, req.headers.get("x-hub-signature-256"), exigirEnv("META_APP_SECRET"));
  if (!valida) {
    log("assinatura_invalida");
    return new Response("invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(corpo));
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const wa: ConfigWhatsApp = {
    token: exigirEnv("WHATSAPP_TOKEN"),
    phoneNumberId: exigirEnv("WHATSAPP_PHONE_NUMBER_ID"),
    graphApiVersion: exigirEnv("GRAPH_API_VERSION"),
  };
  const eventos = lerEventos(payload, wa.phoneNumberId);
  const repo = new RepositorioSupabase(clienteServico());

  for (const s of eventos.statuses) {
    await repo.registrarStatus(s);
    if (s.status === "failed") {
      log("status_falha", { wamid: s.wamid, erros: s.erros });
    }
  }

  const deps: DepsBot = {
    repo,
    atendente: new AtendenteClaude(SALAO, exigirEnv("ANTHROPIC_API_KEY")),
    salao: SALAO,
    enviar: (para, texto) => enviarTexto(wa, para, texto),
    esperar: (ms) => new Promise((r) => setTimeout(r, ms)),
    log,
  };

  for (const m of eventos.mensagens) {
    const { conversaId, nova } = await repo.registrarEntrada(m);
    if (!nova) continue; // reenvio da Meta: já tratado
    emSegundoPlano(
      processarMensagem(deps, conversaId, m).then((r) => log("processado", { conversa: conversaId, resultado: r })),
    );
  }

  log("webhook", { mensagens: eventos.mensagens.length, statuses: eventos.statuses.length, ignorados: eventos.ignorados });
  return new Response("ok", { status: 200 });
}

if (import.meta.main) Deno.serve(tratar);
