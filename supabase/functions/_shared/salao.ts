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
  horarioFuncionamento: string | null;
  formasPagamento: string | null;   // opcional
  tom: string | null;
  mensagemApresentacao: string;     // vai antes da primeira resposta de cada conversa
  mensagemPassagemHumano: string;
}

// Informado pelo usuário em 2026-11-05/06.
export const SALAO: DadosSalao = {
  nomeSalao: "Bruna Frameschi Hair",
  nomeAtendente: "Bruna",
  linkAgendamento: "https://online.maapp.com.br/Brunaframeschihair",
  // TODO confirmar grafia e cidade antes de ir para clientes reais.
  endereco: "Rua Sttore Andrezza, 691 - Jardim Triste",
  horarioFuncionamento: "terça a sábado, das 10h às 18h",
  formasPagamento: null,
  tom: "super amoroso e acolhedor: carinhoso, próximo, pode usar emojis com moderação (💖✨), sem exagero e sem ser formal",
  mensagemApresentacao:
    "Oii! Aqui é a assistente virtual da Bruna Frameschi Hair 💖 Sou um atendimento automático e, se precisar, chamo a Bruna pra você.",
  mensagemPassagemHumano:
    "Vou chamar a Bruna pra te responder, tá bom? Assim que ela puder, ela te retorna por aqui 💖",
};

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
