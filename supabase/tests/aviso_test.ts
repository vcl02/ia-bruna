import { assertEquals } from "jsr:@std/assert@1.0.13";
import { avisarEquipe, lerConfigAviso, limparParametro } from "../functions/_shared/aviso.ts";
import type { ResultadoEnvio } from "../functions/_shared/whatsapp.ts";

const ok: ResultadoEnvio = { ok: true, wamid: "w", httpStatus: 200, erro: null };
const conversa = { id: "c1", waId: "5511", nomePerfil: "Ana", botPausado: true };

function deps(ultimo: Date | null) {
  const enviados: string[] = [];
  return {
    enviados,
    d: {
      ultimoInboundDe: () => Promise.resolve(ultimo),
      enviarTexto: (p: string) => { enviados.push(`texto:${p}`); return Promise.resolve(ok); },
      enviarModelo: (p: string, n: string, _i: string, params: string[]) => { enviados.push(`modelo:${p}:${n}:${params.join("|")}`); return Promise.resolve(ok); },
      log: () => {},
    },
  };
}

Deno.test("config: lista de números só com dígitos", () => {
  const env: Record<string, string> = { SALAO_AVISO_PARA: "+55 11 9999-0000, 5521888" };
  const c = lerConfigAviso((n) => env[n]);
  assertEquals(c.para, ["551199990000", "5521888"]);
  assertEquals(c.modelo, null);
  assertEquals(c.idiomaModelo, "pt_BR");
});

Deno.test("dentro da janela: manda texto", async () => {
  const t = deps(new Date());
  await avisarEquipe({ para: ["55A"], modelo: "aviso", idiomaModelo: "pt_BR" }, t.d, conversa, "pediu humano");
  assertEquals(t.enviados, ["texto:55A"]);
});

Deno.test("fora da janela: manda modelo", async () => {
  const t = deps(null);
  await avisarEquipe({ para: ["55A"], modelo: "aviso", idiomaModelo: "pt_BR" }, t.d, conversa, "pediu\nhumano");
  assertEquals(t.enviados, ["modelo:55A:aviso:Ana (5511)|pediu humano"]);
});

Deno.test("fora da janela e sem modelo: não envia", async () => {
  const t = deps(null);
  await avisarEquipe({ para: ["55A"], modelo: null, idiomaModelo: "pt_BR" }, t.d, conversa, "x");
  assertEquals(t.enviados, []);
});

Deno.test("parâmetro limpo e curto", () => {
  assertEquals(limparParametro("  a\n\tb  "), "a b");
  assertEquals(limparParametro(""), "-");
  assertEquals(limparParametro("x".repeat(300)).length, 200);
});
