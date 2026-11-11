import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { Droplets, Ellipsis, Milk, Moon } from 'lucide-react'
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
  /** O tipo da sessão em andamento: o botão dele fica em mel, como no cartão. */
  sessaoAtiva?: TipoSessao | null
}

// Cada botão tem 56 px de altura (DESIGN.md 4: BarraRegistrar ≥ 56): ícone sobre o rótulo no celular,
// ao lado dele de 1024 para cima. As cores vêm das variáveis do tema: areia e cacau de dia, o cartão da
// noite e o papel na madrugada. O hover inverte na hora.
const BOTAO =
  'alvo-toque flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-cartao px-1 text-[15px] leading-[20px] font-medium transition-[scale] duration-100 ease-out active:scale-[0.96] lg:flex-row lg:gap-2.5 lg:text-[17px] lg:leading-[25px]'
const NEUTRO =
  'bg-(--cor-papel-fundo) text-(--cor-texto) hover:bg-(--cor-texto) hover:text-(--cor-fundo) aria-expanded:bg-(--cor-texto) aria-expanded:text-(--cor-fundo)'
const ATIVO = 'bg-mel text-cacau hover:bg-(--cor-texto) hover:text-(--cor-fundo)'
const ICONE = 'size-6 shrink-0'

/**
 * A barra Registrar de 1 toque do Hoje (DESIGN.md 4; EMENDAS E1, VOLTA1 E5): 4 botões iguais, Sono,
 * Mamada, Fralda e Mais, com ícone, numa barra fixa embaixo. Sono e Mamada iniciam a sessão na hora, e
 * Fralda também: registra a fralda num toque e a confirmação traz Desfazer, Fechar e a escolha opcional
 * do tipo (Xixi, Cocô, Ambos), que só ajusta o texto. Mais abre a lista (Tummy time, Mamadeira,
 * Alimentação sólida, Observação); ao abrir, o foco vai à 1ª opção (E8). O cartão flutuante fica logo
 * acima da barra, mas vem depois da fileira no DOM (o Tab dos botões chega a ele); leva a confirmação,
 * cuja região `role="status"` é única e fica sempre no DOM. Esc fecha o que estiver aberto: o Mais (foco
 * no botão Mais) e, depois, a confirmação da fralda (foco no botão Fralda). Com a janela de menos de 40
 * rem de altura a barra volta ao fluxo.
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
  sessaoAtiva = null,
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
  const cor = (tipo: TipoSessao) => (sessaoAtiva === tipo ? ATIVO : NEUTRO)

  return (
    <section
      ref={barra}
      aria-label="Registro rápido"
      data-barra-registrar=""
      className={`registro-rapido border-t border-(--cor-fio-suave) bg-(--cor-fundo) px-0 pt-[3px] pb-1 text-(--cor-texto) ${
        fixa ? 'barra-fixa fixed inset-x-0 bottom-0 z-30' : 'relative'
      }`}
    >
      <div className="relative mx-auto w-[min(100%-24px,1312px)]" data-barra-miolo="">
        <div className="grid grid-cols-4 gap-2" data-fileira="">
          <button
            ref={refSono}
            type="button"
            aria-label="Iniciar sono de Heloísa"
            data-ativo={sessaoAtiva === 'sono' ? '' : undefined}
            className={`${BOTAO} ${cor('sono')}`}
            onClick={() => iniciar('sono')}
          >
            <Moon aria-hidden="true" className={ICONE} strokeWidth={1.75} />
            <span>Sono</span>
          </button>
          <button
            type="button"
            aria-label="Iniciar mamada de Heloísa"
            data-ativo={sessaoAtiva === 'mamada' ? '' : undefined}
            className={`${BOTAO} ${cor('mamada')}`}
            onClick={() => iniciar('mamada')}
          >
            <Milk aria-hidden="true" className={ICONE} strokeWidth={1.75} />
            <span>Mamada</span>
          </button>
          <button
            ref={botaoFralda}
            type="button"
            aria-label="Registrar fralda de Heloísa"
            className={`${BOTAO} ${NEUTRO}`}
            onClick={registrarFralda}
          >
            <Droplets aria-hidden="true" className={ICONE} strokeWidth={1.75} />
            <span>Fralda</span>
          </button>
          <button
            ref={botaoMais}
            type="button"
            aria-label="Mais registros"
            aria-expanded={maisAberto}
            aria-controls={maisAberto ? idMais : undefined}
            className={`${BOTAO} ${NEUTRO}`}
            onClick={alternarMais}
          >
            <Ellipsis aria-hidden="true" className={ICONE} strokeWidth={1.75} />
            <span>Mais</span>
          </button>
        </div>

        {/* O painel vem DEPOIS da fileira no DOM, para o Tab do gatilho (Fralda e Mais) chegar a ele e às
            suas opções, uma a uma, antes de sair da barra. Na tela, flutua logo acima dela. */}
        <div
          data-painel=""
          data-aberto={aberto ? '' : undefined}
          className={aberto ? 'absolute inset-x-0 bottom-full pb-3' : 'absolute inset-x-0 bottom-full'}
        >
          <div
            className={
              aberto
                ? 'mx-auto max-h-[calc(100dvh-160px)] w-[min(100%,40rem)] overflow-y-auto rounded-cartao border border-(--cor-fio-suave) bg-(--cor-cartao) p-4 [box-shadow:var(--sombra-flutuante)] lg:p-5'
                : undefined
            }
          >
            <Confirmacao texto={texto} aoDesfazer={aoDesfazer} aoFechar={aoFechar} escolhas={escolhas} />

            {maisAberto ? (
              <div
                ref={grupoMais}
                id={idMais}
                role="group"
                aria-label="Outros registros de Heloísa"
                className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${texto !== null ? 'mt-4 border-t border-(--cor-fio-suave) pt-4' : ''}`}
                data-largos=""
              >
                <Botao
                  variante="contorno"
                  tamanho="app"
                  aria-label="Iniciar tummy time de Heloísa"
                  onClick={() => iniciar('tummy')}
                >
                  Tummy time
                </Botao>
                {ITENS_MAIS.map((item) => (
                  <Botao key={item.chave} variante="contorno" tamanho="app" onClick={() => escolherMais(item)}>
                    {item.rotulo}
                  </Botao>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
