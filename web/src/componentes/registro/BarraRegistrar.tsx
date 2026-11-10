import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { Confirmacao } from '../../prototipo/Confirmacao.tsx'
import {
  ESCOLHAS_FRALDA,
  ITENS_MAIS,
  type EscolhaFralda,
  type ItemMais,
  type TipoSessao,
} from '../../prototipo/estado.ts'
import { useBarraFixa } from '../../prototipo/useBarraFixa.ts'
import { Botao } from '../base/Botao.tsx'

type Painel = 'fralda' | 'mais'

interface Props {
  aoIniciarSessao: (tipo: TipoSessao) => void
  aoRegistrarFralda: (escolha: EscolhaFralda) => void
  aoRegistrarMais: (item: ItemMais) => void
  /** O Hoje leva o foco ao primeiro botão (Sono) quando "Desfazer" e "Fechar" saem da tela. */
  refSono?: Ref<HTMLButtonElement>
  /** A frase da confirmação; `null` deixa a região de status vazia (ela não sai do DOM). */
  texto: string | null
  aoDesfazer: () => void
  aoFechar: () => void
}

const BOTAO = 'ha-barra-botao t-botao alvo-toque'

/**
 * A barra Registrar de 1 toque do Hoje (EMENDAS E1): 4 botões iguais, Sono, Mamada, Fralda e Mais,
 * numa barra fixa de 64 px. Sono e Mamada iniciam a sessão na hora. Fralda abre a escolha (Xixi,
 * Cocô, Ambos) e Mais abre a lista (Tummy time, Mamadeira, Alimentação sólida, Observação), um
 * painel por vez. O painel flutua logo acima da barra, dentro do elemento fixo, e leva também a
 * confirmação, cuja região `role="status"` é única e fica sempre no DOM. Esc fecha o painel e devolve
 * o foco ao botão que o abriu. Com a janela de menos de 40 rem de altura a barra volta ao fluxo.
 */
export function BarraRegistrar({
  aoIniciarSessao,
  aoRegistrarFralda,
  aoRegistrarMais,
  refSono,
  texto,
  aoDesfazer,
  aoFechar,
}: Props) {
  const { barra, fixa } = useBarraFixa()
  const [painel, setPainel] = useState<Painel | null>(null)
  const botaoFralda = useRef<HTMLButtonElement>(null)
  const botaoMais = useRef<HTMLButtonElement>(null)
  const grupoFralda = useRef<HTMLDivElement>(null)
  const idFralda = useId()
  const idMais = useId()

  useEffect(() => {
    if (!painel) return
    if (painel === 'fralda') grupoFralda.current?.querySelector('button')?.focus()

    const gatilho = painel === 'fralda' ? botaoFralda : botaoMais
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return
      setPainel(null)
      gatilho.current?.focus()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [painel])

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

  function cancelarFralda() {
    setPainel(null)
    botaoFralda.current?.focus()
  }

  const aberto = texto !== null || painel !== null

  return (
    <section
      ref={barra}
      aria-label="Registro rápido"
      data-barra-registrar=""
      className={fixa ? 'registro-rapido barra-registrar barra-fixa' : 'registro-rapido barra-registrar'}
    >
      <div className="ha-painel" data-painel="" data-aberto={aberto ? '' : undefined}>
        <Confirmacao texto={texto} aoDesfazer={aoDesfazer} aoFechar={aoFechar} />

        {painel === 'fralda' ? (
          <div
            ref={grupoFralda}
            id={idFralda}
            role="group"
            aria-label="Fralda de Heloísa"
            className="ha-painel-grupo"
          >
            {ESCOLHAS_FRALDA.map((escolha) => (
              <Botao key={escolha} variante="moldura" className="alvo-toque" onClick={() => escolherFralda(escolha)}>
                {escolha}
              </Botao>
            ))}
            <Botao variante="moldura" className="alvo-toque" onClick={cancelarFralda}>
              Cancelar
            </Botao>
          </div>
        ) : null}

        {painel === 'mais' ? (
          <div
            id={idMais}
            role="group"
            aria-label="Outros registros de Heloísa"
            className="ha-painel-grupo"
            data-largos=""
          >
            <Botao
              variante="moldura"
              className="alvo-toque"
              aria-label="Iniciar tummy time de Heloísa"
              onClick={() => iniciar('tummy')}
            >
              Tummy time
            </Botao>
            {ITENS_MAIS.map((item) => (
              <Botao key={item.chave} variante="moldura" className="alvo-toque" onClick={() => escolherMais(item)}>
                {item.rotulo}
              </Botao>
            ))}
          </div>
        ) : null}
      </div>

      <div className="ha-barra-fileira" data-fileira="">
        <button
          ref={refSono}
          type="button"
          aria-label="Iniciar sono de Heloísa"
          className={BOTAO}
          onClick={() => iniciar('sono')}
        >
          <span>Sono</span>
        </button>
        <button type="button" aria-label="Iniciar mamada de Heloísa" className={BOTAO} onClick={() => iniciar('mamada')}>
          <span>Mamada</span>
        </button>
        <button
          ref={botaoFralda}
          type="button"
          aria-label="Registrar fralda de Heloísa"
          aria-expanded={painel === 'fralda'}
          aria-controls={painel === 'fralda' ? idFralda : undefined}
          className={BOTAO}
          onClick={() => setPainel(painel === 'fralda' ? null : 'fralda')}
        >
          <span>Fralda</span>
        </button>
        <button
          ref={botaoMais}
          type="button"
          aria-label="Mais registros"
          aria-expanded={painel === 'mais'}
          aria-controls={painel === 'mais' ? idMais : undefined}
          className={BOTAO}
          onClick={() => setPainel(painel === 'mais' ? null : 'mais')}
        >
          <span>Mais</span>
        </button>
      </div>
    </section>
  )
}
