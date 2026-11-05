// Acesso ao banco com a service role (só dentro das Edge Functions).

import { createClient, type SupabaseClient } from "./deps.ts";
import type { MensagemRecebida, ResultadoEnvio, StatusRecebido } from "./whatsapp.ts";
import type { Conversa, Repositorio } from "./bot.ts";
import type { ItemHistorico } from "./llm.ts";

export function clienteServico(): SupabaseClient {
  return createClient(exigirEnv("SUPABASE_URL"), exigirEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

export function exigirEnv(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`variável de ambiente ausente: ${nome}`);
  return v;
}

function checar<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data;
}

export class RepositorioSupabase implements Repositorio {
  constructor(private db: SupabaseClient) {}

  /** Grava a mensagem recebida. `nova` = false quando a Meta reenviou a mesma. */
  async registrarEntrada(m: MensagemRecebida): Promise<{ conversaId: string; nova: boolean }> {
    const conversa = checar(
      await this.db.from("conversas").upsert(
        {
          wa_id: m.waId,
          ...(m.nomePerfil ? { nome_perfil: m.nomePerfil } : {}),
          ultimo_inbound_em: m.recebidaEm.toISOString(),
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "wa_id" },
      ).select("id").single(),
    ) as { id: string };

    const inserida = checar(
      await this.db.from("mensagens").upsert(
        {
          conversa_id: conversa.id,
          direcao: "entrada",
          autor: "cliente",
          wamid: m.wamid,
          tipo: m.tipo,
          texto: m.texto,
          criado_em: m.recebidaEm.toISOString(),
        },
        { onConflict: "wamid", ignoreDuplicates: true },
      ).select("id"),
    ) as unknown[];

    return { conversaId: conversa.id, nova: inserida.length > 0 };
  }

  async registrarStatus(s: StatusRecebido): Promise<void> {
    checar(
      await this.db.from("status_mensagens").upsert(
        {
          wamid: s.wamid,
          status: s.status,
          recipient_id: s.recipientId,
          ocorrido_em: s.ocorridoEm?.toISOString() ?? null,
          erros: s.erros,
          conversation: s.conversation,
          pricing: s.pricing,
        },
        { onConflict: "wamid,status,ocorrido_em", ignoreDuplicates: true },
      ),
    );
  }

  async conversa(id: string): Promise<Conversa> {
    const r = checar(
      await this.db.from("conversas").select("id, wa_id, bot_pausado").eq("id", id).single(),
    ) as { id: string; wa_id: string; bot_pausado: boolean };
    return { id: r.id, waId: r.wa_id, botPausado: r.bot_pausado };
  }

  async ultimaEntradaWamid(conversaId: string): Promise<string | null> {
    const r = checar(
      await this.db.from("mensagens").select("wamid")
        .eq("conversa_id", conversaId).eq("direcao", "entrada")
        .order("criado_em", { ascending: false }).limit(1),
    ) as { wamid: string | null }[];
    return r[0]?.wamid ?? null;
  }

  async historico(conversaId: string, limite: number): Promise<ItemHistorico[]> {
    const r = checar(
      await this.db.from("mensagens").select("autor, texto, tipo")
        .eq("conversa_id", conversaId)
        .order("criado_em", { ascending: false }).limit(limite),
    ) as { autor: ItemHistorico["autor"]; texto: string | null; tipo: string }[];
    return r.reverse().map((m) => ({ autor: m.autor, texto: m.texto ?? `[${m.tipo}]` }));
  }

  async registrarSaida(conversaId: string, autor: "bot" | "humano", texto: string, envio: ResultadoEnvio): Promise<void> {
    checar(
      await this.db.from("mensagens").insert({
        conversa_id: conversaId,
        direcao: "saida",
        autor,
        wamid: envio.wamid,
        tipo: "text",
        texto,
        status: envio.ok ? "aceita" : "erro_envio",
        erro: envio.ok ? null : { http: envio.httpStatus, erro: envio.erro },
      }),
    );
    checar(await this.db.from("conversas").update({ atualizado_em: new Date().toISOString() }).eq("id", conversaId));
  }

  async marcarHumano(conversaId: string, motivo: string): Promise<void> {
    checar(
      await this.db.from("conversas").update({
        bot_pausado: true,
        precisa_humano: true,
        motivo_humano: motivo,
        atualizado_em: new Date().toISOString(),
      }).eq("id", conversaId),
    );
  }
}
