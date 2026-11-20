import type { RefObject } from 'react'
import { CartaoSessao } from '../../../componentes/app/CartaoSessao.tsx'
import { PerguntaSessaoCurta } from '../../../componentes/app/PerguntaSessaoCurta.tsx'
import { Cartao, Pilha } from '../../../componentes/base/layout/index.ts'
import { Carregando } from '../../../componentes/estado/Carregando.tsx'
import { ErroDaRotina } from '../../../componentes/estado/ErroDaRotina.tsx'
import { AvisoDeLista } from '../../../componentes/rotina/AvisoDeLista.tsx'
import { SessoesEmParalelo } from '../../../componentes/rotina/SessoesEmParalelo.tsx'
import type { Secao } from '../../../componentes/rotina/useSecao.ts'
import { COMUM, HOJE } from '../../../conteudo/rotina.ts'
import type { Papel, Resultado } from '../../../dados/comum.ts'
import { LIMITES, type Lista, type Registro } from '../../../dados/rotina.tipos.ts'

interface Props {
  /** A classe de posição do cartão na grade do Hoje. */
  classe: string
  /** A leitura das sessões em andamento: o estado, o erro e os dados da seção. */
  emAndamento: Secao<Lista<Registro>>
  /** A sessão de início mais recente (a do cartão), ou nenhuma. */
  principalSessao: Registro | null
  /** Todas as sessões em andamento do bebê, a de início mais recente primeiro. */
  sessoes: readonly Registro[]
  papel: Papel
  /** O ref do cartão: o foco vai a ele quando a tela pede ou quando a sessão é encerrada. */
  refCartao: RefObject<HTMLElement | null>
  agora: number
  gravacaoLiberada: boolean
  encerrando: boolean
  /** A sessão do cartão cuja pergunta de "menos de 1 minuto" está aberta. */
  curtaDe: string | null
  relogioAtrasDe: string | null
  textoDoPapel: string
  pedirEncerrarPrincipal: () => void
  encerrarPrincipal: () => void
  descartarPrincipal: () => void
  fecharPerguntaDoCartao: () => void
  encerrar: (sessao: Registro, momento?: number) => Promise<void>
  descartarSessao: (sessao: Registro) => Promise<void>
  autorDoRegistro: (registro: Registro) => string
  podeAlterar: (sessao: Registro) => boolean
  podeUnir: (grupo: Registro[]) => boolean
  unir: (grupo: Registro[]) => Promise<Resultado<null>>
}

/**
 * O cartão da sessão do Hoje: o cartão "Em andamento" (ou o erro de leitura que o ocupa, nunca "Nenhuma sessão"),
 * a pergunta da sessão curta, as outras sessões em paralelo e o aviso de lista incompleta. O estado, os efeitos e
 * os handlers ficam no Hoje; aqui só se desenha.
 */
export function CartaoDaSessao({
  classe,
  emAndamento,
  principalSessao,
  sessoes,
  papel,
  refCartao,
  agora,
  gravacaoLiberada,
  encerrando,
  curtaDe,
  relogioAtrasDe,
  textoDoPapel,
  pedirEncerrarPrincipal,
  encerrarPrincipal,
  descartarPrincipal,
  fecharPerguntaDoCartao,
  encerrar,
  descartarSessao,
  autorDoRegistro,
  podeAlterar,
  podeUnir,
  unir,
}: Props) {
  return (
    <Pilha vao="pilha" dataH="coluna" className={classe}>
      {/* Leitura que falhou sem sessão guardada (primeira ou releitura): o erro ocupa o cartão, nunca "Nenhuma sessão". */}
      {emAndamento.estado === 'carregando' || (emAndamento.erro && !principalSessao) ? (
        <Cartao
          as="section"
          ref={refCartao}
          tabIndex={-1}
          data-andamento=""
          aria-busy={emAndamento.estado === 'carregando' ? 'true' : undefined}
          className="alvo-foco flex flex-col gap-esp-pilha border border-(--cor-fio-suave) bg-(--cor-cartao) p-esp-grupo"
        >
          <h2 className="text-pequeno font-medium text-(--cor-texto-2)">{HOJE.emAndamento}</h2>
          {emAndamento.erro ? (
            <ErroDaRotina erro={emAndamento.erro} papel={papel} aoTentarDeNovo={emAndamento.recarregar} aninhado />
          ) : (
            <Carregando texto={COMUM.carregando} />
          )}
        </Cartao>
      ) : (
        <>
          {emAndamento.erro ? (
            <ErroDaRotina erro={emAndamento.erro} papel={papel} aoTentarDeNovo={emAndamento.recarregar} />
          ) : null}
          <CartaoSessao
            ref={refCartao}
            className="p-esp-grupo lg:[&_[data-desenho]]:-mb-esp-grupo lg:[&_[role=timer]]:text-exibicao lg:[&_[role=timer]]:leading-none"
            sessao={
              principalSessao
                ? {
                    id: principalSessao.id,
                    tipo: principalSessao.tipo as 'sono' | 'mamada' | 'tummy',
                    inicio: Date.parse(principalSessao.inicio),
                    pessoa: autorDoRegistro(principalSessao),
                  }
                : null
            }
            agora={agora}
            podeEncerrar={gravacaoLiberada}
            ocupado={encerrando}
            aoEncerrar={pedirEncerrarPrincipal}
            painel={
              principalSessao && curtaDe === principalSessao.id ? (
                <PerguntaSessaoCurta
                  className="w-full"
                  ocupado={encerrando}
                  podeDescartar={podeAlterar(principalSessao)}
                  aoSalvar={encerrarPrincipal}
                  aoDescartar={descartarPrincipal}
                  aoFechar={fecharPerguntaDoCartao}
                />
              ) : null
            }
          />
        </>
      )}
      <SessoesEmParalelo
        sessoes={sessoes}
        agora={agora}
        autorDe={autorDoRegistro}
        podeEncerrar={gravacaoLiberada}
        podeUnir={(grupo) => gravacaoLiberada && podeUnir(grupo)}
        textoDoPapel={textoDoPapel}
        ocupado={encerrando}
        relogioAtrasDe={relogioAtrasDe}
        aoEncerrar={(sessao) => void encerrar(sessao)}
        podeDescartar={(sessao) => podeAlterar(sessao)}
        aoDescartar={(sessao) => void descartarSessao(sessao)}
        aoEncerrarEm={(sessao, momento) => void encerrar(sessao, momento)}
        aoUnir={(grupo) => unir(grupo)}
      />
      {emAndamento.dados?.incompleta ? <AvisoDeLista limite={LIMITES.emAndamento} dado="emAndamento" /> : null}
    </Pilha>
  )
}
