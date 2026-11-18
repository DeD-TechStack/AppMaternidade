-- SEC-05 (SEC-REV SEC-08, ameaça T6): limites de tamanho e de vazio dos nomes no banco.
-- contas.nome_privado até 80 caracteres, familias.nome até 80, bebes.nome até 60; nenhum dos três
-- aceita vazio nem só espaços. O papel authenticated tem update direto nas três colunas (e insert em
-- contas e bebes), e criar_familia só recusava o vazio na criação; o check vale para todos os caminhos
-- e responde 23514. char_length conta caracteres, não bytes.
-- O check roda depois do WITH CHECK da RLS: quem não pode escrever a linha segue recebendo 42501.
--
-- Trava: add constraint ... not valid pega ACCESS EXCLUSIVE só pelo tempo de gravar o catálogo, sem
-- varrer a tabela; validate constraint pega SHARE UPDATE EXCLUSIVE (leituras e escritas seguem) e
-- varre a tabela uma vez. lock_timeout limita a espera pela trava. Se alguma linha existente
-- violar o limite, o validate falha e a migração inteira volta atrás, sem mudar dado nenhum.
-- Rollback:
--   alter table public.contas drop constraint contas_nome_tamanho;
--   alter table public.familias drop constraint familias_nome_tamanho;
--   alter table public.bebes drop constraint bebes_nome_tamanho;

set local lock_timeout = '5s';

alter table public.contas
  add constraint contas_nome_tamanho
  check (char_length(btrim(nome_privado)) >= 1 and char_length(nome_privado) <= 80) not valid;

alter table public.familias
  add constraint familias_nome_tamanho
  check (char_length(btrim(nome)) >= 1 and char_length(nome) <= 80) not valid;

alter table public.bebes
  add constraint bebes_nome_tamanho
  check (char_length(btrim(nome)) >= 1 and char_length(nome) <= 60) not valid;

alter table public.contas validate constraint contas_nome_tamanho;
alter table public.familias validate constraint familias_nome_tamanho;
alter table public.bebes validate constraint bebes_nome_tamanho;
