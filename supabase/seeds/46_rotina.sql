-- MAT-46: rotina da Lia (dados fictícios)
-- Uma semana de registros da Lia (Família Exemplo): de D-7 a D-1, mais uma sessão de sono em
-- andamento hoje e duas notas. Tudo grava pelas funções da rotina, com a identidade de Ana
-- (responsável) ou de Bruno (cuidador) simulada em request.jwt.claims. Só usa a base da MAT-43.

-- Id fixo no formato v7 (invariante 8); o prefixo 46 marca os ids desta tarefa. Some no fim da sessão.
create function pg_temp.id46(n int) returns uuid
language sql immutable as $$
  select ('46' || lpad(to_hex(n), 6, '0') || '-0000-7000-8000-000000000000')::uuid;
$$;

create function pg_temp.como(conta uuid) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', conta, 'role', 'authenticated')::text, false);
$$;

do $$
declare
  c_familia constant uuid := 'f1111111-1111-4111-8111-111111111111';
  c_lia constant uuid := 'c1111111-1111-4111-8111-111111111111';
  c_ana constant uuid := '11111111-1111-4111-8111-111111111111';
  c_bruno constant uuid := '22222222-2222-4222-8222-222222222222';
  c_fuso constant text := 'America/Sao_Paulo';
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_n int := 0;
  v_id uuid;
  v_inicio timestamptz;
  v_fim timestamptz;
  k int;
  r record;
begin
  for k in reverse 7..1 loop
    for r in
      select p.*
      from (
        values
          (1, time '00:30', time '02:45', 'sono'::public.tipo_registro, '{}'::jsonb, null::text, c_bruno),
          (2, time '03:00', time '03:20', 'mamada', '{"lado": "esquerdo"}', null, c_bruno),
          (3, time '03:25', null, 'fralda', '{"conteudo": "xixi"}', null, c_bruno),
          (4, time '03:30', time '06:15', 'sono', '{}', null, c_bruno),
          (5, time '06:30', time '06:50', 'mamada', '{"lado": "direito"}', null, c_ana),
          (6, time '07:00', null, 'fralda', '{"conteudo": "coco"}', null, c_ana),
          (7, time '09:00', time '10:30', 'sono', '{}', null, c_ana),
          (8, time '11:00', null, 'mamadeira', '{"ml": 90, "conteudo": "leite_materno"}', null, c_ana),
          (9, time '11:15', null, 'fralda', '{"conteudo": "ambos"}', null, c_ana),
          (10, time '13:00', time '14:40', 'sono', '{}', null, c_ana),
          (11, time '15:00', time '15:08', 'tummy', '{}', null, c_ana),
          (12, time '16:00', time '16:20', 'mamada', '{"lado": "ambos"}', null, c_ana),
          (13, time '17:30', null, 'fralda', '{"conteudo": "xixi"}', null, c_bruno),
          (14, time '18:00', time '18:40', 'sono', '{}', null, c_bruno),
          (15, time '19:30', null, 'mamadeira', '{"ml": 120, "conteudo": "formula"}', null, c_bruno),
          (16, time '20:30', time '23:50', 'sono', '{}', null, c_bruno),
          -- Exceção 1 (D-4): observação de Ana.
          (17, time '14:50', null, 'observacao', '{}', 'Arrotou pouco depois da mamada.', c_ana),
          -- Exceção 3 (D-2): fralda de Bruno, excluída por Ana.
          (18, time '12:00', null, 'fralda', '{"conteudo": "xixi"}', null, c_bruno)
      ) as p(ord, ini, fim, tipo, detalhes, nota, autor)
      where p.ord <= 16 or (p.ord = 17 and k = 4) or (p.ord = 18 and k = 2)
      order by p.ini
    loop
      v_n := v_n + 1;
      v_id := pg_temp.id46(v_n);
      v_inicio := ((v_hoje - k) + r.ini) at time zone c_fuso;
      v_fim := ((v_hoje - k) + r.fim) at time zone c_fuso;

      -- Exceção 2 (D-3): o sono das 20:30 termina às 00:20 de D-2.
      if k = 3 and r.ord = 16 then
        v_fim := ((v_hoje - k + 1) + time '00:20') at time zone c_fuso;
      end if;

      perform pg_temp.como(r.autor);

      if k = 1 and r.ord = 10 then
        -- Exceção 4 (D-1): o sono nasce em andamento, ao vivo, e Bruno o encerra às 14:40.
        perform public.gravar_registro(v_id, c_lia, r.tipo, v_inicio, c_fuso, -180, null, r.detalhes, r.nota, 'ao_vivo');
        perform pg_temp.como(c_bruno);
        perform public.encerrar_sessao(v_id, v_fim);
      else
        perform public.gravar_registro(v_id, c_lia, r.tipo, v_inicio, c_fuso, -180, v_fim, r.detalhes, r.nota, 'retroativo');
      end if;

      if k = 1 and r.ord = 8 then
        -- Exceção 5 (D-1): Ana corrige a mamadeira de 90 para 100 ml.
        perform pg_temp.como(c_ana);
        perform public.editar_registro(
          v_id, v_inicio, null, '{"ml": 100, "conteudo": "leite_materno"}', null, c_fuso, -180
        );
      end if;

      if k = 2 and r.ord = 18 then
        perform pg_temp.como(c_ana);
        perform public.excluir_registro(v_id);
      end if;
    end loop;
  end loop;

  -- Exceção 6 (hoje): sessão de sono em andamento de Bruno, ao vivo.
  perform pg_temp.como(c_bruno);
  perform public.gravar_registro(
    pg_temp.id46(115), c_lia, 'sono', now() - interval '72 minutes', c_fuso, -180,
    null, '{}', null, 'ao_vivo'
  );

  -- Notas "Para você saber".
  perform pg_temp.como(c_ana);
  perform public.gravar_nota(
    pg_temp.id46(201), c_familia, 'Pomada só à noite.', c_lia, now() + interval '1 day'
  );
  perform pg_temp.como(c_bruno);
  perform public.gravar_nota(pg_temp.id46(202), c_familia, 'Fraldas P no armário de cima.');
end;
$$;

select set_config('request.jwt.claims', '', false);
