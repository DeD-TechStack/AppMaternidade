-- MAT-47: comunidade e moderação (dados fictícios)
-- Carrega depois de ../seed.sql e usa só as contas de Ana, Bruno e Carla (MAT-43) e as linhas
-- iniciais das migrações desta tarefa (versão 2026-11-05 e os espaços). Todo id fixo começa com 47.
-- Senha de Diego e Elisa: senha-local-ficticia (só local; nunca reutilize em outro ambiente).

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, phone_change, phone_change_token
)
values
  (
    '47000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'diego.moderador@exemplo.invalid',
    extensions.crypt('senha-local-ficticia', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', ''
  ),
  (
    '47000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'elisa.admin@exemplo.invalid',
    extensions.crypt('senha-local-ficticia', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', ''
  );

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values
  (
    '47000000-0000-4000-8000-000000000051', '47000000-0000-4000-8000-000000000001',
    '47000000-0000-4000-8000-000000000001',
    '{"sub": "47000000-0000-4000-8000-000000000001", "email": "diego.moderador@exemplo.invalid", "email_verified": true}',
    'email', now(), now(), now()
  ),
  (
    '47000000-0000-4000-8000-000000000052', '47000000-0000-4000-8000-000000000002',
    '47000000-0000-4000-8000-000000000002',
    '{"sub": "47000000-0000-4000-8000-000000000002", "email": "elisa.admin@exemplo.invalid", "email_verified": true}',
    'email', now(), now(), now()
  );

insert into public.contas (id, nome_privado, fuso)
values
  ('47000000-0000-4000-8000-000000000001', 'Diego', 'America/Sao_Paulo'),
  ('47000000-0000-4000-8000-000000000002', 'Elisa', 'America/Sao_Paulo');

-- Papéis de plataforma: Diego moderador, Elisa admin, sem validade e sem quem concedeu.
insert into public.papeis_plataforma (conta_id, papel, concedido_por, valido_ate)
values
  ('47000000-0000-4000-8000-000000000001', 'moderador', null, null),
  ('47000000-0000-4000-8000-000000000002', 'admin', null, null);

-- Ana, Bruno e Carla aceitam a versão vigente. Diego e Elisa não aceitam.
insert into public.aceites_termos (conta_id, versao)
values
  ('11111111-1111-4111-8111-111111111111', '2026-11-05'),
  ('22222222-2222-4222-8222-222222222222', '2026-11-05'),
  ('33333333-3333-4333-8333-333333333333', '2026-11-05');

-- Perfis públicos: nenhum apelido contém o nome privado nem o nome do bebê. Diego e Elisa não têm perfil.
insert into public.perfis_publicos (id, conta_id, apelido)
values
  ('47000000-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'noites_em_claro'),
  ('47000000-0000-4000-8000-000000000012', '22222222-2222-4222-8222-222222222222', 'turno_da_tarde'),
  ('47000000-0000-4000-8000-000000000013', '33333333-3333-4333-8333-333333333333', 'cafe_e_colo');

insert into public.topicos (id, espaco_id, autor_id, titulo, corpo, faixa_etaria)
values
  (
    '47000000-0000-4000-8000-000000000021',
    (select e.id from public.espacos e where e.slug = 'sono'),
    '47000000-0000-4000-8000-000000000011',
    'Sonecas curtas de manhã',
    'As sonecas da manhã duram uns 30 minutos. Com vocês também foi assim nessa fase?',
    '3_6_meses'
  ),
  (
    '47000000-0000-4000-8000-000000000022',
    (select e.id from public.espacos e where e.slug = 'alimentacao'),
    '47000000-0000-4000-8000-000000000013',
    'Mamadeira de madrugada',
    'Alguém conseguiu espaçar a mamadeira da madrugada sem muito choro?',
    null
  ),
  -- Resumo da rotina (RF-12): texto escrito pela própria pessoa, sem ligação com tabela de cuidado.
  (
    '47000000-0000-4000-8000-000000000023',
    (select e.id from public.espacos e where e.slug = 'organizacao-da-rotina'),
    '47000000-0000-4000-8000-000000000011',
    'Resumo da nossa semana',
    'Resumo que eu mesma escrevi: 5 sonecas por dia em média, a mais longa de 1h20. Como está a rotina de vocês?',
    null
  );

insert into public.respostas (id, topico_id, autor_id, corpo)
values
  (
    '47000000-0000-4000-8000-000000000031',
    '47000000-0000-4000-8000-000000000021',
    '47000000-0000-4000-8000-000000000013',
    'Aqui foi igual até uns 4 meses. Depois as sonecas foram ficando mais longas.'
  ),
  (
    '47000000-0000-4000-8000-000000000032',
    '47000000-0000-4000-8000-000000000022',
    '47000000-0000-4000-8000-000000000012',
    'Compre o kit de mamadeiras pelo meu link com desconto.'
  );

-- Carla denuncia a resposta de Bruno como propaganda.
insert into public.denuncias (id, denunciante_id, resposta_id, motivo, texto, estado)
values
  (
    '47000000-0000-4000-8000-000000000041',
    '33333333-3333-4333-8333-333333333333',
    '47000000-0000-4000-8000-000000000032',
    'spam_venda',
    'Propaganda de produto.',
    'aberta'
  );
