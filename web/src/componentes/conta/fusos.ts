import { fusoValido } from '../../dados/comum.puro.ts'

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

// O nome de uso dos quatro horários principais do Brasil (o de São Paulo é o de Brasília).
const PRINCIPAIS_DO_BRASIL: Readonly<Record<string, string>> = {
  'America/Sao_Paulo': 'Brasília',
  'America/Manaus': 'Amazonas',
  'America/Rio_Branco': 'Acre',
  'America/Noronha': 'Fernando de Noronha',
}

// O nome da cidade dos outros fusos do Brasil, com acento (o identificador IANA não tem).
const CIDADES_DO_BRASIL: Readonly<Record<string, string>> = {
  'America/Cuiaba': 'Cuiabá',
  'America/Belem': 'Belém',
  'America/Maceio': 'Maceió',
  'America/Araguaina': 'Araguaína',
  'America/Santarem': 'Santarém',
  'America/Eirunepe': 'Eirunepé',
}

const diferencaDoFuso = (fuso: string) =>
  (new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? '')
    .replace(/^GMT(\+0)?/, 'UTC')
    .replace('-', '−')

const ROTULOS = new Map<string, string>()

/**
 * O fuso em pt-BR para a lista, curto para caber na caixa fechada do seletor a 390 px: o nome e a diferença para o UTC.
 * Brasil: o nome de uso dos quatro horários principais ("Brasília (UTC−3)") e a cidade nos demais ("Fortaleza (UTC−3)").
 * Fora do Brasil: a cidade, o último trecho do identificador ("Buenos Aires (UTC−3)").
 * O valor guardado continua o identificador IANA.
 * Fuso sem nome (`UTC`, `Etc/GMT+3`) mostra só a diferença; identificador inválido volta como veio.
 */
export function rotuloDoFuso(fuso: string): string {
  const pronto = ROTULOS.get(fuso)
  if (pronto) return pronto
  let rotulo = fuso
  try {
    const diferenca = diferencaDoFuso(fuso)
    const semNome = fuso === 'UTC' || fuso.startsWith('Etc/') || !fuso.includes('/')
    const nome = semNome
      ? ''
      : (PRINCIPAIS_DO_BRASIL[fuso] ?? CIDADES_DO_BRASIL[fuso] ?? fuso.slice(fuso.lastIndexOf('/') + 1).replaceAll('_', ' '))
    rotulo = nome ? `${nome} (${diferenca})` : diferenca
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
