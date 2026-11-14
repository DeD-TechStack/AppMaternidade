import { fusoValido } from '../../dados/comum.ts'

// A lista de fusos do controle compartilhado entre Começar, Família e Conta.

const DO_BRASIL = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'America/Boa_Vista',
  'America/Belem',
  'America/Fortaleza',
  'America/Recife',
  'America/Maceio',
  'America/Bahia',
  'America/Araguaina',
  'America/Santarem',
  'America/Noronha',
  'America/Eirunepe',
]

const PADRAO = 'America/Sao_Paulo'

/** Primeiro os fusos do Brasil; depois os demais do navegador e `UTC`, em ordem alfabética. */
export function listaDeFusos(): string[] {
  const todos = new Set<string>(['UTC'])
  try {
    for (const fuso of Intl.supportedValuesOf('timeZone')) todos.add(fuso)
  } catch {
    // Navegador sem `supportedValuesOf`: ficam os do Brasil e `UTC`.
  }
  const brasil = DO_BRASIL.filter(fusoValido)
  const resto = [...todos].filter((fuso) => !DO_BRASIL.includes(fuso)).sort((a, b) => a.localeCompare(b))
  return [...new Set([...brasil, ...resto])]
}

// O nome da cidade de cada fuso do Brasil, com acento (o identificador IANA não tem).
const CIDADES_DO_BRASIL: Readonly<Record<string, string>> = {
  'America/Sao_Paulo': 'São Paulo',
  'America/Cuiaba': 'Cuiabá',
  'America/Belem': 'Belém',
  'America/Maceio': 'Maceió',
  'America/Araguaina': 'Araguaína',
  'America/Santarem': 'Santarém',
  'America/Noronha': 'Fernando de Noronha',
  'America/Eirunepe': 'Eirunepé',
}

const parteDoNome = (fuso: string, timeZoneName: 'longGeneric' | 'shortOffset') =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, timeZoneName }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? ''

const ROTULOS = new Map<string, string>()

/**
 * O fuso em pt-BR para a lista: o nome do horário, a diferença para o UTC e a cidade, como
 * "Horário Padrão de Brasília (UTC−3, São Paulo)". O valor guardado continua o identificador IANA.
 * Fuso sem nome próprio (`UTC`, `Etc/GMT+3`) mostra só a diferença; identificador inválido volta como veio.
 */
export function rotuloDoFuso(fuso: string): string {
  const pronto = ROTULOS.get(fuso)
  if (pronto) return pronto
  let rotulo = fuso
  try {
    const diferenca = parteDoNome(fuso, 'shortOffset').replace(/^GMT(\+0)?/, 'UTC').replace('-', '−')
    const nome = parteDoNome(fuso, 'longGeneric')
    const semCidade = fuso === 'UTC' || fuso.startsWith('Etc/') || !fuso.includes('/')
    const cidade = semCidade ? '' : (CIDADES_DO_BRASIL[fuso] ?? fuso.slice(fuso.lastIndexOf('/') + 1).replaceAll('_', ' '))
    const temNome = nome !== '' && !nome.startsWith('GMT') && !nome.startsWith('UTC')
    if (temNome) rotulo = cidade ? `${nome} (${diferenca}, ${cidade})` : `${nome} (${diferenca})`
    else rotulo = cidade ? `${cidade} (${diferenca})` : diferenca
  } catch {
    // Identificador que o navegador não conhece: fica o identificador.
  }
  ROTULOS.set(fuso, rotulo)
  return rotulo
}

/** O fuso do aparelho, ou `America/Sao_Paulo` se ele não estiver na lista. */
export function fusoDoAparelho(): string {
  const lista = listaDeFusos()
  const aparelho = new Intl.DateTimeFormat().resolvedOptions().timeZone
  return aparelho && lista.includes(aparelho) ? aparelho : PADRAO
}
