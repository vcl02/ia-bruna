-- Espelho do Minha Agenda: serviços, horário e regras vêm de lá, uma vez por dia,
-- pela Edge Function salao-sincronizar. A tela passa a só ler os serviços.

alter table public.salao_servicos
  add column origem_id bigint unique,        -- id do serviço no Minha Agenda (chave do de-para)
  add column categoria text,
  add column a_partir_de boolean not null default false,
  add column sincronizado_em timestamptz;

-- Informações espelhadas do perfil (chave/valor): horario_funcionamento,
-- regras_agendamento, sincronizado_em, ultima_sincronizacao.
create table public.salao_info (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);
alter table public.salao_info enable row level security;
create policy salao_info_le on public.salao_info
  for select to authenticated using (public.salao_eh_equipe());
revoke all on public.salao_info from anon, authenticated;
grant select on public.salao_info to authenticated;

-- Serviços: a fonte é o Minha Agenda; a tela só lê.
drop policy salao_servicos_equipe on public.salao_servicos;
create policy salao_servicos_le on public.salao_servicos
  for select to authenticated using (public.salao_eh_equipe());
revoke insert, update, delete on public.salao_servicos from authenticated;

-- Sincronização diária às 06:07 de Brasília (09:07 UTC), se pg_cron e pg_net existirem.
-- A função não exige JWT; ela recusa rodar de novo em menos de 30 min.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.schedule(
      'salao-sincronizar',
      '7 9 * * *',
      $cmd$select net.http_post(
        url := 'https://yzmyncxoskvqzdczaill.supabase.co/functions/v1/salao-sincronizar',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := '{}'::jsonb
      )$cmd$
    );
  end if;
end;
$$;
