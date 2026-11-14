import { Fragment, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import type { PaginaDeTexto } from '../../conteudo/publicas-texto.ts'
import { Botao } from '../base/Botao.tsx'
import { Colunas, Pilha, QuadroLayout, Secao } from '../base/layout/index.ts'
import { Ilustracao } from '../campo/Ilustracao.tsx'
import { PainelCampo } from '../campo/PainelCampo.tsx'
import { BlocoDeEmail } from './BlocoDeEmail.tsx'
import { IndiceDaPagina } from './IndiceDaPagina.tsx'
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
 * Página pública de leitura longa (Campo de mel). Três partes, de cima para baixo, igual nas seis páginas:
 * 1. a abertura: o nome da página (`h1`, na escala de título), logo abaixo a segunda linha em itálico (corpo de
 *    `h3`) e o botão de ação principal (ou o cartão de e-mail, em Contato). Em 1100 px ou mais, o painel de mel
 *    (só o desenho, com 24 px de respiro em volta, e a frase de apoio logo abaixo dele) fica ao lado; abaixo
 *    disso, embaixo do botão, com o painel de no máximo 40% da altura da janela;
 * 2. o índice "Nesta página": uma lista vertical só (fechada num `details` abaixo de 1100 px);
 * 3. o parágrafo de abertura, quando há, e as seções de leitura, numa coluna só, centrada, com o mesmo fio entre
 *    uma seção e a outra.
 * Quem chega por um endereço com `#secao-...` (como o link das Regras, no Contato) cai no título da seção,
 * com o foco nele.
 *
 * O `h1` leva só o nome da página (o texto exato que as rotas conferem), por isso não usa o `Titulo`
 * animado, cujo texto para leitor de tela repete as linhas; a segunda linha é um parágrafo logo depois dele.
 */
export function PaginaDeLeitura({ pagina }: { pagina: PaginaDeTexto }) {
  const { hash, key } = useLocation()
  const { nome, subtitulo, ilustracao, apoio, acao, blocoDeEmail, apresentacao, secoes } = pagina

  useEffect(() => {
    const alvo = tituloDoFragmento(hash, secoes)
    if (!alvo) return
    alvo.scrollIntoView?.()
    alvo.focus({ preventScroll: true })
  }, [hash, key, secoes])

  return (
    <main>
      <Secao>
        <QuadroLayout>
          <Colunas fracoes="1.2fr 1fr" aPartirDe={1100} vao="midia" alinhar="centro" className="pt-abertura">
            <Pilha vao="grupo" dataH="coluna" className="pt-cabeca">
              <Pilha vao="pilha">
                <h1 className="cm-h1">{ligarPalavrasCurtas(nome)}</h1>
                <p className="pt-segunda-linha">{ligarPalavrasCurtas(subtitulo)}</p>
              </Pilha>
              {blocoDeEmail ? <BlocoDeEmail /> : null}
              {acao ? (
                <div className="pt-acao">
                  <Botao to={acao.para}>{acao.botao}</Botao>
                </div>
              ) : null}
            </Pilha>
            <Pilha vao="pilha" dataH="coluna" className="pt-figura">
              <PainelCampo como="aside" variante="mel" largura="celula" className="pt-painel">
                <Ilustracao nome={ilustracao} carregamento="eager" className="pt-ilustracao" />
              </PainelCampo>
              <p className="pt-apoio">{apoio}</p>
            </Pilha>
          </Colunas>
        </QuadroLayout>
      </Secao>
      <Secao as="div">
        <QuadroLayout largura="leitura">
          <Pilha vao="bloco" className="pt-leitura">
            <IndiceDaPagina secoes={secoes.map(({ secao }) => secao)} />
            {apresentacao ? <p className="cm-lide">{apresentacao}</p> : null}
            {secoes.map((dados) => (
              <SecaoDeTexto key={dados.secao.id} dados={dados} />
            ))}
          </Pilha>
        </QuadroLayout>
      </Secao>
    </main>
  )
}
