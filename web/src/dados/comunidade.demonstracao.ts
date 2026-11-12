import type { FixtureComunidade } from './comunidade.memoria.ts'

// A fixture do modo memória: os dados de `supabase/seeds/47_comunidade.sql` (mesmos apelidos, textos,
// estados e, onde o seed fixa, os mesmos ids) e as linhas iniciais das migrações (a versão `2026-11-05`
// vigente e os 7 espaços). Só dados fictícios. As contas aparecem só pelo id: elas são as autoras do
// conteúdo, e ninguém entra com elas no modo demonstração.
//
// Datas: toda coluna de data é o carregamento da página menos 1 hora por linha, na ordem do seed (a
// primeira linha é a mais antiga e a última fica 1 hora antes da carga). As datas não são comparadas
// com o banco: só a ordem conta.

const HORA = 3_600_000

const CONTAS = {
  juliana: '11111111-1111-4111-8111-111111111111',
  bruno: '22222222-2222-4222-8222-222222222222',
  carla: '33333333-3333-4333-8333-333333333333',
  davi: '45444444-4444-4444-8444-444444444444',
  diego: '47000000-0000-4000-8000-000000000001',
  elisa: '47000000-0000-4000-8000-000000000002',
} as const

const PERFIS = {
  juliana: '47000000-0000-4000-8000-000000000011',
  bruno: '47000000-0000-4000-8000-000000000012',
  carla: '47000000-0000-4000-8000-000000000013',
} as const

// Os ids dos espaços são do arquivo: a migração os gera com `gen_random_uuid()`. O seed aponta para
// o espaço pelo `slug`.
const ESPACOS = [
  { id: '47000000-0000-4000-8000-0000000000e1', slug: 'sono', nome: 'Sono', ordem: 1 },
  { id: '47000000-0000-4000-8000-0000000000e2', slug: 'alimentacao', nome: 'Alimentação', ordem: 2 },
  { id: '47000000-0000-4000-8000-0000000000e3', slug: 'banho', nome: 'Banho', ordem: 3 },
  { id: '47000000-0000-4000-8000-0000000000e4', slug: 'tummy-time', nome: 'Tummy time', ordem: 4 },
  { id: '47000000-0000-4000-8000-0000000000e5', slug: 'organizacao-da-rotina', nome: 'Organização da rotina', ordem: 5 },
  { id: '47000000-0000-4000-8000-0000000000e6', slug: 'divisao-dos-cuidados', nome: 'Divisão dos cuidados', ordem: 6 },
  { id: '47000000-0000-4000-8000-0000000000e7', slug: 'dificuldades-do-dia-a-dia', nome: 'Dificuldades do dia a dia', ordem: 7 },
] as const

const TOPICOS = {
  sonecas: '47000000-0000-4000-8000-000000000021',
  mamadeira: '47000000-0000-4000-8000-000000000022',
  resumo: '47000000-0000-4000-8000-000000000023',
} as const

const RESPOSTAS = {
  sonecas: '47000000-0000-4000-8000-000000000031',
  propaganda: '47000000-0000-4000-8000-000000000032',
} as const

const DENUNCIA = '47000000-0000-4000-8000-000000000041'

function criarFixture(carga: number): FixtureComunidade {
  // A data da k-ésima linha do seed (k a partir de 1): a carga menos (16 - k) horas.
  let linha = 0
  const data = () => {
    linha += 1
    return new Date(carga - (16 - linha) * HORA).toISOString()
  }
  const espaco = (slug: string) => ESPACOS.find((e) => e.slug === slug)!.id

  const versoes = [{ versao: '2026-11-05', vigente: true, publicadaEm: data() }]
  const papeis = [
    { contaId: CONTAS.diego, papel: 'moderador' as const, concedidoPor: null, concedidoEm: data(), validoAte: null },
    { contaId: CONTAS.elisa, papel: 'admin' as const, concedidoPor: null, concedidoEm: data(), validoAte: null },
  ]
  const aceites = [CONTAS.juliana, CONTAS.bruno, CONTAS.carla].map((contaId) => ({
    contaId,
    versao: '2026-11-05',
    aceitoEm: data(),
  }))
  const perfis = [
    { id: PERFIS.juliana, contaId: CONTAS.juliana, apelido: 'noites_em_claro', bio: null, faixa: null, criadoEm: data() },
    { id: PERFIS.bruno, contaId: CONTAS.bruno, apelido: 'turno_da_tarde', bio: null, faixa: null, criadoEm: data() },
    { id: PERFIS.carla, contaId: CONTAS.carla, apelido: 'cafe_e_colo', bio: null, faixa: null, criadoEm: data() },
  ]
  const topicos = [
    {
      id: TOPICOS.sonecas,
      espacoId: espaco('sono'),
      autorId: PERFIS.juliana,
      titulo: 'Sonecas curtas de manhã',
      corpo: 'As sonecas da manhã duram uns 30 minutos. Com vocês também foi assim nessa fase?',
      faixa: '3_6_meses' as const,
      estado: 'visivel' as const,
      motivoModeracao: null,
      criadoEm: data(),
      editadoEm: null,
    },
    {
      id: TOPICOS.mamadeira,
      espacoId: espaco('alimentacao'),
      autorId: PERFIS.carla,
      titulo: 'Mamadeira de madrugada',
      corpo: 'Alguém conseguiu espaçar a mamadeira da madrugada sem muito choro?',
      faixa: null,
      estado: 'visivel' as const,
      motivoModeracao: null,
      criadoEm: data(),
      editadoEm: null,
    },
    {
      id: TOPICOS.resumo,
      espacoId: espaco('organizacao-da-rotina'),
      autorId: PERFIS.juliana,
      titulo: 'Resumo da nossa semana',
      corpo: 'Resumo que eu mesma escrevi: 5 sonecas por dia em média, a mais longa de 1h20. Como está a rotina de vocês?',
      faixa: null,
      estado: 'visivel' as const,
      motivoModeracao: null,
      criadoEm: data(),
      editadoEm: null,
    },
  ]
  const respostas = [
    {
      id: RESPOSTAS.sonecas,
      topicoId: TOPICOS.sonecas,
      autorId: PERFIS.carla,
      respostaA: null,
      corpo: 'Aqui foi igual até uns 4 meses. Depois as sonecas foram ficando mais longas.',
      estado: 'visivel' as const,
      motivoModeracao: null,
      criadoEm: data(),
      editadoEm: null,
    },
    {
      id: RESPOSTAS.propaganda,
      topicoId: TOPICOS.mamadeira,
      autorId: PERFIS.bruno,
      respostaA: null,
      corpo: 'Compre o kit de mamadeiras pelo meu link com desconto.',
      estado: 'visivel' as const,
      motivoModeracao: null,
      criadoEm: data(),
      editadoEm: null,
    },
  ]
  // Carla denuncia a resposta de Bruno como propaganda.
  const denuncias = [
    {
      id: DENUNCIA,
      denuncianteId: CONTAS.carla,
      topicoId: null,
      respostaId: RESPOSTAS.propaganda,
      perfilId: null,
      motivo: 'spam_venda' as const,
      texto: 'Propaganda de produto.',
      estado: 'aberta' as const,
      decididaPor: null,
      decididaEm: null,
      criadaEm: data(),
    },
  ]

  return {
    versoes,
    contas: Object.values(CONTAS),
    aceites,
    perfis,
    espacos: ESPACOS.map((e) => ({ ...e })),
    topicos,
    respostas,
    denuncias,
    bloqueios: [],
    papeis,
    auditoria: [],
  }
}

export const fixtureComunidadeDemonstracao: FixtureComunidade = criarFixture(Date.now())
