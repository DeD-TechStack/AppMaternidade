import { useEffect, useId, useRef, useState, type Ref, type RefObject } from 'react'
import { Droplets, Ellipsis, Milk, Moon } from 'lucide-react'
import { ESCOLHAS_FRALDA, REGISTRO_RAPIDO, ROTULO_TIPO } from '../../conteudo/rotina.ts'
import type { ConteudoFralda, TipoSessao } from '../../dados/rotina.tipos.ts'
import { useBarraFixa } from '../../prototipo/useBarraFixa.ts'
import { ALVO_APP } from '../app/alvo.ts'
import { Botao } from '../base/Botao.tsx'
import { ConfirmacaoRotina } from './ConfirmacaoRotina.tsx'
import type { AcaoDaConfirmacao, ConfirmacaoDaRotina } from './contexto.ts'

/** Os botões que gravam: o toque repetido em um deles fica sem efeito enquanto a gravação está em curso. */
export type BotaoRapido = TipoSessao | 'fralda' | 'mamadeira' | 'solido'

export type ItemDoMais = 'mamadeira' | 'solido' | 'observacao' | 'outro'

interface Props {
  nome: string
  /** O texto do papel ou do arquivamento: no lugar dos botões rápidos, que então não aparecem. */
  textoNoLugarDosBotoes: string | null
  /** Primeira leitura da tela: os botões já aparecem, com `aria-disabled="true"`. */
  carregando: boolean
  /** Os botões com gravação em curso: `aria-disabled="true"` e o toque não grava. */
  ocupados: ReadonlySet<BotaoRapido>
  /** O tipo da sessão em andamento: o botão dele fica em mel, como no cartão. */
  sessaoAtiva: TipoSessao | null
  /** O Hoje leva o foco ao primeiro botão quando a confirmação sai da tela. */
  refSono?: Ref<HTMLButtonElement>
  /** O Hoje leva o foco ao botão Fralda e ao botão Mais depois de "Desfazer": o que criou o registro (A11Y-004). */
  refFralda?: RefObject<HTMLButtonElement | null>
  refMais?: RefObject<HTMLButtonElement | null>
  confirmacao: ConfirmacaoDaRotina | null
  aoIniciar: (tipo: TipoSessao) => void
  aoFralda: (conteudo: ConteudoFralda) => void
  aoMais: (item: ItemDoMais) => void
  aoAcionar: (acao: AcaoDaConfirmacao) => void
}

// Cada botão tem 56 px de altura (DESIGN.md 4: BarraRegistrar ≥ 56): ícone sobre o rótulo no celular, ao
// lado dele de 1024 para cima. As cores vêm das variáveis do tema, e o hover inverte na hora.
const BOTAO =
  'alvo-toque flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-cartao px-1 text-[15px] leading-[20px] font-medium transition-[scale] duration-100 ease-out active:scale-[0.96] aria-disabled:opacity-60 lg:flex-row lg:gap-2.5 lg:text-[17px] lg:leading-[25px]'
const NEUTRO =
  'bg-(--cor-papel-fundo) text-(--cor-texto) hover:bg-(--cor-texto) hover:text-(--cor-fundo) aria-expanded:bg-(--cor-texto) aria-expanded:text-(--cor-fundo)'
const ATIVO = 'bg-mel text-cacau hover:bg-(--cor-texto) hover:text-(--cor-fundo)'
const ICONE = 'size-6 shrink-0'

/**
 * A barra Registrar do Hoje com os dados do banco (R38-06): Sono, Mamada, Fralda e Mais. Sono e Mamada (e o
 * Tummy time, dentro do Mais) começam uma sessão. Fralda abre a escolha Xixi, Cocô, Ambos e Cancelar e grava
 * num toque (o conteúdo da fralda é obrigatório no banco). Mais abre Tummy time, Mamadeira, Alimentação
 * sólida, Observação e `Outro horário…`. O painel vem depois da fileira no DOM (o Tab chega a ele) e leva a
 * confirmação, cuja região `role="status"` é única e fica sempre no DOM. Esc fecha o painel aberto e o foco
 * volta ao botão que o abriu.
 */
export function BarraRegistroRapido({
  nome,
  textoNoLugarDosBotoes,
  carregando,
  ocupados,
  sessaoAtiva,
  refSono,
  refFralda,
  refMais,
  confirmacao,
  aoIniciar,
  aoFralda,
  aoMais,
  aoAcionar,
}: Props) {
  const { barra, fixa } = useBarraFixa()
  const [painel, setPainel] = useState<'fralda' | 'mais' | null>(null)
  const fraldaInterno = useRef<HTMLButtonElement>(null)
  const maisInterno = useRef<HTMLButtonElement>(null)
  const botaoFralda = refFralda ?? fraldaInterno
  const botaoMais = refMais ?? maisInterno
  const grupo = useRef<HTMLDivElement>(null)
  const idPainel = useId()

  // Ao abrir, o foco vai à 1ª opção: sem isso o painel passaria despercebido para quem usa o teclado.
  useEffect(() => {
    if (painel) grupo.current?.querySelector('button')?.focus()
  }, [painel])

  useEffect(() => {
    if (!painel) return
    const gatilho = painel === 'fralda' ? botaoFralda : botaoMais
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return
      setPainel(null)
      gatilho.current?.focus()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [painel, botaoFralda, botaoMais])

  const desativado = (botao: BotaoRapido) => carregando || ocupados.has(botao)
  const cor = (tipo: TipoSessao) => (sessaoAtiva === tipo ? ATIVO : NEUTRO)

  function iniciar(tipo: TipoSessao) {
    setPainel(null)
    if (!desativado(tipo)) aoIniciar(tipo)
  }

  function alternar(qual: 'fralda' | 'mais') {
    if (painel === qual) botaoDe(qual).current?.focus()
    setPainel(painel === qual ? null : qual)
  }

  const botaoDe = (qual: 'fralda' | 'mais') => (qual === 'fralda' ? botaoFralda : botaoMais)

  function escolherFralda(conteudo: ConteudoFralda) {
    setPainel(null)
    botaoFralda.current?.focus()
    if (!desativado('fralda')) aoFralda(conteudo)
  }

  function escolherMais(item: ItemDoMais) {
    setPainel(null)
    botaoMais.current?.focus()
    aoMais(item)
  }

  const itensDoMais: Array<{ chave: ItemDoMais; rotulo: string }> = [
    { chave: 'mamadeira', rotulo: ROTULO_TIPO.mamadeira },
    { chave: 'solido', rotulo: ROTULO_TIPO.solido },
    { chave: 'observacao', rotulo: ROTULO_TIPO.observacao },
    { chave: 'outro', rotulo: REGISTRO_RAPIDO.outroHorario },
  ]

  return (
    <section
      ref={barra}
      aria-label={REGISTRO_RAPIDO.regiao}
      data-barra-registrar=""
      className={`registro-rapido border-t border-(--cor-fio-suave) bg-(--cor-fundo) px-0 pt-[3px] pb-1 text-(--cor-texto) ${
        fixa ? 'barra-fixa fixed inset-x-0 bottom-0 z-30' : 'relative'
      }`}
    >
      <div className="relative mx-auto w-[min(100%-24px,1312px)]" data-barra-miolo="">
        {textoNoLugarDosBotoes !== null ? (
          <p className="px-2 py-3 text-center text-[15px] leading-[22px] font-medium" data-sem-botoes="">
            {textoNoLugarDosBotoes}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2" data-fileira="">
            <button
              ref={refSono}
              type="button"
              aria-label={REGISTRO_RAPIDO.iniciarSono(nome)}
              aria-disabled={desativado('sono') ? 'true' : undefined}
              data-ativo={sessaoAtiva === 'sono' ? '' : undefined}
              className={`${BOTAO} ${cor('sono')}`}
              onClick={() => iniciar('sono')}
            >
              <Moon aria-hidden="true" className={ICONE} strokeWidth={1.75} />
              <span>{ROTULO_TIPO.sono}</span>
            </button>
            <button
              type="button"
              aria-label={REGISTRO_RAPIDO.iniciarMamada(nome)}
              aria-disabled={desativado('mamada') ? 'true' : undefined}
              data-ativo={sessaoAtiva === 'mamada' ? '' : undefined}
              className={`${BOTAO} ${cor('mamada')}`}
              onClick={() => iniciar('mamada')}
            >
              <Milk aria-hidden="true" className={ICONE} strokeWidth={1.75} />
              <span>{ROTULO_TIPO.mamada}</span>
            </button>
            <button
              ref={botaoFralda}
              type="button"
              aria-label={REGISTRO_RAPIDO.registrarFralda(nome)}
              aria-expanded={painel === 'fralda'}
              aria-controls={painel === 'fralda' ? idPainel : undefined}
              aria-disabled={desativado('fralda') ? 'true' : undefined}
              className={`${BOTAO} ${NEUTRO}`}
              onClick={() => alternar('fralda')}
            >
              <Droplets aria-hidden="true" className={ICONE} strokeWidth={1.75} />
              <span>{ROTULO_TIPO.fralda}</span>
            </button>
            <button
              ref={botaoMais}
              type="button"
              aria-label={REGISTRO_RAPIDO.maisRegistros}
              aria-expanded={painel === 'mais'}
              aria-controls={painel === 'mais' ? idPainel : undefined}
              className={`${BOTAO} ${NEUTRO}`}
              onClick={() => alternar('mais')}
            >
              <Ellipsis aria-hidden="true" className={ICONE} strokeWidth={1.75} />
              <span>{REGISTRO_RAPIDO.mais}</span>
            </button>
          </div>
        )}

        {/* O painel vem DEPOIS da fileira no DOM, para o Tab chegar a ele. Na tela, flutua logo acima dela. */}
        <div
          data-painel=""
          data-aberto={confirmacao !== null || painel !== null ? '' : undefined}
          className={confirmacao !== null || painel !== null ? 'absolute inset-x-0 bottom-full pb-3' : 'absolute inset-x-0 bottom-full'}
        >
          <div
            className={
              confirmacao !== null || painel !== null
                ? 'mx-auto max-h-[calc(100dvh-160px)] w-[min(100%,40rem)] overflow-y-auto rounded-cartao border border-(--cor-fio-suave) bg-(--cor-cartao) p-4 [box-shadow:var(--sombra-flutuante)] lg:p-5'
                : undefined
            }
          >
            <ConfirmacaoRotina confirmacao={confirmacao} aoAcionar={aoAcionar} />

            {painel === 'fralda' ? (
              <div
                ref={grupo}
                id={idPainel}
                role="group"
                aria-label={REGISTRO_RAPIDO.grupoFralda(nome)}
                className={`grid grid-cols-2 gap-2 sm:grid-cols-4 ${confirmacao !== null ? 'mt-4 border-t border-(--cor-fio-suave) pt-4' : ''}`}
              >
                {ESCOLHAS_FRALDA.map((escolha) => (
                  <Botao
                    key={escolha.valor}
                    variante="contorno"
                    tamanho="app"
                    className={`px-3 ${ALVO_APP}`}
                    onClick={() => escolherFralda(escolha.valor)}
                  >
                    {escolha.rotulo}
                  </Botao>
                ))}
                <Botao
                  variante="texto"
                  tamanho="app"
                  className={ALVO_APP}
                  onClick={() => {
                    setPainel(null)
                    botaoFralda.current?.focus()
                  }}
                >
                  {REGISTRO_RAPIDO.cancelar}
                </Botao>
              </div>
            ) : null}

            {painel === 'mais' ? (
              <div
                ref={grupo}
                id={idPainel}
                role="group"
                aria-label={REGISTRO_RAPIDO.grupoMais(nome)}
                className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${confirmacao !== null ? 'mt-4 border-t border-(--cor-fio-suave) pt-4' : ''}`}
                data-largos=""
              >
                <Botao
                  variante="contorno"
                  tamanho="app"
                  className={ALVO_APP}
                  aria-label={REGISTRO_RAPIDO.iniciarTummy(nome)}
                  onClick={() => iniciar('tummy')}
                >
                  {ROTULO_TIPO.tummy}
                </Botao>
                {itensDoMais.map((item) => (
                  <Botao key={item.chave} variante="contorno" tamanho="app" className={ALVO_APP} onClick={() => escolherMais(item.chave)}>
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
