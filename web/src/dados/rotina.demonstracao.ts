import { BEBE_DEMONSTRACAO, FAMILIAS_DEMONSTRACAO, PESSOAS_DEMONSTRACAO } from './conta.demonstracao.ts'
import type { FixtureRotina } from './rotina.memoria.ts'
import type { DetalhesRegistro, Nota, Registro, TipoRegistro } from './rotina.tipos.ts'

// A fixture de demonstração da rotina (modo memória): a bebê Heloísa vive um dia fictício. Tudo nasce
// relativo ao instante da carga (`agora`), para as horas baterem entre si: a sessão de sono de Bruno
// começou há 72 minutos, a última mamada terminou há 2 h 10 min e a fralda é de há 50 minutos. Só dados
// fictícios, com as mesmas pessoas da fixture de conta (Juliana, Bruno).

const MINUTO = 60_000
const HORA = 60 * MINUTO

interface OpcoesDemonstracao {
  /** Quem escreveu a nota em destaque; o padrão é Bruno, que é membro da família de exemplo. */
  autorDaNota?: string
  /** O fuso que os registros guardam (o do aparelho que os gravou). */
  fuso?: string
}

const idDemonstracao = (numero: number) => `d0000000-0000-7000-8000-${String(numero).padStart(12, '0')}`

export function criarFixtureRotinaDemonstracao(agora: number, opcoes: OpcoesDemonstracao = {}): FixtureRotina {
  const { responsavel, bruno } = PESSOAS_DEMONSTRACAO
  const fuso = opcoes.fuso ?? 'America/Sao_Paulo'
  const quando = (deslocamentoMs: number) => new Date(agora + deslocamentoMs).toISOString()
  let numero = 0

  function registro(
    tipo: TipoRegistro,
    autor: string,
    inicioHa: number,
    fimHa: number | null,
    resto: { detalhes?: DetalhesRegistro; nota?: string | null } = {},
  ): Registro {
    numero += 1
    const inicio = quando(-inicioHa)
    const fim = fimHa === null ? null : quando(-fimHa)
    // O servidor recebeu o registro quando a pessoa o enviou: no fim da sessão, ou no instante do pontual.
    const recebidoEm = fim ?? inicio
    return {
      id: idDemonstracao(numero),
      familiaId: FAMILIAS_DEMONSTRACAO.exemplo,
      bebeId: BEBE_DEMONSTRACAO,
      tipo,
      inicio,
      fim,
      detalhes: resto.detalhes ?? {},
      nota: resto.nota ?? null,
      origem: 'ao_vivo',
      fuso,
      deslocamentoMin: 0,
      criadoPor: autor,
      encerradoPor: fim === null ? null : autor,
      versao: 1,
      recebidoEm,
      atualizadoEm: recebidoEm,
      excluidoEm: null,
      excluidoPor: null,
    }
  }

  const registros: Registro[] = [
    registro('sono', bruno.id, 72 * MINUTO, null),
    registro('fralda', bruno.id, 50 * MINUTO, null, { detalhes: { conteudo: 'xixi' } }),
    registro('mamada', responsavel.id, 148 * MINUTO, 130 * MINUTO, { detalhes: { lado: 'esquerdo' } }),
    registro('fralda', responsavel.id, 3 * HORA, null, { detalhes: { conteudo: 'coco' } }),
    registro('sono', bruno.id, 4 * HORA + 5 * MINUTO, 3 * HORA + 20 * MINUTO, { nota: 'no carrinho' }),
    registro('mamada', responsavel.id, 5 * HORA + 10 * MINUTO, 4 * HORA + 52 * MINUTO, { detalhes: { lado: 'direito' } }),
    registro('sono', responsavel.id, 6 * HORA + 30 * MINUTO, 5 * HORA + 40 * MINUTO, { nota: 'no berço' }),
    registro('fralda', bruno.id, 6 * HORA, null, { detalhes: { conteudo: 'ambos' } }),
    registro('mamadeira', bruno.id, 8 * HORA, null, { detalhes: { ml: 90, conteudo: 'leite_materno' } }),
    registro('sono', responsavel.id, 11 * HORA, 7 * HORA + 15 * MINUTO, { nota: 'sono da noite' }),
    registro('tummy', bruno.id, 16 * HORA + 40 * MINUTO, 16 * HORA + 30 * MINUTO, { nota: 'no tapete, com o espelho' }),
    registro('tummy', responsavel.id, 21 * HORA, 20 * HORA + 52 * MINUTO),
  ]

  const autorDaNota = opcoes.autorDaNota ?? bruno.id
  const notas: Nota[] = [
    {
      id: idDemonstracao(900),
      familiaId: FAMILIAS_DEMONSTRACAO.exemplo,
      bebeId: null,
      texto: 'Pomada só à noite.',
      destaqueAte: quando(20 * HORA + 40 * MINUTO),
      criadoPor: autorDaNota,
      criadaEm: quando(-(3 * HORA + 20 * MINUTO)),
      versao: 1,
      atualizadoEm: quando(-(3 * HORA + 20 * MINUTO)),
      excluidaEm: null,
      excluidaPor: null,
    },
  ]

  return { registros, notas }
}
