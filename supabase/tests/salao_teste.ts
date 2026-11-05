// Dados FICTÍCIOS, só para teste. Não são do salão.
import { SALAO, type DadosSalao } from "../functions/_shared/salao.ts";

export const SALAO_TESTE: DadosSalao = {
  ...SALAO,
  nomeSalao: "Salão Teste",
  nomeAtendente: "Fulana",
  linkAgendamento: "https://exemplo.invalid/agendar",
  endereco: "Rua Fictícia, 1",
  horarioFuncionamento: "ter a sáb, 9h às 18h",
  servicos: [{ nome: "Escova", preco: "R$ 50" }],
  tom: "informal",
};
