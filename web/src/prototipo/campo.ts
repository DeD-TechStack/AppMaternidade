type CampoDeDia = 'accent' | 'field-1' | 'field-2'

// Cada campo de cor tem o nome do token do dia e o do tom correspondente da madrugada. O
// atributo data-campo carrega o nome certo para o tema; a cor em si vem das variáveis de uso,
// que na madrugada já apontam para os tons da noite. O urucum vira o papel fundo escuro, o único
// campo da madrugada sem cor quente saturada (o cronômetro não ofusca).
const DA_NOITE: Record<CampoDeDia, string> = {
  accent: 'night-paper-deep',
  'field-1': 'night-field-1',
  'field-2': 'night-field-2',
}

export function nomeDoCampo(dia: CampoDeDia, madrugada: boolean): string {
  return madrugada ? DA_NOITE[dia] : dia
}
