import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.13";
import {
  AgendadorMinhaAgenda, DEF_CONFIRMAR, DEF_PROPOR, ehConfirmacao, montarFerramentas, telefoneNacional,
  type DepsFerramentas, type PedidoAgendamento, type Proposta, type RepositorioPropostas,
} from "../functions/_shared/agendamento.ts";
import type { Agenda } from "../functions/_shared/disponibilidade.ts";

Deno.test("confirmação: aceita sim claros e recusa dúvida ou negação", () => {
  for (const t of ["sim", "Sim!", "SIM pode", "s", "pode marcar", "Confirmo", "ok", "isso mesmo", "👍", "pode sim, obrigada"]) {
    assertEquals(ehConfirmacao(t), true, t);
  }
  for (const t of ["não", "nao, prefiro outro", "sim, mas não agora", "talvez", "qual o preço?", "", null, "pera", "simone"]) {
    assertEquals(ehConfirmacao(t), false, String(t));
  }
});

Deno.test("telefone nacional a partir do wa_id", () => {
  assertEquals(telefoneNacional("5511992090474"), "11992090474");
  assertEquals(telefoneNacional("551133334444"), "1133334444");
  assertEquals(telefoneNacional("14155550123"), null);
});

Deno.test("agendador: login, cadastro com dados da cliente e POST no formato do site", async () => {
  const pedidos: Array<{ url: string; body: unknown }> = [];
  const f = (async (url: string, init?: RequestInit) => {
    const u = String(url);
    pedidos.push({ url: u.replace(/\?.*$/, ""), body: init?.body ? JSON.parse(String(init.body)) : null });
    if (u.includes("accounts:signUp")) return new Response(JSON.stringify({ idToken: "tc", refreshToken: "r", expiresIn: "3600" }));
    if (u.includes("GuestSignUp")) return new Response("{}");
    return new Response(JSON.stringify({ status: "CREATED" }));
  }) as typeof fetch;
  const p: PedidoAgendamento = { nome: "Isa", telefone: "11992090474", profissionalId: 486643, servicoId: 5732343, data: "2026-11-20", hora: "09:00", comentario: "c" };
  await new AgendadorMinhaAgenda("KEY", f).agendar(p);
  const cad = pedidos[1].body as Record<string, unknown>;
  assertEquals([cad.name, cad.phone, cad.countryIso], ["Isa", "11992090474", "BR"]);
  assertEquals(pedidos[2].url, "https://apionline.maapp.com.br/currentUser/appointments");
  assertEquals(pedidos[2].body, { userCpf: null, appointmentsDto: [{ employeeId: 486643, comments: "c", date: "2026-11-20", startTime: "09:00", serviceIds: [5732343] }] });
});

Deno.test("agendador: resposta sem CREATED é erro", async () => {
  const f = (async (url: string) => String(url).includes("signUp")
    ? new Response(JSON.stringify({ idToken: "t", refreshToken: "r" }))
    : new Response(String(url).includes("appointments") ? JSON.stringify({ status: "ERROR" }) : "{}")) as typeof fetch;
  let erro = "";
  try {
    await new AgendadorMinhaAgenda("K", f).agendar({ nome: "a", telefone: "1", profissionalId: 1, servicoId: 1, data: "2026-11-20", hora: "09:00", comentario: "" });
  } catch (e) { erro = String(e); }
  assertStringIncludes(erro, "não criou");
});

// ---------- fluxo propor -> confirmar ----------

class PropostasMemoria implements RepositorioPropostas {
  itens: Array<Proposta & { status: string }> = [];
  criar(p: Omit<Proposta, "id">) {
    for (const x of this.itens) if (x.conversaId === p.conversaId && x.status === "proposto") x.status = "substituido";
    const n = { ...p, id: `p${this.itens.length + 1}`, status: "proposto" };
    this.itens.push(n);
    return Promise.resolve(n);
  }
  pendente(c: string) { return Promise.resolve([...this.itens].reverse().find((x) => x.conversaId === c && x.status === "proposto") ?? null); }
  mudarStatus(id: string, de: string, para: string) {
    const x = this.itens.find((i) => i.id === id && i.status === de);
    if (x) x.status = para;
    return Promise.resolve(!!x);
  }
  agendadosDesde(c: string) { return Promise.resolve(this.itens.filter((x) => x.conversaId === c && x.status === "agendado").length); }
}

const AGORA = new Date("2026-11-07T12:00:00Z");
const SERVICOS = [{ origem_id: 5732343, nome: "Banho de Lua", preco: "R$ 30,00" }];

function cenario(ultimaMensagem: string, opcoes: { livre?: boolean; falharAgendamento?: boolean } = {}) {
  const propostas = new PropostasMemoria();
  const agendados: PedidoAgendamento[] = [];
  const avisos: string[] = [];
  let livre = opcoes.livre ?? true;
  const deps: DepsFerramentas = {
    consulta: { vagas: (_s, data): Promise<Agenda> => Promise.resolve({ data, feriado: false, profissionais: [
      { id: 486643, nome: "Bruna", horarios: livre ? ["09:00", "11:00"] : ["11:00"] },
      { id: 1001243, nome: "Alessandra", horarios: [] },
    ] }) },
    agendador: { agendar: (p) => opcoes.falharAgendamento ? Promise.reject(new Error("HTTP 409")) : (agendados.push(p), Promise.resolve()) },
    propostas,
    avisar: (a) => (avisos.push(a), Promise.resolve()),
    log: () => {},
    maxDias: 15,
    agora: () => AGORA,
  };
  const ctx = (msg: string) => ({ conversaId: "c1", waId: "5511992090474", ultimaMensagem: msg, servicos: SERVICOS });
  return {
    propostas, agendados, avisos,
    ferramentas: (msg = ultimaMensagem) => montarFerramentas(ctx(msg), deps),
    ocupar: () => { livre = false; },
  };
}

const PROPOSTA = { servico_id: 5732343, data: "2026-11-10", hora: "09:00", profissional: "Bruna", nome_cliente: "Isa" };

Deno.test("oferece as três ferramentas quando o agendamento está ligado", () => {
  const nomes = cenario("oi").ferramentas().definicoes.map((d) => d.name);
  assertEquals(nomes, ["consultar_horarios", DEF_PROPOR.name, DEF_CONFIRMAR.name]);
});

Deno.test("só consulta quando o agendamento está desligado", async () => {
  const f = montarFerramentas({ conversaId: "c1", waId: "5511992090474", ultimaMensagem: "sim", servicos: SERVICOS },
    { consulta: { vagas: () => Promise.reject(new Error("x")) }, avisar: () => Promise.resolve(), log: () => {}, maxDias: 15, agora: () => AGORA });
  assertEquals(f.definicoes.map((d) => d.name), ["consultar_horarios"]);
  assertStringIncludes(await f.executar("confirmar_agendamento", {}), "desconhecida");
});

Deno.test("fluxo feliz: propõe, cliente diz sim, agenda e avisa", async () => {
  const c = cenario("quero às 9 com a Bruna");
  const r1 = await c.ferramentas().executar("propor_agendamento", PROPOSTA);
  assertStringIncludes(r1, "Ainda NÃO está agendado");
  assertEquals(c.agendados.length, 0);
  const r2 = await c.ferramentas("Sim!").executar("confirmar_agendamento", {});
  assertStringIncludes(r2, "AGENDADO");
  assertEquals(c.agendados[0], { nome: "Isa", telefone: "11992090474", profissionalId: 486643, servicoId: 5732343, data: "2026-11-10", hora: "09:00", comentario: "Agendado pelo assistente virtual do WhatsApp" });
  assertEquals(c.avisos.length, 1);
  assertEquals(c.propostas.itens[0].status, "agendado");
});

Deno.test("TRAVA: sem 'sim' da cliente não agenda, mesmo que o modelo peça", async () => {
  const c = cenario("x");
  await c.ferramentas().executar("propor_agendamento", PROPOSTA);
  const r = await c.ferramentas("qual o endereço?").executar("confirmar_agendamento", {});
  assertStringIncludes(r, "Nada foi agendado");
  assertEquals(c.agendados.length, 0);
  assertEquals(c.propostas.itens[0].status, "proposto");
});

Deno.test("TRAVA: sem proposta pendente não agenda", async () => {
  const c = cenario("sim");
  assertStringIncludes(await c.ferramentas().executar("confirmar_agendamento", {}), "não há proposta");
  assertEquals(c.agendados.length, 0);
});

Deno.test("TRAVA: proposta vencida não agenda", async () => {
  const c = cenario("x");
  await c.ferramentas().executar("propor_agendamento", PROPOSTA);
  c.propostas.itens[0].expiraEm = AGORA.getTime() - 1;
  assertStringIncludes(await c.ferramentas("sim").executar("confirmar_agendamento", {}), "expirou");
  assertEquals(c.agendados.length, 0);
});

Deno.test("TRAVA: um agendamento por conversa por dia", async () => {
  const c = cenario("x");
  await c.ferramentas().executar("propor_agendamento", PROPOSTA);
  await c.ferramentas("sim").executar("confirmar_agendamento", {});
  await c.ferramentas().executar("propor_agendamento", { ...PROPOSTA, hora: "11:00" });
  assertStringIncludes(await c.ferramentas("sim").executar("confirmar_agendamento", {}), "já teve um agendamento");
  assertEquals(c.agendados.length, 1);
});

Deno.test("horário ocupado entre a proposta e o sim: não agenda e oferece outros", async () => {
  const c = cenario("x");
  await c.ferramentas().executar("propor_agendamento", PROPOSTA);
  c.ocupar();
  const r = await c.ferramentas("sim").executar("confirmar_agendamento", {});
  assertStringIncludes(r, "ocupado antes da confirmação");
  assertEquals(c.agendados.length, 0);
  assertEquals(c.propostas.itens[0].status, "falhou");
});

Deno.test("erro do Minha Agenda: registra falha e manda para humano", async () => {
  const c = cenario("x", { falharAgendamento: true });
  await c.ferramentas().executar("propor_agendamento", PROPOSTA);
  const r = await c.ferramentas("sim").executar("confirmar_agendamento", {});
  assertStringIncludes(r, "passar_para_humano = true");
  assertEquals(c.propostas.itens[0].status, "falhou");
  assertEquals(c.avisos.length, 0);
});

Deno.test("proposta valida profissional, horário, nome e serviço", async () => {
  const f = cenario("x").ferramentas();
  assertStringIncludes(await f.executar("propor_agendamento", { ...PROPOSTA, profissional: "Joana" }), "Opções: Bruna, Alessandra");
  assertStringIncludes(await f.executar("propor_agendamento", { ...PROPOSTA, hora: "10:00" }), "não está mais livre");
  assertStringIncludes(await f.executar("propor_agendamento", { ...PROPOSTA, hora: "9h" }), "HH:MM");
  assertStringIncludes(await f.executar("propor_agendamento", { ...PROPOSTA, nome_cliente: " " }), "falta o nome");
  assertStringIncludes(await f.executar("propor_agendamento", { ...PROPOSTA, servico_id: 1 }), "serviço não encontrado");
  assertStringIncludes(await f.executar("propor_agendamento", { ...PROPOSTA, data: "2026-12-30" }), "15 dias");
});

Deno.test("nova proposta substitui a anterior", async () => {
  const c = cenario("x");
  await c.ferramentas().executar("propor_agendamento", PROPOSTA);
  await c.ferramentas().executar("propor_agendamento", { ...PROPOSTA, hora: "11:00" });
  assertEquals(c.propostas.itens.map((i) => i.status), ["substituido", "proposto"]);
  await c.ferramentas("sim").executar("confirmar_agendamento", {});
  assertEquals(c.agendados[0].hora, "11:00");
});
