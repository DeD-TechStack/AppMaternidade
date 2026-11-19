import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Menu, Moon, X } from 'lucide-react'
import type { ErroDados } from '../../dados/comum.ts'
import { EntradaAvisos } from '../avisos/EntradaAvisos.tsx'
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

/**
 * As páginas da casa (o Início e as três de produto): um link entre elas navega com `viewTransition`, e o chão do
 * herói (`view-transition-name: chao`, em inicio-casa.css) passa de uma para a outra. Com movimento reduzido a
 * troca é imediata (a mesma folha anula as animações da transição).
 */
export const PAGINAS_DA_CASA: ReadonlySet<string> = new Set(['/', '/como-funciona', '/cuidado-compartilhado', '/desenvolvimento'])

// A noite do cabeçalho (DS1:RF-09) vive aqui, num guardião de módulo: uma contagem das páginas montadas que a
// pediram. Há noite enquanto a contagem for maior que zero; o `Cabecalho` a lê com `useSyncExternalStore`.
let paginasDeNoite = 0
const ouvintesDaNoite = new Set<() => void>()

function assinarNoite(ouvinte: () => void) {
  ouvintesDaNoite.add(ouvinte)
  return () => {
    ouvintesDaNoite.delete(ouvinte)
  }
}

const lerNoite = () => paginasDeNoite > 0
const lerNoiteNoServidor = () => false

function mudarNoite(passo: 1 | -1) {
  paginasDeNoite = Math.max(0, paginasDeNoite + passo)
  ouvintesDaNoite.forEach((ouvinte) => ouvinte())
}

/**
 * Liga a noite do cabeçalho enquanto a página que o chama está montada: o cabeçalho vira cacau, os links e a marca
 * ficam de papel e a pílula "Criar conta" vira contorno. Ao desmontar, o tom volta ao dia. No StrictMode o efeito
 * roda duas vezes (soma, subtrai, soma) e termina de noite.
 */
export function useCabecalhoNoite(): void {
  useEffect(() => {
    mudarNoite(1)
    return () => mudarNoite(-1)
  }, [])
}

interface Props {
  /** `publico`: os quatro links, Entrar e "Criar conta". `logado` (/app/*): Hoje, Sessão e os itens da área. */
  contexto: Contexto
  /** O "Modo madrugada" só existe nas páginas da Rotina. */
  comLua: boolean
  madrugada: boolean
  aoAlternarMadrugada: () => void
  /** Força o tom (os testes). Sem ele, o tom segue `useCabecalhoNoite()`: `dia` (papel) ou `noite` (cacau). */
  tom?: 'dia' | 'noite'
}

/**
 * O cabeçalho do site (DESIGN.md 4, CabecalhoCTA): fixo no topo, de papel (de cacau no tom `noite`), o nome em
 * Literata 600, os links e o espaço da conta, que segue a sessão: sem sessão, Entrar e a pílula "Criar conta"
 * (na linha em toda largura, ao lado do botão do menu); com sessão, "Conta" e "Sair" em toda página; enquanto a
 * sessão carrega, nada. Abaixo de 1100 px os links e "Entrar" vão para o menu de altura cheia (o botão Menu).
 * Nas páginas da Rotina, a lua liga o modo madrugada.
 */
export function Cabecalho({ contexto, comLua, madrugada, aoAlternarMadrugada, tom: tomForcado }: Props) {
  const deNoite = useSyncExternalStore(assinarNoite, lerNoite, lerNoiteNoServidor)
  const tom = tomForcado ?? (deNoite ? 'noite' : 'dia')
  // O menu guarda o caminho em que foi aberto: ao navegar (por um link dele ou não), fecha sozinho.
  const { pathname } = useLocation()
  const [abertoEm, setAbertoEm] = useState<string | null>(null)
  const menuAberto = abertoEm === pathname
  const botaoMenu = useRef<HTMLButtonElement>(null)
  const idMenu = useId()
  const fecharMenu = useCallback(() => setAbertoEm(null), [])

  const { estado, usuario, sair } = useSessao()
  // Um usuário conhecido é uma pessoa entrada, mesmo quando a leitura da conta falhou (`erro`): "visitante"
  // é só a ausência de usuário (sem sessão, ou a leitura da própria sessão que falhou).
  const situacao: SituacaoDaConta =
    estado === 'carregando' ? 'carregando' : estado === 'com_sessao' || usuario !== null ? 'com_sessao' : 'visitante'
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
    <header className="cm-cabecalho" data-cabecalho="" data-contexto={contexto} data-tom={tom}>
      {/* O primeiro Tab de toda página: pula o cabeçalho e vai ao <main> (WCAG 2.4.1). */}
      <PularParaConteudo />
      {/* O conteúdo do cabeçalho se alinha à borda do quadro; a altura e o padding vertical continuam os de hoje. */}
      <QuadroLayout className="cm-cab-miolo">
        <Link to="/" className="cm-marca" data-nome-site="" viewTransition>
          {NOME_SITE}
        </Link>

        <nav aria-label={ROTULO_NAVEGACAO} className="cm-cab-links">
          {ITENS_DO_CABECALHO[contexto].map((item) => (
            <NavLink key={item.para} to={item.para} end className="cm-cab-link" viewTransition={PAGINAS_DA_CASA.has(item.para)}>
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
              {/* A pílula do CabecalhoCTA: na linha em toda largura; de noite ela vira contorno (sem botão de mel). */}
              <Botao
                to={DESTINO_CRIAR_CONTA}
                variante={tom === 'noite' ? 'contorno' : 'primario'}
                className="cm-cab-criar"
                data-cabecalho-acao=""
                data-cabecalho-pilula=""
              >
                {ROTULO_CRIAR_CONTA}
              </Botao>
            </>
          ) : null}

          {situacao === 'com_sessao' ? (
            // Os dois ficam no cabeçalho de 1100 para cima; abaixo disso vão para o menu (mesma classe do "Entrar").
            <>
              <EntradaAvisos variante="linha" />
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
