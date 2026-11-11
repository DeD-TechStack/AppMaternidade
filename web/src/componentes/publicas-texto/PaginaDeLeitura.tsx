import { Fragment, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import type { PaginaDeTexto } from '../../conteudo/publicas-texto.ts'
import { Botao } from '../base/Botao.tsx'
import { Ilustracao } from '../campo/Ilustracao.tsx'
import { PainelCampo } from '../campo/PainelCampo.tsx'
import { BlocoDeEmail } from './BlocoDeEmail.tsx'
import { BlocoDeLeitura } from './BlocoDeLeitura.tsx'
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
 * Página pública de leitura longa (Campo de mel). Cinco partes, de cima para baixo:
 * 1. a abertura: o nome da página (`h1`, na escala de título), logo abaixo a segunda linha em itálico (corpo de
 *    `h3`), os primeiros itens de uma lista quando a página pede e o botão de ação principal. Em 1100 px ou mais,
 *    o painel de mel (a frase de apoio repetida em itálico, mais o desenho) fica ao lado; abaixo disso, embaixo;
 * 2. o índice "Nesta página", em corpo pequeno e com um fio só;
 * 3. o parágrafo de abertura, quando há, e as seções de leitura (uns 70 caracteres por linha, à esquerda).
 * A página de tarefa (Exclusão) põe o painel de mel depois do passo a passo, na leitura, e não na abertura.
 * Quem chega por um endereço com `#secao-...` (como o link das Regras, no Contato) cai no título da seção,
 * com o foco nele.
 *
 * O `h1` leva só o nome da página (o texto exato que as rotas conferem), por isso não usa o `Titulo`
 * animado, cujo texto para leitor de tela repete as linhas; a segunda linha é um parágrafo logo depois dele.
 */
export function PaginaDeLeitura({ pagina }: { pagina: PaginaDeTexto }) {
  const { hash, key } = useLocation()
  const { nome, subtitulo, ilustracao, apoio, acao, itensNaAbertura, painelDepoisDe, blocoDeEmail, apresentacao, secoes } = pagina

  useEffect(() => {
    const alvo = tituloDoFragmento(hash, secoes)
    if (!alvo) return
    alvo.scrollIntoView?.()
    alvo.focus({ preventScroll: true })
  }, [hash, key, secoes])

  const naAbertura = painelDepoisDe === undefined
  const painel = (
    <PainelCampo como="aside" variante="mel" largura="celula" className="pt-painel">
      <p className="pt-apoio">{apoio}</p>
      <Ilustracao nome={ilustracao} carregamento={naAbertura ? 'eager' : 'lazy'} className="pt-ilustracao" />
    </PainelCampo>
  )

  return (
    <main className="cm-area pt-pagina">
      <section className="pt-abertura" data-painel={naAbertura ? 'abertura' : 'leitura'}>
        <div className="pt-cabeca">
          <h1 className="cm-h1">{ligarPalavrasCurtas(nome)}</h1>
          <p className="pt-segunda-linha">{ligarPalavrasCurtas(subtitulo)}</p>
          {itensNaAbertura ? (
            <div className="pt-texto pt-abertura-lista">
              <BlocoDeLeitura bloco={{ itens: itensNaAbertura }} />
            </div>
          ) : null}
          {blocoDeEmail ? <BlocoDeEmail /> : null}
          {acao ? (
            <div className="pt-acao">
              <Botao to={acao.para}>{acao.botao}</Botao>
            </div>
          ) : null}
        </div>
        {naAbertura ? painel : null}
      </section>
      <IndiceDaPagina secoes={secoes.map(({ secao }) => secao)} />
      <div className="pt-leitura">
        {apresentacao ? <p className="cm-lide">{apresentacao}</p> : null}
        {secoes.map((dados, indice) => (
          <Fragment key={dados.secao.id}>
            <SecaoDeTexto dados={dados} />
            {indice + 1 === painelDepoisDe ? painel : null}
          </Fragment>
        ))}
      </div>
    </main>
  )
}
