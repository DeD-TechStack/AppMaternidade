import { Fragment, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import type { PaginaDeTexto } from '../../conteudo/publicas-texto.ts'
import { Ilustracao } from '../campo/Ilustracao.tsx'
import { PainelCampo } from '../campo/PainelCampo.tsx'
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
 * Página pública de leitura longa (Campo de mel). O título tem duas linhas: o nome da página (`h1`) e,
 * logo abaixo, a segunda linha em itálico; em 1440 ele corre pela largura toda. Abaixo dele, a coluna de
 * texto (uns 70 caracteres por linha) fica à esquerda e o painel de areia, com o desenho e o índice
 * "Nesta página", à direita; em 390 tudo empilha na ordem do DOM (título, painel com o índice recolhido,
 * texto). Quem chega por um endereço com `#secao-...` (como o link das Regras, no Contato) cai no título
 * da seção, com o foco nele.
 *
 * O `h1` leva só o nome da página (o texto exato que as rotas conferem), por isso não usa o `Titulo`
 * animado, cujo texto para leitor de tela repete as linhas; a segunda linha é um parágrafo do mesmo tamanho.
 */
export function PaginaDeLeitura({ pagina }: { pagina: PaginaDeTexto }) {
  const { hash, key } = useLocation()
  const { nome, subtitulo, ilustracao, aviso, apresentacao, secoes } = pagina

  useEffect(() => {
    const alvo = tituloDoFragmento(hash, secoes)
    if (!alvo) return
    alvo.scrollIntoView?.()
    alvo.focus({ preventScroll: true })
  }, [hash, key, secoes])

  return (
    <main className="cm-area pt-pagina">
      <div className="pt-grade">
        <div className="pt-cabeca">
          <h1 className="cm-h1">{ligarPalavrasCurtas(nome)}</h1>
          <p className="pt-segunda-linha">{ligarPalavrasCurtas(subtitulo)}</p>
        </div>
        <PainelCampo como="aside" variante="areia" largura="celula" className="pt-painel">
          <Ilustracao nome={ilustracao} carregamento="eager" className="pt-ilustracao" />
          <IndiceDaPagina secoes={secoes.map(({ secao }) => secao)} />
        </PainelCampo>
        <div className="pt-leitura">
          {apresentacao ? <p className="cm-lide">{apresentacao}</p> : null}
          {aviso ? <p className="pt-aviso">{aviso}</p> : null}
          {secoes.map((dados) => (
            <SecaoDeTexto key={dados.secao.id} dados={dados} />
          ))}
        </div>
      </div>
    </main>
  )
}
