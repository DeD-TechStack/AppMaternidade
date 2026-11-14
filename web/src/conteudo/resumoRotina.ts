import { ESTADOS, TOTAIS } from './rotina.ts'

// O texto do resumo da rotina que a Comunidade pode incluir (RF12, A3, RN-04): o bloco que entra no corpo
// (RF-08) e as frases dos estados do painel (RF-15). Os literais são os da spec RF12 v3 (RN-08): mudar uma
// redação exige versão nova da spec. As frases de "sem família" e "família sem bebê" são as da Rotina; os rótulos
// dos números são os dos totais do Histórico.

/** O bloco: 1 linha de título e 1 linha por número marcado (RF-08). */
export const BLOCO_DO_RESUMO = {
  tituloHoje: 'Resumo da rotina de hoje até agora:',
  /** `N` em algarismos, e `1 dia` no singular. */
  tituloSemana: (dias: number) =>
    `Resumo da rotina dos últimos 7 dias (média por dia, em ${dias === 1 ? '1 dia' : `${dias} dias`} com registro):`,
  linha: (rotulo: string, valor: string) => `- ${rotulo}: ${valor}`,
  /** O valor de uma linha da semana: `12 h 05 por dia`. */
  porDia: (valor: string) => `${valor} por dia`,
  /** A mamadeira de hoje: a mesma frase do Histórico (`2, somando 240 ml`). */
  mamadeirasDeHoje: TOTAIS.mamadeirasComMl,
  /** A mamadeira da semana: a contagem leva vírgula decimal (`1,3 por dia, somando 180 ml por dia`). */
  mamadeirasDaSemana: (contagem: string, ml: number) => `${contagem} por dia, somando ${ml} ml por dia`,
  rotulos: {
    sono: TOTAIS.sono,
    tummy: TOTAIS.tummy,
    mamadas: TOTAIS.mamadas,
    mamadeiras: TOTAIS.mamadeiras,
    fraldas: TOTAIS.fraldas,
    solidos: TOTAIS.solidos,
  },
} as const

/** O texto de cada estado de dados do painel (RF-02, RF-15). */
export const ESTADOS_DO_RESUMO = {
  lendo: 'Lendo a rotina…',
  falhaNaLeitura: 'Não foi possível ler a rotina agora. O seu texto continua aqui.',
  semFamilia: ESTADOS.semFamilia,
  familiaSemBebe: ESTADOS.familiaSemBebe,
  soResponsavel: 'Só quem é responsável pelo bebê pode compartilhar números da rotina.',
  semBebeAtivo: 'Não há bebê ativo para resumir.',
  escolhaUmBebe: 'Escolha um bebê para ver os números.',
  nenhumNumero: 'Nenhum registro concluído neste período.',
  registrosDemais: ESTADOS.demaisParaSomar,
} as const

/** A escolha de bebê (RF-03): `<nome>, <idade>`, ` · <família>` e o desempate ` (2)`. */
export const ESCOLHA_DE_BEBE = {
  doFamilia: (rotulo: string, familia: string) => `${rotulo} · ${familia}`,
  repetido: (rotulo: string, ordem: number) => `${rotulo} (${ordem})`,
} as const
