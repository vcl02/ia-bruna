# ia-bruna — bot de WhatsApp do salão

Bot que atende as clientes do salão pelo WhatsApp (Cloud API da Meta):
tira dúvidas com base numa lista fixa de dados, entende o que a cliente
quer, manda o link de agendamento e passa para uma pessoa quando precisa.

Projeto separado do hub pessoal (`vcl02/hub`): banco, segredos e código
próprios.

## Estrutura

```
supabase/
  migrations/                 esquema, RLS e visão de falhas de envio
  functions/
    whatsapp-webhook/         webhook da Meta (verificação, assinatura, gravação, bot)
    responder/                envio manual pela tela de conversas
    _shared/                  módulos comuns (assinatura, WhatsApp, LLM, regras do bot, banco)
  tests/                      testes Deno (sem rede, sem banco)
  config.toml                 verify_jwt por função
web/index.html                tela de conversas (estática)
docs/                         decisões, diagnóstico dos modelos, pendências, deploy
```

## Como roda

1. A Meta chama `whatsapp-webhook`. O código confere `X-Hub-Signature-256`
   com o App Secret e grava mensagens e `statuses`.
2. Para cada mensagem nova (dedupe por `wamid`), em segundo plano:
   espera alguns segundos para juntar mensagens seguidas; se o bot da
   conversa estiver pausado, não faz nada; se for áudio/imagem, pedido de
   atendente ou faltar dado do salão, passa para humano sem chamar a LLM;
   senão chama o Claude, que devolve JSON com a resposta e se precisa de humano.
3. Passar para humano = pausa o bot daquela conversa e marca
   "precisa de você" na tela. Só volta quando alguém clica em "Retomar bot".
4. A tela de conversas usa login do Supabase Auth; só quem está na tabela
   `equipe` vê algo (RLS). Responder pela tela pausa o bot da conversa.

## Desenvolvimento

Requer Deno 2.

```
deno task test     # testes
deno task check    # checagem de tipos das funções
```

Os dados do salão ficam em `supabase/functions/_shared/salao.ts`. Enquanto
faltar algum campo obrigatório, o bot não usa a LLM e passa tudo para humano.

## Segredos

Nenhum segredo no repositório. Os nomes estão em `.env.example`; os valores
vão só para os secrets do Supabase. `web/config.js` (URL e chave anon do
Supabase) fica fora do git.

## Deploy

Ver `docs/deploy.md`. Toda mudança remota (deploy, migration, secrets,
configuração na Meta) só depois de confirmação explícita.
