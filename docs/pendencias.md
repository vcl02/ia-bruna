# Pendências, fatos e suposições

## Verificado nesta sessão (2026-11-05)
- O repositório estava vazio.
- Testes Deno: 25 passando (assinatura, parser do payload, envio com
  `fetch` falso, histórico/prompt da LLM, regras do bot, verificação GET e
  recusa de assinatura inválida no webhook).
- A migration foi aplicada num Postgres 16 local com stubs do `auth`
  do Supabase: a equipe lê e pausa; usuário fora da equipe vê 0 linhas;
  `anon` e escrita fora das colunas de pausa são negados. Não foi testada
  num projeto Supabase real.
- O SDK `@anthropic-ai/sdk@1.3.0` aceita, na checagem de tipos,
  `fallbacks: "default"` e `output_config.format` em `beta.messages.create`.
  Não houve chamada real à API.

## Não verificado (relato ou suposição)
- Tudo em "O que já está feito" do pedido (app na Meta, número registrado,
  texto livre chegando, modelos não chegando).
- Comportamento real da Meta: formato exato do payload hoje, tempo que ela
  espera pela resposta antes de reenviar, eventos extras em coexistência
  (ex.: mensagens enviadas pelo app do celular). O parser ignora campos
  desconhecidos em vez de quebrar.
- `EdgeRuntime.waitUntil` e o limite de tempo das Edge Functions: o código
  conta com isso para responder rápido à Meta. Conferir no projeto real.
- Política da Meta para IA: pelo que sei, os termos do WhatsApp Business
  passaram a proibir assistentes de IA de uso geral e permitir assistentes
  focados no negócio. **A conferir no texto atual antes de pôr no ar.**
- O nome no link (`Brunaframeschihair`) sugere o nome da sua tia/salão,
  mas não usei isso como dado.
- Não consegui abrir o link de agendamento daqui (a rede deste ambiente
  bloqueia o domínio). Não sei se a página tem captcha.

## Perguntas em aberto
1. Dados do salão para `salao.ts`: nome do salão, nome de quem atende,
   endereço, horário, lista de serviços com preços, formas de pagamento
   (opcional), tom.
2. Coexistência: o seu número registrado continua funcionando no app
   WhatsApp Business do celular? (Sim/Não)
3. Token: temporário do painel ou permanente de usuário do sistema?
   (Temporário expira; para produção precisa do permanente.)
4. Projeto Supabase do salão: já existe? Qual?
5. Quando passar para humano, quer aviso além da tela (ex.: e-mail ou
   mensagem para um número)? Hoje só aparece "precisa de você".
6. Retenção (LGPD): por quanto tempo guardar conversas? Proposta: 12 meses.
7. O bot deve se apresentar como assistente automático na primeira
   mensagem? (Recomendo que sim.)
8. Onde hospedar a tela de conversas (`web/`)?

## Limitações conhecidas da fase 1
- Fora da janela de 24 h, só modelo aprovado é entregue; a tela recusa
  texto livre nesse caso e envio de modelo pela tela não existe ainda.
- Mensagens em sequência: o bot espera ~4 s e responde só a última, com o
  histórico. Se a cliente demorar mais entre mensagens, pode receber duas
  respostas.
- A tela atualiza a cada 15 s (sem tempo real).
