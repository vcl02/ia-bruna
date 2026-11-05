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
- Modelo `claude-opus-5-5`, esforço `low` (conversa curta). Ajustar só
  com base em conversas reais.
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
- RLS ligado em todas as tabelas; leitura só para `equipe`; a tela só
  pode alterar as colunas de pausa.
- Logs não levam texto de mensagem.
- Em aberto: prazo de retenção e aviso de que é um assistente automático
  (ver `pendencias.md`).
