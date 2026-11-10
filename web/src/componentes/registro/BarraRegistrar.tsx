import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { Confirmacao } from '../../prototipo/Confirmacao.tsx'
import {
  ESCOLHAS_FRALDA,
  ITENS_MAIS,
  TEXTO_FRALDA,
  ehConfirmacaoDeFralda,
  type EscolhaFralda,
  type ItemMais,
  type TipoSessao,
} from '../../prototipo/estado.ts'
import { useBarraFixa } from '../../prototipo/useBarraFixa.ts'
import { Botao } from '../base/Botao.tsx'

interface Props {
  aoIniciarSessao: (tipo: TipoSessao) => void
  /** O toque em Fralda registra na hora (E5): o registro não leva o tipo. */
  aoRegistrarFralda: () => void
  /** A escolha opcional do tipo, na confirmação, ajusta o registro já feito (não cria outro). */
  aoAjustarFralda: (escolha: EscolhaFralda) => void
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
 * A barra Registrar de 1 toque do Hoje (EMENDAS E1, VOLTA1 E5): 4 botões iguais, Sono, Mamada, Fralda e
 * Mais, numa barra fixa de 64 px. Sono e Mamada iniciam a sessão na hora, e Fralda também: registra a
 * fralda num toque e a confirmação traz Desfazer, Fechar e a escolha opcional do tipo (Xixi, Cocô,
 * Ambos), que só ajusta o texto. Mais abre a lista (Tummy time, Mamadeira, Alimentação sólida,
 * Observação); ao abrir, o foco vai à 1ª opção (E8). O painel flutua logo acima da barra, dentro do elemento
 * fixo, mas vem depois da fileira no DOM (o Tab dos botões chega a ele); leva a confirmação, cuja
 * região `role="status"` é única e fica sempre no DOM. Esc fecha o que estiver aberto: o Mais (foco no
 * botão Mais) e, depois, a confirmação da fralda (foco no botão Fralda). Com a janela de menos de
 * 40 rem de altura a barra volta ao fluxo.
 */
export function BarraRegistrar({
  aoIniciarSessao,
  aoRegistrarFralda,
  aoAjustarFralda,
  aoRegistrarMais,
  refSono,
  texto,
  aoDesfazer,
  aoFechar,
}: Props) {
  const { barra, fixa } = useBarraFixa()
  const [maisAberto, setMaisAberto] = useState(false)
  const botaoFralda = useRef<HTMLButtonElement>(null)
  const botaoMais = useRef<HTMLButtonElement>(null)
  const grupoMais = useRef<HTMLDivElement>(null)
  const idMais = useId()
  const fraldaNaTela = ehConfirmacaoDeFralda(texto)

  // Ao abrir (clique, Enter ou Espaço), o foco vai à 1ª opção: sem isso ele ficava no gatilho e o
  // painel passava despercebido para quem usa o teclado (E8).
  useEffect(() => {
    if (maisAberto) grupoMais.current?.querySelector('button')?.focus()
  }, [maisAberto])

  useEffect(() => {
    if (!maisAberto && !fraldaNaTela) return

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return
      if (maisAberto) {
        setMaisAberto(false)
        botaoMais.current?.focus()
        return
      }
      aoFechar()
      botaoFralda.current?.focus()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [maisAberto, fraldaNaTela, aoFechar])

  function iniciar(tipo: TipoSessao) {
    setMaisAberto(false)
    aoIniciarSessao(tipo)
  }

  // Um toque, um registro: o painel do Mais, se aberto, fecha. O foco fica no botão tocado.
  function registrarFralda() {
    setMaisAberto(false)
    aoRegistrarFralda()
  }

  // Fechar pelo próprio botão deixa o foco nele (o foco estava na 1ª opção, que sai com o painel).
  function alternarMais() {
    if (maisAberto) botaoMais.current?.focus()
    setMaisAberto(!maisAberto)
  }

  function escolherMais(item: ItemMais) {
    setMaisAberto(false)
    botaoMais.current?.focus()
    aoRegistrarMais(item)
  }

  // O tipo vigente é o do fim do texto ("Fralda registrada: Xixi"); sem tipo, nenhum fica marcado.
  const tipoEscolhido = fraldaNaTela && texto && texto !== TEXTO_FRALDA ? texto.slice(TEXTO_FRALDA.length + 2) : null
  const escolhas = fraldaNaTela
    ? {
        rotulo: 'Tipo da fralda',
        opcoes: ESCOLHAS_FRALDA,
        escolhida: tipoEscolhido,
        aoEscolher: (opcao: string) => {
          const tipo = ESCOLHAS_FRALDA.find((escolha) => escolha === opcao)
          if (tipo) aoAjustarFralda(tipo)
        },
      }
    : undefined

  const aberto = texto !== null || maisAberto

  return (
    <section
      ref={barra}
      aria-label="Registro rápido"
      data-barra-registrar=""
      className={fixa ? 'registro-rapido barra-registrar barra-fixa' : 'registro-rapido barra-registrar'}
    >
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
          className={BOTAO}
          onClick={registrarFralda}
        >
          <span>Fralda</span>
        </button>
        <button
          ref={botaoMais}
          type="button"
          aria-label="Mais registros"
          aria-expanded={maisAberto}
          aria-controls={maisAberto ? idMais : undefined}
          className={BOTAO}
          onClick={alternarMais}
        >
          <span>Mais</span>
        </button>
      </div>

      {/* O painel vem DEPOIS da fileira no DOM, para o Tab do gatilho (Fralda e Mais) chegar a ele e às
          suas opções, uma a uma, antes de sair da barra. Visualmente continua logo acima dela: `.ha-painel`
          é `position: absolute; bottom: 100%`, e a posição não depende da ordem do DOM. */}
      <div className="ha-painel" data-painel="" data-aberto={aberto ? '' : undefined}>
        <Confirmacao texto={texto} aoDesfazer={aoDesfazer} aoFechar={aoFechar} escolhas={escolhas} />

        {maisAberto ? (
          <div
            ref={grupoMais}
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
    </section>
  )
}
