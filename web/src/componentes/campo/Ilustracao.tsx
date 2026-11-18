import { srcSetWebp, urlPublica } from './urlPublica.ts'

/** Os seis desenhos de traço de `web/public/ilustracoes` (ver o PROVENANCE.md de lá). */
export const NOMES_ILUSTRACAO = [
  'avo-carrinho',
  'pai-colo',
  'tummy-time',
  'maos-celular',
  'baba-tapete',
  'mae-noite',
] as const

export type NomeIlustracao = (typeof NOMES_ILUSTRACAO)[number]

/** O que cada desenho mostra: o texto alternativo padrão. */
export const DESCRICAO_ILUSTRACAO: Record<NomeIlustracao, string> = {
  'avo-carrinho': 'Desenho de traço: uma avó empurra o carrinho do bebê.',
  'pai-colo': 'Desenho de traço: um pai segura o bebê no colo.',
  'tummy-time': 'Desenho de traço: o bebê de bruços no tapete, levantando a cabeça.',
  'maos-celular': 'Desenho de traço: duas mãos passam um celular de uma pessoa para outra.',
  'baba-tapete': 'Desenho de traço: a babá brinca com o bebê no tapete.',
  'mae-noite': 'Desenho de traço: de noite, a mãe nina o bebê no colo.',
}

/**
 * O tamanho de cada desenho em 1×, em px, medido nos WebPs de `web/public/ilustracoes`. Vai no
 * `width` e no `height` da `<img>`: a caixa fica reservada antes de o arquivo chegar.
 */
export const DIMENSAO_ILUSTRACAO: Record<NomeIlustracao, { largura: number; altura: number }> = {
  'avo-carrinho': { largura: 357, altura: 626 },
  'pai-colo': { largura: 199, altura: 623 },
  'tummy-time': { largura: 603, altura: 399 },
  'maos-celular': { largura: 627, altura: 339 },
  'baba-tapete': { largura: 560, altura: 547 },
  'mae-noite': { largura: 552, altura: 599 },
}

interface Props {
  nome: NomeIlustracao
  /** O texto alternativo; sem ele, vale a descrição padrão do desenho. */
  alt?: string
  /** Só enfeite, ao lado de um texto que já diz o mesmo: `alt` vazio. */
  decorativa?: boolean
  /** `lazy` (padrão) carrega ao chegar perto da janela; `eager`, na hora (vitrine e primeira dobra). */
  carregamento?: 'lazy' | 'eager'
  /** A imagem da primeira dobra: carrega na hora e com prioridade alta. Vale mais que `carregamento`. */
  prioritaria?: boolean
  className?: string
}

/**
 * Ilustração de traço preto (DESIGN.md 4 e 6), em WebP 1× e 2×, com largura e altura explícitas.
 * Vai sobre papel ou mel, nunca sobre o cacau. Carrega ao chegar perto da janela; `prioritaria`
 * antecipa a da primeira dobra.
 */
export function Ilustracao({ nome, alt, decorativa = false, carregamento = 'lazy', prioritaria = false, className }: Props) {
  const base = `/ilustracoes/${nome}`
  const { largura, altura } = DIMENSAO_ILUSTRACAO[nome]
  return (
    <img
      src={urlPublica(`${base}@1x.webp`)}
      srcSet={srcSetWebp(base)}
      width={largura}
      height={altura}
      alt={decorativa ? '' : (alt ?? DESCRICAO_ILUSTRACAO[nome])}
      loading={prioritaria ? 'eager' : carregamento}
      fetchPriority={prioritaria ? 'high' : undefined}
      decoding="async"
      className={['cm-ilustracao', className].filter(Boolean).join(' ')}
      data-ilustracao={nome}
    />
  )
}
