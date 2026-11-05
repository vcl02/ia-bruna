# Pendências, fatos e suposições

## Verificado (2026-11-06)
- Testes Deno: 34 passando (assinatura, parser incl. eco do app, envio de
  texto e modelo com `fetch` falso, aviso à equipe, regras do bot, prompt,
  verificação GET e recusa de assinatura inválida).
- Migration aplicada num Postgres 16 local com stubs do `auth`: equipe lê,
  pausa e edita serviços; fora da equipe vê 0 linhas e não grava;
  `salao_limpar_antigos` apaga conversa de 13 meses com as mensagens e não
  pode ser chamada por usuário logado.
- Tela testada no Chromium com Supabase falso: lista, conversa (HTML da
  cliente escapado), aba Serviços inserindo registro.
- Supabase (leitura): organização no plano free; projetos `hub` e
  `gestao-ammi`; o hub não tem tabelas `salao_*`; tem pg_cron; as políticas
  de leitura do hub só liberam o seu usuário ou o dono da linha.

## Não verificado
- Formato real do evento `smb_message_echoes` (coexistência).
- `EdgeRuntime.waitUntil`, limites de tempo das Edge Functions e
  comportamento de reenvio da Meta.
- Limite de 2 projetos ativos no plano free.
- Política atual da Meta para IA.
- Endereço: "Rua Sttore Andrezza, 691 - Jardim Triste" foi usado como
  recebido; grafia e cidade a confirmar.
- Não consegui abrir o link de agendamento (rede deste ambiente bloqueia).

## Perguntas em aberto
1. Endereço: grafia correta da rua e do bairro, e a cidade.
2. Preços: cadastrar pela aba Serviços, ou me mandar a lista?
3. Quem recebe o aviso? No teste, o número precisa ser diferente do
   número do bot (o seu). Na produção, a Bruna já verá tudo no app.
4. Seu número (já na API) continua funcionando no app do celular?
5. Formas de pagamento (opcional).

## Limitações conhecidas
- Fora da janela de 24 h só modelo aprovado é entregue; a tela recusa
  texto livre nesse caso.
- Mensagens seguidas com mais de ~4 s de intervalo podem gerar duas respostas.
- A tela atualiza a cada 15 s.
