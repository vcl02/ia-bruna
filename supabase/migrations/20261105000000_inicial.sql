-- Estrutura inicial do bot do salão.
-- Princípios: só o necessário (LGPD), RLS ligado em tudo, acesso de leitura
-- e escrita apenas para quem está na tabela `equipe`. As Edge Functions usam
-- a service role (ignora RLS) e nunca expõem essa chave ao navegador.

create extension if not exists pgcrypto;

-- Quem pode usar a tela de conversas (você e sua tia).
create table public.equipe (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);

-- Uma conversa por número de cliente (wa_id = número no formato da Meta).
create table public.conversas (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  nome_perfil text,                       -- nome público do perfil do WhatsApp
  bot_pausado boolean not null default false,
  precisa_humano boolean not null default false,
  motivo_humano text,
  ultimo_inbound_em timestamptz,          -- base da janela de 24 h
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas (id) on delete cascade,
  direcao text not null check (direcao in ('entrada', 'saida')),
  autor text not null check (autor in ('cliente', 'bot', 'humano')),
  wamid text unique,                      -- id da mensagem na Meta (dedupe)
  tipo text not null,                     -- text, image, audio, template...
  texto text,                             -- só texto; mídia não é baixada
  status text,                            -- último status conhecido (saída)
  erro jsonb,                             -- erro de envio, se houver
  criado_em timestamptz not null default now()
);
create index mensagens_conversa_idx on public.mensagens (conversa_id, criado_em);

-- Cada status recebido no webhook (sent, delivered, read, failed...).
-- É daqui que sai o diagnóstico dos modelos que não chegam.
create table public.status_mensagens (
  id bigint generated always as identity primary key,
  wamid text not null,
  status text not null,
  recipient_id text,
  ocorrido_em timestamptz,
  erros jsonb,
  conversation jsonb,
  pricing jsonb,
  recebido_em timestamptz not null default now(),
  unique (wamid, status, ocorrido_em)
);
create index status_mensagens_wamid_idx on public.status_mensagens (wamid);

-- Visão para diagnóstico: só os status com erro, com o código e a mensagem.
create view public.falhas_de_envio
with (security_invoker = true) as
select
  s.recebido_em,
  s.wamid,
  s.recipient_id,
  s.status,
  e ->> 'code' as codigo,
  e ->> 'title' as titulo,
  e ->> 'message' as mensagem,
  e -> 'error_data' ->> 'details' as detalhes,
  m.tipo as tipo_mensagem
from public.status_mensagens s
cross join lateral jsonb_array_elements(coalesce(s.erros, '[]'::jsonb)) e
left join public.mensagens m on m.wamid = s.wamid
order by s.recebido_em desc;

-- Atualiza o status atual da mensagem de saída quando chega um status novo.
create function public.aplicar_status() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mensagens
     set status = new.status,
         erro = coalesce(new.erros, erro)
   where wamid = new.wamid;
  return new;
end;
$$;

create trigger status_mensagens_aplicar
after insert on public.status_mensagens
for each row execute function public.aplicar_status();

-- RLS
alter table public.equipe enable row level security;
alter table public.conversas enable row level security;
alter table public.mensagens enable row level security;
alter table public.status_mensagens enable row level security;

create function public.eh_equipe() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.equipe where user_id = auth.uid());
$$;

revoke all on function public.eh_equipe() from public;
grant execute on function public.eh_equipe() to authenticated;

create policy equipe_le_a_si on public.equipe
  for select to authenticated using (user_id = auth.uid());

create policy equipe_le_conversas on public.conversas
  for select to authenticated using (public.eh_equipe());
create policy equipe_pausa_conversas on public.conversas
  for update to authenticated using (public.eh_equipe()) with check (public.eh_equipe());

create policy equipe_le_mensagens on public.mensagens
  for select to authenticated using (public.eh_equipe());

create policy equipe_le_status on public.status_mensagens
  for select to authenticated using (public.eh_equipe());

-- O painel só pode mudar as colunas de pausa; o resto é das Edge Functions.
revoke all on public.equipe, public.conversas, public.mensagens, public.status_mensagens from anon, authenticated;
grant select on public.equipe, public.conversas, public.mensagens, public.status_mensagens, public.falhas_de_envio to authenticated;
grant update (bot_pausado, precisa_humano, motivo_humano) on public.conversas to authenticated;
revoke all on public.falhas_de_envio from anon;
