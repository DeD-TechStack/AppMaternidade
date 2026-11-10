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

/** O fuso do aparelho, ou `America/Sao_Paulo` se ele não estiver na lista. */
export function fusoDoAparelho(): string {
  const lista = listaDeFusos()
  const aparelho = new Intl.DateTimeFormat().resolvedOptions().timeZone
  return aparelho && lista.includes(aparelho) ? aparelho : PADRAO
}
