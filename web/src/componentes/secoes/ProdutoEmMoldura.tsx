import { useState } from 'react'
import { exigirImagem, exigirTexto, type Imagem } from './contrato.ts'

interface Props {
  /** A captura da tela, por baixo da moldura. `alt` descreve a tela. */
  tela: Imagem & { alt: string }
  /** A moldura do aparelho (arte decorativa, por cima da tela). */
  moldura: Imagem
  /**
   * A captura é mais alta que a tela do aparelho e pode rolar: as duas camadas ficam num botão de alternância
   * (`button[data-produto-rolar]`, `aria-pressed`), nomeado pelo `alt` da tela, e o `figure` leva `data-rolado`
   * enquanto ele está ligado. Quanto a tela rola é da página (CSS dela); sem a prop, nada muda.
   */
  rolavel?: boolean
}

const PECA = 'ProdutoEmMoldura'

/**
 * ProdutoEmMoldura (DS1:RF-03): a captura de uma tela de verdade sob a moldura de um aparelho. Duas camadas e nada
 * mais: a tela (`img[data-produto-tela]`), posicionada no vao da moldura (borda de 3 % da largura da tela de cada
 * lado, raio externo de 11 % da largura externa, raio da tela = externo menos a borda), e a moldura
 * (`img[data-produto-moldura-arte]`, `alt=""`, `aria-hidden`) por cima. Sem sombra, sem rotacao, sem aparelho
 * desenhado em CSS ou SVG, sem texto e sem aviso da tela.
 */
export function ProdutoEmMoldura({ tela, moldura, rolavel = false }: Props) {
  exigirImagem(PECA, 'tela', tela)
  exigirTexto(PECA, 'tela.alt', tela.alt)
  exigirImagem(PECA, 'moldura', moldura)
  const [rolado, setRolado] = useState(false)

  const camadas = (
    <>
      <img
        data-produto-tela=""
        src={tela.src}
        srcSet={tela.srcSet}
        sizes={tela.sizes}
        width={tela.largura}
        height={tela.altura}
        alt={tela.alt}
        loading="lazy"
        decoding="async"
      />
      <img
        data-produto-moldura-arte=""
        src={moldura.src}
        srcSet={moldura.srcSet}
        sizes={moldura.sizes}
        width={moldura.largura}
        height={moldura.altura}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
    </>
  )

  return (
    <figure data-produto-moldura="" data-rolado={rolavel && rolado ? '' : undefined} className="cm-produto-moldura">
      {rolavel ? (
        <button type="button" data-produto-rolar="" aria-pressed={rolado} onClick={() => setRolado((r) => !r)}>
          {camadas}
        </button>
      ) : (
        camadas
      )}
    </figure>
  )
}
