import type { Papel, ErroDados } from '../dados/comum.ts'
import type { TipoRegistro } from '../dados/rotina.tipos.ts'

// Todos os textos de interface da área da rotina (MAT-38a). Nenhum arquivo de `paginas/` nem de
// `componentes/rotina/` declara frase em literal. Os marcados "exato" são conferidos letra por letra
// pelos testes; os outros são propostos e o valor final mora aqui.

export const TITULOS = {
  hoje: 'Hoje',
  sessao: 'Sessão',
  registroNovo: 'Novo registro',
  registroEditar: 'Editar registro',
} as const

export const ROTULO_TIPO: Readonly<Record<TipoRegistro, string>> = {
  sono: 'Sono',
  mamada: 'Mamada',
  tummy: 'Tummy time',
  mamadeira: 'Mamadeira',
  fralda: 'Fralda',
  solido: 'Alimentação sólida',
  observacao: 'Observação',
}

export const COMUM = {
  carregando: 'Carregando…',
  tentarDeNovo: 'Tentar de novo',
  atualizar: 'Atualizar',
  atualizadoAs: (hora: string) => `Atualizado às ${hora}`,
  fechar: 'Fechar',
  desfazer: 'Desfazer',
  cancelar: 'Cancelar',
  salvar: 'Salvar',
  salvando: 'Salvando…',
  voltarParaHoje: 'Voltar para Hoje',
  pessoaRemovida: 'pessoa removida',
  exMembro: 'ex-membro da família',
  semNomeDoBebe: 'Bebê',
  emAndamento: 'em andamento',
  fusoDiferente: (aparelho: string, familia: string) =>
    `Horários no fuso deste aparelho (${aparelho}). O dia segue o fuso da família (${familia}).`,
} as const

// ---- estados de tela (R38-11) --------------------------------------------------------------------

export const ESTADOS = {
  semFamilia: 'Você ainda não faz parte de uma família.',
  familiaSemBebe: 'Esta família ainda não tem bebê cadastrado.',
  acessoPerdido: 'Você não tem mais acesso a este bebê.',
  observador: 'Seu papel nesta família permite só ver os registros.',
  cuidador: 'Seu papel nesta família permite mudar só os registros que você fez.',
  arquivado: 'Este bebê está arquivado. Os registros ficam só para leitura.',
  listaIncompleta: (limite: number) => `Esta lista mostra só os primeiros ${limite} itens.`,
  demaisParaSomar: 'Há registros demais para somar aqui.',
  naoEncontrado: 'Não encontramos este registro. Ele pode ter sido removido, ou você não tem mais acesso.',
  registroExcluido: 'Este registro foi excluído e não pode ser mudado.',
  redeNaLeitura: 'Não foi possível falar com o servidor. Verifique a conexão.',
  redeNaEscrita: 'Não deu para confirmar com o servidor. Tente de novo: se já tiver sido salvo, não duplica.',
} as const

/** A frase de cada chave do catálogo de erros (Anexo B). Código e mensagem do banco nunca aparecem. */
const TEXTOS_ERRO: Readonly<Record<string, string>> = {
  parametro_obrigatorio: 'Faltou um dado obrigatório. Confira o formulário.',
  nao_encontrado: ESTADOS.naoEncontrado,
  bebe_arquivado: ESTADOS.arquivado,
  registro_excluido: ESTADOS.registroExcluido,
  nota_excluida: 'Esta nota foi excluída.',
  nao_e_sessao: 'Este registro não é uma sessão.',
  sessao_ja_encerrada: 'Uma sessão encerrada não pode voltar a ficar em andamento.',
  prazo_encerrado: 'Passaram-se mais de 30 dias. Este registro não pode mais ser restaurado.',
  horario_no_futuro: 'O horário está no futuro. Confira o relógio ou escolha outro horário.',
  valor_invalido: 'Algum valor está fora do permitido. Confira o formulário.',
  tente_de_novo: 'O servidor estava ocupado. Tente de novo.',
  fuso_da_familia_invalido: 'O fuso da família está inválido. Peça a um responsável para corrigir em Família.',
  sessao_encerrada: 'Sua sessão terminou. Entre de novo.',
  desconhecido:
    'Algo deu errado e não sabemos se a mudança foi salva. Toque em Tentar de novo ou atualize para conferir.',
}

interface OpcoesDoTexto {
  /** `true` numa escrita: a frase de rede não afirma se a mudança foi salva. */
  escrita?: boolean
  /** O papel da conta, para a frase de `sem_permissao`. */
  papel?: Papel | null
}

/** A frase do erro, pelo catálogo; nunca o código nem a mensagem original do banco. */
export function textoDoErro(erro: ErroDados, opcoes: OpcoesDoTexto = {}): string {
  if (erro.classe === 'rede') return opcoes.escrita ? ESTADOS.redeNaEscrita : ESTADOS.redeNaLeitura
  if (erro.chave === 'sem_permissao') return opcoes.papel === 'cuidador' ? ESTADOS.cuidador : ESTADOS.observador
  return TEXTOS_ERRO[erro.chave] ?? TEXTOS_ERRO[erro.classe] ?? TEXTOS_ERRO.desconhecido
}

/** Os erros que repetem a mesma chamada: sem resposta, `tente_de_novo` e `desconhecido`. */
export const ehErroRepetivel = (erro: ErroDados): boolean =>
  erro.classe === 'rede' || erro.classe === 'tente_de_novo' || erro.classe === 'desconhecido'

// ---- Hoje (R38-05) ----------------------------------------------------------------------------------

export const HOJE = {
  linhaDoBebe: (nome: string, idade: string) => `${nome}, ${idade}`,
  rotuloEResumo: (rotulo: string, resumo: string) => `${rotulo}, ${resumo}`,
  notaDe: (autor: string, quando: string) => `${autor}, ${quando}`,
  trocarDeBebe: 'Trocar de bebê',
  semSessao: 'Nenhuma sessão em andamento.',
  emAndamento: 'Em andamento',
  ultimos: 'Últimos',
  desdeCarregando: 'Desde o seu último registro',
  paraVoceSaber: 'Para você saber',
  semNotaEmDestaque: 'Nenhuma nota em destaque.',
  desdeOUltimo: (hora: string) => `Desde o seu último registro, às ${hora}`,
  nadaNovo: 'Nada novo desde o seu último registro.',
  hojeAteAgora: 'Hoje até agora',
  mamadas: 'Mamadas',
  fraldas: 'Fraldas',
  sono: 'Sono',
  semRegistros: 'Nenhum registro hoje. Toque em um botão abaixo para começar.',
  semConcluidos: 'Nenhum registro concluído ainda.',
  umaHoraEMinutos: (horas: number, minutos: number) => `${horas} h ${String(minutos).padStart(2, '0')}`,
  ultimaMamada: (hora: string, autor: string) => `Última mamada às ${hora}, com ${autor}`,
} as const

export const SELETOR = {
  rotulo: 'Escolher bebê',
  arquivados: 'Arquivados',
  daFamilia: (nome: string) => ` · ${nome}`,
} as const

export const SEM_RESULTADO = '—'

/** Os pedaços de texto dos formatos de hora e de resumo (`componentes/rotina/formatos.ts`). */
export const FORMATOS = {
  agora: 'agora',
  haMinutos: (minutos: number) => `há ${minutos} min`,
  haHoras: (horas: number) => `há ${horas} h`,
  haHorasEMinutos: (horas: number, minutos: number) => `há ${horas} h ${minutos} min`,
  ontem: (hora: string) => `ontem ${hora}`,
  terminaNoDiaSeguinte: 'termina no dia seguinte',
  separador: ' · ',
  ml: (quantidade: number) => `${quantidade} ml`,
  lados: { esquerdo: 'lado esquerdo', direito: 'lado direito', ambos: 'os dois lados' },
  conteudosDaMamadeira: { leite_materno: 'leite materno', formula: 'fórmula' },
  conteudosDaFralda: { xixi: 'Xixi', coco: 'Cocô', ambos: 'Ambos' },
  reticencias: '…',
} as const

// ---- sessões em paralelo e esquecidas (R38-09) -------------------------------------------------------

export const SESSOES = {
  jaEmAndamento: (rotulo: string) => `Já há uma sessão de ${rotulo} em andamento.`,
  outras: 'Outras sessões em andamento',
  verSessao: 'Ver sessão',
  encerrar: 'Encerrar',
  porAutor: (autor: string) => `por ${autor}`,
  iniciadoAs: (hora: string, autor: string) => `Iniciado às ${hora} por ${autor}`,
  duasDoMesmoTipo: (quantidade: number, rotuloMinusculo: string) => {
    const palavra = quantidade === 2 ? 'Duas' : quantidade === 3 ? 'Três' : quantidade === 4 ? 'Quatro' : String(quantidade)
    return `${palavra} sessões de ${rotuloMinusculo} em andamento.`
  },
  unir: 'Unir',
  unindo: 'Unindo…',
  uniaoIncompleta: 'A união ficou incompleta. Toque em Unir para terminar.',
  esquecida: (duracao: string) => `Ainda em andamento? Começou há ${duracao}.`,
  encerrarOutroHorario: 'Encerrar em outro horário',
  relogioAtras: 'O relógio deste aparelho está antes do início desta sessão. Confira a hora do aparelho.',
  jaEncerradaPor: (autor: string, hora: string) => `Esta sessão já tinha sido encerrada por ${autor} às ${hora}.`,
  menos5: '−5 min',
  mais5: '+5 min',
  data: 'Data',
  hora: 'Hora',
  fimNoPassado: 'O fim não pode ser antes do início.',
  fimNoFuturo: 'O fim está mais de 5 minutos no futuro.',
  fimInvalido: 'Escolha uma data e uma hora para o fim.',
  notaLonga: 'A nota passa de 500 caracteres. Encurte o texto.',
  descartada: 'Esta sessão foi descartada.',
} as const

// ---- registro rápido e confirmação (R38-06, R38-07) --------------------------------------------------

export const ESCOLHAS_FRALDA = [
  { valor: 'xixi', rotulo: 'Xixi' },
  { valor: 'coco', rotulo: 'Cocô' },
  { valor: 'ambos', rotulo: 'Ambos' },
] as const

export const REGISTRO_RAPIDO = {
  regiao: 'Registro rápido',
  tipoDaFralda: 'Tipo da fralda',
  cancelar: 'Cancelar',
  outroHorario: 'Outro horário…',
  detalhes: 'Detalhes',
  fraldaRegistrada: (rotulo: string) => `Fralda registrada: ${rotulo}`,
  registrada: (rotulo: string) => `${rotulo} registrada`,
  iniciarSono: (nome: string) => `Iniciar sono de ${nome}`,
  iniciarMamada: (nome: string) => `Iniciar mamada de ${nome}`,
  registrarFralda: (nome: string) => `Registrar fralda de ${nome}`,
  iniciarTummy: (nome: string) => `Iniciar tummy time de ${nome}`,
  maisRegistros: 'Mais registros',
  mais: 'Mais',
  grupoFralda: (nome: string) => `Fralda de ${nome}`,
  grupoMais: (nome: string) => `Outros registros de ${nome}`,
  iniciarMamadaRedondo: 'Iniciar mamada',
} as const

export const CONFIRMACAO = {
  sessaoEncerrada: (duracao: string, comNota: boolean) => `Sessão encerrada: ${duracao}${comNota ? ', com nota' : ''}`,
  editarHorario: 'Editar horário',
  manterOsDois: 'Manter os dois',
  excluirEste: 'Excluir este',
  duplicado: (autor: string, rotuloMinusculo: string, hora: string) => `${autor} registrou ${rotuloMinusculo} às ${hora}.`,
  registroSalvo: 'Registro salvo.',
  notaDoEncerramento: (erro: string, texto: string) => `${erro} Sua nota: “${texto}”`,
} as const

// ---- Sessão (R38-08) ----------------------------------------------------------------------------------

export const SESSAO = {
  titulo: (rotulo: string, nome: string) => `${rotulo} de ${nome}`,
  descartarPergunta: 'Descartar esta sessão?',
} as const

// ---- formulário de registro (R38-10) -------------------------------------------------------------------

export const FORMULARIO = {
  escolhaDoTipo: 'Tipo do registro',
  inicio: 'Início',
  fim: 'Fim',
  horario: 'Horário',
  /** O prefixo que só o leitor de tela ouve: o grupo já diz o rótulo na tela. */
  prefixoDoCampo: (rotulo: string) => `${rotulo}: `,
  data: 'data',
  hora: 'hora',
  fimOpcional: 'Deixe vazio para começar uma sessão em andamento.',
  lado: 'Lado',
  ladoNenhum: 'Sem lado',
  lados: { esquerdo: 'Esquerdo', direito: 'Direito', ambos: 'Ambos' },
  quantidade: 'Quantidade em ml',
  conteudoMamadeira: 'Conteúdo',
  conteudoNenhum: 'Sem conteúdo',
  conteudosDaMamadeira: { leite_materno: 'Leite materno', formula: 'Fórmula' },
  conteudoFralda: 'Conteúdo',
  escolhaObrigatoria: 'Escolha o conteúdo da fralda.',
  alimento: 'Alimento',
  texto: 'Texto',
  nota: 'Nota',
  menos5: '−5 min',
  mais5: '+5 min',
  menos5Para: (campo: string) => `−5 min no campo ${campo}`,
  mais5Para: (campo: string) => `+5 min no campo ${campo}`,
  salvar: 'Salvar',
  salvarAssim: 'Salvar assim',
  corrigir: 'Corrigir',
  cancelar: 'Cancelar',
  semPermissaoParaCriar: ESTADOS.observador,
  voltar: 'Voltar',
  confirmarGrupo: 'Confirmar o registro',
  conteudoPlaceholder: 'Escolha o conteúdo',
  tipoPlaceholder: 'Escolha o tipo',
  erroTipo: 'Escolha o tipo do registro.',
  erroFimIncompleto: 'Escolha a data e a hora do fim, ou deixe os dois vazios.',
  semBebe: 'Sem bebê ativo.',
  erroFimAntesDoInicio: 'O fim não pode ser antes do início.',
  erroNoFuturo: 'O horário está mais de 5 minutos no futuro.',
  erroMl: 'Escreva um número inteiro de 1 a 500.',
  erroTextoObrigatorio: 'Escreva o texto.',
  erroTextoLongo: 'O texto passa de 500 caracteres.',
  erroNotaLonga: 'A nota passa de 500 caracteres.',
  erroAlimentoLongo: 'O alimento passa de 100 caracteres.',
  erroInicioObrigatorio: 'Escolha a data e a hora.',
  erroSessaoEncerradaSemFim: 'Uma sessão encerrada não pode voltar a ficar em andamento.',
  confirmaDuracao: (rotulo: string, duracao: string) => `Este ${rotulo} dura ${duracao}, mais do que o esperado.`,
  confirmaSobreposicao: (rotulo: string, de: string, ate: string) => `Este ${rotulo} se sobrepõe a outro, das ${de} às ${ate}.`,
  confirmaSobreposicaoEmAndamento: (rotulo: string, de: string) =>
    `Este ${rotulo} se sobrepõe a outro, das ${de} até agora (em andamento).`,
  eMaisN: (quantidade: number) => `E mais ${quantidade}.`,
} as const

export const LIMITES_DE_DURACAO_MIN: Readonly<Record<'sono' | 'mamada' | 'tummy', number>> = {
  sono: 16 * 60,
  mamada: 2 * 60,
  tummy: 60,
}
