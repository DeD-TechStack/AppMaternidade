import { useLayoutEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { Coluna, Colunas } from '../base/layout/Colunas.tsx'
import { QuadroLayout } from '../base/layout/QuadroLayout.tsx'
import { Secao } from '../base/layout/Secao.tsx'
import { RevelacaoPorBaixo } from '../../movimento/RevelacaoPorBaixo.tsx'
import { COLUNAS_DO_RODAPE, FRASE_DO_RODAPE, NOME_SITE, ROTULO_NAVEGACAO_RODAPE } from './textos.ts'

/**
 * O rodapé das rotas /app/*: o nome do site em texto pequeno e, embaixo, todos os links numa linha que quebra, sem o
 * painel de mel. Fica no mesmo QuadroLayout da moldura logada: a borda esquerda é a do conteúdo da tela.
 */
function RodapeCompacto() {
  return (
    <footer className="cm-rodape cm-rodape-compacto" data-rodape="" id="rodape">
      <QuadroLayout className="cm-rodape-compacto-quadro">
        <p className="cm-rodape-compacto-marca cm-pequeno" data-marca-rodape="">
          {NOME_SITE}
        </p>
        <nav aria-label={ROTULO_NAVEGACAO_RODAPE} className="cm-rodape-compacto-nav">
          {COLUNAS_DO_RODAPE.flatMap((coluna) => coluna.links).map((link) => (
            <Link key={link.para} to={link.para} className="cm-rodape-link">
              {link.rotulo}
            </Link>
          ))}
        </nav>
      </QuadroLayout>
    </footer>
  )
}

/** O nome com um ponto de quebra antes de cada maiúscula interna (`App<wbr>Maternidade`); o texto não muda. */
function nomeQuebravel(nome: string): ReactNode[] {
  return nome.split(/(?=[A-Z])/).flatMap((parte, i) => (i === 0 ? [parte] : [<wbr key={i} />, parte]))
}

/**
 * Página curta: o `<main>` mede menos de 1,5 vez a altura da janela (404, Contato, acesso, Moderação). Medido antes
 * da pintura, quando o `<main>` muda de tamanho e quando a janela muda. Sem `<main>`, vale a página longa.
 */
function usePaginaCurta(): boolean {
  const { pathname } = useLocation()
  const [curta, setCurta] = useState(false)
  useLayoutEffect(() => {
    const main = document.querySelector('main')
    const medir = () => setCurta(main ? main.getBoundingClientRect().height < 1.5 * window.innerHeight : false)
    medir()
    window.addEventListener('resize', medir)
    const observador = main && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    if (main) observador?.observe(main)
    return () => {
      window.removeEventListener('resize', medir)
      observador?.disconnect()
    }
  }, [pathname])
  return curta
}

/**
 * O rodapé do site (DESIGN.md 4): um painel de mel com a frase, as colunas Produto, Ajuda e Legal (todo link vai a
 * uma rota pública), o nome em Literata e o aviso de demonstração numa linha (`comAviso`: só no site público; as
 * telas do app têm a etiqueta delas). Página longa: o nome na largura do miolo do painel, e o conteúdo sai de baixo,
 * de -30 % a 0, preso à rolagem (M7). Página curta (`data-pagina-curta`): o nome no tamanho `exibicao` e o conteúdo
 * parado no lugar, sem a revelação (numa página que quase não rola, ela deixava links cortados em repouso).
 */
export function Rodape({ comAviso = true }: { comAviso?: boolean }) {
  // Nas rotas /app/* o rodapé é uma linha só de links: sem o nome grande, sem a frase nem o painel de mel.
  // O aviso não entra aqui (as telas do app trazem o delas).
  const { pathname } = useLocation()
  const curta = usePaginaCurta()
  if (pathname === '/app' || pathname.startsWith('/app/')) return <RodapeCompacto />

  const conteudo = (
    <>
      <Colunas fracoes="5fr 7fr" aPartirDe={1100}>
        <Coluna>
          <p className="cm-h3 cm-rodape-frase">
            {FRASE_DO_RODAPE[0]}
            <span className="cm-segunda-linha">{FRASE_DO_RODAPE[1]}</span>
          </p>
        </Coluna>
        <Coluna>
          <nav aria-label={ROTULO_NAVEGACAO_RODAPE} className="cm-rodape-colunas">
            {COLUNAS_DO_RODAPE.map((coluna) => (
              <div key={coluna.titulo} data-coluna={coluna.titulo.toLowerCase()}>
                <h2 className="cm-rodape-titulo">{coluna.titulo}</h2>
                <ul className="cm-rodape-lista">
                  {coluna.links.map((link) => (
                    <li key={link.para}>
                      <Link to={link.para} className="cm-rodape-link">
                        {link.rotulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </Coluna>
      </Colunas>

      <p className="cm-rodape-nome" data-nome-rodape="" aria-hidden="true">
        {nomeQuebravel(NOME_SITE)}
      </p>

      {comAviso ? (
        <div className="cm-rodape-base cm-pequeno">
          <AvisoDemonstracao rodape />
        </div>
      ) : null}
    </>
  )

  // O rodapé do site é um painel: a caixa externa (`footer`, sem fundo, metade de `espaco-bloco` em cima e embaixo)
  // e, dentro, a caixa de mel com a largura do quadro. A frase e as colunas de links são duas colunas de texto.
  return (
    <Secao
      as="footer"
      variante="painel"
      painel="mel"
      className="cm-rodape"
      classeCaixa="cm-rodape-painel"
      data-rodape=""
      data-pagina-curta={curta ? '' : undefined}
      id="rodape"
    >
      {curta ? (
        <div className="cm-rodape-conteudo">{conteudo}</div>
      ) : (
        <RevelacaoPorBaixo variante="M7" className="cm-rodape-conteudo">
          {conteudo}
        </RevelacaoPorBaixo>
      )}
    </Secao>
  )
}
