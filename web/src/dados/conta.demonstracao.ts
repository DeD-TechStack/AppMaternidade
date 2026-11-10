import type { FixtureConta } from './conta.memoria.ts'

// A fixture do modo memória: os mesmos ids do seed local (`supabase/seed.sql` e
// `supabase/seeds/45_conta_familia.sql`), com os nomes de exemplo de Daniel (a mãe Juliana e a
// bebê Heloísa). O seed do banco local continua com Ana e Lia e não aparece no site. Só dados
// fictícios.

/** A senha de todos, a mesma do seed (fictícia e pública no repositório). */
export const SENHA_DEMONSTRACAO = 'senha-local-ficticia'

/** Os códigos de convite do seed: `45a1` e `45b2` repetidos 16 vezes (64 caracteres). */
export const CODIGO_CONVITE_PENDENTE = '45a1'.repeat(16)
export const CODIGO_CONVITE_VENCIDO = '45b2'.repeat(16)

export const PESSOAS_DEMONSTRACAO = {
  responsavel: { id: '11111111-1111-4111-8111-111111111111', email: 'juliana@exemplo.invalid', nome: 'Juliana' },
  bruno: { id: '22222222-2222-4222-8222-222222222222', email: 'bruno@exemplo.invalid', nome: 'Bruno' },
  carla: { id: '33333333-3333-4333-8333-333333333333', email: 'carla@exemplo.invalid', nome: 'Carla' },
  davi: { id: '45444444-4444-4444-8444-444444444444', email: 'davi@exemplo.invalid', nome: 'Davi' },
} as const

export const FAMILIAS_DEMONSTRACAO = {
  exemplo: 'f1111111-1111-4111-8111-111111111111',
  teste: 'f2222222-2222-4222-8222-222222222222',
} as const

export const BEBE_DEMONSTRACAO = 'c1111111-1111-4111-8111-111111111111'

const DIA = 86_400_000

/** `agora` é o instante da carga da página: o convite pendente vence 7 dias depois dele. */
export function criarFixtureDemonstracao(agora: number): FixtureConta {
  const quando = (dias: number) => new Date(agora + dias * DIA).toISOString()
  const { responsavel, bruno, carla, davi } = PESSOAS_DEMONSTRACAO
  const fuso = 'America/Sao_Paulo'

  return {
    usuarios: [responsavel, bruno, carla, davi].map((pessoa) => ({
      id: pessoa.id,
      email: pessoa.email,
      senha: SENHA_DEMONSTRACAO,
      nomeMetadados: null,
    })),
    contas: [
      { id: responsavel.id, nome: responsavel.nome, fuso, criadaEm: quando(-30) },
      { id: bruno.id, nome: bruno.nome, fuso, criadaEm: quando(-30) },
      { id: carla.id, nome: carla.nome, fuso, criadaEm: quando(-30) },
      { id: davi.id, nome: davi.nome, fuso, criadaEm: quando(-30) },
    ],
    familias: [
      { id: FAMILIAS_DEMONSTRACAO.exemplo, nome: 'Família Exemplo', fuso, criadaEm: quando(-30), criadaPor: responsavel.id },
      { id: FAMILIAS_DEMONSTRACAO.teste, nome: 'Família Teste', fuso, criadaEm: quando(-20), criadaPor: carla.id },
    ],
    vinculos: [
      {
        id: 'b1111111-1111-4111-8111-111111111111',
        familiaId: FAMILIAS_DEMONSTRACAO.exemplo,
        contaId: responsavel.id,
        papel: 'responsavel',
        estado: 'ativo',
        validoAte: null,
        criadoEm: quando(-30),
        concedidoPor: null,
      },
      {
        id: 'b2222222-2222-4222-8222-222222222222',
        familiaId: FAMILIAS_DEMONSTRACAO.exemplo,
        contaId: bruno.id,
        papel: 'cuidador',
        estado: 'ativo',
        validoAte: null,
        criadoEm: quando(-29),
        concedidoPor: responsavel.id,
      },
      {
        id: 'b3333333-3333-4333-8333-333333333333',
        familiaId: FAMILIAS_DEMONSTRACAO.teste,
        contaId: carla.id,
        papel: 'responsavel',
        estado: 'ativo',
        validoAte: null,
        criadoEm: quando(-20),
        concedidoPor: null,
      },
    ],
    bebes: [
      {
        id: BEBE_DEMONSTRACAO,
        familiaId: FAMILIAS_DEMONSTRACAO.exemplo,
        nome: 'Heloísa',
        nascimento: '2026-08-05',
        estado: 'ativo',
        criadoEm: quando(-29),
        criadoPor: responsavel.id,
      },
    ],
    convites: [
      {
        id: '45e11111-1111-4111-8111-111111111111',
        familiaId: FAMILIAS_DEMONSTRACAO.exemplo,
        papel: 'observador',
        validoAte: null,
        criadoPor: responsavel.id,
        codigo: CODIGO_CONVITE_PENDENTE,
        expiraEm: quando(7),
        estado: 'pendente',
        criadoEm: quando(0),
      },
      {
        id: '45e22222-2222-4222-8222-222222222222',
        familiaId: FAMILIAS_DEMONSTRACAO.exemplo,
        papel: 'cuidador',
        validoAte: null,
        criadoPor: responsavel.id,
        codigo: CODIGO_CONVITE_VENCIDO,
        expiraEm: quando(-1),
        estado: 'pendente',
        criadoEm: quando(-8),
      },
    ],
  }
}
