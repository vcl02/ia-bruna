// Dados fixos do salão usados pelo bot. Nada aqui é segredo.
// Serviços e preços ficam no banco (tabela salao_servicos), editáveis pela tela.
// Enquanto faltar campo obrigatório ou não houver serviço ativo, o bot não
// chama a LLM: passa direto para humano.

export interface Servico {
  nome: string;
  preco: string;
  duracao?: string | null;
  observacao?: string | null;
}

export interface DadosSalao {
  nomeSalao: string | null;
  nomeAtendente: string | null;
  linkAgendamento: string | null;
  endereco: string | null;
  horarioFuncionamento: string | null; // espelhado do Minha Agenda (salao_info); este é só o valor inicial
  regrasAgendamento: string | null;    // espelhado do Minha Agenda: antecedência, cancelamento, atraso
  formasPagamento: string | null;   // opcional
  tom: string | null;
  // Textos fixos com variações: o bot sorteia um, para não soar repetitivo.
  mensagensApresentacao: string[];  // vai antes da primeira resposta de cada conversa
  mensagensPassagemHumano: string[];
}

// Informado pelo usuário em 2026-11-05/06.
export const SALAO: DadosSalao = {
  nomeSalao: "Bruna Frameschi Hair",
  nomeAtendente: "Bruna",
  linkAgendamento: "https://online.maapp.com.br/Brunaframeschihair",
  // Confirmado pelo usuário em 2026-11-06.
  endereco: "Rua Ettore Andreazza, 691 - Jardim Tietê, São Paulo - SP",
  // Valor inicial, igual ao Minha Agenda em 2026-11-07. A sincronização diária sobrescreve.
  horarioFuncionamento: "terça a sábado, das 8h às 12h e das 13h às 19h. Fechado: segunda e domingo.",
  regrasAgendamento: null,
  formasPagamento: null,
  tom: "carinhoso, acolhedor e próximo, como uma pessoa do salão conversando no WhatsApp; nada formal",
  mensagensApresentacao: [
    "Oii! Aqui é a assistente virtual da Bruna Frameschi Hair 💖 Sou um atendimento automático e, se precisar, chamo a Bruna pra você.",
    "Olá! Eu sou a assistente virtual da Bruna Frameschi Hair ✨ Respondo de forma automática e chamo a Bruna sempre que precisar.",
    "Oi, tudo bem? Aqui é a assistente virtual da Bruna Frameschi Hair 🌸 Sou um atendimento automático, mas a Bruna está por perto se precisar.",
  ],
  mensagensPassagemHumano: [
    "Vou chamar a Bruna pra te responder, tá bom? Assim que ela puder, ela te retorna por aqui 💖",
    "Essa a Bruna mesma vai te responder! Já avisei ela, e ela fala com você aqui assim que puder 😊",
    "Deixa eu passar pra Bruna, que ela te ajuda melhor nisso. Ela te responde aqui mesmo, tá? 🌸",
  ],
};

/** Aplica o que veio do Minha Agenda (tabela salao_info) sobre os dados fixos. */
export function comInfoEspelhada(d: DadosSalao, info: Record<string, string>): DadosSalao {
  return {
    ...d,
    horarioFuncionamento: info.horario_funcionamento || d.horarioFuncionamento,
    regrasAgendamento: info.regras_agendamento || d.regrasAgendamento,
  };
}

export function camposFaltando(d: DadosSalao, servicos: Servico[]): string[] {
  const faltando: string[] = [];
  if (!d.nomeSalao) faltando.push("nomeSalao");
  if (!d.nomeAtendente) faltando.push("nomeAtendente");
  if (!d.linkAgendamento) faltando.push("linkAgendamento");
  if (!d.endereco) faltando.push("endereco");
  if (!d.horarioFuncionamento) faltando.push("horarioFuncionamento");
  if (!d.tom) faltando.push("tom");
  if (servicos.length === 0) faltando.push("servicos (tabela salao_servicos vazia)");
  return faltando;
}
