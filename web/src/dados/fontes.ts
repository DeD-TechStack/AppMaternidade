import type { DadosRotina, Nota, Registro } from './rotina.tipos.ts'

// ---- os registros que ligam a conta em memória à rotina e aos avisos em memória (RF-13, RF14:RF-15) --------------------
// Ficam aqui, e não em `conta.memoria.ts`, porque a fachada da página (`sessao.tsx`, `rotina.ts`, `avisos.ts`) precisa
// registrar fontes e carregadores sem baixar o motor da memória: o motor e a fixture só chegam quando alguém usa a conta
// em memória. Tudo é chaveado pelo objeto da conta; uma cópia (o que o provedor de sessão faz da conta) e o motor de
// dentro da fachada apontam para a conta "original" por `registrarOrigemDaConta`.

/**
 * Quem leva os registros e as notas da rotina para a exportação (RF-13). A memória da rotina se registra aqui
 * com `registrarFonteDeExportacao(conta, ...)`, chaveada pelo objeto da conta; sem rotina ligada, as listas
 * saem vazias. A assinatura de `exportarDados` não muda.
 */
interface FonteDeExportacao {
  registros: () => readonly Registro[]
  notas: () => readonly Nota[]
  /** Zera a autoria (`criadoPor`, `encerradoPor`, `excluidoPor`, `excluidaPor`) de quem teve a conta excluída. */
  anonimizarAutor?: (contaId: string) => void
  /** A rotina em memória dona desta fonte: quem precisa lê-la (os avisos) usa esta em vez de criar outra. */
  rotina?: () => DadosRotina
}

/**
 * Quem leva a preferência de avisos e o "visto até" da conta para a exportação (RF14:RF-15). A memória dos
 * avisos se registra aqui com `registrarFonteDeAvisos(conta, ...)`; sem ela, a conta exporta desligado e
 * sem "visto até". O "visto até" vem como instante ISO, ou `null`.
 */
type FonteDeAvisos = (contaId: string) => { ligados: boolean; vistosAte: string | null }

export const SEM_ROTINA: FonteDeExportacao = { registros: () => [], notas: () => [] }
const SEM_AVISOS: FonteDeAvisos = () => ({ ligados: false, vistosAte: null })

const fontesDeExportacao = new WeakMap<object, FonteDeExportacao>()
const carregadoresDaFonte = new WeakMap<object, () => Promise<unknown>>()
const fontesDeAvisos = new WeakMap<object, FonteDeAvisos>()
const origensDaConta = new WeakMap<object, object>()

const origemDe = (conta: object): object => origensDaConta.get(conta) ?? conta

/**
 * Diz que `copia` (o que um provedor faz da conta, como o `envolver` da sessão, ou o motor de dentro da fachada) é a
 * mesma memória que `original`: a fonte registrada pela rotina sobre a cópia vale para a exportação e para a exclusão
 * da conta original.
 */
export function registrarOrigemDaConta(copia: object, original: object): void {
  origensDaConta.set(copia, origemDe(original))
}

export function registrarFonteDeExportacao(conta: object, fonte: FonteDeExportacao): void {
  fontesDeExportacao.set(origemDe(conta), fonte)
}

/** A fonte já registrada para esta conta (ou para a original, se for cópia); `undefined` se a rotina ainda não chegou. */
export function fonteDeExportacao(conta: object): FonteDeExportacao | undefined {
  return fontesDeExportacao.get(origemDe(conta))
}

/** A rotina em memória já registrada para esta conta (ou para a original, se for cópia); `undefined` se não há. */
export function rotinaRegistrada(conta: object): DadosRotina | undefined {
  return fonteDeExportacao(conta)?.rotina?.()
}

/**
 * Quem carrega a rotina em memória sob demanda (o motor só é baixado quando a rotina ou os avisos são usados). A
 * exportação e a exclusão da conta esperam este carregador antes de ler a fonte, para que a rotina entre nelas mesmo
 * quando a pessoa nunca abriu a rotina.
 */
export function registrarCarregadorDaFonte(conta: object, carregar: () => Promise<unknown>): void {
  carregadoresDaFonte.set(origemDe(conta), carregar)
}

export function carregadorDaFonte(conta: object): (() => Promise<unknown>) | undefined {
  return carregadoresDaFonte.get(origemDe(conta))
}

/** Diz se a rotina em memória já registrou a fonte de exportação (ou um carregador dela) para esta conta (ou a original, se for cópia). */
export function temFonteDeExportacao(conta: object): boolean {
  const origem = origemDe(conta)
  return fontesDeExportacao.has(origem) || carregadoresDaFonte.has(origem)
}

export function registrarFonteDeAvisos(conta: object, fonte: FonteDeAvisos): void {
  fontesDeAvisos.set(conta, fonte)
}

/** A fonte de avisos da conta (ou da original, se for o motor de dentro da fachada); sem ela, desligado. */
export function fonteDeAvisos(conta: object): FonteDeAvisos {
  return fontesDeAvisos.get(conta) ?? fontesDeAvisos.get(origemDe(conta)) ?? SEM_AVISOS
}
