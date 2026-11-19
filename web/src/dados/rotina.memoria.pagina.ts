import type { DadosConta } from './conta.ts'
import { criarFixtureRotinaDemonstracao } from './rotina.demonstracao.ts'
import { criarDadosRotinaMemoria } from './rotina.memoria.ts'
import type { DadosRotina } from './rotina.tipos.ts'

// A rotina em memória da página: o motor (`rotina.memoria.ts`) com a fixture de demonstração. Só `rotina.ts` chega
// aqui, por `import()`: assim o motor e a fixture ficam fora do pacote de entrada e só são baixados quando a rotina
// (ou os avisos, ou a exportação da conta em memória) é usada.
export function criarRotinaMemoriaDaPagina(dadosConta: DadosConta): DadosRotina {
  return criarDadosRotinaMemoria(dadosConta, criarFixtureRotinaDemonstracao(Date.now()))
}
