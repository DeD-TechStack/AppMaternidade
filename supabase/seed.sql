-- Dados fictícios só para desenvolvimento local. Nada daqui vale fora do banco local.
-- Senha de todos os usuários: senha-local-ficticia (só local; nunca reutilize em outro ambiente).

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, phone_change, phone_change_token
)
values
  (
    '11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'ana@exemplo.invalid',
    extensions.crypt('senha-local-ficticia', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', ''
  ),
  (
    '22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'bruno@exemplo.invalid',
    extensions.crypt('senha-local-ficticia', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', ''
  ),
  (
    '33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'carla@exemplo.invalid',
    extensions.crypt('senha-local-ficticia', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', ''
  );

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values
  (
    'aaaaaaa1-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '{"sub": "11111111-1111-4111-8111-111111111111", "email": "ana@exemplo.invalid", "email_verified": true}',
    'email', now(), now(), now()
  ),
  (
    'aaaaaaa2-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    '{"sub": "22222222-2222-4222-8222-222222222222", "email": "bruno@exemplo.invalid", "email_verified": true}',
    'email', now(), now(), now()
  ),
  (
    'aaaaaaa3-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333',
    '33333333-3333-4333-8333-333333333333',
    '{"sub": "33333333-3333-4333-8333-333333333333", "email": "carla@exemplo.invalid", "email_verified": true}',
    'email', now(), now(), now()
  );

insert into public.contas (id, nome_privado, fuso)
values
  ('11111111-1111-4111-8111-111111111111', 'Ana', 'America/Sao_Paulo'),
  ('22222222-2222-4222-8222-222222222222', 'Bruno', 'America/Sao_Paulo'),
  ('33333333-3333-4333-8333-333333333333', 'Carla', 'America/Sao_Paulo');

insert into public.familias (id, nome, fuso, criada_por)
values
  ('f1111111-1111-4111-8111-111111111111', 'Família Exemplo', 'America/Sao_Paulo',
   '11111111-1111-4111-8111-111111111111'),
  ('f2222222-2222-4222-8222-222222222222', 'Família Teste', 'America/Sao_Paulo',
   '33333333-3333-4333-8333-333333333333');

insert into public.vinculos (id, familia_id, conta_id, papel, estado)
values
  ('b1111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111',
   '11111111-1111-4111-8111-111111111111', 'responsavel', 'ativo'),
  ('b2222222-2222-4222-8222-222222222222', 'f1111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222', 'cuidador', 'ativo'),
  ('b3333333-3333-4333-8333-333333333333', 'f2222222-2222-4222-8222-222222222222',
   '33333333-3333-4333-8333-333333333333', 'responsavel', 'ativo');

insert into public.bebes (id, familia_id, nome, nascimento, criado_por)
values
  ('c1111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111',
   'Lia', '2026-08-05', '11111111-1111-4111-8111-111111111111');
