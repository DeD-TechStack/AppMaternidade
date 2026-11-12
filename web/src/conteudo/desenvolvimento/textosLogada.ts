// Os textos de interface da página logada Desenvolvimento (MAT-39a, seção 5 da spec: T-xx). O conteúdo de
// saúde dos itens fica em itens.ts e o aviso T-62 em pagina.ts (`AVISO_SAUDE`); aqui só o que a página
// logada acrescenta. Nenhum texto usa os nomes de teste antigos (Lia, Ana).
import { AVISO_SAUDE } from './pagina.ts'
import { CONSULTADO_EM } from './fontes.ts'
import { tituloDaAba } from '../conta.ts'

export const T = {
  /** T-01, o `h1`. */
  titulo: 'Desenvolvimento',
  /** T-02. */
  paraLer: 'Para ler',
  /** T-03. */
  ideias: 'Ideias para brincar nesta fase',
  /** T-04. */
  todasAsFases: 'Todas as fases',
  /** T-05. */
  semFase: 'As ideias deste site vão até os 12 meses.',
  /** T-23. */
  soVer: 'Seu papel nesta família permite só ver os registros.',
  /** T-34: a linha de metadados de cada item. */
  metadados: `Autoria: AppMaternidade · Revisão profissional: pendente · Versão 0.1 · Fontes consultadas em ${CONSULTADO_EM}`,
  /** T-35, antes e depois do link "Contato". */
  erroNoConteudo: ['Encontrou um erro neste conteúdo? Avise pelo ', '.'],
  contato: 'Contato',
  /** T-36. */
  fontes: 'Fontes',
  /** T-37. */
  nestaFase: 'nesta fase',
  /** T-38. */
  carregando: 'Carregando…',
  /** T-39. */
  semBebe: 'Nenhum bebê cadastrado nesta família.',
  /** T-48, o `h1` do conteúdo que não existe. */
  naoEncontrado: 'Não encontramos este conteúdo.',
  /** T-49. */
  voltar: 'Voltar para Desenvolvimento',
  /** T-50. */
  emRevisao: 'Este conteúdo está em revisão profissional e aparece aqui quando a revisão terminar.',
  /** T-51, o rótulo do seletor de bebê. */
  bebe: 'Bebê',
  /** T-56. */
  semFamilia: 'Você ainda não faz parte de uma família.',
  comecar: 'Começar',
  /** T-59. */
  falhaDeLeitura: 'Não deu para carregar os dados. Confira a conexão.',
  tentarDeNovo: 'Tentar de novo',
  /** T-61, o nome da região rolável da tabela do item 1. */
  tabela: 'Tabela: quanto tempo, segundo cada fonte',
  /** T-62, o aviso de saúde (decisão de Daniel; não muda). */
  avisoDeSaude: AVISO_SAUDE,
  /** T-66. */
  nascimentoDepoisDeHoje: 'A data de nascimento está depois de hoje. Confira em Família.',
  /** T-67. */
  fusoInvalido: 'Não deu para calcular as datas desta família. Confira o fuso em Família.',
  irParaFamilia: 'Ir para Família',
  /** Só da página logada: a ação principal da primeira dobra e a legenda de cada fonte. */
  verIdeias: 'Ver ideias para brincar',
  consultadaEm: `consultada em ${CONSULTADO_EM}`,
} as const

/** T-06: o dia segue o fuso da família; as horas, o do aparelho. */
export const avisoDeFuso = (aparelho: string, familia: string) =>
  `Horários no fuso deste aparelho (${aparelho}). O dia segue o fuso da família (${familia}).`

/** T-40. */
export const bebeArquivado = (nome: string) =>
  `${nome} está arquivado. Os registros continuam visíveis, mas não dá para registrar.`

/** A linha do bebê abaixo do `h1`: "<nome> · <idade>", ou só o nome quando não há idade. */
export const linhaDoBebe = (nome: string, idade: string | null) => (idade === null ? nome : `${nome} · ${idade}`)

/** A fase: "Fase: <título>" ou "Fases: <a> e <b>". Sem fase, vale T-05 (`T.semFase`). */
export function linhaDaFase(titulos: readonly string[]): string | null {
  if (titulos.length === 0) return null
  return titulos.length === 1 ? `Fase: ${titulos[0]}` : `Fases: ${titulos.join(' e ')}`
}

/** O título da aba de cada rota: "<título> | AppMaternidade". */
export const tituloDaAbaDesenvolvimento = (titulo: string) => tituloDaAba(titulo)

export const TITULO_NAO_ENCONTRADO_DA_ABA = tituloDaAba('Conteúdo não encontrado')
