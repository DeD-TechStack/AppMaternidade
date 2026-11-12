// Os textos de interface do bloco Tummy time (MAT-39b, seção 5 da spec: T-xx). Os do 39a (T-23, T-38, T-40,
// T-59, T-62 e T-06) ficam em `textosLogada.ts` e o bloco os importa de lá. Nenhum texto usa os nomes de teste
// antigos nem U+00AD.
import { formatarDuracao } from '../../prototipo/formatar.ts'

export const TT = {
  /** T-60, o `h2` do bloco. */
  titulo: 'Tummy time',
  /** T-07. */
  emAndamento: 'Em andamento',
  /** T-08: o texto visível do botão. */
  iniciar: 'Iniciar tummy time',
  /** T-09. */
  fizemosAgora: 'Fizemos agora',
  /** T-10. */
  outroHorario: 'Registrar outro horário',
  /** T-11: o texto visível do botão. */
  encerrar: 'Encerrar',
  /** T-12. */
  descartar: 'Descartar',
  /** T-14, o rótulo do campo de duração. */
  duracao: 'Duração em minutos (opcional)',
  /** T-15, o texto fixo de segurança. */
  seguranca: 'Só com o bebê acordado e um adulto olhando. Se ele ficar com sono, coloque de barriga para cima no berço.',
  /** T-16. */
  registrado: 'Tummy time registrado.',
  /** T-18. */
  descartada: 'Sessão descartada.',
  /** T-22. */
  vazio: 'Nenhum tummy time nos últimos 7 dias.',
  /** T-24. */
  fimAntesDoInicio: 'O fim não pode ser antes do início.',
  /** T-25. */
  noFuturo: 'O horário não pode ficar no futuro.',
  /** T-26. */
  maisDeUmaHora: 'Mais de 1 hora de tummy time. Está certo?',
  salvarAssim: 'Salvar assim',
  corrigir: 'Corrigir',
  /** T-27. */
  sobreposicao: 'Já há tummy time registrado nesse horário. Salvar mesmo assim?',
  salvarMesmoAssim: 'Salvar mesmo assim',
  voltar: 'Voltar',
  /** T-29. */
  duracaoInvalida: 'Use um número inteiro de 1 a 999.',
  /** T-30. */
  semDuracao: 'sem duração',
  /** T-31. */
  contaRemovida: 'por conta removida',
  /** T-32. */
  registradoDepois: 'registrado depois',
  /** T-41. */
  semResposta: 'Sem resposta do servidor. Não dá para saber se foi salvo. Tentar de novo é seguro: nada fica repetido.',
  /** T-42. */
  servidorOcupado: 'O servidor estava ocupado. Nada foi salvo.',
  /** T-43. */
  naoEncontrado: 'Não encontrado. O registro pode ter sido apagado, ou o seu acesso mudou.',
  /** T-44. */
  semPermissao: 'Sem permissão. Seu papel nesta família não permite esta ação.',
  /** T-45. */
  descartadaPorOutra: 'Esta sessão foi descartada por outra pessoa.',
  /** T-46. */
  prazoEncerrado: 'Passou o prazo para desfazer.',
  /** T-47. */
  inesperado: 'Algo deu errado e nada foi alterado. Tente de novo.',
  /** T-52. */
  salvoSemAtualizar: 'Salvo. Não deu para atualizar a lista.',
  atualizar: 'Atualizar',
  /** T-53. */
  salvando: 'Salvando…',
  /** T-54. */
  preenchaInicioEFim: 'Preencha o início e o fim.',
  /** T-57. */
  outraConta: 'por outra conta',
  /** T-58. */
  horarioInexistente: 'Esse horário não existe neste dia, por causa da mudança de horário. Escolha outro.',
  /** T-63. */
  listaIncompleta: 'A lista ficou incompleta. Os totais do dia não aparecem.',
  /** T-64, o link para o item 1. */
  fontes: 'O que as fontes dizem sobre tummy time',
  /** T-65. */
  desfeito: 'Desfeito.',
  /** T-68. */
  relogioAtras: 'O relógio deste aparelho está antes do início da sessão. Confira a hora do aparelho.',

  // Rótulos que a spec não numera: os botões das confirmações e do formulário.
  salvar: 'Salvar',
  cancelar: 'Cancelar',
  fechar: 'Fechar',
  desfazer: 'Desfazer',
  tentarDeNovo: 'Tentar de novo',
  dia: 'Dia',
  inicio: 'Início',
  fim: 'Fim',
  hoje: 'Hoje',
  ontem: 'Ontem',
  historico: 'Últimos 7 dias',
} as const

/** T-08: o nome acessível do botão Iniciar. */
export const iniciarDe = (nome: string) => `Iniciar tummy time de ${nome}`

/** T-11: o nome acessível do botão Encerrar. */
export const encerrarDe = (nome: string) => `Encerrar tummy time de ${nome}`

/** T-13: "Iniciado às <HH:MM> <autor>". */
export const iniciadoAs = (hora: string, autor: string) => `Iniciado às ${hora} ${autor}`

/** T-17: o fim da sessão encerrada agora. */
export const encerrado = (duracao: string) => `Tummy time encerrado: ${duracao}.`

/** T-19: a outra pessoa já tinha encerrado. */
export const jaEncerrada = (hora: string) => `Esta sessão já tinha sido encerrada às ${hora}.`

/** T-20, T-21 e T-55: o resumo do dia escolhido. */
export function resumoDoDia(dia: string, sessoes: number, totalMs: number): string {
  if (sessoes >= 1) {
    return `${dia}: ${sessoes === 1 ? '1 sessão' : `${sessoes} sessões`}, ${formatarDuracao(totalMs)} no total`
  }
  if (totalMs > 0) return `${dia}: ${formatarDuracao(totalMs)} no total, de sessão que começou antes deste dia.`
  return `${dia}: nenhuma sessão registrada.`
}

/** T-33: a marca da sessão que termina em outro dia da família. */
export const terminaNoDiaSeguinte = 'termina no dia seguinte'
export const terminaEm = (data: string) => `termina em ${data}`

/** O autor da linha e do início: "por <nome>" (T-31 e T-57 têm texto próprio). */
export const autorPor = (nome: string) => `por ${nome}`
