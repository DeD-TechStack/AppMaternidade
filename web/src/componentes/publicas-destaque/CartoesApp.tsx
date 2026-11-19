import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { CUIDADO_DESTAQUE as CC } from '../../conteudo/publicas-destaque.ts'
import { DESENVOLVIMENTO_DESTAQUE as DD } from '../../conteudo/desenvolvimento/pagina.ts'
import { SemQuebra } from './SemQuebra.tsx'
import './publicas-destaque.css'

// As telas de exemplo das páginas públicas, em HTML de verdade (DESIGN.md 4), com a família fictícia:
// Juliana (mãe), Ícaro, Carla e a bebê Heloísa. Cada página tem no máximo um CartaoFlutuante (girado,
// com a sombra flutuante); as outras telas vão num CartaoPlano, no fluxo, sem giro e com a sombra de
// cartão. Os botões desenhados aqui são parte da tela de exemplo, não controles desta página.

/** O cartão de app no fluxo do painel: branco, raio 20, `--sombra-cartao`, sem giro nem sobra. */
export function CartaoPlano({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={['pd-cartao-plano', className].filter(Boolean).join(' ')} data-cartao-plano="">
      {children}
    </div>
  )
}

interface PropsLinha {
  inicial?: string
  bebe?: boolean
  nome: string
  detalhe: string
  hora?: string
}

function Linha({ inicial, bebe = false, nome, detalhe, hora }: PropsLinha) {
  return (
    <li className="pd-linha" data-linha-bebe={bebe ? '' : undefined}>
      {inicial ? (
        <span className="pd-avatar" data-bebe={bebe ? '' : undefined} aria-hidden="true">
          {inicial}
        </span>
      ) : null}
      <span className="pd-linha-texto">
        <span className="pd-linha-nome">{nome}</span>
        <span className="pd-linha-detalhe">
          <SemQuebra texto={detalhe} />
        </span>
      </span>
      {hora ? <span className="pd-linha-hora">{hora}</span> : null}
    </li>
  )
}

/** Cuidado compartilhado: a tela Família, com o papel de cada pessoa. */
export function CartaoFamilia() {
  const c = CC.familia
  return (
    <div className="pd-cartao">
      <p className="pd-cartao-titulo">{c.titulo}</p>
      <ul className="pd-linhas">
        <Linha inicial={c.bebe.nome[0]} bebe nome={c.bebe.nome} detalhe={c.bebe.papel} />
        {c.pessoas.map((pessoa) => (
          <Linha key={pessoa.nome} inicial={pessoa.nome[0]} nome={pessoa.nome} detalhe={pessoa.papel} />
        ))}
      </ul>
      <p className="pd-botao-falso">{c.botao}</p>
    </div>
  )
}

/** Cuidado compartilhado: o convite com prazo. */
export function CartaoConviteComPrazo() {
  const c = CC.convite
  return (
    <div className="pd-cartao pd-cartao-cabeca">
      <span className="pd-selo-ok" aria-hidden="true">
        <Check strokeWidth={2.25} />
      </span>
      <div>
        <p className="pd-linha-nome">{c.titulo}</p>
        <p className="pd-cartao-detalhe pd-mt-2">{c.prazo}</p>
      </div>
    </div>
  )
}

/**
 * Cuidado compartilhado: a tarde da Heloísa, com quem fez cada registro e a que horas (a soneca que
 * Ícaro começou e Carla encerrou), e a nota que Carla deixou para quem chega.
 */
export function CartaoTarde() {
  const c = CC.tarde
  const nota = CC.nota
  return (
    <div className="pd-cartao">
      <p className="pd-cartao-titulo">{c.titulo}</p>
      <p className="pd-cartao-detalhe pd-mt-2">{c.rotulo}</p>
      <ul className="pd-linhas">
        {c.itens.map((item) => (
          <Linha key={item.hora} inicial={item.inicial} nome={item.quem} detalhe={item.oQue} hora={item.hora} />
        ))}
      </ul>
      <div className="pd-nota">
        <p className="pd-cartao-rotulo">{nota.rotulo}</p>
        <p className="pd-nota-texto">{nota.texto}</p>
        <p className="pd-cartao-detalhe">
          <SemQuebra texto={nota.autor} />
        </p>
      </div>
    </div>
  )
}

/** Desenvolvimento: o tummy time registrado só com "fizemos", sem meta. */
export function CartaoTummy() {
  const c = DD.registro
  return (
    <div className="pd-cartao">
      <p className="pd-cartao-rotulo">{c.rotulo}</p>
      <p className="pd-cartao-hora">{c.valor}</p>
      <p className="pd-cartao-detalhe">
        <SemQuebra texto={c.detalhe} />
      </p>
    </div>
  )
}
