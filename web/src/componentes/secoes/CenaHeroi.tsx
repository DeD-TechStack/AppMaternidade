import type { CSSProperties, ReactNode } from 'react'
import { exigirImagem, exigirIntervalo, exigirTexto, violacao, type Imagem } from './contrato.ts'

type Parede = 'papel' | 'cacau'
type Chao = 'areia' | 'chao-noite' | 'nenhum'

interface Props {
  /** A placa de estudio (a maior imagem; `largura` e `altura` sao as do maior arquivo). */
  imagem: Imagem
  /** O recorte de 390: serve abaixo de 768 (`<source media="(max-width: 767px)">`). */
  recorte390: Imagem
  alt: string
  /** A largura da placa em 1440, de 836 a 1115 px. */
  larguraMax: number
  /** As paredes dos dois lados da costura da placa. */
  parede: { esquerda: Parede; direita: Parede }
  /** Os chaos dos dois lados da costura da placa. */
  chao: { esquerda: Chao; direita: Chao }
  /** A costura da placa, como fracao da largura dela (0 a 1). */
  costura: number
  /** A linha do chao, como fracao da altura da placa (0 a 1). */
  alturaChao: number
  /** A borda da janela a que a placa fica rente. */
  lado: 'direita' | 'esquerda'
  /** O id do titulo (o `h1` que o chamador poe nos filhos). */
  idTitulo: string
  /** Decorative layers inside the plate's box, above the picture (the lamp light of the Inicio). Rendered `aria-hidden`. */
  sobrePlaca?: ReactNode
  /** Elements that come after the plate in DOM order, as the last children of the section (the caption stuck to the plate). */
  depoisDaPlaca?: ReactNode
  children?: ReactNode
}

const PECA = 'CenaHeroi'
const PAREDES: readonly string[] = ['papel', 'cacau']
const CHAOS: readonly string[] = ['areia', 'chao-noite', 'nenhum']

function exigirEntre(nome: string, valor: unknown, validos: readonly string[]) {
  if (typeof valor !== 'string' || !validos.includes(valor)) violacao(PECA, `${nome} must be one of ${validos.join(', ')}`)
}

/**
 * CenaHeroi (DS1:RF-11): a placa de estudio rente a uma borda da janela, com o texto ao lado, e as paredes e os
 * chaos continuados em CSS (camadas solidas, nunca gradiente) ate as duas bordas. A placa e uma `<picture>`: o
 * recorte de 390 e o `<source>` abaixo de 768. E a imagem do topo da pagina: `fetchpriority="high"`, nunca
 * `loading="lazy"`.
 */
export function CenaHeroi({
  imagem,
  recorte390,
  alt,
  larguraMax,
  parede,
  chao,
  costura,
  alturaChao,
  lado,
  idTitulo,
  sobrePlaca,
  depoisDaPlaca,
  children,
}: Props) {
  exigirImagem(PECA, 'imagem', imagem)
  exigirImagem(PECA, 'recorte390', recorte390)
  exigirTexto(PECA, 'alt', alt)
  exigirIntervalo(PECA, 'larguraMax', larguraMax, 836, 1115)
  exigirIntervalo(PECA, 'costura', costura, 0, 1)
  exigirIntervalo(PECA, 'alturaChao', alturaChao, 0, 1)
  exigirTexto(PECA, 'idTitulo', idTitulo)
  exigirEntre('parede.esquerda', parede.esquerda, PAREDES)
  exigirEntre('parede.direita', parede.direita, PAREDES)
  exigirEntre('chao.esquerda', chao.esquerda, CHAOS)
  exigirEntre('chao.direita', chao.direita, CHAOS)
  exigirEntre('lado', lado, ['direita', 'esquerda'])

  const medidas = {
    '--cena-largura-max': larguraMax,
    '--cena-costura': costura,
    '--cena-altura-chao': alturaChao,
    '--cena-aspecto': `${imagem.largura} / ${imagem.altura}`,
    '--cena-aspecto-390': `${recorte390.largura} / ${recorte390.altura}`,
  } as CSSProperties

  return (
    <section
      data-cena-heroi=""
      data-largura-max={larguraMax}
      data-lado={lado}
      aria-labelledby={idTitulo}
      className="cm-cena-heroi"
      style={medidas}
    >
      <div className="cm-cena-texto">{children}</div>
      <div className="cm-cena-placa">
        <div className="cm-cena-camadas" aria-hidden="true">
          <span data-camada="parede-esquerda" data-fundo={parede.esquerda} />
          <span data-camada="parede-direita" data-fundo={parede.direita} />
          <span data-camada="chao-esquerda" data-fundo={chao.esquerda} />
          <span data-camada="chao-direita" data-fundo={chao.direita} />
        </div>
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet={recorte390.srcSet ?? recorte390.src}
            sizes={recorte390.sizes}
            width={recorte390.largura}
            height={recorte390.altura}
          />
          <img
            src={imagem.src}
            srcSet={imagem.srcSet}
            sizes={imagem.sizes}
            width={imagem.largura}
            height={imagem.altura}
            alt={alt}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        {sobrePlaca ? (
          <div data-sobre-placa="" aria-hidden="true">
            {sobrePlaca}
          </div>
        ) : null}
      </div>
      {depoisDaPlaca}
    </section>
  )
}
