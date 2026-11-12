// Os 9 itens de conteúdo da página logada (DES-05), montados a partir do conteúdo que a página pública já
// usa (`conteudo/desenvolvimento/itens.ts`): o texto não é duplicado nem mudado. Aqui só ganham o que a
// página logada precisa a mais: a janela de idade em dias, o corpo em blocos e o interruptor de publicação.
import { CONSULTADO_EM, FONTES } from '../../conteudo/desenvolvimento/fontes.ts'
import { FASES, IDEIAS, MARCOS, QUANTO_TEMPO, TUMMY_TIME } from '../../conteudo/desenvolvimento/itens.ts'
import type { Artigo, Fonte } from '../../conteudo/desenvolvimento/tipos.ts'

export type BlocoDoCorpo =
  | { tipo: 'subtitulo'; texto: string }
  | { tipo: 'paragrafo'; texto: string }
  | { tipo: 'lista'; itens: readonly string[] }
  | { tipo: 'tabela'; colunas: readonly string[]; linhas: ReadonlyArray<readonly string[]> }

export interface ItemDeConteudo {
  id: string
  titulo: string
  tipo: 'artigo' | 'atividade'
  /** A janela de idade em dias, com limites inclusivos. */
  de: number
  ate: number
  /** Um dos itens 3 a 8 (as fases): só estes entram na conta da fase do bebê. */
  fase: boolean
  /** O resumo mostrado em "Para ler" (só os artigos). */
  resumo: string | null
  corpo: readonly BlocoDoCorpo[]
  fontes: readonly Fonte[]
  consultadoEm: string
  /** Publicar ou recolher um item é mudar só este campo (P17). */
  publicado: boolean
}

export const ID_TUMMY_TIME = 'desenv-tummy-time-fontes'
export const ID_TODAS_AS_FASES = 'desenv-ideias-todas-as-fases'
export const ID_MARCOS = 'desenv-marcos-sem-cobranca'

// As janelas das fases (DES-05): propostas no rascunho, o revisor confirma.
const JANELAS: Readonly<Record<string, readonly [number, number]>> = {
  'desenv-ideias-0-2m': [0, 75],
  'desenv-ideias-2-4m': [45, 135],
  'desenv-ideias-4-6m': [105, 195],
  'desenv-ideias-6-8m': [165, 255],
  'desenv-ideias-8-10m': [225, 315],
  'desenv-ideias-10-12m': [285, 395],
}

function partesDoArtigo(partes: Artigo['itens']): BlocoDoCorpo[] {
  return partes.flatMap((parte): BlocoDoCorpo[] => [
    { tipo: 'subtitulo', texto: parte.titulo },
    ...parte.textos.map((texto): BlocoDoCorpo => ({ tipo: 'paragrafo', texto })),
  ])
}

// O tummy time: o que é, segurança e quando começar, a tabela "quanto tempo" e, depois dela, "se o bebê
// reclamar". A frase que a página pública escreveu sobre meta fica de fora: o rascunho não a tem.
const ANTES_DA_TABELA = 3

const corpoDoTummyTime: BlocoDoCorpo[] = [
  ...partesDoArtigo(TUMMY_TIME.itens.slice(0, ANTES_DA_TABELA)),
  { tipo: 'subtitulo', texto: QUANTO_TEMPO.titulo },
  { tipo: 'tabela', colunas: QUANTO_TEMPO.colunas, linhas: QUANTO_TEMPO.linhas },
  ...partesDoArtigo(TUMMY_TIME.itens.slice(ANTES_DA_TABELA)),
]

export const ITENS_DE_CONTEUDO: readonly ItemDeConteudo[] = [
  {
    id: ID_TUMMY_TIME,
    titulo: TUMMY_TIME.titulo,
    tipo: 'artigo',
    de: 0,
    ate: 365,
    fase: false,
    resumo: TUMMY_TIME.resumo,
    corpo: corpoDoTummyTime,
    fontes: TUMMY_TIME.fontes,
    consultadoEm: TUMMY_TIME.consultadoEm,
    publicado: true,
  },
  {
    id: ID_TODAS_AS_FASES,
    titulo: IDEIAS.todasTitulo,
    tipo: 'atividade',
    de: 0,
    ate: 395,
    fase: false,
    resumo: null,
    corpo: [{ tipo: 'lista', itens: IDEIAS.todas }],
    fontes: [FONTES.guia, FONTES.spsp, FONTES.pathways],
    consultadoEm: CONSULTADO_EM,
    publicado: true,
  },
  ...FASES.map(
    (fase): ItemDeConteudo => ({
      id: fase.id,
      titulo: fase.titulo,
      tipo: 'atividade',
      de: JANELAS[fase.id][0],
      ate: JANELAS[fase.id][1],
      fase: true,
      resumo: null,
      corpo: [{ tipo: 'lista', itens: fase.itens }],
      fontes: fase.fontes,
      consultadoEm: fase.consultadoEm,
      publicado: true,
    }),
  ),
  {
    id: ID_MARCOS,
    titulo: MARCOS.titulo,
    tipo: 'artigo',
    de: 0,
    ate: 365,
    fase: false,
    resumo: MARCOS.resumo,
    corpo: partesDoArtigo(MARCOS.itens),
    fontes: MARCOS.fontes,
    consultadoEm: MARCOS.consultadoEm,
    publicado: true,
  },
]

export const IDS_DOS_ITENS: readonly string[] = ITENS_DE_CONTEUDO.map((item) => item.id)

/** O parágrafo de abertura de "Ideias para brincar nesta fase" (linha 75 do rascunho). */
export const ABERTURA_DAS_IDEIAS: string = IDEIAS.texto

export const rotaDoItem = (id: string) => `/app/desenvolvimento/conteudo/${id}`
