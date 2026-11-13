import { useCallback, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Menu, Moon, X } from 'lucide-react'
import { Botao } from '../base/Botao.tsx'
import { MenuCelular } from './MenuCelular.tsx'
import { PularParaConteudo } from './PularParaConteudo.tsx'
import {
  DESTINO_CRIAR_CONTA,
  DESTINO_ENTRAR,
  ITENS_DO_CABECALHO,
  NOME_SITE,
  ROTULO_CRIAR_CONTA,
  ROTULO_ENTRAR,
  ROTULO_MADRUGADA,
  ROTULO_MADRUGADA_CURTO,
  ROTULO_MENU,
  ROTULO_NAVEGACAO,
  type Contexto,
} from './textos.ts'

interface Props {
  /** `publico`: os quatro links, Entrar e "Criar conta". `logado` (/app/*): Hoje, Sessão e o "Modo madrugada". */
  contexto: Contexto
  madrugada: boolean
  aoAlternarMadrugada: () => void
}

/**
 * O cabeçalho do site (DESIGN.md 4): fixo no topo, de papel, o nome em Literata 600 24 px, os links,
 * Entrar e o primário "Criar conta". Abaixo de 1100 px os links vão para o menu de altura cheia (o
 * botão Menu), e abaixo de 640 o "Criar conta" também. Na área logada, a lua liga o modo madrugada.
 */
export function Cabecalho({ contexto, madrugada, aoAlternarMadrugada }: Props) {
  // O menu guarda o caminho em que foi aberto: ao navegar (por um link dele ou não), fecha sozinho.
  const { pathname } = useLocation()
  const [abertoEm, setAbertoEm] = useState<string | null>(null)
  const menuAberto = abertoEm === pathname
  const botaoMenu = useRef<HTMLButtonElement>(null)
  const idMenu = useId()
  const fecharMenu = useCallback(() => setAbertoEm(null), [])

  return (
    <header className="cm-cabecalho" data-cabecalho="">
      {/* O primeiro Tab de toda página: pula o cabeçalho e vai ao <main> (WCAG 2.4.1). */}
      <PularParaConteudo />
      <div className="cm-area cm-cab-miolo">
        <Link to="/" className="cm-marca" data-nome-site="">
          {NOME_SITE}
        </Link>

        <nav aria-label={ROTULO_NAVEGACAO} className="cm-cab-links">
          {ITENS_DO_CABECALHO[contexto].map((item) => (
            <NavLink key={item.para} to={item.para} end className="cm-cab-link">
              {item.rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="cm-cab-acoes">
          {contexto === 'logado' ? (
            <Botao
              variante="contorno"
              tamanho="app"
              className="cm-cab-madrugada"
              aria-pressed={madrugada}
              aria-label={ROTULO_MADRUGADA}
              icone={<Moon size={20} />}
              onClick={aoAlternarMadrugada}
              data-cabecalho-acao=""
            >
              <span className="cm-rotulo-longo">{ROTULO_MADRUGADA}</span>
              <span className="cm-rotulo-curto" aria-hidden="true">
                {ROTULO_MADRUGADA_CURTO}
              </span>
            </Botao>
          ) : (
            <>
              <Link to={DESTINO_ENTRAR} className="cm-cab-link cm-cab-entrar">
                {ROTULO_ENTRAR}
              </Link>
              <Botao to={DESTINO_CRIAR_CONTA} className="cm-cab-criar" data-cabecalho-acao="">
                {ROTULO_CRIAR_CONTA}
              </Botao>
            </>
          )}

          <button
            ref={botaoMenu}
            type="button"
            className="sb-cab-menu"
            aria-label={ROTULO_MENU}
            aria-expanded={menuAberto}
            aria-controls={idMenu}
            onClick={() => setAbertoEm(menuAberto ? null : pathname)}
          >
            {menuAberto ? <X size={26} aria-hidden="true" /> : <Menu size={26} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <MenuCelular id={idMenu} aberto={menuAberto} contexto={contexto} aoFechar={fecharMenu} botao={botaoMenu} />
    </header>
  )
}
