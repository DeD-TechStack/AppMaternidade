import './secoes.css'

// O contrato das pecas de secoes/ (DS1:RF-12, spec 3 e 3.12): uma violacao LANCA um Error na renderizacao, em
// qualquer build (nao so em desenvolvimento). Os textos chegam por props; o pacote nao escreve frase de interface,
// por isso as mensagens abaixo falam do contrato, em ingles tecnico, e nunca aparecem na tela.

/** Os quatro chaos de uma faixa de ponta a ponta. O mel nao existe como chao. */
const FUNDOS = ['papel', 'cacau', 'areia', 'chao-noite'] as const
export type Fundo = (typeof FUNDOS)[number]

export type Tom = 'dia' | 'noite'

/** Um arquivo de imagem servido: o menor `src`, o `srcSet` em descritores `w`, o `sizes` e o tamanho do maior arquivo. */
export interface Imagem {
  src: string
  srcSet?: string
  sizes?: string
  largura: number
  altura: number
}

export function violacao(peca: string, motivo: string): never {
  throw new Error(`${peca}: ${motivo}`)
}

/** Uma string obrigatoria: nao vazia depois de `trim`. */
export function exigirTexto(peca: string, nome: string, valor: unknown): string {
  if (typeof valor !== 'string' || valor.trim() === '') violacao(peca, `${nome} must be a non-empty string`)
  return valor
}

/** Um numero finito dentro de [minimo, maximo]. */
export function exigirIntervalo(peca: string, nome: string, valor: unknown, minimo: number, maximo: number): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < minimo || valor > maximo) {
    violacao(peca, `${nome} must be a finite number from ${minimo} to ${maximo}`)
  }
  return valor
}

/** Um inteiro positivo (o tamanho intrinseco de uma imagem). */
function exigirInteiroPositivo(peca: string, nome: string, valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor <= 0) {
    violacao(peca, `${nome} must be a positive integer`)
  }
  return valor
}

/** Um destino interno: comeca com "/". */
export function exigirCaminho(peca: string, nome: string, valor: unknown): string {
  const caminho = exigirTexto(peca, nome, valor)
  if (!caminho.startsWith('/')) violacao(peca, `${nome} must start with "/"`)
  return caminho
}

export function exigirFundo(peca: string, nome: string, valor: unknown): Fundo {
  if (typeof valor !== 'string' || !(FUNDOS as readonly string[]).includes(valor)) {
    violacao(peca, `${nome} must be one of ${FUNDOS.join(', ')}`)
  }
  return valor as Fundo
}

export function exigirTom(peca: string, valor: unknown): Tom {
  if (valor !== 'dia' && valor !== 'noite') violacao(peca, 'tom must be "dia" or "noite"')
  return valor
}

/** O `src` e o tamanho de uma imagem; `srcSet` e `sizes`, quando vierem, nao podem ser vazios. */
export function exigirImagem(peca: string, nome: string, imagem: Imagem | undefined): Imagem {
  if (typeof imagem !== 'object' || imagem === null) violacao(peca, `${nome} is required`)
  exigirTexto(peca, `${nome}.src`, imagem.src)
  exigirInteiroPositivo(peca, `${nome}.largura`, imagem.largura)
  exigirInteiroPositivo(peca, `${nome}.altura`, imagem.altura)
  if (imagem.srcSet !== undefined) exigirTexto(peca, `${nome}.srcSet`, imagem.srcSet)
  if (imagem.sizes !== undefined) exigirTexto(peca, `${nome}.sizes`, imagem.sizes)
  return imagem
}
