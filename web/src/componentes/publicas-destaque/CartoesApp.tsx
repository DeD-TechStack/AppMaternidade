import { Check, Moon } from 'lucide-react'
import { COMO_FUNCIONA_DESTAQUE as CF, CUIDADO_DESTAQUE as CC } from '../../conteudo/publicas-destaque.ts'
import { DESENVOLVIMENTO_DESTAQUE as DD } from '../../conteudo/desenvolvimento/pagina.ts'
import './publicas-destaque.css'

// As telas de exemplo das páginas públicas, em HTML de verdade (DESIGN.md 4, CartaoFlutuante), com a
// família fictícia: Juliana (mãe), Bruno, Carla e a bebê Heloísa. Vão dentro de um CartaoFlutuante.
// Os botões desenhados aqui são parte da tela de exemplo, não controles desta página.

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
        <span className="pd-linha-detalhe">{detalhe}</span>
      </span>
      {hora ? <span className="pd-linha-hora">{hora}</span> : null}
    </li>
  )
}

/** Como funciona, abertura: a última mamada, como o Hoje mostra. */
export function CartaoUltimaMamada() {
  const c = CF.ultimaMamada
  return (
    <div className="pd-cartao">
      <p className="pd-cartao-rotulo">{c.rotulo}</p>
      <p className="pd-cartao-hora">{c.hora}</p>
      <p className="pd-cartao-detalhe">{c.detalhe}</p>
    </div>
  )
}

/** Passo 1: o convite aceito. */
export function CartaoConvite() {
  const c = CF.convite
  return (
    <div className="pd-cartao">
      <div className="pd-cartao-cabeca">
        <span className="pd-selo-ok" aria-hidden="true">
          <Check strokeWidth={2.25} />
        </span>
        <div>
          <p className="pd-cartao-rotulo">{c.rotulo}</p>
          <p className="pd-cartao-titulo">{c.pessoa}</p>
        </div>
      </div>
      <p className="pd-cartao-detalhe">{c.papel}</p>
    </div>
  )
}

/** Passo 1: os primeiros registros dos dois responsáveis. */
export function CartaoPrimeirosRegistros() {
  const c = CF.primeirosRegistros
  return (
    <div className="pd-cartao">
      <p className="pd-cartao-titulo">{c.titulo}</p>
      <ul className="pd-linhas">
        {c.itens.map((item) => (
          <Linha key={item.tipo} nome={item.tipo} detalhe={item.detalhe} hora={item.hora} />
        ))}
      </ul>
    </div>
  )
}

/** Passo 2: o modo madrugada, com o botão grande de mel. */
export function CartaoMadrugada() {
  const c = CF.madrugada
  return (
    <div className="pd-cartao">
      <p className="pd-cartao-cabeca pd-cartao-rotulo">
        <Moon aria-hidden="true" strokeWidth={2} />
        {c.rotulo}
      </p>
      <p className="pd-cartao-rotulo pd-mt-20">{c.ultima}</p>
      <p className="pd-cartao-hora">{c.hora}</p>
      <p className="pd-cartao-detalhe">{c.detalhe}</p>
      <p className="pd-botao-redondo">{c.botao}</p>
    </div>
  )
}

/** Passo 3: o que aconteceu desde que você saiu, com a soneca de Bruno ainda em andamento. */
export function CartaoDesdeQueSaiu() {
  const c = CF.desdeQueSaiu
  return (
    <div className="pd-cartao">
      <p className="pd-cartao-titulo">{c.titulo}</p>
      <div className="pd-andamento">
        <p className="pd-cartao-rotulo">{c.andamento.rotulo}</p>
        <p className="pd-cartao-hora">{c.andamento.tempo}</p>
        <p className="pd-cartao-detalhe">{c.andamento.detalhe}</p>
      </div>
      <ul className="pd-linhas">
        {c.itens.map((item) => (
          <Linha key={item.tipo} inicial={item.inicial} nome={item.tipo} detalhe={item.detalhe} hora={item.hora} />
        ))}
      </ul>
      <div className="pd-nota">
        <p className="pd-cartao-rotulo">{c.nota.rotulo}</p>
        <p className="pd-nota-texto">{c.nota.texto}</p>
        <p className="pd-cartao-detalhe">{c.nota.autor}</p>
      </div>
    </div>
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

/** Cuidado compartilhado: uma soneca começada por um adulto e encerrada por outro. */
export function CartaoSoneca() {
  const c = CC.soneca
  return (
    <div className="pd-cartao">
      <p className="pd-cartao-rotulo">{c.titulo}</p>
      <p className="pd-cartao-hora">{c.duracao}</p>
      <ul className="pd-linhas">
        <Linha inicial={c.inicio.quem[0]} nome={c.inicio.quem} detalhe={c.inicio.rotulo} />
        <Linha inicial={c.fim.quem[0]} nome={c.fim.quem} detalhe={c.fim.rotulo} />
      </ul>
    </div>
  )
}

/** Cuidado compartilhado: a nota em destaque para quem chega. */
export function CartaoNota() {
  const c = CC.nota
  return (
    <div className="pd-cartao">
      <p className="pd-cartao-rotulo">{c.rotulo}</p>
      <p className="pd-nota-texto">{c.texto}</p>
      <p className="pd-cartao-detalhe">{c.autor}</p>
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
      <p className="pd-cartao-detalhe">{c.detalhe}</p>
    </div>
  )
}
