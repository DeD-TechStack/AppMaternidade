import { fixtureComunidadeDemonstracao } from './comunidade.demonstracao.ts'
import { criarEstadoComunidade, type EstadoComunidade } from './comunidade.memoria.ts'

// O elenco dos testes da Comunidade (o mesmo da MAT-47, COM-08, sobre a memória): nove pessoas, cada uma
// numa situação diferente, e o conteúdo que elas publicaram. Só dados fictícios. Só os testes importam
// este arquivo.

export type PessoaDoElenco =
  | 'autor'
  | 'outro'
  | 'bloqueado'
  | 'semAceite'
  | 'semPerfil'
  | 'nova'
  | 'moderador'
  | 'admin'
  | 'vencido'

interface Pessoa {
  conta: string
  perfil: string | null
  apelido: string | null
  email: string
}

const id = (numero: number) => `c0000000-0000-4000-8000-${String(numero).padStart(12, '0')}`

/** As contas pelo id (a fixture de conta do teste traz as mesmas) e o perfil de cada uma. */
export const ELENCO: Record<PessoaDoElenco, Pessoa> = {
  autor: { conta: id(1), perfil: id(101), apelido: 'autor_do_forum', email: 'autor@exemplo.invalid' },
  outro: { conta: id(2), perfil: id(102), apelido: 'outra_pessoa', email: 'outro@exemplo.invalid' },
  bloqueado: { conta: id(3), perfil: id(103), apelido: 'perfil_bloqueado', email: 'bloqueado@exemplo.invalid' },
  semAceite: { conta: id(4), perfil: id(104), apelido: 'sem_aceite_novo', email: 'semaceite@exemplo.invalid' },
  semPerfil: { conta: id(5), perfil: null, apelido: null, email: 'semperfil@exemplo.invalid' },
  nova: { conta: id(6), perfil: null, apelido: null, email: 'nova@exemplo.invalid' },
  moderador: { conta: id(7), perfil: id(107), apelido: 'moderador_do_dia', email: 'moderador@exemplo.invalid' },
  admin: { conta: id(8), perfil: null, apelido: null, email: 'admin@exemplo.invalid' },
  vencido: { conta: id(9), perfil: id(109), apelido: 'moderador_vencido', email: 'vencido@exemplo.invalid' },
}

/** O conteúdo do elenco, pelo id. */
export const CONTEUDO = {
  topicoDoAutor: id(201),
  topicoOculto: id(202),
  topicoRemovido: id(203),
  topicoDoModerador: id(204),
  topicoDoBloqueado: id(205),
  topicoDoOutro: id(206),
  respostaDoOutro: id(301),
  respostaDoBloqueado: id(302),
  respostaDoAutor: id(303),
  filhaDoOutro: id(304),
  respostaOculta: id(305),
} as const

const VERSAO_ANTIGA = '2026-10-01'

/** O estado do elenco, a partir do carregamento da página: a ordem das datas é a da lista. */
export function criarElenco(agora = Date.now()): EstadoComunidade {
  const base = criarEstadoComunidade(fixtureComunidadeDemonstracao)
  const sono = base.espacos.find((e) => e.slug === 'sono')!.id
  const alimentacao = base.espacos.find((e) => e.slug === 'alimentacao')!.id
  const banho = base.espacos.find((e) => e.slug === 'banho')!.id
  let linha = 0
  const data = () => new Date(agora - (200 - ++linha) * 60_000).toISOString()

  const pessoas = Object.values(ELENCO)
  const aceitam = [ELENCO.autor, ELENCO.outro, ELENCO.bloqueado, ELENCO.semPerfil, ELENCO.moderador, ELENCO.vencido]
  const comPerfil = pessoas.filter((p) => p.perfil !== null)

  const topico = (idDoTopico: string, autor: PessoaDoElenco, espacoId: string, titulo: string, extras: Partial<EstadoComunidade['topicos'][number]> = {}) => ({
    id: idDoTopico,
    espacoId,
    autorId: ELENCO[autor].perfil,
    titulo,
    corpo: `Texto de ${titulo}.`,
    faixa: null,
    estado: 'visivel' as const,
    motivoModeracao: null,
    criadoEm: data(),
    editadoEm: null,
    ...extras,
  })
  const resposta = (idDaResposta: string, topicoId: string, autor: PessoaDoElenco, corpo: string, extras: Partial<EstadoComunidade['respostas'][number]> = {}) => ({
    id: idDaResposta,
    topicoId,
    autorId: ELENCO[autor].perfil,
    respostaA: null,
    corpo,
    estado: 'visivel' as const,
    motivoModeracao: null,
    criadoEm: data(),
    editadoEm: null,
    ...extras,
  })

  return {
    versoes: [
      { versao: VERSAO_ANTIGA, vigente: false, publicadaEm: data() },
      { versao: '2026-11-05', vigente: true, publicadaEm: data() },
    ],
    contas: pessoas.map((p) => p.conta),
    aceites: [
      ...aceitam.map((p) => ({ contaId: p.conta, versao: '2026-11-05', aceitoEm: data() })),
      { contaId: ELENCO.semAceite.conta, versao: VERSAO_ANTIGA, aceitoEm: data() },
    ],
    perfis: comPerfil.map((p) => ({
      id: p.perfil!,
      contaId: p.conta,
      apelido: p.apelido!,
      bio: null,
      faixa: null,
      criadoEm: data(),
    })),
    espacos: base.espacos,
    topicos: [
      topico(CONTEUDO.topicoDoAutor, 'autor', sono, 'Tópico do autor'),
      topico(CONTEUDO.topicoOculto, 'autor', sono, 'Tópico oculto', { estado: 'oculto', motivoModeracao: 'Motivo do teste' }),
      topico(CONTEUDO.topicoRemovido, 'autor', sono, 'Tópico removido', { estado: 'removido', motivoModeracao: 'Motivo do teste' }),
      topico(CONTEUDO.topicoDoModerador, 'moderador', alimentacao, 'Tópico do moderador'),
      topico(CONTEUDO.topicoDoBloqueado, 'bloqueado', sono, 'Tópico do bloqueado'),
      topico(CONTEUDO.topicoDoOutro, 'outro', banho, 'Tópico do outro', { faixa: '3_6_meses' }),
    ],
    respostas: [
      resposta(CONTEUDO.respostaDoOutro, CONTEUDO.topicoDoAutor, 'outro', 'Resposta do outro'),
      resposta(CONTEUDO.respostaDoBloqueado, CONTEUDO.topicoDoAutor, 'bloqueado', 'Resposta do bloqueado'),
      resposta(CONTEUDO.respostaDoAutor, CONTEUDO.topicoDoAutor, 'autor', 'Resposta do autor'),
      resposta(CONTEUDO.filhaDoOutro, CONTEUDO.topicoDoAutor, 'outro', 'Filha da resposta do autor', {
        respostaA: CONTEUDO.respostaDoAutor,
      }),
      resposta(CONTEUDO.respostaOculta, CONTEUDO.topicoDoAutor, 'autor', 'Resposta oculta', {
        estado: 'oculto',
        motivoModeracao: 'Motivo da resposta',
      }),
    ],
    denuncias: [],
    bloqueios: [{ bloqueadorId: ELENCO.autor.perfil!, bloqueadoId: ELENCO.bloqueado.perfil!, criadoEm: data() }],
    papeis: [
      { contaId: ELENCO.moderador.conta, papel: 'moderador', concedidoPor: null, concedidoEm: data(), validoAte: null },
      { contaId: ELENCO.admin.conta, papel: 'admin', concedidoPor: null, concedidoEm: data(), validoAte: null },
      {
        contaId: ELENCO.vencido.conta,
        papel: 'moderador',
        concedidoPor: null,
        concedidoEm: data(),
        validoAte: new Date(agora - 3_600_000).toISOString(),
      },
    ],
    auditoria: [],
  }
}
