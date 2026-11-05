import { useEffect, useId, useRef, useState, type Ref } from 'react'
import {
  ESCOLHAS_FRALDA,
  ITENS_MAIS,
  type EscolhaFralda,
  type ItemMais,
  type TipoSessao,
} from './estado.ts'

type Painel = 'fralda' | 'mais'

// O layout depende da largura DO COMPONENTE, em rem, e não da janela: ele aparece no Hoje, em
// coluna de 40 rem, e na miniatura do Início, num painel de 260 a 400 px. Por isso o div raiz é
// o contêiner (@container) e só há variantes de contêiner aqui, nunca sm:/md:/lg:. Faixas:
//  - abaixo de 17 rem: uma coluna, e o rótulo pode quebrar (fonte em 200%, painel estreito);
//  - de 17 a 36 rem: grade de 6 colunas. Sono, Mamada e Fralda ocupam 2 colunas cada; Tummy
//    time e + Mais ocupam 3 cada. Os rótulos não quebram, então as duas linhas têm a mesma altura;
//  - a partir de 36 rem: os 5 numa linha só, rótulos sem quebra.
const GRADE = 'grid grid-cols-6 gap-2 @min-[36rem]:grid-cols-5 @max-[17rem]:grid-cols-1'
const ACAO = 'botao acao-rapida whitespace-nowrap @max-[17rem]:whitespace-normal'
const PRIMEIRA_LINHA = `${ACAO} col-span-2 @min-[36rem]:col-span-1 @max-[17rem]:col-span-1`
const SEGUNDA_LINHA = `${ACAO} col-span-3 @min-[36rem]:col-span-1 @max-[17rem]:col-span-1`

interface Props {
  aoIniciarSessao: (tipo: TipoSessao) => void
  aoRegistrarFralda: (escolha: EscolhaFralda) => void
  aoRegistrarMais: (item: ItemMais) => void
  /** Versão do Início: botões sem ação e fora da ordem de Tab. */
  desativado?: boolean
  /** O Hoje leva o foco ao primeiro botão quando "Desfazer" e "Fechar" saem da tela. */
  refSono?: Ref<HTMLButtonElement>
}

// Os botões de registro da tela Hoje. Fralda abre uma escolha de um toque; "+ Mais" é um
// disclosure. Esc fecha o que estiver aberto e o foco volta ao botão que abriu.
export function BotoesRapidos({
  aoIniciarSessao,
  aoRegistrarFralda,
  aoRegistrarMais,
  desativado = false,
  refSono,
}: Props) {
  const [painel, setPainel] = useState<Painel | null>(null)
  const botaoFralda = useRef<HTMLButtonElement>(null)
  const botaoMais = useRef<HTMLButtonElement>(null)
  const painelFralda = useRef<HTMLDivElement>(null)
  const idFralda = useId()
  const idMais = useId()

  useEffect(() => {
    if (!painel) return
    if (painel === 'fralda') painelFralda.current?.querySelector('button')?.focus()

    const gatilho = painel === 'fralda' ? botaoFralda : botaoMais
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return
      setPainel(null)
      gatilho.current?.focus()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [painel])

  const propsComuns = { disabled: desativado, tabIndex: desativado ? -1 : undefined }

  function iniciar(tipo: TipoSessao) {
    setPainel(null)
    aoIniciarSessao(tipo)
  }

  function escolherFralda(escolha: EscolhaFralda) {
    setPainel(null)
    botaoFralda.current?.focus()
    aoRegistrarFralda(escolha)
  }

  function escolherMais(item: ItemMais) {
    setPainel(null)
    botaoMais.current?.focus()
    aoRegistrarMais(item)
  }

  return (
    <div className="@container">
      <div className={GRADE}>
        <button
          ref={refSono}
          type="button"
          aria-label="Iniciar sono de Lia"
          className={PRIMEIRA_LINHA}
          onClick={() => iniciar('sono')}
          {...propsComuns}
        >
          Sono
        </button>
        <button
          type="button"
          aria-label="Iniciar mamada de Lia"
          className={PRIMEIRA_LINHA}
          onClick={() => iniciar('mamada')}
          {...propsComuns}
        >
          Mamada
        </button>
        <button
          ref={botaoFralda}
          type="button"
          aria-label="Registrar fralda de Lia"
          aria-expanded={painel === 'fralda'}
          aria-controls={painel === 'fralda' ? idFralda : undefined}
          className={PRIMEIRA_LINHA}
          onClick={() => setPainel(painel === 'fralda' ? null : 'fralda')}
          {...propsComuns}
        >
          Fralda
        </button>
        <button
          type="button"
          aria-label="Iniciar tummy time de Lia"
          className={SEGUNDA_LINHA}
          onClick={() => iniciar('tummy')}
          {...propsComuns}
        >
          Tummy time
        </button>
        <button
          ref={botaoMais}
          type="button"
          aria-label="Mais registros"
          aria-expanded={painel === 'mais'}
          aria-controls={painel === 'mais' ? idMais : undefined}
          className={SEGUNDA_LINHA}
          onClick={() => setPainel(painel === 'mais' ? null : 'mais')}
          {...propsComuns}
        >
          {/* Um só elemento inline: texto solto ao lado do "+" viraria item flex anônimo e perderia o espaço. */}
          <span>
            <span aria-hidden="true">+</span> Mais
          </span>
        </button>
      </div>

      {painel === 'fralda' ? (
        <div
          ref={painelFralda}
          id={idFralda}
          role="group"
          aria-label="Fralda de Lia"
          className="mt-2 flex flex-wrap gap-2"
        >
          {ESCOLHAS_FRALDA.map((escolha) => (
            <button
              key={escolha}
              type="button"
              className="botao acao-rapida flex-1"
              onClick={() => escolherFralda(escolha)}
            >
              {escolha}
            </button>
          ))}
          <button
            type="button"
            className="botao botao-secundario flex-1"
            onClick={() => {
              setPainel(null)
              botaoFralda.current?.focus()
            }}
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {painel === 'mais' ? (
        <div id={idMais} role="group" aria-label="Outros registros de Lia" className="mt-2 flex flex-wrap gap-2">
          {ITENS_MAIS.map((item) => (
            <button
              key={item.chave}
              type="button"
              className="botao acao-rapida flex-1"
              onClick={() => escolherMais(item)}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
