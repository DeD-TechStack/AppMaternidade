import type { Ref } from 'react'
import { Link } from 'react-router'
import { COMUM_COMUNIDADE, LISTA, TX, textoDoErroComunidade } from '../../conteudo/comunidade.ts'
import type { ErroDados } from '../../dados/comum.ts'
import { Botao } from '../base/Botao.tsx'
import { Etiqueta } from '../base/Etiqueta.tsx'
import { Pilha } from '../base/layout/Pilha.tsx'
import { BOTAO_SECUNDARIO, LINK_ALVO } from '../conta/Partes.tsx'
import { caminhoDeEntrada } from './volta.ts'

// As peças de aviso que as telas da Comunidade repetem. O visual sai das classes do "Campo de mel" e
// das variáveis `--cor-*` do tema, que trocam na madrugada.

/** O link de ajuda: leva à âncora das regras, pelo roteador (com o subcaminho do site). */
export function LinkDeAjuda() {
  return (
    <Link to={{ pathname: '/regras-da-comunidade', hash: '#secao-ajuda-agora' }} className={LINK_ALVO}>
      {TX.ajuda}
    </Link>
  )
}

/** O aviso de saúde (TX-02) com o link "Onde pedir ajuda agora". */
export function AvisoDeSaude() {
  return (
    <div
      role="note"
      className="flex max-w-[40rem] flex-col items-start gap-1 rounded-campo border border-[var(--cor-fio-suave)] bg-[var(--cor-papel-fundo)] px-4 py-3"
    >
      <p>{TX.tx02}</p>
      <LinkDeAjuda />
    </div>
  )
}

/** O selo de texto das telas da Comunidade (TX-01). */
export function Selo() {
  return <Etiqueta>{TX.tx01}</Etiqueta>
}

/** O topo do conteúdo: o link "Voltar" (menos na C1) e o selo. */
export function TopoDaTela({ voltar }: { voltar?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {voltar ? (
        <Link to={voltar} className={LINK_ALVO}>
          {COMUM_COMUNIDADE.voltar}
        </Link>
      ) : null}
      <Selo />
    </div>
  )
}

interface ResumoProps {
  texto: string
  /** O botão do erro: "Tentar de novo" ou "Conferir". Sem rótulo, não há botão. */
  rotuloDaAcao?: string
  aoAgir?: () => void
  refResumo?: Ref<HTMLDivElement>
}

/** A frase de um erro de ação, perto do controle que falhou: `role="alert"`, com o foco movido a ela. */
export function ResumoDeErro({ texto, rotuloDaAcao, aoAgir, refResumo }: ResumoProps) {
  return (
    <div
      ref={refResumo}
      role="alert"
      tabIndex={-1}
      className="alvo-foco flex w-full flex-col items-start gap-3 rounded-campo border-[1.5px] border-[var(--cor-texto)] bg-[var(--cor-cartao)] p-4"
    >
      <p className="font-medium wrap-anywhere">{texto}</p>
      {rotuloDaAcao && aoAgir ? (
        <button type="button" className={BOTAO_SECUNDARIO} data-tamanho="app" onClick={aoAgir}>
          {rotuloDaAcao}
        </button>
      ) : null}
    </div>
  )
}

/** Quem não é escritor habilitado: o bloco que leva à entrada na comunidade, com o destino da ação. */
export function ParaEntrar({ destino }: { destino: string }) {
  return (
    <Pilha vao="grupo" className="max-w-[34rem] items-start">
      <p>{LISTA.paraPublicarFrase}</p>
      <Botao to={caminhoDeEntrada(destino)} tamanho="app">
        {LISTA.entrar}
      </Botao>
    </Pilha>
  )
}

/** "Não existe" e "não pode ver" respondem igual (TX-11), com o caminho de volta à Comunidade. */
export function NaoEncontrado() {
  return (
    <Pilha vao="grupo" className="items-start" data-estado="nao-encontrado">
      <p className="font-medium">{TX.tx11}</p>
      <Link to="/app/comunidade" className={LINK_ALVO}>
        {COMUM_COMUNIDADE.irParaComunidade}
      </Link>
    </Pilha>
  )
}

/**
 * O erro de uma leitura: não encontrado (também o `P0002`), sem permissão, rede ou qualquer outro
 * (a frase `desconhecido` com o código). Nunca mostra lista vazia nem dado parcial como se fosse a resposta.
 */
export function ErroDeLeitura({ erro, aoTentarDeNovo }: { erro: ErroDados; aoTentarDeNovo: () => void }) {
  if (erro.classe === 'sessao_encerrada') return null
  if (erro.classe === 'nao_encontrado') return <NaoEncontrado />
  if (erro.classe === 'sem_permissao') return <ResumoDeErro texto={textoDoErroComunidade(erro)} />
  const mostrado = erro.classe === 'rede' ? erro : { ...erro, chave: 'desconhecido' }
  return (
    <ResumoDeErro
      texto={textoDoErroComunidade(mostrado)}
      rotuloDaAcao={COMUM_COMUNIDADE.tentarDeNovo}
      aoAgir={aoTentarDeNovo}
    />
  )
}

/** O esqueleto da lista ou do item: só aparece se a leitura passar de 300 ms. */
export function Esqueleto({ linhas = 3 }: { linhas?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3" data-esqueleto="">
      {Array.from({ length: linhas }, (_, indice) => (
        <div key={indice} className="h-20 animate-pulse rounded-cartao bg-[var(--cor-papel-fundo)]" />
      ))}
    </div>
  )
}
