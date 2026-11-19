import { criarDadosAvisosMemoria } from './avisos.memoria.ts'
import type { DadosAvisos } from './avisos.ts'
import { criarDadosConta, type DadosConta } from './conta.ts'
import type { DadosRotina } from './rotina.tipos.ts'

// Os avisos em memória da página: a composição da conta e da rotina em memória (as mesmas instâncias que a página usa).
// Só `avisos.ts` chega aqui, por `import()`: o motor dos avisos fica fora do pacote de entrada e só é baixado quando
// os avisos são lidos. A conta da página chega embrulhada pelo provedor de sessão, e a exportação em memória lê da
// instância de dentro (a de `criarDadosConta()`): por isso a fonte dos avisos se registra nas duas.
export function criarAvisosMemoriaDaPagina(dadosConta: DadosConta, rotina: DadosRotina): DadosAvisos {
  return criarDadosAvisosMemoria(dadosConta, rotina, { registrarTambemEm: [criarDadosConta()] })
}
