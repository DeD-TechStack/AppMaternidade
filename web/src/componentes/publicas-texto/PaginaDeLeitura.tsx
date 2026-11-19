import { Fragment, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import type { PaginaDeTexto } from '../../conteudo/publicas-texto.ts'
import { Botao } from '../base/Botao.tsx'
import { Pilha, QuadroLayout, Secao } from '../base/layout/index.ts'
import { BlocoDeEmail } from './BlocoDeEmail.tsx'
import { IndiceDaPagina } from './IndiceDaPagina.tsx'
import { PlacaDaRua } from './PlacaDaRua.tsx'
import { SecaoDeTexto } from './SecaoDeTexto.tsx'
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

/**
 * Página pública de leitura longa (T2, a folha assinada em `.oc/ref/t2.md`). Duas partes, igual nas seis páginas:
 * 1. a abertura: uma faixa de cacau logo abaixo do cabeçalho, com o nome da página (`h1`, o maior texto da página,
 *    em papel), a frase de abertura (`subtitulo`, em prumo, no degrau `abertura`) e uma pílula de mel (ou, em
 *    Contato, o bloco de e-mail no lugar do botão). A placa da rua (M11) fica na parte direita da mesma faixa, rente
 *    à borda direita e ao pé dela; abaixo de 60 rem ela desce para baixo do texto, rente à borda direita;
 * 2. o documento, sobre papel: uma coluna de leitura de 640 px na borda esquerda do quadro (a mesma do `h1`), com as
 *    seções separadas só por espaço e títulos, e o índice "Nesta página" à direita da coluna quando o quadro tem
 *    lugar para 640 + vão + 320 (consulta de contêiner em `publicasTexto.css`); abaixo disso o índice vem antes do
 *    documento, em fluxo.
 * Os campos `ilustracao` e `apoio` ficam no conteúdo, mas esta página não os mostra.
 * Quem chega por um endereço com `#secao-...` (como o link das Regras, no Contato) cai no título da seção,
 * com o foco nele.
 *
 * O `h1` leva só o nome da página (o texto exato que as rotas conferem), por isso não usa o `Titulo`
 * animado, cujo texto para leitor de tela repete as linhas; a frase de abertura é um parágrafo logo depois dele.
 * Nada se move: o primeiro desenho já é o final.
 */
export function PaginaDeLeitura({ pagina }: { pagina: PaginaDeTexto }) {
  const { hash, key } = useLocation()
  const { nome, subtitulo, acao, blocoDeEmail, apresentacao, secoes } = pagina

  useEffect(() => {
    const alvo = tituloDoFragmento(hash, secoes)
    if (!alvo) return
    alvo.scrollIntoView?.()
    alvo.focus({ preventScroll: true })
  }, [hash, key, secoes])

  return (
    <main>
      <Secao as="div" className="pt-abertura" data-faixa-fundo="cacau">
        <div className="pt-abertura-grade">
          <QuadroLayout largura="leitura" className="pt-abertura-quadro">
            <Pilha vao="grupo" dataH="coluna" className="pt-cabeca">
              <Pilha vao="pilha">
                <h1 className="cm-h1 cm-exibicao">{ligarPalavrasCurtas(nome)}</h1>
                <p className="cm-lide">{subtitulo}</p>
              </Pilha>
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
          <PlacaDaRua />
        </div>
      </Secao>
      <Secao as="div" className="pt-secao-leitura">
        <QuadroLayout className="pt-pagina">
          <div className="pt-pagina-grade">
            <IndiceDaPagina secoes={secoes.map(({ secao }) => secao)} />
            <Pilha vao="midia" className="pt-leitura max-w-leitura">
              {apresentacao ? <p className="cm-lide">{apresentacao}</p> : null}
              {secoes.map((dados) => (
                <SecaoDeTexto key={dados.secao.id} dados={dados} />
              ))}
            </Pilha>
          </div>
        </QuadroLayout>
      </Secao>
    </main>
  )
}
