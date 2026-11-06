-- Aviso de segurança do Supabase: a função do gatilho ficava exposta em
-- /rest/v1/rpc. Ela só deve rodar como gatilho.
revoke execute on function public.salao_aplicar_status() from public, anon, authenticated;
