import { ESCOLHA_DE_BEBE } from '../../conteudo/resumoRotina.ts'
import { HOJE } from '../../conteudo/rotina.ts'
import { diaDaFamilia, formatarIdade } from '../../dados/rotina.dia.ts'
import type { ContextoRotina } from '../../dados/rotina.tipos.ts'
import { listarBebes, ordenarParaOSeletor } from '../rotina/ProvedorRotina.tsx'

// Quem pode ter o resumo e a escolha do bebê (RF12, RF-02 e RF-03). O bebê elegível é o ativo de uma família em
// que a conta é responsável. A ordem é a do seletor da Rotina (famílias por nome, bebês por nome, desempate por id,
// arquivados por último); aqui só entram os elegíveis, e os arquivados nunca são oferecidos.

/** Uma opção da escolha de bebê. O nome do bebê aparece só no `rotulo`, só na escolha (RF-03), e nunca no bloco. */
export interface OpcaoDeBebe {
  id: string
  /** `<nome>, <idade>`, mais ` · <família>` se os elegíveis são de mais de uma família, e ` (2)`, ` (3)` nos repetidos. */
  rotulo: string
  /** O fuso da família do bebê: o dia de hoje e a janela de 7 dias seguem esse fuso (RF-06, RF-07). */
  fuso: string
}

/** Por que o painel não oferece escolhas (RF-02), na ordem de prioridade. */
export type MotivoDoImpedimento = 'sem_familia' | 'sem_bebe' | 'so_responsavel' | 'sem_bebe_ativo'

type AcessoAoResumo = { tipo: 'impedido'; motivo: MotivoDoImpedimento } | { tipo: 'liberado'; opcoes: OpcaoDeBebe[] }

/** Os rótulos das opções: o `<nome>, <idade>`, o sufixo de família e o desempate numerado (RF-03). */
function opcoesDosElegiveis(elegiveis: ReturnType<typeof listarBebes>, agora: number): OpcaoDeBebe[] {
  const emVariasFamilias = new Set(elegiveis.map((item) => item.familia.id)).size > 1
  const vistos = new Map<string, number>()
  return elegiveis.map((item) => {
    const idade = formatarIdade(item.bebe.nascimento, diaDaFamilia(agora, item.familia.fuso))
    const base = HOJE.linhaDoBebe(item.bebe.nome, idade)
    const comFamilia = emVariasFamilias ? ESCOLHA_DE_BEBE.doFamilia(base, item.familia.nome) : base
    const ordem = (vistos.get(comFamilia) ?? 0) + 1
    vistos.set(comFamilia, ordem)
    return { id: item.bebe.id, rotulo: ordem === 1 ? comFamilia : ESCOLHA_DE_BEBE.repetido(comFamilia, ordem), fuso: item.familia.fuso }
  })
}

/**
 * A conferência de acesso, feita uma vez, com o contexto lido na abertura do painel (RF-19): sem família, nenhuma
 * família com bebê, bebê mas nenhum sob a responsabilidade da conta, ou só arquivados (RF-02, nesta ordem); senão,
 * as opções de bebê, na ordem do seletor da Rotina. `agora` é o instante da leitura, para a idade.
 */
export function decidirAcesso(contexto: ContextoRotina, agora: number): AcessoAoResumo {
  if (contexto.familias.length === 0) return { tipo: 'impedido', motivo: 'sem_familia' }
  const todos = ordenarParaOSeletor(listarBebes(contexto))
  if (todos.length === 0) return { tipo: 'impedido', motivo: 'sem_bebe' }
  const doResponsavel = todos.filter((item) => item.papel === 'responsavel')
  if (doResponsavel.length === 0) return { tipo: 'impedido', motivo: 'so_responsavel' }
  const elegiveis = doResponsavel.filter((item) => !item.arquivado)
  if (elegiveis.length === 0) return { tipo: 'impedido', motivo: 'sem_bebe_ativo' }
  return { tipo: 'liberado', opcoes: opcoesDosElegiveis(elegiveis, agora) }
}
