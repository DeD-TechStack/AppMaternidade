import type { ReactNode, Ref } from 'react'
import { Link } from 'react-router'
import {
  AVISO_BANCO_DEMONSTRACAO,
  COMUM,
  ETIQUETA_PROTOTIPO,
  textoDoErro,
} from '../../conteudo/conta.ts'
import { AVISO_DEMONSTRACAO } from '../../conteudo/textos.ts'
import { modoDados, type ErroDados } from '../../dados/comum.ts'
import { Botao } from '../base/Botao.tsx'
import { Etiqueta } from '../base/Etiqueta.tsx'
import { LinhaRotuloTexto } from '../base/LinhaRotuloTexto.tsx'

// As peças das telas de acesso no sistema novo (MAT-44d-3): o que a base (`componentes/base/`) não
// traz pronto para estas telas. A marcação e as classes são as da base (`sb-*`, `t-*`).

/** O bloco do formulário: abaixo da abertura, a 32 px do fio dela (16 abaixo de 768). */
export function BlocoDoFormulario({ children }: { children: ReactNode }) {
  return (
    <div className="sb-area sb-mt-fio-bloco" data-bloco="">
      {children}
    </div>
  )
}

/** O botão de envio: primário de 80 px (64 abaixo de 768), `disabled` enquanto o envio está em curso. */
export function BotaoEnvio({ enviando, children }: { enviando: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={enviando}
      className="sb-botao t-botao alvo-toque"
      data-botao="primario"
    >
      {children}
    </button>
  )
}

/** O estado carregando: o texto, sem formulário clicável, na coluna c2–c8. */
export function CarregandoAcesso() {
  return <p className="sb-status t-corpo">{COMUM.carregando}</p>
}

/**
 * A região de status da tela: única, sempre no DOM (para o leitor de tela anunciar o que entra
 * nela), não move o foco e não some sozinha. Vazia, fica fora da vista; com texto, ocupa c2–c8.
 */
export function RegiaoStatusAcesso({ mensagem }: { mensagem: string | null }) {
  return (
    <div role="status" className={mensagem ? 'sb-status t-corpo wrap-anywhere' : 'sr-only'}>
      {mensagem}
    </div>
  )
}

interface ResumoErroAcessoProps {
  erro: ErroDados
  /** O botão "Tentar de novo" aparece quando há a ação e a classe do erro pede repetição. */
  aoTentarDeNovo?: () => void
  repetivel?: boolean
  refResumo?: Ref<HTMLDivElement>
  children?: ReactNode
}

/** A frase do catálogo no topo do formulário; o foco vai para ela num envio com erro. */
export function ResumoErroAcesso({ erro, aoTentarDeNovo, repetivel = false, refResumo, children }: ResumoErroAcessoProps) {
  return (
    <div ref={refResumo} role="alert" tabIndex={-1} className="sb-resumo alvo-foco">
      <p className="sb-resumo-texto t-corpo wrap-anywhere">{textoDoErro(erro)}</p>
      {children}
      {repetivel && aoTentarDeNovo ? (
        <Botao variante="moldura" className="alvo-toque" onClick={aoTentarDeNovo}>
          {COMUM.tentarDeNovo}
        </Botao>
      ) : null}
    </div>
  )
}

/** O link do corpo da tela (fora da abertura): alvo de toque inteiro e o sublinhado da base. */
export function LinkAcesso({ para, children }: { para: string; children: ReactNode }) {
  return (
    <Link to={para} className="sb-acesso-link t-corpo alvo-toque">
      {children}
    </Link>
  )
}

/** A etiqueta de protótipo da coluna lateral da abertura. */
export function ItemEtiquetaPrototipo() {
  return (
    <li>
      <Etiqueta>{ETIQUETA_PROTOTIPO}</Etiqueta>
    </li>
  )
}

/** Um link da coluna lateral da abertura: o estilo de link do sistema, com o alvo de toque inteiro. */
export function ItemLinkDaAbertura({ para, children }: { para: string; children: ReactNode }) {
  return (
    <li>
      <Link to={para} className="sb-abertura-link t-corpo alvo-toque">
        {children}
      </Link>
    </li>
  )
}

/**
 * O aviso de demonstração na coluna lateral da abertura, em `ui` 15/21, sem borda nem fundo. Sem as
 * variáveis do banco (modo memória), é o aviso de que nada é salvo, em toda tela de acesso. Com o
 * banco, é o aviso do banco de teste, só onde a tela o pede (`doBanco`, em Criar conta).
 */
export function ItemAvisoDeDemonstracao({ doBanco = false }: { doBanco?: boolean }) {
  const comBanco = modoDados() === 'supabase'
  if (comBanco && !doBanco) return null

  return (
    <li>
      <p
        data-aviso={comBanco ? 'banco-de-demonstracao' : 'demonstracao'}
        className="sb-acesso-aviso t-ui t-secundario"
      >
        {comBanco ? AVISO_BANCO_DEMONSTRACAO : AVISO_DEMONSTRACAO}
      </p>
    </li>
  )
}

interface LinhasDeExplicacaoProps {
  /** O tema do bloco: o nome acessível da seção. */
  tema: string
  linhas: ReadonlyArray<{ rotulo: string; texto: string }>
}

/** As linhas "rótulo + texto" do fim da tela, a 160 px do bloco de cima (48 abaixo de 768). */
export function LinhasDeExplicacao({ tema, linhas }: LinhasDeExplicacaoProps) {
  return (
    <section className="sb-area sb-mt-midia-linhas" aria-label={tema} data-bloco="">
      {linhas.map((linha) => (
        <LinhaRotuloTexto key={linha.rotulo} rotulo={linha.rotulo}>
          {linha.texto}
        </LinhaRotuloTexto>
      ))}
    </section>
  )
}
