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

// O nome legível dos 16 fusos do Brasil: o horário legal e a cidade ou região.
const NOMES_DO_BRASIL: Record<string, string> = {
  'America/Sao_Paulo': 'Horário de Brasília (São Paulo)',
  'America/Manaus': 'Horário do Amazonas (Manaus)',
  'America/Cuiaba': 'Horário do Amazonas (Cuiabá)',
  'America/Campo_Grande': 'Horário do Amazonas (Campo Grande)',
  'America/Porto_Velho': 'Horário do Amazonas (Porto Velho)',
  'America/Rio_Branco': 'Horário do Acre (Rio Branco)',
  'America/Boa_Vista': 'Horário do Amazonas (Boa Vista)',
  'America/Belem': 'Horário de Brasília (Belém)',
  'America/Fortaleza': 'Horário de Brasília (Fortaleza)',
  'America/Recife': 'Horário de Brasília (Recife)',
  'America/Maceio': 'Horário de Brasília (Maceió)',
  'America/Bahia': 'Horário de Brasília (Salvador)',
  'America/Araguaina': 'Horário de Brasília (Araguaína)',
  'America/Santarem': 'Horário de Brasília (Santarém)',
  'America/Noronha': 'Horário de Fernando de Noronha',
  'America/Eirunepe': 'Horário do Acre (Eirunepé)',
}

// A lista tem centenas de fusos e o `Intl` custa: cada nome se calcula uma vez.
const nomes = new Map<string, string>()

function calcularNome(id: string): string {
  if (id === 'UTC') return 'Tempo universal (UTC)'
  const conhecido = NOMES_DO_BRASIL[id]
  if (conhecido) return conhecido
  if (!fusoValido(id)) return id

  const cidade = id.slice(id.lastIndexOf('/') + 1).replaceAll('_', ' ')
  if (!cidade) return id
  let horario = ''
  try {
    const partes = new Intl.DateTimeFormat('pt-BR', { timeZone: id, timeZoneName: 'longGeneric' }).formatToParts(new Date())
    horario = partes.find((parte) => parte.type === 'timeZoneName')?.value ?? ''
  } catch {
    // Sem o nome do horário, fica só a cidade.
  }
  return horario && horario !== cidade ? `${horario} (${cidade})` : cidade
}

/**
 * O texto legível de um fuso para o seletor: o valor da opção continua sendo o id IANA. Nunca
 * lança: um id inválido, ou um navegador sem `Intl`, devolve o próprio id.
 */
export function nomeDoFuso(id: string): string {
  const guardado = nomes.get(id)
  if (guardado !== undefined) return guardado
  let nome: string
  try {
    nome = calcularNome(id)
  } catch {
    nome = id
  }
  if (nome !== id) nomes.set(id, nome)
  return nome
}

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
