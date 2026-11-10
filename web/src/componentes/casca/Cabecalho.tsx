import { useCallback, useId, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { Botao } from '../base/Botao.tsx'
import { MenuCelular } from './MenuCelular.tsx'
import { SubmenuEmBreve } from './SubmenuEmBreve.tsx'
import {
  DESTINO_ENTRAR,
  ITENS_DO_CABECALHO,
  NOME_SITE,
  NUCLEO_MADRUGADA,
  PREFIXO_MADRUGADA,
  ROTULO_ENTRAR,
  ROTULO_MADRUGADA,
  ROTULO_MENU,
  ROTULO_NAVEGACAO,
  type Contexto,
} from './textos.ts'

interface Props {
  /** `publico`: Início · Protótipo · + Em breve e "Entrar". `logado`: Hoje · + Em breve · Conta e "Modo madrugada". */
  contexto: Contexto
  madrugada: boolean
  aoAlternarMadrugada: () => void
}

/**
 * O cabeçalho do site, o mesmo em todas as telas: 64 px (60 abaixo de 768), fixo no topo, de papel
 * opaco e sem fio embaixo. Abaixo de 768 os links vão para o menu do celular.
 */
export function Cabecalho({ contexto, madrugada, aoAlternarMadrugada }: Props) {
  const [menuAberto, setMenuAberto] = useState(false)
  const botaoMenu = useRef<HTMLButtonElement>(null)
  const idMenu = useId()
  const fecharMenu = useCallback(() => setMenuAberto(false), [])

  return (
    <header className="sb-cabecalho" data-cabecalho="">
      <div className="sb-area sb-cab-miolo">
        <button
          ref={botaoMenu}
          type="button"
          className="sb-cab-menu"
          aria-label={ROTULO_MENU}
          aria-expanded={menuAberto}
          aria-controls={idMenu}
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <span className="sb-menu-icone" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <Link to="/" className="sb-cab-nome" data-nome-site="">
          {NOME_SITE}
        </Link>

        <nav aria-label={ROTULO_NAVEGACAO} className="sb-cab-links">
          {ITENS_DO_CABECALHO[contexto].map((item) =>
            item.tipo === 'em-breve' ? (
              <SubmenuEmBreve key="em-breve" />
            ) : (
              <NavLink key={item.para + item.rotulo} to={item.para} end className="sb-cab-link t-corpo">
                {item.rotulo}
              </NavLink>
            ),
          )}
        </nav>

        {contexto === 'logado' ? (
          <Botao
            variante="moldura"
            className="sb-cab-acao"
            aria-pressed={madrugada}
            aria-label={ROTULO_MADRUGADA}
            onClick={aoAlternarMadrugada}
            data-cabecalho-acao=""
            data-ligado={madrugada ? '' : undefined}
          >
            <span>
              <span className="sb-cab-prefixo">{PREFIXO_MADRUGADA}</span>
              {NUCLEO_MADRUGADA}
            </span>
          </Botao>
        ) : (
          <Botao variante="moldura" className="sb-cab-acao" to={DESTINO_ENTRAR} data-cabecalho-acao="">
            {ROTULO_ENTRAR}
          </Botao>
        )}
      </div>

      <MenuCelular id={idMenu} aberto={menuAberto} contexto={contexto} aoFechar={fecharMenu} botao={botaoMenu} />
    </header>
  )
}
