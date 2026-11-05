// Aviso à equipe por WhatsApp quando uma conversa precisa de alguém.
//
// Regra da Meta: texto livre só é entregue se o destinatário mandou mensagem
// para o número do salão nas últimas 24 h. Fora disso, só modelo aprovado.
// Por isso: dentro da janela -> texto; fora -> modelo (se configurado).

import { dentroDaJanela, type ResultadoEnvio } from "./whatsapp.ts";
import type { Conversa } from "./bot.ts";

export interface ConfigAviso {
  para: string[];                 // números da equipe (formato da Meta, só dígitos)
  modelo: string | null;          // nome do modelo aprovado na Meta
  idiomaModelo: string;           // ex.: pt_BR
}

export interface DepsAviso {
  ultimoInboundDe(waId: string): Promise<Date | null>;
  enviarTexto(para: string, texto: string): Promise<ResultadoEnvio>;
  enviarModelo(para: string, nome: string, idioma: string, params: string[]): Promise<ResultadoEnvio>;
  log(evento: string, dados?: Record<string, unknown>): void;
}

/** Parâmetro de modelo: sem quebras de linha e curto. */
export function limparParametro(t: string, max = 200): string {
  const s = t.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s || "-";
}

export function lerConfigAviso(env: (n: string) => string | undefined): ConfigAviso {
  return {
    para: (env("SALAO_AVISO_PARA") ?? "").split(",").map((s) => s.replace(/\D/g, "")).filter(Boolean),
    modelo: env("SALAO_AVISO_MODELO") || null,
    idiomaModelo: env("SALAO_AVISO_MODELO_IDIOMA") || "pt_BR",
  };
}

export async function avisarEquipe(cfg: ConfigAviso, deps: DepsAviso, c: Conversa, motivo: string): Promise<void> {
  const cliente = c.nomePerfil ? `${c.nomePerfil} (${c.waId})` : c.waId;
  for (const para of cfg.para) {
    let envio: ResultadoEnvio | null = null;
    let via = "nenhum";
    if (dentroDaJanela(await deps.ultimoInboundDe(para))) {
      via = "texto";
      envio = await deps.enviarTexto(para, `💬 Conversa precisa de você: ${cliente}\nMotivo: ${motivo}`);
    } else if (cfg.modelo) {
      via = "modelo";
      envio = await deps.enviarModelo(para, cfg.modelo, cfg.idiomaModelo, [limparParametro(cliente), limparParametro(motivo)]);
    }
    deps.log("aviso_equipe", { conversa: c.id, via, ok: envio?.ok ?? false, http: envio?.httpStatus ?? null });
  }
}
