import type { AutorDoAviso } from '../dados/avisos.ts'
import { tituloDaAba } from './conta.ts'

// Todos os textos de interface dos avisos entre cuidadores (RF14, tabela 2.3 da spec). Nenhum texto concorda
// com o gênero de quem lê (RF14:RN-05). Os textos de erro são os de sempre (`ResumoErro`) e não moram aqui.

const ROTULO = 'Avisos'

/** O texto de acessibilidade do link do cabeçalho: o número é lido uma vez, e a pílula fica de fora. */
function nomeDoLink(quantos: number, maisDe50: boolean): string {
  if (maisDe50 || quantos > 50) return `${ROTULO}, mais de 50 avisos novos`
  if (quantos <= 0) return ROTULO
  if (quantos === 1) return `${ROTULO}, 1 aviso novo`
  return `${ROTULO}, ${quantos} avisos novos`
}

/** A contagem dentro do link: vazia sem aviso, de "1" a "50" e "50+" quando há mais que isso. */
function pilula(quantos: number, maisDe50: boolean): string {
  if (maisDe50 || quantos > 50) return '50+'
  if (quantos <= 0) return ''
  return String(quantos)
}

/** A primeira linha de cada aviso, pela regra de autor da rotina; " em destaque" vem logo depois de "uma nota". */
function linhaDoAutor(autor: AutorDoAviso, emDestaque: boolean): string {
  const destaque = emDestaque ? ' em destaque' : ''
  if (autor.tipo === 'nome') return `${autor.nome} escreveu uma nota${destaque}`
  if (autor.tipo === 'removido') return `Uma pessoa removida escreveu uma nota${destaque}`
  return `Alguém que saiu da família escreveu uma nota${destaque}`
}

/** A terceira linha de cada aviso: família, dia e hora (no fuso do aparelho, dois dígitos, sem ano). */
function linhaDoMomento(familia: string, dia: string, hora: string): string {
  return `${familia} · ${dia} às ${hora}`
}

export const AVISOS_TEXTOS = {
  // A área de conta.
  indiceDaConta: ROTULO,
  secaoTitulo: 'Avisos de outros cuidadores',
  secaoFrase:
    'Quando ligados, os avisos mostram aqui no site as notas que outras pessoas escrevem nas suas famílias. Nada chega por celular ou e-mail, e o site não manda lembretes.',
  rotuloDaCaixa: 'Mostrar avisos de outros cuidadores',
  lendoPreferencia: 'Lendo a sua preferência…',
  statusLigados: 'Avisos ligados.',
  statusDesligados: 'Avisos desligados.',
  // O cabeçalho.
  linkDoCabecalho: ROTULO,
  nomeDoLink,
  pilula,
  // A página de avisos.
  abaDaPagina: tituloDaAba(ROTULO),
  h1: ROTULO,
  lead: 'Notas que outras pessoas escreveram nas suas famílias nos últimos 7 dias.',
  linhaDoAutor,
  linhaDoMomento,
  avisoDeFuso: 'Os horários estão no fuso deste aparelho, que é diferente do fuso de uma das suas famílias.',
  maisDe50: 'Mostrando os 50 avisos mais recentes.',
  botao: 'Marcar todos como vistos',
  botaoSalvando: 'Marcando…',
  statusMarcados: 'Avisos marcados como vistos.',
  lendoAvisos: 'Lendo os avisos…',
  desligado: 'Os avisos estão desligados.',
  ligarNaConta: 'Ligar os avisos na Conta',
  vazio: 'Nenhum aviso novo.',
} as const

// Compatibilidade com ambientes conectados que ainda não oferecem todos os RPCs de Avisos.
export const AVISOS_COMPATIBILIDADE_TEXTOS = {
  indisponiveis: 'Os avisos não estão disponíveis neste ambiente.',
  preferenciaIndisponivel: 'Não é possível mudar a preferência de avisos neste ambiente.',
  marcacaoIndisponivel: 'Não é possível marcar os avisos como vistos neste ambiente.',
} as const
