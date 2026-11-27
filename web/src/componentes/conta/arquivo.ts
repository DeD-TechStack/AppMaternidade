import { dataNoFuso, type ErroDados, type Resultado } from '../../dados/comum.ts'

export const EXPORTACAO_INCOMPLETA = {
  erro: { classe: 'desconhecido', chave: 'exportacao_incompleta', codigo: '', mensagemOriginal: '' } satisfies ErroDados,
  texto: 'A exportação completa dos seus dados está indisponível no momento. Nenhum arquivo foi baixado.',
}

const objeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)
const lista = (valor: unknown): valor is Array<Record<string, unknown>> =>
  Array.isArray(valor) && valor.every(objeto)
const texto = (valor: unknown): valor is string => typeof valor === 'string' && valor !== ''

/** O SQL legado usa a mesma marca v1; as seções precisam vir explícitas, mesmo quando vazias. */
function exportacaoCompleta(valor: unknown): boolean {
  if (!objeto(valor) || valor.formato !== 'appmaternidade-exportacao-v1' || !texto(valor.gerado_em)) return false
  const { conta, avisos, familias } = valor
  return objeto(conta) && texto(conta.id) && texto(conta.nome_privado) && texto(conta.fuso) && texto(conta.criada_em) &&
    (conta.email === null || texto(conta.email)) &&
    lista(valor.vinculos) && lista(valor.registros) && lista(valor.notas) &&
    objeto(avisos) && typeof avisos.ligados === 'boolean' && (avisos.vistos_ate === null || texto(avisos.vistos_ate)) &&
    lista(familias) && familias.every((familia) =>
      texto(familia.id) && texto(familia.nome) && texto(familia.fuso) && texto(familia.criada_em) &&
      lista(familia.membros) && lista(familia.bebes) && lista(familia.convites) &&
      lista(familia.registros) && lista(familia.notas),
    )
}

export function validarExportacao(resultado: Resultado<unknown>): Resultado<unknown> {
  if (!resultado.ok || exportacaoCompleta(resultado.valor)) return resultado
  return { ok: false, erro: EXPORTACAO_INCOMPLETA.erro }
}

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
  // Depois do clique, para o download começar antes de o endereço deixar de valer.
  setTimeout(() => URL.revokeObjectURL(endereco))
}
