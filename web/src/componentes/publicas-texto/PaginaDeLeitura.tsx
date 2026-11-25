import { Fragment, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import type { PaginaDeTexto } from '../../conteudo/publicas-texto.ts'
import { Botao } from '../base/Botao.tsx'
import { Pilha, QuadroLayout, Secao } from '../base/layout/index.ts'
import { useCabecalhoNoite } from '../casca/Cabecalho.tsx'
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
 * Página pública de leitura longa (F8-1: a placa de rua, em noite). Duas partes, igual nas seis páginas:
 * 1. a abertura: uma faixa de cacau, da altura do próprio texto, que é um bloco só com o cabeçalho (a página liga
 *    `useCabecalhoNoite()`): o nome da página (`h1`, o maior texto, em papel, no degrau `titulo-1`) e a frase de
 *    abertura (`subtitulo`, no degrau `abertura`); só Exclusão ("Ir para a Conta") e Contato (o bloco de e-mail) trazem
 *    uma ação. A placa da rua (M11) é a faixa de luz na parte direita (rente à borda direita e ao pé, com a altura da
 *    faixa); abaixo de 60 rem ela é uma linha própria no pé da faixa, rente à borda direita;
 * 2. o documento, sobre papel: uma coluna de leitura de 640 px na borda esquerda do quadro (a mesma do `h1`), com as
 *    seções separadas só por espaço e títulos, e o índice "Nesta página" (três seções ou mais) à direita da coluna
 *    quando o quadro tem lugar para 640 + vão + 320 (consulta de contêiner em `publicasTexto.css`), gruda na linha de
 *    âncora e marca a seção atual; abaixo disso o índice vem antes do documento, em fluxo. Com menos de três seções
 *    (Contato) não há índice e as duas seções ficam lado a lado, em telas largas.
 * Os campos `ilustracao` e `apoio` ficam no conteúdo, mas esta página não os mostra.
 * Quem chega por um endereço com `#secao-...` (como o link das Regras, no Contato) cai no título da seção,
 * com o foco nele.
 *
 * O `h1` leva só o nome da página (o texto exato que as rotas conferem), por isso não usa o `Titulo`
 * animado, cujo texto para leitor de tela repete as linhas; a frase de abertura é um parágrafo logo depois dele.
 * Nada se move na abertura: o primeiro desenho já é o final. O único movimento da página é o marcador do índice.
 */
export function PaginaDeLeitura({ pagina }: { pagina: PaginaDeTexto }) {
  useCabecalhoNoite()
  const { hash, key } = useLocation()
  const { nome, subtitulo, acao, blocoDeEmail, apresentacao, secoes } = pagina
  const temIndice = secoes.length >= 3

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
            <Pilha vao="pilha" dataH="coluna" className="pt-cabeca">
              <Pilha vao="junto">
                <h1 className="cm-h1">{ligarPalavrasCurtas(nome)}</h1>
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
          <div className={temIndice ? 'pt-pagina-grade' : 'pt-pagina-grade pt-sem-indice'}>
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
