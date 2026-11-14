// O ponto de entrada da peça do resumo da rotina (RF12, A2 e RN-01): os arquivos da Comunidade importam daqui e
// de mais nenhum arquivo da peça. É um dos dois pontos de passagem da fronteira do cuidado (o outro é a sessão).
// Por ora só tem o que não precisa de tela: o controlador das leituras com os estados de dados, e a conta do fim do
// corpo (o separador e o bloco anexado). O painel (`.tsx`) entra aqui no cartão seguinte. A única coisa que passa da
// peça ao compositor é texto.

export { anexarBloco, separadorAntesDoBloco } from './bloco.ts'
export { NUMERO_DO_ESTADO, criarControladorDoResumo } from './controlador.ts'
export type { CaixaDoNumero, ControladorDoResumo, EstadoDoResumo, OpcoesDoControlador, SituacaoDoResumo } from './controlador.ts'
export type { MotivoDoImpedimento, OpcaoDeBebe } from './bebes.ts'
export type { ChaveDoNumero, PeriodoDoResumo } from './calculo.ts'
