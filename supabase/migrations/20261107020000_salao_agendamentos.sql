-- Propostas e agendamentos feitos pelo bot no Minha Agenda.
-- Fluxo: proposto -> agendando -> agendado | falhou; proposto -> expirado | substituido.
create table public.salao_agendamentos (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.salao_conversas (id) on delete cascade,
  servico_origem_id bigint not null,
  servico_nome text not null,
  profissional_id bigint not null,
  profissional_nome text not null,
  data date not null,
  hora text not null,
  preco text,
  nome_cliente text not null,
  status text not null check (status in ('proposto', 'agendando', 'agendado', 'falhou', 'expirado', 'substituido')),
  detalhe text,
  expira_em timestamptz not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index salao_agendamentos_conversa_idx on public.salao_agendamentos (conversa_id, criado_em);

alter table public.salao_agendamentos enable row level security;
create policy salao_agendamentos_le on public.salao_agendamentos
  for select to authenticated using (public.salao_eh_equipe());
revoke all on public.salao_agendamentos from anon, authenticated;
grant select on public.salao_agendamentos to authenticated;
