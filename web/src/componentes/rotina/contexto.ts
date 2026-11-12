import { createContext, useContext } from 'react'
import type { Papel } from '../../dados/comum.ts'
import type { Bebe } from '../../dados/conta.ts'
import type { ContextoRotina, DadosRotina, FamiliaDaRotina } from '../../dados/rotina.tipos.ts'

// O que o provedor da área entrega às telas: os dados, o bebê ativo (R38-03), a versão que faz as seções
// relerem (R38-12) e a confirmação única (R38-07).

export interface BebeAtivo {
  bebe: Bebe
  familia: FamiliaDaRotina
  papel: Papel
  arquivado: boolean
}

/** O que a abertura da área achou (R38-03): um bebê, a família sem bebê ou nenhuma família. */
export type SituacaoDaRotina = 'bebe' | 'familia_sem_bebe' | 'sem_familia'

export interface AcaoDaConfirmacao {
  /** Identifica a ação para o foco e para os testes. */
  chave:
    | 'desfazer'
    | 'fechar'
    | 'manter_os_dois'
    | 'excluir_este'
    | 'editar_horario'
    | 'detalhes'
    | 'tentar_de_novo'
    | 'ver_no_historico'
    | 'abrir_a_lixeira'
  rotulo: string
  executar: () => void
  /** No 38b, uma ação que é link: a rota de destino (o foco vai ao `h1` dela). */
  para?: string
}

export interface ConfirmacaoDaRotina {
  /** Muda a cada confirmação nova. */
  id: number
  texto: string
  acoes: AcaoDaConfirmacao[]
  /** A frase de uma nota que não pôde ser gravada, para a pessoa não perder o que escreveu. */
  textoDaNota?: string
}

export type NovaConfirmacao = Omit<ConfirmacaoDaRotina, 'id'>

export interface ValorRotina {
  dados: DadosRotina
  contaId: string
  contexto: ContextoRotina
  situacao: SituacaoDaRotina
  ativo: BebeAtivo | null
  /** Todos os bebês de todas as famílias, na ordem do seletor. */
  bebes: BebeAtivo[]
  /** O contexto relido já não tem o bebê que estava ativo. */
  acessoPerdido: boolean
  /** Muda a cada releitura pedida (abrir, escrever, voltar à aba, `Atualizar`). */
  versao: number
  atualizar: () => void
  escolherBebe: (id: string) => void
  /** O registro (ou nota) é de um item que esta conta pode alterar, e o bebê não está arquivado. */
  podeAlterar: (item: { criadoPor: string | null; familiaId: string; bebeId: string | null }) => boolean
  nomeDoAutor: (autor: string | null, familiaId: string) => string
  confirmacao: ConfirmacaoDaRotina | null
  mostrarConfirmacao: (nova: NovaConfirmacao) => void
  fecharConfirmacao: () => void
}

export const ContextoDaRotina = createContext<ValorRotina | null>(null)

export function useRotina(): ValorRotina {
  const valor = useContext(ContextoDaRotina)
  if (!valor) throw new Error('useRotina precisa estar dentro de ProvedorRotina')
  return valor
}
