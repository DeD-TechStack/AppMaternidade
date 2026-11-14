import type { ReactNode, RefObject } from 'react'
import { Info } from 'lucide-react'
import { ESTADOS } from '../../conteudo/rotina.ts'
import { AvisoDaTela } from '../app/AvisoDaTela.tsx'
import { Pilha, QuadroLayout, Secao } from '../base/layout/index.ts'
import { ConfirmacaoRotina } from './ConfirmacaoRotina.tsx'
import { TituloRotina } from './TituloRotina.tsx'
import { useRotina, type AcaoDaConfirmacao } from './contexto.ts'

interface Props {
  /** O valor de `data-tela`: o nome da tela, para os testes e a depuração. */
  tela: string
  principal: RefObject<HTMLElement | null>
  acionar: (acao: AcaoDaConfirmacao) => void
  titulo: string
  linha: string
  antes?: ReactNode
  lateral?: ReactNode
  /** `aria-busy` no `<main>` durante a primeira leitura. */
  ocupada?: boolean
  children: ReactNode
}

/**
 * A segunda linha do título sem quebra dentro de palavra com hífen (`quinta-feira` não vira `quinta-` e `feira`).
 * Sem hífen, devolve o texto; com hífen, o `TituloRotina` usa a mesma estrutura e as mesmas classes do título da base.
 */
function semQuebraNoHifen(texto: string): ReactNode {
  const partes = texto.split(/(\p{L}+-\p{L}+)/u)
  if (partes.length === 1) return texto
  return partes.map((parte, indice) =>
    indice % 2 === 1 ? (
      <span key={indice} className="whitespace-nowrap">
        {parte}
      </span>
    ) : (
      parte
    ),
  )
}

/**
 * A casca das telas do 38b: um único `<main>`, o título com a linha em itálico, o aviso de acesso perdido e a
 * região `role="status"` (a única da tela, sempre no DOM) com a confirmação da rotina (R38-07, R38-11). O aviso
 * de demonstração fica fora do `<main>`.
 */
export function TelaRotina({ tela, principal, acionar, titulo, linha, antes, lateral, ocupada = false, children }: Props) {
  const { confirmacao, acessoPerdido } = useRotina()
  return (
    <>
      <main ref={principal} className="rotina-principal text-corpo" data-tela={tela} aria-busy={ocupada ? 'true' : undefined}>
        <Secao>
          <QuadroLayout>
            <Pilha vao="bloco">
              <TituloRotina antes={antes} titulo={titulo} linha={semQuebraNoHifen(linha)} lateral={lateral} />
              {acessoPerdido ? (
                <p className="inline-flex items-start gap-2.5 self-start rounded-campo bg-(--cor-papel-fundo) px-4 py-3 font-medium">
                  <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
                  {ESTADOS.acessoPerdido}
                </p>
              ) : null}
              {/* Vazia, a região fica no DOM (o leitor de tela anuncia o que entra nela) e fora do fluxo: sem vão. */}
              <div className={confirmacao ? undefined : 'sr-only'} data-confirmacao-da-tela="">
                <ConfirmacaoRotina confirmacao={confirmacao} aoAcionar={acionar} />
              </div>
              {children}
            </Pilha>
          </QuadroLayout>
        </Secao>
      </main>
      <AvisoDaTela />
    </>
  )
}
