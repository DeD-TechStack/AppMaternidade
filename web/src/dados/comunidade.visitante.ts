import type { Resultado } from './comum.ts'
import { erroDaChaveComunidade } from './comunidade.erros.ts'
import type { DadosComunidade, OperacaoComunidade } from './comunidade.ts'
import type { EstadoComunidade } from './comunidade.memoria.ts'

// O visitante da demonstração (só no modo memória, nunca no Supabase): quem não tem conta lê a Comunidade de
// exemplo com uma identidade fixa. Ela vira conta habilitada (as políticas de leitura da memória pedem isso),
// mas não tem perfil, aceite nem papel, e não é o id de nenhuma conta da fixture. A publicação continua pedindo conta.

const ID_DO_VISITANTE = '47000000-0000-4000-8000-0000000000f0'

/** As operações do visitante sem conta: só leituras. As demais pedem conta (`sessao_encerrada`). */
const LEITURAS_DO_VISITANTE: ReadonlySet<OperacaoComunidade> = new Set<OperacaoComunidade>([
  'situacaoDaConta',
  'lerPerfis',
  'listarEspacos',
  'listarTopicos',
  'lerTopico',
  'lerRespostas',
  'lerResposta',
  'listarBloqueios',
])

/** A conta da memória: a da sessão ou, sem ela, o visitante (que entra na lista de contas habilitadas). */
export function contaOuVisitante(estado: EstadoComunidade, contaDaSessao: string | null): string {
  const conta = contaDaSessao ?? ID_DO_VISITANTE
  if (!estado.contas.includes(conta)) estado.contas.push(conta)
  return conta
}

type Operacao = (...args: unknown[]) => Promise<Resultado<unknown>>

interface ReacoesDaDemonstracao {
  tem(topicoId: string): boolean
  alternar(topicoId: string): boolean
}

const reacoesPorMemoria = new WeakMap<DadosComunidade, ReacoesDaDemonstracao>()

/** A reação pertence à instância da página em memória e fica disponível só para o visitante. */
export function obterReacoesDaDemonstracao(dados: DadosComunidade): ReacoesDaDemonstracao | undefined {
  return reacoesPorMemoria.get(dados)
}

/** A fachada em memória permite ler e reagir sem conta. As operações de publicação ainda pedem conta. */
export function comVisitante(
  memoria: DadosComunidade & { readonly estado: EstadoComunidade },
  contaDaSessao: () => string | null,
): DadosComunidade {
  const dados = { ...memoria } as unknown as Record<OperacaoComunidade, Operacao>
  for (const nome of Object.keys(dados) as OperacaoComunidade[]) {
    const operacao = dados[nome]
    if (typeof operacao !== 'function' || LEITURAS_DO_VISITANTE.has(nome)) continue
    dados[nome] = (...args) =>
      contaDaSessao()
        ? operacao(...args)
        : Promise.resolve({ ok: false, erro: erroDaChaveComunidade('sessao_encerrada') })
  }
  const fachada = dados as unknown as DadosComunidade
  const apoios = new Set<string>()
  reacoesPorMemoria.set(fachada, {
    tem: (topicoId) => apoios.has(topicoId),
    alternar: (topicoId) => {
      if (contaDaSessao() || !memoria.estado.topicos.some((topico) => topico.id === topicoId && topico.estado === 'visivel')) {
        return apoios.has(topicoId)
      }
      if (apoios.delete(topicoId)) return false
      apoios.add(topicoId)
      return true
    },
  })
  return fachada
}
