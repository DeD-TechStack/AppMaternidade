import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { T } from '../../conteudo/desenvolvimento/textosLogada.ts'
import { BOTAO_SECUNDARIO } from '../conta/Partes.tsx'

// Os avisos de estado da página: texto na tinta do tema, faixa de papel e, no erro, o contorno do tema. O
// aviso nunca depende só da cor: tem sempre a frase inteira. Sem ícone (a página não traz ícones novos).

const FAIXA = 'cm-area mt-6 flex flex-col items-start gap-3'
const TEXTO = 'm-0 max-w-[65ch] rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3 font-medium wrap-anywhere'

/** Uma frase de estado (arquivado, só ver, nascimento depois de hoje): região de status, sem mover o foco. */
export function AvisoDeEstado({ children, dado }: { children: ReactNode; dado: string }) {
  return (
    <div className={FAIXA}>
      <p role="status" data-aviso-estado={dado} className={TEXTO}>
        {children}
      </p>
    </div>
  )
}

/** T-06: o dia segue o fuso da família. Texto pequeno, sem faixa. */
export function AvisoDeFuso({ children }: { children: ReactNode }) {
  return (
    <p data-fuso-diferente="" className="cm-area cm-pequeno cm-texto-2 mt-4">
      {children}
    </p>
  )
}

/** Um estado que ocupa a página no lugar do conteúdo, com uma ação opcional (link ou botão). */
function EstadoDaPagina({
  dado,
  alerta = false,
  ocupado = false,
  children,
  acao,
}: {
  dado: string
  alerta?: boolean
  ocupado?: boolean
  children: ReactNode
  acao?: ReactNode
}) {
  return (
    <div className="cm-area mt-8 flex max-w-[40rem] flex-col items-start gap-4" data-estado-da-pagina={dado} aria-busy={ocupado ? 'true' : undefined}>
      <p
        role={alerta ? 'alert' : 'status'}
        className={`m-0 w-full rounded-campo px-4 py-3 font-medium wrap-anywhere ${
          alerta ? 'border-2 border-[var(--cor-erro,var(--cor-texto))] bg-[var(--cor-cartao)]' : 'bg-[var(--cor-papel-fundo)]'
        }`}
      >
        {children}
      </p>
      {acao}
    </div>
  )
}

/** T-38. */
export const EstadoCarregando = () => <EstadoDaPagina dado="carregando" ocupado>{T.carregando}</EstadoDaPagina>

/** T-59 com "Tentar de novo". */
export function EstadoDeErro({ aoTentarDeNovo }: { aoTentarDeNovo: () => void }) {
  return (
    <EstadoDaPagina
      dado="erro"
      alerta
      acao={
        <button type="button" className={BOTAO_SECUNDARIO} data-tamanho="app" onClick={aoTentarDeNovo}>
          {T.tentarDeNovo}
        </button>
      }
    >
      {T.falhaDeLeitura}
    </EstadoDaPagina>
  )
}

/** T-67 (estado 2b): o fuso da família não existe; o link leva a Família. */
export function EstadoDeFusoInvalido() {
  return (
    <EstadoDaPagina
      dado="fuso-invalido"
      alerta
      acao={
        <Link to="/app/familia" className={BOTAO_SECUNDARIO} data-tamanho="app">
          {T.irParaFamilia}
        </Link>
      }
    >
      {T.fusoInvalido}
    </EstadoDaPagina>
  )
}

/** T-56: sem família. */
export function EstadoSemFamilia() {
  return (
    <EstadoDaPagina
      dado="sem-familia"
      acao={
        <Link to="/app/comecar" className={BOTAO_SECUNDARIO} data-tamanho="app">
          {T.comecar}
        </Link>
      }
    >
      {T.semFamilia}
    </EstadoDaPagina>
  )
}

/** T-39: família sem bebê. */
export function EstadoSemBebe() {
  return (
    <EstadoDaPagina
      dado="sem-bebe"
      acao={
        <Link to="/app/familia" className={BOTAO_SECUNDARIO} data-tamanho="app">
          {T.irParaFamilia}
        </Link>
      }
    >
      {T.semBebe}
    </EstadoDaPagina>
  )
}
