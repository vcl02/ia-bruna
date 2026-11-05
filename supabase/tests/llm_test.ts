import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.13";
import { montarMensagens, montarSistema, validarDecisao } from "../functions/_shared/llm.ts";
import { SERVICOS_TESTE } from "./salao_teste.ts";
import { SALAO } from "../functions/_shared/salao.ts";

Deno.test("histórico alterna papéis, começa e termina com a cliente", () => {
  const m = montarMensagens([
    { autor: "bot", texto: "msg antiga do bot" },
    { autor: "cliente", texto: "oi" },
    { autor: "cliente", texto: "quanto é a escova?" },
    { autor: "humano", texto: "R$ 50" },
    { autor: "cliente", texto: "obrigada" },
  ]);
  assertEquals(m.map((x) => x.role), ["user", "assistant", "user"]);
  assertEquals(m[0].content, "oi\nquanto é a escova?");
  assertEquals(m[1].content, "[Atendente humana] R$ 50");
});

Deno.test("prompt contém só os dados configurados", () => {
  const s = montarSistema(SALAO, SERVICOS_TESTE);
  assertStringIncludes(s, "Escova: R$ 50");
  assertStringIncludes(s, SALAO.linkAgendamento!);
  assertStringIncludes(s, "Bruna Frameschi Hair");
  assertStringIncludes(s, "Nunca invente");
});

Deno.test("valida o formato da decisão", () => {
  assertEquals(validarDecisao({ resposta: "a", passar_para_humano: false, motivo: "", intencao: "duvida" })?.resposta, "a");
  assertEquals(validarDecisao({ resposta: "a", passar_para_humano: "não", motivo: "", intencao: "duvida" }), null);
  assertEquals(validarDecisao({ resposta: "a", passar_para_humano: false, motivo: "", intencao: "xpto" }), null);
  assertEquals(validarDecisao(null), null);
});
