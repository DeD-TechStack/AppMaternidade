import axe from 'axe-core'

// O axe-core recusa uma segunda execução ("Axe is already running") enquanto outra está viva, e a de um teste que
// estourou o tempo continua viva. Aqui as execuções entram numa fila: cada uma só começa depois que a anterior
// terminou, com sucesso ou com erro.

let fila: Promise<unknown> = Promise.resolve()

export function rodarAxe(contexto: axe.ElementContext, opcoes?: axe.RunOptions): Promise<axe.AxeResults> {
  const execucao = fila.then(() => (opcoes === undefined ? axe.run(contexto) : axe.run(contexto, opcoes)))
  fila = execucao.catch(() => undefined)
  return execucao
}
