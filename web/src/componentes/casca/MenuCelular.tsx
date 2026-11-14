import { useEffect, useRef, type RefObject } from 'react'
import { Link, NavLink } from 'react-router'
import { Botao } from '../base/Botao.tsx'
import {
  DESTINO_CONTA,
  DESTINO_CRIAR_CONTA,
  DESTINO_ENTRAR,
  ITENS_DO_CABECALHO,
  ROTULO_CONTA,
  ROTULO_CRIAR_CONTA,
  ROTULO_ENTRAR,
  ROTULO_SAINDO,
  ROTULO_SAIR,
  type Contexto,
  type SituacaoDaConta,
} from './textos.ts'

const FOCAVEIS = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** O ponto de quebra do cabeçalho: de 1100 para cima valem os links de computador, e o menu não existe. */
const PONTO_DE_QUEBRA = 1100
const CONSULTA_COMPUTADOR = `(min-width: ${PONTO_DE_QUEBRA}px)`

/** A janela já passou do ponto de quebra? No jsdom (sem layout) é a largura que decide. */
const naLarguraDeComputador = () => window.innerWidth >= PONTO_DE_QUEBRA

interface Props {
  id: string
  aberto: boolean
  contexto: Contexto
  /** O espaço da conta: nada enquanto a sessão carrega, "Conta" e "Sair" com sessão, "Entrar" e "Criar conta" sem. */
  situacao: SituacaoDaConta
  saindo: boolean
  aoSair: () => void
  aoFechar: () => void
  /** O botão que abre o menu: o foco volta a ele ao fechar. */
  botao: RefObject<HTMLButtonElement | null>
}

/**
 * O menu abaixo de 1100 px: um painel de papel de altura cheia logo abaixo do cabeçalho, com os links em
 * Literata e o espaço da conta (Entrar e "Criar conta" no site público; "Conta" e "Sair" com sessão). É uma
 * divulgação (disclosure): o foco vai ao primeiro item ao abrir, o Tab segue do último item para a página
 * (sem prender o foco), o Esc fecha devolvendo o foco ao botão do menu e o menu fecha sozinho ao passar de 1100.
 */
export function MenuCelular({ id, aberto, contexto, situacao, saindo, aoSair, aoFechar, botao }: Props) {
  const painel = useRef<HTMLDivElement>(null)

  // Ao abrir, o foco vai ao primeiro item.
  useEffect(() => {
    if (!aberto) return
    painel.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus()
  }, [aberto])

  // Ao passar do ponto de quebra o menu fecha (o foco não volta ao botão, que some ali).
  useEffect(() => {
    if (!aberto) return
    const aoRedimensionar = () => {
      if (naLarguraDeComputador()) aoFechar()
    }
    const aoMudarConsulta = (evento: { matches: boolean }) => {
      if (evento.matches) aoFechar()
    }
    const consulta = typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA_COMPUTADOR) : null
    if (consulta && typeof consulta.addEventListener === 'function') consulta.addEventListener('change', aoMudarConsulta)
    window.addEventListener('resize', aoRedimensionar)
    return () => {
      window.removeEventListener('resize', aoRedimensionar)
      if (consulta && typeof consulta.removeEventListener === 'function') consulta.removeEventListener('change', aoMudarConsulta)
    }
  }, [aberto, aoFechar])

  // Só o Esc é do menu: o Tab segue a ordem natural do documento (o painel é o último do cabeçalho).
  useEffect(() => {
    if (!aberto) return
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return
      evento.preventDefault()
      aoFechar()
      botao.current?.focus()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aberto, aoFechar, botao])

  return (
    <div id={id} ref={painel} className="cm-menu-celular" data-menu-celular="" hidden={!aberto}>
      {aberto ? (
        <div className="cm-area">
          <ul className="cm-menu-lista">
            {ITENS_DO_CABECALHO[contexto].map((item) => (
              <li key={item.para}>
                <NavLink to={item.para} end className="cm-menu-link cm-h3" onClick={aoFechar}>
                  {item.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
          {situacao === 'visitante' && contexto === 'publico' ? (
            <div className="cm-menu-acoes">
              <Botao to={DESTINO_CRIAR_CONTA}>{ROTULO_CRIAR_CONTA}</Botao>
              <Botao variante="contorno" to={DESTINO_ENTRAR}>
                {ROTULO_ENTRAR}
              </Botao>
            </div>
          ) : null}
          {situacao === 'com_sessao' ? (
            <div className="cm-menu-acoes">
              {/* Link do mesmo desenho do botão, para fechar o menu também quando a pessoa já está na Conta. */}
              <Link
                to={DESTINO_CONTA}
                className="cm-botao cm-botao-contorno alvo-toque"
                data-botao="contorno"
                data-tamanho="site"
                onClick={aoFechar}
              >
                {ROTULO_CONTA}
              </Link>
              <Botao variante="contorno" desativado={saindo} onClick={aoSair}>
                {saindo ? ROTULO_SAINDO : ROTULO_SAIR}
              </Botao>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
