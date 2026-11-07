-- Sessão anônima usada pelo bot para CONSULTAR horários livres no Minha Agenda.
-- Só as Edge Functions (service role) acessam: RLS ligado e nenhuma política.
create table public.salao_sessao_minhaagenda (
  id smallint primary key default 1 check (id = 1),  -- uma linha só
  id_token text not null,
  refresh_token text not null,
  expira_em timestamptz not null,
  cadastrado boolean not null default false,
  atualizado_em timestamptz not null default now()
);
alter table public.salao_sessao_minhaagenda enable row level security;
revoke all on public.salao_sessao_minhaagenda from anon, authenticated;
