# Deploy (cada passo exige confirmação antes de ser executado)

Alvo: projeto Supabase **próprio do salão** (não o do hub). Ainda não
criado/indicado.

| # | Ação | Alvo | Efeito |
|---|------|------|--------|
| 1 | Aplicar `supabase/migrations/*` | banco do projeto do salão | cria tabelas, visão, gatilho e RLS |
| 2 | `supabase secrets set ...` (nomes em `.env.example`) | Edge Functions do projeto | guarda token da Meta, app secret, chave da Anthropic |
| 3 | Deploy de `whatsapp-webhook` e `responder` | Edge Functions | publica as URLs |
| 4 | Configurar o webhook no app da Meta (URL da função + verify token) e assinar o campo `messages` | app na Meta | a Meta passa a mandar mensagens e statuses |
| 5 | Criar usuário(s) no Supabase Auth e inserir em `equipe` | Auth + tabela `equipe` | libera a tela de conversas |
| 6 | Publicar `web/` (com `config.js`) e definir `PAINEL_ORIGEM` | hospedagem estática a definir | tela de conversas no ar |

Antes de ligar para clientes reais: preencher `salao.ts`, conferir a
política da Meta para IA, testar com números da família.

Rollback: pausar o bot de todas as conversas
(`update conversas set bot_pausado = true;`) ou remover a assinatura do
webhook no app da Meta.
