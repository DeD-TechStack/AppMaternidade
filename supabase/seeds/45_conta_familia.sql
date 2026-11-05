-- MAT-45: conta, família e convites (dados fictícios)
-- Só para desenvolvimento local. Senha do usuário: senha-local-ficticia (só local; nunca
-- reutilize em outro ambiente). Os códigos de convite abaixo também valem só no banco local:
--   convite pendente (observador): código = '45a1' repetido 16 vezes (64 caracteres);
--   convite vencido (cuidador):    código = '45b2' repetido 16 vezes (64 caracteres).
-- O banco guarda só o hash (SHA-256 em hexadecimal minúsculo); o código em claro fica aqui.
-- Usa só as linhas do supabase/seed.sql (Ana, Bruno e Família Exemplo) e as próprias.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, phone_change, phone_change_token
)
values
  (
    '45444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'davi@exemplo.invalid',
    extensions.crypt('senha-local-ficticia', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', ''
  );

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values
  (
    '45aaaaa4-4444-4444-8444-444444444444', '45444444-4444-4444-8444-444444444444',
    '45444444-4444-4444-8444-444444444444',
    '{"sub": "45444444-4444-4444-8444-444444444444", "email": "davi@exemplo.invalid", "email_verified": true}',
    'email', now(), now(), now()
  );

-- Davi não tem família: aceita convite na mão.
insert into public.contas (id, nome_privado, fuso)
values ('45444444-4444-4444-8444-444444444444', 'Davi', 'America/Sao_Paulo');

-- Ana (responsável) concedeu o papel de Bruno.
update public.vinculos
   set concedido_por = '11111111-1111-4111-8111-111111111111'
 where id = 'b2222222-2222-4222-8222-222222222222';

insert into public.convites (
  id, familia_id, papel, criado_por, codigo_hash, expira_em, estado, criado_em
)
values
  (
    '45e11111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111',
    'observador', '11111111-1111-4111-8111-111111111111',
    encode(extensions.digest(repeat('45a1', 16), 'sha256'), 'hex'),
    now() + interval '7 days', 'pendente', now()
  ),
  (
    '45e22222-2222-4222-8222-222222222222', 'f1111111-1111-4111-8111-111111111111',
    'cuidador', '11111111-1111-4111-8111-111111111111',
    encode(extensions.digest(repeat('45b2', 16), 'sha256'), 'hex'),
    now() - interval '1 day', 'pendente', now() - interval '8 days'
  );
