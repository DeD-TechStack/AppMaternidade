// Textos mínimos da casca estática do TelefoneDemo (carregados com a Início).
// Mantido separado de textos.ts para não levar strings do motor para o pacote de entrada.

export type FluxoDemoTelefone = 'historico' | 'hoje' | 'familia' | 'notas'

export const DEMO_CASCA = {
  experimentar: 'Experimentar',
  carregando: 'Abrindo…',
  erroCarga: 'Não foi possível abrir a prévia.',
  nomes: {
    historico: 'Histórico',
    hoje: 'Hoje à noite',
    familia: 'Cuidado compartilhado',
    notas: 'Notas',
  },
  experimentarFluxo: (fluxo: FluxoDemoTelefone) => `Experimentar ${DEMO_CASCA.nomes[fluxo]}`,
  abrindoFluxo: (fluxo: FluxoDemoTelefone) => `Abrindo… ${DEMO_CASCA.nomes[fluxo]}`,
} as const
