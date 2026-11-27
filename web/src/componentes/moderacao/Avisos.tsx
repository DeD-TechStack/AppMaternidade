import { Link } from 'react-router'
import { COMUM_COMUNIDADE } from '../../conteudo/comunidade.ts'
import { NAO_ENCONTRADO, SEM_PERMISSAO, TX, textoDoErroModeracao } from '../../conteudo/moderacao.ts'
import type { ErroDados } from '../../dados/comum.ts'
import { Pilha } from '../base/layout/Pilha.tsx'
import { ResumoDeErro } from '../comunidade/Avisos.tsx'
import { LINK_ALVO_DO_PAINEL } from './estilos.ts'

// As peças de aviso do painel. O visual é o das peças da Comunidade (`ResumoDeErro`, `Esqueleto`).

/** "Não existe" e "não pode ver" respondem igual (TX-11), com o caminho de volta à fila. */
export function NaoEncontradoNoPainel() {
  return (
    <Pilha vao="grupo" className="items-start" data-estado="nao-encontrado">
      <p className="font-medium">{NAO_ENCONTRADO.frase}</p>
      <Link to="/moderacao" className={LINK_ALVO_DO_PAINEL}>
        {NAO_ENCONTRADO.link}
      </Link>
    </Pilha>
  )
}

/** O estado "sem permissão" (TX-12), com o link para a Comunidade. Nenhuma outra leitura acontece. */
export function SemPermissao({ frasePerdida }: { frasePerdida?: string | null }) {
  return (
    <Pilha vao="grupo" className="items-start" data-estado="sem-permissao">
      {frasePerdida ? (
        <p role="alert" className="font-medium">
          {frasePerdida}
        </p>
      ) : null}
      <p className="font-medium">{TX.tx12}</p>
      <Link to="/app/comunidade" className={LINK_ALVO_DO_PAINEL}>
        {SEM_PERMISSAO.link}
      </Link>
    </Pilha>
  )
}

/**
 * O erro de uma leitura do painel: não encontrado (também o `P0002`), rede ou qualquer outro (a frase
 * `desconhecido` com o código). Nunca mostra lista vazia nem dado parcial como se fosse a resposta. O
 * `sem_permissao` e a sessão encerrada têm estado próprio, no quadro e na MAT-37.
 */
export function ErroDeLeituraNoPainel({ erro, aoTentarDeNovo }: { erro: ErroDados; aoTentarDeNovo: () => void }) {
  if (erro.classe === 'sessao_encerrada') return null
  if (erro.classe === 'nao_encontrado') return <NaoEncontradoNoPainel />
  if (erro.classe === 'sem_permissao') return <ResumoDeErro texto={textoDoErroModeracao(erro)} />
  const mostrado = erro.classe === 'rede' ? erro : { ...erro, chave: 'desconhecido' }
  return (
    <ResumoDeErro
      texto={textoDoErroModeracao(mostrado)}
      rotuloDaAcao={COMUM_COMUNIDADE.tentarDeNovo}
      aoAgir={aoTentarDeNovo}
    />
  )
}
