# Decisões

Registro curto. Data = quando foi decidido ou registrado aqui.

## 2026-11-05 — Fase 1: webhook + LLM numa Edge Function do Supabase
- Sem servidor próprio. Webhook, bot e envio manual são Edge Functions.
- A resposta HTTP à Meta sai logo depois de gravar; a geração com a LLM
  roda em segundo plano (`EdgeRuntime.waitUntil`).
- Dedupe por `wamid` (a Meta pode reenviar o mesmo evento).

## 2026-11-05 — Número do salão: migrar o número da tia para a API
- Se for coexistência como no número do Victor, ela mantém o app no celular.
- Antes de migrar: confirmar se ela usa os lembretes por WhatsApp do
  Minha Agenda, que podem parar de funcionar.

## 2026-11-05 — Agenda: link público do Minha Agenda
- Sem API pública conhecida. Fase 1 só manda o link.
- Fase 2 (depois): robô Playwright num servidor pequeno, só após a cliente
  confirmar um resumo. Passos/seletores versionados no banco, ativados só
  depois de passar no monitoramento. Plano B: manda o link e avisa.
- Captcha: não usar serviço de quebra. Pedir API ao suporte ou ficar no plano B.

## 2026-11-05 — LLM: Claude pela API da Anthropic
- Modelo `claude-sonnet-5-5`, esforço `medium` (decisão do Victor em
  2026-11-06, por custo; antes era `claude-opus-5-5` em `low`).
- Saída estruturada (JSON com `resposta`, `passar_para_humano`, `motivo`,
  `intencao`), validada no código. Se falhar, recusar ou cortar: passa
  para humano.
- Fallback do lado do servidor (`fallbacks: "default"`) ligado: se o
  modelo recusar, a API tenta outro modelo.
- A LLM só recebe os dados de `salao.ts` e as últimas 20 mensagens.
- Mensagem que não é texto (áudio, imagem) não vai para a LLM: passa para humano.

## 2026-11-05 — Dados e LGPD
- Gravado: número, nome do perfil, texto das mensagens, statuses.
  Mídia não é baixada.
- RLS ligado em todas as tabelas; leitura só para `salao_equipe`; a tela só
  pode alterar as colunas de pausa.
- Logs não levam texto de mensagem.
- Retenção: 12 meses sem movimento -> conversa apagada (função
  `salao_limpar_antigos`, agendada no pg_cron pela migration).
- O bot se apresenta como assistente virtual na primeira resposta.

## 2026-11-06 — Testes dentro do projeto Supabase do hub (temporário)
- Motivo: a organização está no plano free com 2 projetos ativos (hub e
  gestao-ammi). Pelo que sei, o free permite 2 projetos ativos (não conferido).
- Isolamento: tabelas `salao_*`, funções `salao-*`, secrets `SALAO_*`,
  chave da Anthropic própria do bot.
- Riscos aceitos só para teste: secrets do projeto são visíveis para
  todas as funções (as do hub enxergariam as do bot e vice-versa); o login
  da tela usa o Auth do hub.
- Por isso, durante os testes, **só o Victor** usa a tela (conta que já
  existe no hub). Não criar conta da Bruna no hub: as políticas
  `*_somente_dono` do hub deixariam uma conta nova gravar linhas próprias
  nas tabelas pessoais (sem ler as do Victor — verificado nas políticas).
- Antes de clientes reais: projeto próprio do salão (pausar um projeto,
  ou plano pago). A migração é: aplicar a mesma migration lá, copiar
  `salao_servicos`, trocar URL do webhook na Meta.

## 2026-11-06 — Serviços e preços no banco
- Tabela `salao_servicos`, editada pela aba Serviços da tela. Mudar preço
  não exige deploy.
- Depois: importar do site do Minha Agenda por script (adiado).

## 2026-11-06 — Aviso à equipe por e-mail
- Troca do aviso por WhatsApp (exigiria modelo aprovado fora da janela de 24 h).
- Provedor: Resend (sugestão minha; trocar = mudar só `enviarEmailResend`).
- O e-mail leva nome do perfil, número e motivo; não leva texto da conversa.
- Sem chave configurada, o aviso só vai para o log; o resto funciona.

## 2026-11-06 — Coexistência
- O número do Victor, registrado na API, continua 100% no app (relato).
- O número da Bruna vai para a API mantendo o app no celular.
- Resposta dada pelo app pausa o bot da conversa (evento de eco).
