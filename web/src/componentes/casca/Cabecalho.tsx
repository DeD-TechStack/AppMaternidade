import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Menu, Moon, X } from 'lucide-react'
import type { ErroDados } from '../../dados/comum.ts'
import { Botao } from '../base/Botao.tsx'
import { QuadroLayout } from '../base/layout/QuadroLayout.tsx'
import { ResumoErro } from '../conta/Partes.tsx'
import { useSessao } from '../conta/sessao.tsx'
import { MenuCelular } from './MenuCelular.tsx'
import { PularParaConteudo } from './PularParaConteudo.tsx'
import {
  DESTINO_CONTA,
  DESTINO_CRIAR_CONTA,
  DESTINO_ENTRAR,
  ITENS_DO_CABECALHO,
  NOME_SITE,
  ROTULO_CONTA,
  ROTULO_CRIAR_CONTA,
  ROTULO_ENTRAR,
  ROTULO_MADRUGADA,
  ROTULO_MADRUGADA_CURTO,
  ROTULO_MENU,
  ROTULO_NAVEGACAO,
  ROTULO_SAINDO,
  ROTULO_SAIR,
  type Contexto,
  type SituacaoDaConta,
} from './textos.ts'

interface Props {
  /** `publico`: os quatro links, Entrar e "Criar conta". `logado` (/app/*): Hoje, Sessão e os itens da área. */
  contexto: Contexto
  /** O "Modo madrugada" só existe nas páginas da Rotina. */
  comLua: boolean
  madrugada: boolean
  aoAlternarMadrugada: () => void
}

/**
 * O cabeçalho do site (DESIGN.md 4): fixo no topo, de papel, o nome em Literata 600 24 px, os links e o
 * espaço da conta, que segue a sessão: sem sessão, Entrar e o primário "Criar conta"; com sessão, "Conta" e
 * "Sair" em toda página; enquanto a sessão carrega, nada. Abaixo de 1100 px os links e o espaço da conta vão
 * para o menu de altura cheia (o botão Menu), e abaixo de 640 o "Criar conta" também. Nas páginas da Rotina,
 * a lua liga o modo madrugada.
 */
export function Cabecalho({ contexto, comLua, madrugada, aoAlternarMadrugada }: Props) {
  // O menu guarda o caminho em que foi aberto: ao navegar (por um link dele ou não), fecha sozinho.
  const { pathname } = useLocation()
  const [abertoEm, setAbertoEm] = useState<string | null>(null)
  const menuAberto = abertoEm === pathname
  const botaoMenu = useRef<HTMLButtonElement>(null)
  const idMenu = useId()
  const fecharMenu = useCallback(() => setAbertoEm(null), [])

  const { estado, sair } = useSessao()
  const situacao: SituacaoDaConta =
    estado === 'carregando' ? 'carregando' : estado === 'com_sessao' ? 'com_sessao' : 'visitante'
  // Os links de visitante seguem a sessão e valem onde valem hoje: nas páginas do site público.
  const comVisitante = situacao === 'visitante' && contexto === 'publico'

  const [saindo, setSaindo] = useState(false)
  const [falha, setFalha] = useState<ErroDados | null>(null)
  const resumo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (falha) resumo.current?.focus()
  }, [falha])

  // Com sucesso, a sessão acaba: numa página logada a guarda leva a /entrar com "Você saiu da conta."
  // e numa pública a pessoa fica onde está. A falha deixa a pessoa entrada, com o alerta e "Tentar de novo".
  async function aoSair() {
    if (saindo) return
    setSaindo(true)
    setFalha(null)
    const resultado = await sair()
    if (!resultado.ok) setFalha(resultado.erro)
    setSaindo(false)
  }

  return (
    <header className="cm-cabecalho" data-cabecalho="" data-contexto={contexto}>
      {/* O primeiro Tab de toda página: pula o cabeçalho e vai ao <main> (WCAG 2.4.1). */}
      <PularParaConteudo />
      {/* O conteúdo do cabeçalho se alinha à borda do quadro; a altura e o padding vertical continuam os de hoje. */}
      <QuadroLayout className="cm-cab-miolo">
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
          {comLua ? (
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
          ) : null}

          {comVisitante ? (
            <>
              <Link to={DESTINO_ENTRAR} className="cm-cab-link cm-cab-entrar">
                {ROTULO_ENTRAR}
              </Link>
              <Botao to={DESTINO_CRIAR_CONTA} className="cm-cab-criar" data-cabecalho-acao="">
                {ROTULO_CRIAR_CONTA}
              </Botao>
            </>
          ) : null}

          {situacao === 'com_sessao' ? (
            // Os dois ficam no cabeçalho de 1100 para cima; abaixo disso vão para o menu (mesma classe do "Entrar").
            <>
              <NavLink to={DESTINO_CONTA} end className="cm-cab-link cm-cab-entrar">
                {ROTULO_CONTA}
              </NavLink>
              <button
                type="button"
                className="cm-cab-link cm-cab-entrar cursor-pointer"
                disabled={saindo}
                onClick={() => void aoSair()}
              >
                {saindo ? ROTULO_SAINDO : ROTULO_SAIR}
              </button>
            </>
          ) : null}

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
      </QuadroLayout>

      <MenuCelular
        id={idMenu}
        aberto={menuAberto}
        contexto={contexto}
        situacao={situacao}
        saindo={saindo}
        aoSair={() => void aoSair()}
        aoFechar={fecharMenu}
        botao={botaoMenu}
      />

      {/* A saída que falhou: o alerta abre logo abaixo do cabeçalho, sem mudar a altura dele. */}
      {falha ? (
        <QuadroLayout className="absolute inset-x-0 top-full z-10 pt-2">
          <div className="max-w-[28rem]">
            <ResumoErro erro={falha} refResumo={resumo} repetivel aoTentarDeNovo={() => void aoSair()} />
          </div>
        </QuadroLayout>
      ) : null}
    </header>
  )
}
