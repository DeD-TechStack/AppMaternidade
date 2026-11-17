// Os textos do painel "Resumo da rotina" (RF12, A3 e RN-04): rótulos, grupos e botões. Os literais são os da spec
// RF12 v3 (RN-08): mudar uma redação exige versão nova da spec. As frases dos estados (RF-02 e RF-15) vêm de
// `resumoRotina.ts` (`ESTADOS_DO_RESUMO`); o bloco e os rótulos dos números, também.

export const PAINEL_DO_RESUMO = {
  titulo: 'Resumo da rotina',
  bebe: 'Bebê',
  ajudaDoNome: 'O nome aparece só aqui, para você escolher.',
  periodo: 'Período',
  periodos: {
    hoje: 'Hoje até agora',
    semana: 'Últimos 7 dias (média por dia)',
  },
  numeros: 'Números que entram no texto',
  /** O nome da caixa de marcar: o rótulo e o valor que vai entrar no bloco (`Sono: 9 h 20`). */
  caixa: (rotulo: string, valor: string) => `${rotulo}: ${valor}`,
  previa: 'Vai entrar no texto assim:',
  marqueUm: 'Marque pelo menos um número.',
  inserir: 'Inserir no texto',
  cancelar: 'Cancelar',
  tentarDeNovo: 'Tentar de novo',
} as const
