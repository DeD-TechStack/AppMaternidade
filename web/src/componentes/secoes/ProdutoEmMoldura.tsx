import { useId, useState } from 'react'
import { exigirImagem, exigirTexto, type Imagem } from './contrato.ts'

interface Props {
  /** A captura da tela, por baixo da moldura. `alt` descreve a tela. */
  tela: Imagem & { alt: string }
  /** A moldura do aparelho (arte decorativa, por cima da tela). */
  moldura: Imagem
  /**
   * A captura é mais alta que a tela do aparelho e pode rolar: as duas camadas e uma linha de texto da página ficam
   * num botão de alternância (`button[data-produto-rolar]`, `aria-pressed`) e o `figure` leva `data-rolado` enquanto
   * ele está ligado. A linha traz o rótulo visível `acao` (o nome do botão) e, ao lado, a pista estática do estado
   * (`inicial` com a tela em repouso, `detalhe` com ela apertada); o `alt` da tela fica como descrição. Os três
   * textos chegam por props (esta peça não lê conteúdo da página) e são obrigatórios como o `alt`: faltando um,
   * lança. Quanto a tela rola é da página (CSS dela); sem a prop, nada muda (duas imagens, nenhum controle, nenhum
   * texto).
   */
  rolavel?: TextosRolaveis
}

/** Os três textos da prévia rolável: o rótulo da ação e as duas pistas do estado. */
interface TextosRolaveis {
  acao: string
  inicial: string
  detalhe: string
}

const PECA = 'ProdutoEmMoldura'

/**
 * ProdutoEmMoldura (DS1:RF-03): a captura de uma tela de verdade sob a moldura de um aparelho. Duas camadas e nada
 * mais: a tela (`img[data-produto-tela]`), posicionada no vao da moldura (borda de 3 % da largura da tela de cada
 * lado, raio externo de 11 % da largura externa, raio da tela = externo menos a borda), e a moldura
 * (`img[data-produto-moldura-arte]`, `alt=""`, `aria-hidden`) por cima. Sem sombra, sem rotacao, sem aparelho
 * desenhado em CSS ou SVG, sem texto e sem aviso da tela. A unica excecao e o modo `rolavel`, cujo texto e DOM da
 * pagina, ao lado da moldura, nunca pintado na captura nem por cima dela.
 */
export function ProdutoEmMoldura({ tela, moldura, rolavel }: Props) {
  exigirImagem(PECA, 'tela', tela)
  exigirTexto(PECA, 'tela.alt', tela.alt)
  exigirImagem(PECA, 'moldura', moldura)
  if (rolavel) {
    exigirTexto(PECA, 'rolavel.acao', rolavel.acao)
    exigirTexto(PECA, 'rolavel.inicial', rolavel.inicial)
    exigirTexto(PECA, 'rolavel.detalhe', rolavel.detalhe)
  }
  const [rolado, setRolado] = useState(false)
  const id = useId()
  const idRotulo = `${id}-rotulo`
  const idTela = `${id}-tela`

  const camadas = (
    <>
      <img
        id={rolavel ? idTela : undefined}
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
        // Um botão só (uma parada de Tab): nome = o rótulo visível; o alt da tela é a descrição, dito uma vez. A pista
        // do estado é texto estático (`aria-hidden`: quem usa leitor de tela ouve o estado em `aria-pressed`).
        <button
          type="button"
          className="alvo-toque"
          data-produto-rolar=""
          aria-pressed={rolado}
          aria-labelledby={idRotulo}
          aria-describedby={idTela}
          onClick={() => setRolado((r) => !r)}
        >
          {/* As duas camadas num caixa próprio (posicionado pela página): a altura da tela segue a da moldura, nunca a
              da linha de texto que vem depois. */}
          <span data-produto-camadas="">{camadas}</span>
          <span data-produto-acao="">
            <span id={idRotulo} data-produto-rotulo="">
              {rolavel.acao}
            </span>
            <span data-produto-estado="" aria-hidden="true">
              {rolado ? rolavel.detalhe : rolavel.inicial}
            </span>
          </span>
        </button>
      ) : (
        camadas
      )}
    </figure>
  )
}
