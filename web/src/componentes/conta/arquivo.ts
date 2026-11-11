import { dataNoFuso } from '../../dados/comum.ts'

/** `appmaternidade-dados-AAAA-MM-DD.json`, com a data no fuso da conta. */
export function nomeDoArquivoDeDados(fuso: string, instante: number = Date.now()): string {
  return `appmaternidade-dados-${dataNoFuso(instante, fuso)}.json`
}

/** Baixa o JSON como arquivo, sem mudar o conteúdo, formatado com 2 espaços. */
export function baixarJson(conteudo: unknown, nome: string): void {
  const arquivo = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' })
  const endereco = URL.createObjectURL(arquivo)
  const ligacao = document.createElement('a')
  ligacao.href = endereco
  ligacao.download = nome
  document.body.appendChild(ligacao)
  ligacao.click()
  ligacao.remove()
  URL.revokeObjectURL(endereco)
}
