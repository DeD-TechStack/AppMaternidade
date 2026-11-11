import { useEffect } from 'react'
import { useLocation } from 'react-router'
import type { PaginaDeTexto } from '../../conteudo/publicas-texto.ts'
import { Ilustracao } from '../campo/Ilustracao.tsx'
import { PainelCampo } from '../campo/PainelCampo.tsx'
import { IndiceDaPagina } from './IndiceDaPagina.tsx'
import { SecaoDeTexto } from './SecaoDeTexto.tsx'
import './publicasTexto.css'

/**
 * Página pública de leitura longa (Campo de mel). O título tem duas linhas: o nome da página (`h1`) e,
 * logo abaixo, a segunda linha em itálico. Em 1440 o título e a coluna de texto (até 72 caracteres) ficam
 * à esquerda e o painel de areia, com o desenho e o índice "Nesta página", à direita, desde o topo; em
 * 390 tudo empilha na ordem do DOM (título, painel, texto). Quem chega por um endereço com `#secao-...`
 * (como o link das Regras, no Contato) cai no título da seção, com o foco nele.
 *
 * O `h1` leva só o nome da página (o texto exato que as rotas conferem), por isso não usa o `Titulo`
 * animado, cujo texto para leitor de tela repete as linhas; a segunda linha é um parágrafo do mesmo tamanho.
 */
export function PaginaDeLeitura({ pagina }: { pagina: PaginaDeTexto }) {
  const { hash, key } = useLocation()
  const { nome, subtitulo, ilustracao, aviso, apresentacao, secoes } = pagina

  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1))
    const alvo = id ? document.getElementById(id) : null
    if (!alvo) return
    alvo.scrollIntoView?.()
    alvo.focus({ preventScroll: true })
  }, [hash, key])

  return (
    <main className="cm-area pt-pagina">
      <div className="pt-grade">
        <div className="pt-cabeca">
          <h1 className="cm-h1">{nome}</h1>
          <p className="pt-segunda-linha">{subtitulo}</p>
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
