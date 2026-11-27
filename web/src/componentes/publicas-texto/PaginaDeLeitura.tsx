import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import { useLocation, useNavigationType } from 'react-router'
import type { PaginaDeTexto } from '../../conteudo/publicas-texto.ts'
import { Botao } from '../base/Botao.tsx'
import { Pilha, QuadroLayout, Secao } from '../base/layout/index.ts'
import { useCabecalhoNoite } from '../casca/Cabecalho.tsx'
import { BlocoDeEmail } from './BlocoDeEmail.tsx'
import { IndiceDaPagina } from './IndiceDaPagina.tsx'
import { Luminaria } from './Luminaria.tsx'
import { SecaoDeTexto } from './SecaoDeTexto.tsx'
import '../inicio-composicao/composicao.css'
import './publicasTexto.css'

/**
 * Cola cada palavra curta ("de", "e", "o", "a", "do"...) à palavra seguinte, para a quebra de linha do título
 * nunca deixar uma delas sozinha no fim da linha. O texto não muda: os espaços continuam sendo espaços comuns
 * (só ficam dentro de um trecho que não quebra).
 */
function ligarPalavrasCurtas(texto: string): ReactNode {
  const palavras = texto.split(' ')
  const trechos: ReactNode[] = []
  for (let posicao = 0; posicao < palavras.length; posicao += 1) {
    const curta = palavras[posicao].replace(/[^\p{L}]/gu, '').length <= 2
    if (curta && posicao < palavras.length - 1) {
      trechos.push(
        <span key={posicao} className="pt-junto">
          {palavras[posicao]} {palavras[posicao + 1]}
        </span>,
      )
      posicao += 1
    } else {
      trechos.push(palavras[posicao])
    }
  }
  return trechos.map((trecho, indice) => (
    <Fragment key={indice}>
      {indice > 0 ? ' ' : null}
      {trecho}
    </Fragment>
  ))
}

/**
 * O título de seção que o fragmento do endereço (`#...`) aponta, ou `null`. O fragmento vem de fora: pode
 * ter porcentagem malformada (`%`, `%E0%A4%A`), ser desconhecido ou nem ser desta página. Nesses casos não
 * há alvo, e portanto nenhuma rolagem, nenhum foco e nenhum erro.
 */
function tituloDoFragmento(hash: string, secoes: PaginaDeTexto['secoes']): HTMLElement | null {
  let id: string
  try {
    id = decodeURIComponent(hash.slice(1))
  } catch {
    return null
  }
  if (!secoes.some(({ secao }) => secao.id === id)) return null
  return document.getElementById(id)
}

function FaixasDeLeitura({ secoes }: { secoes: PaginaDeTexto['secoes'] }) {
  const [destinatario, pilares, ...fecho] = secoes
  return (
    <>
      <Secao as="div">
        <QuadroLayout className="pt-destinatario">
          <SecaoDeTexto dados={destinatario} editorial lede />
        </QuadroLayout>
      </Secao>
      <Secao as="div" className="pt-pilares">
        <QuadroLayout className="pt-pagina">
          <SecaoDeTexto dados={pilares} editorial pilares />
        </QuadroLayout>
      </Secao>
      <Secao as="div">
        <QuadroLayout className="pt-pagina">
          <div className="pt-fecho">
            {fecho.map((dados) => <SecaoDeTexto key={dados.secao.id} dados={dados} editorial />)}
          </div>
        </QuadroLayout>
      </Secao>
    </>
  )
}

export function PaginaDeLeitura({
  pagina,
  destaques,
}: { pagina: PaginaDeTexto; destaques?: Readonly<Record<string, readonly string[]>> }) {
  useCabecalhoNoite()
  const { hash, key, pathname } = useLocation()
  const navegacao = useNavigationType()
  const caminhoAnterior = useRef<string | null>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const { nome, subtitulo, acao, blocoDeEmail, abertura, disposicao, apresentacao, secoes } = pagina
  const cena = abertura === 'cena'
  const faixas = disposicao === 'faixas'
  const temIndice = secoes.length >= 3

  useEffect(() => {
    const mudouDePagina = caminhoAnterior.current !== pathname
    caminhoAnterior.current = pathname
    if (!hash) {
      // A casca cuida da rolagem. Carga inicial e Voltar/Avançar preservam o foco do navegador.
      if (mudouDePagina && navegacao !== 'POP') titulo.current?.focus({ preventScroll: true })
      return
    }
    const alvo = tituloDoFragmento(hash, secoes)
    if (!alvo) return
    alvo.scrollIntoView?.()
    alvo.focus({ preventScroll: true })
  }, [hash, key, navegacao, pathname, secoes])

  return (
    <main className={blocoDeEmail ? 'co pt-contato' : 'co'}>
      <Secao as="div" className={cena ? 'pt-abertura pt-cena' : 'pt-abertura'} data-faixa-fundo="cacau">
        <div className="pt-abertura-grade">
          <QuadroLayout largura="leitura" className="pt-abertura-quadro">
            <Pilha vao="pilha" dataH="coluna" className="pt-cabeca">
              <Pilha vao="junto">
                <h1 ref={titulo} tabIndex={-1} className={cena ? 'co-h1' : 'co-h2'}>
                  {cena ? nome : ligarPalavrasCurtas(nome)}
                </h1>
                <p className="co-lede">{subtitulo}</p>
              </Pilha>
              {cena && apresentacao ? <p className="co-lede">{apresentacao}</p> : null}
              {blocoDeEmail ? <BlocoDeEmail /> : null}
              {acao ? (
                <div className="pt-acao">
                  <Botao variante="mel" to={acao.para}>
                    {acao.botao}
                  </Botao>
                </div>
              ) : null}
            </Pilha>
          </QuadroLayout>
          <Luminaria />
        </div>
      </Secao>
      {faixas ? (
        <FaixasDeLeitura secoes={secoes} />
      ) : (
        <Secao as="div" className="pt-secao-leitura">
          <QuadroLayout className="pt-pagina">
            <div className={temIndice ? 'pt-pagina-grade' : 'pt-pagina-grade pt-sem-indice'}>
              {temIndice ? <IndiceDaPagina secoes={secoes.map(({ secao }) => secao)} /> : null}
              <Pilha vao="midia" className="pt-leitura max-w-leitura">
                {!cena && apresentacao ? <p className="cm-lide">{apresentacao}</p> : null}
                {secoes.map((dados) => (
                  <SecaoDeTexto key={dados.secao.id} dados={dados} destaques={destaques?.[dados.secao.id]} />
                ))}
              </Pilha>
            </div>
          </QuadroLayout>
        </Secao>
      )}
    </main>
  )
}
