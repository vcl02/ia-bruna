import { assertEquals } from "jsr:@std/assert@1.0.13";
import { processarMensagem, type Conversa, type DepsBot, type Repositorio } from "../functions/_shared/bot.ts";
import type { Atendente, DecisaoLLM, ItemHistorico } from "../functions/_shared/llm.ts";
import type { MensagemRecebida, ResultadoEnvio } from "../functions/_shared/whatsapp.ts";
import { SALAO } from "../functions/_shared/salao.ts";
import { SALAO_TESTE } from "./salao_teste.ts";

class RepoFake implements Repositorio {
  c: Conversa = { id: "c1", waId: "55", botPausado: false };
  ultima = "wamid.1";
  saidas: { autor: string; texto: string }[] = [];
  humano: string | null = null;
  pausarDuranteLLM = false;
  conversa() { return Promise.resolve({ ...this.c }); }
  historico(): Promise<ItemHistorico[]> { return Promise.resolve([{ autor: "cliente", texto: "oi" }]); }
  ultimaEntradaWamid() { return Promise.resolve(this.ultima); }
  registrarSaida(_c: string, autor: "bot" | "humano", texto: string) { this.saidas.push({ autor, texto }); return Promise.resolve(); }
  marcarHumano(_c: string, motivo: string) { this.humano = motivo; this.c.botPausado = true; return Promise.resolve(); }
}

function msg(p: Partial<MensagemRecebida> = {}): MensagemRecebida {
  return { wamid: "wamid.1", waId: "55", nomePerfil: null, tipo: "text", texto: "Quanto custa a escova?", recebidaEm: new Date(), ...p };
}

function montar(decisao: DecisaoLLM | Error, salao = SALAO_TESTE) {
  const repo = new RepoFake();
  const enviados: string[] = [];
  let chamadasLLM = 0;
  const atendente: Atendente = {
    responder: () => {
      chamadasLLM++;
      if (repo.pausarDuranteLLM) repo.c.botPausado = true;
      return decisao instanceof Error ? Promise.reject(decisao) : Promise.resolve(decisao);
    },
  };
  const deps: DepsBot = {
    repo, atendente, salao,
    enviar: (_p, t): Promise<ResultadoEnvio> => { enviados.push(t); return Promise.resolve({ ok: true, wamid: "w", httpStatus: 200, erro: null }); },
    esperar: () => Promise.resolve(),
    log: () => {},
  };
  return { repo, deps, enviados, llm: () => chamadasLLM };
}

const ok: DecisaoLLM = { resposta: "A escova é R$ 50!", passar_para_humano: false, motivo: "", intencao: "duvida" };

Deno.test("responde com a LLM quando está tudo configurado", async () => {
  const t = montar(ok);
  assertEquals(await processarMensagem(t.deps, "c1", msg()), "respondido");
  assertEquals(t.enviados, ["A escova é R$ 50!"]);
  assertEquals(t.repo.humano, null);
});

Deno.test("conversa pausada: não responde nem chama a LLM", async () => {
  const t = montar(ok);
  t.repo.c.botPausado = true;
  assertEquals(await processarMensagem(t.deps, "c1", msg()), "pausado");
  assertEquals(t.enviados.length + t.llm(), 0);
});

Deno.test("mensagem mais recente na fila: esta não responde", async () => {
  const t = montar(ok);
  t.repo.ultima = "wamid.2";
  assertEquals(await processarMensagem(t.deps, "c1", msg()), "substituida_por_mais_recente");
  assertEquals(t.enviados.length, 0);
});

Deno.test("áudio passa para humano sem chamar a LLM", async () => {
  const t = montar(ok);
  assertEquals(await processarMensagem(t.deps, "c1", msg({ tipo: "audio", texto: null })), "passado_para_humano");
  assertEquals(t.llm(), 0);
  assertEquals(t.repo.c.botPausado, true);
  assertEquals(t.enviados, [SALAO_TESTE.mensagemPassagemHumano]);
});

Deno.test("pedido de atendente passa para humano", async () => {
  const t = montar(ok);
  assertEquals(await processarMensagem(t.deps, "c1", msg({ texto: "quero falar com uma atendente" })), "passado_para_humano");
  assertEquals(t.llm(), 0);
});

Deno.test("dados do salão incompletos: não chama a LLM", async () => {
  const t = montar(ok, SALAO);
  assertEquals(await processarMensagem(t.deps, "c1", msg()), "passado_para_humano");
  assertEquals(t.llm(), 0);
});

Deno.test("falha da LLM passa para humano", async () => {
  const t = montar(new Error("timeout"));
  assertEquals(await processarMensagem(t.deps, "c1", msg()), "passado_para_humano");
  assertEquals(t.repo.c.botPausado, true);
});

Deno.test("LLM pede humano: envia a resposta e pausa", async () => {
  const t = montar({ resposta: "Vou chamar a Fulana", passar_para_humano: true, motivo: "remarcação", intencao: "remarcar_ou_cancelar" });
  assertEquals(await processarMensagem(t.deps, "c1", msg({ texto: "preciso remarcar" })), "passado_para_humano");
  assertEquals(t.repo.humano, "remarcação");
  assertEquals(t.enviados, ["Vou chamar a Fulana"]);
});

Deno.test("pausado enquanto a LLM pensava: descarta a resposta", async () => {
  const t = montar(ok);
  t.repo.pausarDuranteLLM = true;
  assertEquals(await processarMensagem(t.deps, "c1", msg()), "pausado");
  assertEquals(t.enviados.length, 0);
});
