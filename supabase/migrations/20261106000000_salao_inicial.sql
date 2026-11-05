-- Bot do salão. Tudo com prefixo salao_ para conviver temporariamente no
-- projeto do hub sem colidir com as tabelas dele e poder ser removido ou
-- copiado para um projeto próprio depois.
-- Princípios: só o necessário (LGPD), RLS ligado em tudo, acesso apenas
-- para quem está em salao_equipe. As Edge Functions usam a service role.

create extension if not exists pgcrypto;

-- Quem pode usar a tela de conversas.
create table public.salao_equipe (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);

-- Serviços e preços (editáveis pela tela). O bot só fala do que está ativo aqui.
create table public.salao_servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco text not null,          -- texto livre: "R$ 80", "a partir de R$ 120"
  duracao text,
  observacao text,
  ativo boolean not null default true,
  ordem int not null default 0,
  atualizado_em timestamptz not null default now()
);

-- Uma conversa por número (wa_id = número no formato da Meta).
create table public.salao_conversas (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  nome_perfil text,
  bot_pausado boolean not null default false,
  precisa_humano boolean not null default false,
  motivo_humano text,
  ultimo_inbound_em timestamptz,          -- base da janela de 24 h
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.salao_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.salao_conversas (id) on delete cascade,
  direcao text not null check (direcao in ('entrada', 'saida')),
  autor text not null check (autor in ('cliente', 'bot', 'humano')),
  wamid text unique,
  tipo text not null,
  texto text,                             -- só texto; mídia não é baixada
  status text,
  erro jsonb,
  criado_em timestamptz not null default now()
);
create index salao_mensagens_conversa_idx on public.salao_mensagens (conversa_id, criado_em);

-- Cada status recebido no webhook. Base do diagnóstico dos modelos.
create table public.salao_status (
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
create index salao_status_wamid_idx on public.salao_status (wamid);

create view public.salao_falhas_de_envio
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
from public.salao_status s
cross join lateral jsonb_array_elements(coalesce(s.erros, '[]'::jsonb)) e
left join public.salao_mensagens m on m.wamid = s.wamid
order by s.recebido_em desc;

create function public.salao_aplicar_status() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.salao_mensagens
     set status = new.status,
         erro = coalesce(new.erros, erro)
   where wamid = new.wamid;
  return new;
end;
$$;

create trigger salao_status_aplicar
after insert on public.salao_status
for each row execute function public.salao_aplicar_status();

-- Retenção (LGPD): conversas sem movimento há 12 meses são apagadas,
-- com as mensagens. Statuses com mais de 12 meses também.
create function public.salao_limpar_antigos() returns void
language sql
security definer
set search_path = public
as $$
  delete from public.salao_conversas where atualizado_em < now() - interval '12 months';
  delete from public.salao_status where recebido_em < now() - interval '12 months';
$$;
revoke all on function public.salao_limpar_antigos() from public, anon, authenticated;

-- RLS
alter table public.salao_equipe enable row level security;
alter table public.salao_servicos enable row level security;
alter table public.salao_conversas enable row level security;
alter table public.salao_mensagens enable row level security;
alter table public.salao_status enable row level security;

create function public.salao_eh_equipe() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.salao_equipe where user_id = (select auth.uid()));
$$;
revoke all on function public.salao_eh_equipe() from public, anon;
grant execute on function public.salao_eh_equipe() to authenticated;

create policy salao_equipe_le_a_si on public.salao_equipe
  for select to authenticated using (user_id = (select auth.uid()));

create policy salao_servicos_equipe on public.salao_servicos
  for all to authenticated using (public.salao_eh_equipe()) with check (public.salao_eh_equipe());

create policy salao_conversas_le on public.salao_conversas
  for select to authenticated using (public.salao_eh_equipe());
create policy salao_conversas_pausa on public.salao_conversas
  for update to authenticated using (public.salao_eh_equipe()) with check (public.salao_eh_equipe());

create policy salao_mensagens_le on public.salao_mensagens
  for select to authenticated using (public.salao_eh_equipe());

create policy salao_status_le on public.salao_status
  for select to authenticated using (public.salao_eh_equipe());

revoke all on public.salao_equipe, public.salao_servicos, public.salao_conversas,
  public.salao_mensagens, public.salao_status, public.salao_falhas_de_envio from anon, authenticated;
grant select on public.salao_equipe, public.salao_conversas, public.salao_mensagens,
  public.salao_status, public.salao_falhas_de_envio to authenticated;
grant select, insert, update, delete on public.salao_servicos to authenticated;
grant update (bot_pausado, precisa_humano, motivo_humano) on public.salao_conversas to authenticated;

-- Agenda a limpeza diária, se o pg_cron estiver ligado no projeto.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('salao-limpar-antigos', '17 6 * * *', 'select public.salao_limpar_antigos()');
  end if;
end;
$$;
