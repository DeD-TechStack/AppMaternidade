import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { PAINEL_DO_RESUMO } from '../../conteudo/resumoRotinaPainel.ts'
import { Cartao } from '../base/layout/Cartao.tsx'
import { Pilha } from '../base/layout/Pilha.tsx'
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from '../conta/Partes.tsx'
import { useSessao } from '../conta/sessao.tsx'
import { useDadosRotina } from '../rotina/dadosRotina.tsx'
import { criarControladorDoResumo } from './controlador.ts'
import type { PeriodoDoResumo } from './calculo.ts'

// O painel "Resumo da rotina" dos compositores da Comunidade (RF12: RF-02 a RF-05, RF-10, RF-15, RF-18 e RF-19).
// Não é modal: é uma região do fluxo da página, com controles nativos (rádios e caixas de marcar), sem prisão de
// foco. Quem o abre é o compositor, dono do botão, do estado aberto e do foco que volta; o painel só pede "inserir
// este texto" e "fechar". Cada montagem é uma abertura: lê o contexto de novo e começa no estado 1 (RF-19 item 1).
// O texto de cada estado vem do controlador; o texto de interface vem de `conteudo/` (RN-04).

interface Props {
  /** O `id` da região: o botão do compositor aponta para ele com `aria-controls`. */
  id: string
  /** O `id` do título: o compositor leva o foco a ele (só por programa) ao abrir. */
  idDoTitulo: string
  /** O nível do título na página do compositor (2 no tópico novo, 3 na resposta, que já está sob um `h2`). */
  nivelDoTitulo?: 2 | 3
  /** "Inserir no texto": o bloco exato que a prévia mostra. Nada além de texto sai do painel. */
  aoInserir: (texto: string) => void
  /** "Cancelar" e `Esc`: o compositor fecha o painel e devolve o foco ao botão. */
  aoFechar: () => void
}

const CLASSE_DO_ROTULO = 'cm-campo-rotulo mb-esp-junto p-0'
// O `.cm-botao` é `nowrap`: a 390 px com 200 % de fonte o rótulo passava da tela. Estas classes o deixam quebrar.
const QUEBRA_DO_BOTAO = 'h-auto max-w-full py-3 text-center whitespace-normal wrap-anywhere'
const PRINCIPAL = `${BOTAO_PRINCIPAL} ${QUEBRA_DO_BOTAO}`
const SECUNDARIO = `${BOTAO_SECUNDARIO} ${QUEBRA_DO_BOTAO}`
const CLASSE_DA_OPCAO = 'alvo-toque flex min-h-11 cursor-pointer items-center gap-esp-junto'
const CLASSE_DO_CONTROLE = 'size-5 shrink-0 accent-[var(--cor-texto)]'

interface OpcaoDoGrupo {
  chave: string
  rotulo: string
  marcada: boolean
  aoMudar: (marcada: boolean) => void
}

/** Um grupo nomeado de rádios ou de caixas de marcar, nativos, com o rótulo visível e alvos de toque. */
function GrupoDeOpcoes({ legenda, tipo, nome, opcoes, ajuda }: { legenda: string; tipo: 'radio' | 'checkbox'; nome: string; opcoes: readonly OpcaoDoGrupo[]; ajuda?: ReactNode }) {
  const idDaAjuda = useId()
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={ajuda ? idDaAjuda : undefined}>
      <legend className={CLASSE_DO_ROTULO}>{legenda}</legend>
      <Pilha vao="junto">
        {opcoes.map((opcao) => (
          <label key={opcao.chave} className={CLASSE_DA_OPCAO}>
            <input
              type={tipo}
              name={tipo === 'radio' ? nome : undefined}
              checked={opcao.marcada}
              onChange={(evento) => opcao.aoMudar(evento.target.checked)}
              className={CLASSE_DO_CONTROLE}
            />
            <span className="text-corpo wrap-anywhere">{opcao.rotulo}</span>
          </label>
        ))}
        {ajuda ? (
          <p id={idDaAjuda} className="text-pequeno text-[var(--cor-texto-2)]">
            {ajuda}
          </p>
        ) : null}
      </Pilha>
    </fieldset>
  )
}

const PERIODOS: readonly PeriodoDoResumo[] = ['hoje', 'semana']

export function PainelDoResumo({ id, idDoTitulo, nivelDoTitulo = 2, aoInserir, aoFechar }: Props) {
  const base = useDadosRotina()
  const { recarregarConta } = useSessao()
  // Toda leitura do painel passa pelo aviso de sessão vencida, como as operações da Comunidade (RF-19 item 7).
  // O `recarregarConta` da sessão é estável (`useCallback`), então a captura na criação não fica velha.
  const [controlador] = useState(() => criarControladorDoResumo({ dados: base, aoSessaoEncerrada: () => void recarregarConta() }))
  const situacao = useSyncExternalStore(controlador.inscrever, controlador.situacao)
  const nomeDoBebe = useId()
  const nomeDoPeriodo = useId()
  const raiz = useRef<HTMLDivElement>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const fechar = useRef(aoFechar)
  useEffect(() => {
    fechar.current = aoFechar
  })

  // Abrir é montar: lê o contexto; desmontar (fechar, ou "Ver prévia") descarta a leitura em andamento.
  useEffect(() => {
    controlador.abrir()
    return () => controlador.fechar()
  }, [controlador])

  useEffect(() => {
    titulo.current?.focus()
  }, [])

  // `Esc` dentro do painel é o "Cancelar"; `Enter` num rádio ou numa caixa não envia o formulário do compositor (RF-18).
  useEffect(() => {
    const elemento = raiz.current
    if (elemento === null) return
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        evento.stopPropagation()
        fechar.current()
      } else if (evento.key === 'Enter' && evento.target instanceof HTMLInputElement) {
        evento.preventDefault()
      }
    }
    elemento.addEventListener('keydown', aoTeclar)
    return () => elemento.removeEventListener('keydown', aoTeclar)
  }, [])

  const Titulo = nivelDoTitulo === 3 ? 'h3' : 'h2'
  const escolhendo = situacao.opcoes.length > 0
  const naRegiaoDeStatus = situacao.estado === 'impedido' || situacao.estado === 'sem_bebe_escolhido' ? null : situacao.texto
  const falhou = situacao.estado === 'falha_contexto' || situacao.estado === 'falha_numeros'

  return (
    <Cartao id={id} role="group" aria-labelledby={idDoTitulo} className="border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)]">
      <div ref={raiz}>
        <Pilha vao="grupo">
          <Pilha vao="pilha">
            <Titulo ref={titulo} id={idDoTitulo} tabIndex={-1} className="cm-h4 alvo-foco text-titulo-4">
              {PAINEL_DO_RESUMO.titulo}
            </Titulo>
            {/* A única região de status do painel: anuncia os estados 1, 2, 5, 6, 7 e 8. Sem texto, fica fora do fluxo. */}
            <p role="status" className={naRegiaoDeStatus ? 'text-corpo' : 'sr-only'}>
              {naRegiaoDeStatus}
            </p>
            {situacao.estado === 'impedido' ? <p className="text-corpo">{situacao.texto}</p> : null}
            {falhou ? (
              <div>
                <button type="button" className={SECUNDARIO} data-tamanho="app" onClick={() => controlador.tentarDeNovo()}>
                  {PAINEL_DO_RESUMO.tentarDeNovo}
                </button>
              </div>
            ) : null}
          </Pilha>

          {escolhendo ? (
            <>
              <GrupoDeOpcoes
                legenda={PAINEL_DO_RESUMO.bebe}
                tipo="radio"
                nome={nomeDoBebe}
                ajuda={PAINEL_DO_RESUMO.ajudaDoNome}
                opcoes={situacao.opcoes.map((opcao) => ({
                  chave: opcao.id,
                  rotulo: opcao.rotulo,
                  marcada: situacao.bebeId === opcao.id,
                  aoMudar: () => controlador.escolherBebe(opcao.id),
                }))}
              />
              <GrupoDeOpcoes
                legenda={PAINEL_DO_RESUMO.periodo}
                tipo="radio"
                nome={nomeDoPeriodo}
                opcoes={PERIODOS.map((periodo) => ({
                  chave: periodo,
                  rotulo: PAINEL_DO_RESUMO.periodos[periodo],
                  marcada: situacao.periodo === periodo,
                  aoMudar: () => controlador.escolherPeriodo(periodo),
                }))}
              />
              {situacao.estado === 'sem_bebe_escolhido' ? <p className="text-corpo">{situacao.texto}</p> : null}
              {situacao.estado === 'pronto' ? (
                <>
                  <GrupoDeOpcoes
                    legenda={PAINEL_DO_RESUMO.numeros}
                    tipo="checkbox"
                    nome=""
                    opcoes={situacao.caixas.map((caixa) => ({
                      chave: caixa.chave,
                      rotulo: PAINEL_DO_RESUMO.caixa(caixa.rotulo, caixa.valor),
                      marcada: caixa.marcado,
                      aoMudar: (marcada) => controlador.marcar(caixa.chave, marcada),
                    }))}
                  />
                  <Pilha vao="junto">
                    <p className="cm-campo-rotulo">{PAINEL_DO_RESUMO.previa}</p>
                    {situacao.bloco === '' ? (
                      <p className="text-corpo text-[var(--cor-texto-2)]">{PAINEL_DO_RESUMO.marqueUm}</p>
                    ) : (
                      <p data-bloco="" className="text-corpo wrap-anywhere whitespace-pre-line rounded-campo bg-[var(--cor-papel-fundo)] p-esp-pilha">
                        {situacao.bloco}
                      </p>
                    )}
                  </Pilha>
                </>
              ) : null}
            </>
          ) : null}

          <Pilha vao="junto">
            {escolhendo ? (
              <button type="button" disabled={!situacao.podeInserir} className={PRINCIPAL} data-tamanho="app" onClick={() => aoInserir(situacao.bloco)}>
                {PAINEL_DO_RESUMO.inserir}
              </button>
            ) : null}
            <button type="button" className={SECUNDARIO} data-tamanho="app" onClick={aoFechar}>
              {PAINEL_DO_RESUMO.cancelar}
            </button>
          </Pilha>
        </Pilha>
      </div>
    </Cartao>
  )
}
