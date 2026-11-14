import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { Droplets, Ellipsis, Milk, Moon } from 'lucide-react'
import { REGISTRO_RAPIDO } from '../../conteudo/rotina.ts'
import type { TipoRegistro } from '../../dados/rotina.tipos.ts'
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
import { ALVO_APP } from '../app/alvo.ts'

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
  'alvo-toque flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-cartao px-1 text-pequeno font-medium transition-[scale] duration-100 ease-out active:scale-[0.96] lg:flex-row lg:gap-2.5 lg:text-corpo'
const NEUTRO =
  'bg-(--cor-papel-fundo) text-(--cor-texto) hover:bg-(--cor-texto) hover:text-(--cor-fundo) aria-expanded:bg-(--cor-texto) aria-expanded:text-(--cor-fundo)'
const ATIVO = 'bg-mel text-cacau hover:bg-(--cor-texto) hover:text-(--cor-fundo)'
const ICONE = 'size-6 shrink-0'

/** O registro que a barra acabou de criar e o botão dela que o criou: para onde o foco volta no "Desfazer". */
interface RegistroDaBarra {
  tipo: TipoRegistro
  origem: 'fralda' | 'mais'
}

const TIPOS_DO_MAIS: readonly TipoRegistro[] = ['mamadeira', 'solido', 'observacao']

const registroDoMais = (item: ItemMais): RegistroDaBarra | null => {
  const tipo = TIPOS_DO_MAIS.find((candidato) => candidato === item.chave)
  return tipo ? { tipo, origem: 'mais' } : null
}

/** Sem toque nesta barra (a confirmação já estava na tela), a frase da confirmação diz o que foi registrado. */
function registroDaFrase(texto: string | null): RegistroDaBarra | null {
  if (ehConfirmacaoDeFralda(texto)) return { tipo: 'fralda', origem: 'fralda' }
  const item = ITENS_MAIS.find((candidato) => texto === `${candidato.rotulo} registrada`)
  return item ? registroDoMais(item) : null
}

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
 *
 * "Desfazer" (A11Y-004): a barra chama `aoDesfazer`, troca a confirmação por `Registro desfeito: <tipo>.` (só
 * "Fechar", que não some sozinho) e leva o foco ao botão que criou o registro, nunca ao primeiro da barra.
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
  const ultimo = useRef<RegistroDaBarra | null>(null)
  // O aviso de "Desfazer" vale enquanto a página não põe outra confirmação no lugar (outro texto).
  const [desfeito, setDesfeito] = useState<(RegistroDaBarra & { texto: string | null }) | null>(null)
  const mostrandoDesfeito = desfeito !== null && (texto === null || texto === desfeito.texto)
  const textoNaTela = mostrandoDesfeito ? REGISTRO_RAPIDO.desfeito(desfeito.tipo) : texto
  const fraldaNaTela = ehConfirmacaoDeFralda(textoNaTela)

  // Ao abrir (clique, Enter ou Espaço), o foco vai à 1ª opção: sem isso ele ficava no gatilho e o
  // painel passava despercebido para quem usa o teclado (E8).
  useEffect(() => {
    if (maisAberto) grupoMais.current?.querySelector('button')?.focus()
  }, [maisAberto])

  // "Fechar" e Esc fecham a confirmação e o aviso de "Desfazer".
  function fechar() {
    setDesfeito(null)
    aoFechar()
  }

  useEffect(() => {
    if (!maisAberto && !fraldaNaTela && !mostrandoDesfeito) return

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return
      if (maisAberto) {
        setMaisAberto(false)
        botaoMais.current?.focus()
        return
      }
      const gatilho = mostrandoDesfeito && desfeito.origem === 'mais' ? botaoMais : botaoFralda
      setDesfeito(null)
      aoFechar()
      gatilho.current?.focus()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [maisAberto, fraldaNaTela, mostrandoDesfeito, desfeito, aoFechar])

  function iniciar(tipo: TipoSessao) {
    setMaisAberto(false)
    setDesfeito(null)
    ultimo.current = null
    aoIniciarSessao(tipo)
  }

  // Um toque, um registro: o painel do Mais, se aberto, fecha. O foco fica no botão tocado.
  function registrarFralda() {
    setMaisAberto(false)
    setDesfeito(null)
    ultimo.current = { tipo: 'fralda', origem: 'fralda' }
    aoRegistrarFralda()
  }

  // Fechar pelo próprio botão deixa o foco nele (o foco estava na 1ª opção, que sai com o painel).
  function alternarMais() {
    if (maisAberto) botaoMais.current?.focus()
    setMaisAberto(!maisAberto)
  }

  function escolherMais(item: ItemMais) {
    setMaisAberto(false)
    setDesfeito(null)
    ultimo.current = registroDoMais(item)
    botaoMais.current?.focus()
    aoRegistrarMais(item)
  }

  // "Desfazer": o aviso entra no lugar da confirmação e o foco volta ao botão que criou o registro. Sem
  // origem conhecida (a página não registrou por esta barra e a frase não diz o tipo), o foco vai ao Fralda.
  function desfazer() {
    const registro = ultimo.current ?? registroDaFrase(texto)
    aoDesfazer()
    if (registro) setDesfeito({ ...registro, texto })
    const gatilho = registro?.origem === 'mais' ? botaoMais : botaoFralda
    gatilho.current?.focus()
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

  const aberto = textoNaTela !== null || maisAberto
  const cor = (tipo: TipoSessao) => (sessaoAtiva === tipo ? ATIVO : NEUTRO)

  return (
    <section
      ref={barra}
      aria-label="Registro rápido"
      data-barra-registrar=""
      className={`registro-rapido border-t border-(--cor-fio-suave) bg-(--cor-fundo) px-0 pt-3 pb-3 text-(--cor-texto) lg:pt-4 lg:pb-4 ${
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
            data-h={aberto ? 'cartao' : undefined}
            className={
              aberto
                ? 'mx-auto max-h-[calc(100dvh-160px)] w-[min(100%,40rem)] overflow-y-auto border border-(--cor-fio-suave) bg-(--cor-cartao) [box-shadow:var(--sombra-flutuante)]'
                : undefined
            }
          >
            <Confirmacao texto={textoNaTela} aoDesfazer={desfazer} aoFechar={fechar} escolhas={escolhas} semDesfazer={mostrandoDesfeito} />

            {maisAberto ? (
              <div
                ref={grupoMais}
                id={idMais}
                role="group"
                aria-label="Outros registros de Heloísa"
                className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${textoNaTela !== null ? 'mt-4 border-t border-(--cor-fio-suave) pt-4' : ''}`}
                data-largos=""
              >
                <Botao
                  variante="contorno"
                  tamanho="app"
                  className={ALVO_APP}
                  aria-label="Iniciar tummy time de Heloísa"
                  onClick={() => iniciar('tummy')}
                >
                  Tummy time
                </Botao>
                {ITENS_MAIS.map((item) => (
                  <Botao key={item.chave} variante="contorno" tamanho="app" className={ALVO_APP} onClick={() => escolherMais(item)}>
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
