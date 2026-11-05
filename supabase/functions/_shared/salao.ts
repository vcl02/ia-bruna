// Dados do salão usados pelo bot. Nada aqui é segredo.
// Campos `null` são informações que AINDA NÃO FORAM PASSADAS. Enquanto houver
// campo obrigatório faltando, o bot não chama a LLM: passa direto para humano.

export interface Servico {
  nome: string;
  preco: string;        // texto livre, ex.: "R$ 80" ou "a partir de R$ 120"
  duracao?: string;     // opcional, ex.: "1h"
  observacao?: string;  // opcional, ex.: "preço varia com o comprimento"
}

export interface DadosSalao {
  nomeSalao: string | null;
  nomeAtendente: string | null;     // como o bot se apresenta / quem assume
  linkAgendamento: string | null;
  endereco: string | null;
  horarioFuncionamento: string | null;
  formasPagamento: string | null;   // opcional
  servicos: Servico[];
  tom: string | null;
  mensagemPassagemHumano: string;
  mensagemForaDoEscopo: string;
}

export const SALAO: DadosSalao = {
  nomeSalao: null,
  nomeAtendente: null,
  // Informado pelo usuário em 2026-11-05.
  linkAgendamento: "https://online.maapp.com.br/Brunaframeschihair",
  endereco: null,
  horarioFuncionamento: null,
  formasPagamento: null,
  servicos: [],
  tom: null,
  mensagemPassagemHumano:
    "Vou chamar alguém do salão pra te responder, tá? Assim que possível já te retornam por aqui. 😊",
  mensagemForaDoEscopo:
    "Por aqui eu só consigo ajudar com assuntos do salão (serviços, preços, horários e agendamento).",
};

export function camposFaltando(d: DadosSalao): string[] {
  const faltando: string[] = [];
  if (!d.nomeSalao) faltando.push("nomeSalao");
  if (!d.nomeAtendente) faltando.push("nomeAtendente");
  if (!d.linkAgendamento) faltando.push("linkAgendamento");
  if (!d.endereco) faltando.push("endereco");
  if (!d.horarioFuncionamento) faltando.push("horarioFuncionamento");
  if (!d.tom) faltando.push("tom");
  if (d.servicos.length === 0) faltando.push("servicos");
  return faltando;
}
