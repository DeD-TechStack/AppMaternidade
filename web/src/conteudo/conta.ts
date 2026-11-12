import type { ErroDados } from '../dados/comum.ts'

// Todos os textos de interface da área de conta (MAT-37a). Já passaram pela revisão de texto
// (`.oc/textos_MAT-37a.md`): não reescrever. Nenhum arquivo de `paginas/` declara frase em literal.

const MARCA = 'AppMaternidade'

// O contato provisório da demonstração (decisão de Daniel, 06/11/2026): o e-mail do autor dos
// commits do repositório. É o único lugar do código em que ele aparece.
const CONTATO_PROVISORIO = 'danielmacedosilva11@gmail.com'

export const TITULOS = {
  entrar: 'Entrar',
  criarConta: 'Criar conta',
  recuperarAcesso: 'Recuperar acesso',
  redefinirSenha: 'Nova senha',
  contaExcluida: 'Conta excluída',
  comecar: 'Começar',
  conta: 'Conta',
  convite: 'Convite',
  familia: 'Família',
  /** O `h1` do erro da guarda: a tela não abriu, e ainda assim tem um título. */
  erroDaConta: 'Não foi possível abrir a sua conta.',
} as const

/** O título da aba é fixo por rota: "<título da rota> | AppMaternidade". */
export function tituloDaAba(titulo: string): string {
  return `${titulo} | ${MARCA}`
}

/**
 * O `h1` das telas com a cena de mel: a primeira linha e a segunda, esta inteira em itálico. Cada uma
 * diz o que a família ganha, e não o que o site é. Linhas curtas: cada uma cabe numa linha na coluna do
 * formulário. O título da aba continua o de `TITULOS`.
 */
export const MANCHETES = {
  entrar: ['Volte à rotina', 'da família.'],
  criarConta: ['Divida a rotina', 'com carinho.'],
  recuperarAcesso: ['Esqueceu a senha?', 'A gente ajuda.'],
  redefinirSenha: ['Senha nova,', 'rotina de volta.'],
  contaExcluida: ['Conta excluída.', 'Até a próxima.'],
  comecar: ['Vamos começar', 'pelo seu nome.'],
  comecarFamilia: ['Vamos começar', 'a sua família.'],
  convite: ['Convite para', 'uma família'],
} as const

/** O nome acessível de cada `h1` acima: as duas linhas, separadas por um espaço. */
function nomeDoH1(linhas: readonly [string, string]): string {
  return `${linhas[0]} ${linhas[1]}`
}

export const NOMES_DO_H1 = {
  entrar: nomeDoH1(MANCHETES.entrar),
  criarConta: nomeDoH1(MANCHETES.criarConta),
  recuperarAcesso: nomeDoH1(MANCHETES.recuperarAcesso),
  redefinirSenha: nomeDoH1(MANCHETES.redefinirSenha),
  contaExcluida: nomeDoH1(MANCHETES.contaExcluida),
  comecar: nomeDoH1(MANCHETES.comecar),
  comecarFamilia: nomeDoH1(MANCHETES.comecarFamilia),
  convite: nomeDoH1(MANCHETES.convite),
} as const

/** A cena de mel das telas de acesso: os arquivos de `web/public/cenas/acesso/` (512 × 768 em 1×). */
export const CENA_ACESSO = {
  base: '/cenas/acesso/entrar',
  largura: 512,
  altura: 768,
  alt: 'Celular sobre um pedestal de oliva, com uma tela do app AppMaternidade aberta.',
} as const

export const COMUM = {
  carregando: 'Carregando…',
  tentarDeNovo: 'Tentar de novo',
  mostrarSenha: 'Mostrar senha',
  entrando: 'Entrando…',
  criandoConta: 'Criando conta…',
  enviando: 'Enviando…',
  salvando: 'Salvando…',
  excluindo: 'Excluindo…',
  saindo: 'Saindo…',
  preparandoArquivo: 'Preparando o arquivo…',
  escrevaEmail: 'Escreva o seu e-mail.',
  escrevaSenha: 'Escreva a sua senha.',
  escrevaNome: 'Escreva o seu nome.',
  escrevaData: 'Escolha a data de nascimento.',
  // A resposta pode ter se perdido depois de o banco gravar: o que a pessoa criou pode já estar na lista.
  conexaoCaiu: 'A conexão caiu antes da resposta. Confira abaixo se ficou salvo antes de tentar de novo.',
  repitaSenha: 'Repita a senha.',
  senhasDiferentes: 'As duas senhas precisam ser iguais.',
  ajudaSenha: 'Pelo menos 6 caracteres.',
  idCopiado: 'Id copiado.',
  copieManualmente: 'Copie manualmente.',
  rotuloEmail: 'E-mail',
  rotuloSenha: 'Senha',
  rotuloNome: 'Seu nome',
  ajudaNome: 'É o nome que a família vai ver.',
} as const

export const CABECALHO = {
  navegacao: 'Conta',
  conta: 'Conta',
  irParaHoje: 'Ir para o Hoje',
  sair: 'Sair',
} as const

export const ENTRAR = {
  frase: 'Use o e-mail e a senha que você cadastrou.',
  botao: 'Entrar',
  semConta: 'Ainda não tem conta?',
  criarConta: 'Criar conta',
  esqueci: 'Esqueci a senha',
  convite: 'Tenho um convite',
} as const

export const CRIAR_CONTA = {
  frase: 'Você precisa de um nome, um e-mail e uma senha.',
  botao: 'Criar conta',
  jaTemConta: 'Já tem conta?',
  entrar: 'Entrar',
  // A frase termina em dois pontos e cada documento é um link em linha própria (alvo de 44 px).
  termos: {
    frase: 'Ao criar a conta, você concorda com:',
    termos: 'Termos de uso',
    privacidade: 'Política de privacidade',
  },
  confirmacao: (email: string) => `Enviamos um link de confirmação para ${email}. Abra o link para entrar.`,
} as const

export const AVISO_BANCO_DEMONSTRACAO =
  'Este site é uma demonstração com banco de teste. Para a família e o bebê, use só nomes e datas fictícios.'

export const RECUPERAR = {
  frase: 'Escreva o e-mail da conta. Enviamos um link para você criar uma senha nova.',
  botao: 'Enviar link',
  resultado:
    'Se houver uma conta com este e-mail, enviamos um link para criar uma senha nova. Confira também a caixa de spam.',
  entrar: 'Entrar',
  criarConta: 'Criar conta',
} as const

export const REDEFINIR = {
  frase: 'Escolha a senha nova da sua conta.',
  novaSenha: 'Nova senha',
  repetirSenha: 'Repetir a senha',
  botao: 'Salvar senha',
  pedirOutroLink: 'Pedir outro link',
} as const

export const CONTA_EXCLUIDA = {
  frase: 'Sua conta foi excluída.',
  inicio: 'Início',
  criarConta: 'Criar conta',
} as const

export const COMECAR = {
  titulo: 'Seu nome',
  frase: 'Falta pouco. Diga o seu nome e o fuso em que você está.',
  fuso: 'Fuso',
  ajudaFuso: 'Os horários aparecem neste fuso.',
  botao: 'Salvar',
  /** A opção do fuso guardado que não está na lista. */
  fusoAtual: (fuso: string) => `${fuso} (atual)`,
} as const

/** O que cada papel é e o que ele permite (Modelo de Dados, tabela 5.1, em palavras do site). */
export const PAPEIS = {
  responsavel: {
    nome: 'Responsável',
    minusculo: 'responsável',
    permite: 'Administra a família, os bebês, os convites e os dados. Pode haver mais de um responsável.',
  },
  cuidador: {
    nome: 'Cuidador',
    minusculo: 'cuidador',
    permite: 'Registra e acompanha. Edita e exclui só o que você mesmo criou, e pode encerrar qualquer sessão em andamento.',
  },
  observador: {
    nome: 'Observador',
    minusculo: 'observador',
    permite: 'Lê registros e notas, mas não escreve.',
  },
} as const

/** A ordem dos papéis nas listas e nas opções: do que mais pode ao que só acompanha. */
export const ORDEM_DOS_PAPEIS = ['responsavel', 'cuidador', 'observador'] as const

export const COMECAR_FAMILIA = {
  titulo: 'Como você quer começar?',
  frase: 'Crie a família do seu bebê ou entre numa que já existe, com um convite.',
  criar: {
    titulo: 'Criar uma família',
    texto: 'Você será a pessoa responsável e convida quem vai cuidar junto.',
    botao: 'Criar uma família',
  },
  convite: {
    titulo: 'Tenho um convite',
    texto: 'Alguém já cuida do bebê e mandou um código ou um link para você.',
    botao: 'Tenho um convite',
  },
  irParaFamilia: 'Ir para a família',
  formulario: {
    titulo: 'Criar uma família',
    nome: 'Nome da família',
    ajudaNome: 'Só quem faz parte da família vê este nome.',
    fuso: 'Fuso da família',
    ajudaFuso: 'Os horários da família aparecem neste fuso.',
    botao: 'Criar família',
    voltar: 'Voltar',
  },
  bebe: {
    titulo: 'Agora, o primeiro bebê',
    frase: 'A data serve para mostrar atividades da fase; ela não aparece na comunidade.',
    nome: 'Nome ou apelido',
    nascimento: 'Data de nascimento',
    salvar: 'Salvar bebê',
    depois: 'Fazer depois',
  },
} as const

export const CONVITE = {
  frase: 'Cole o código ou o link que você recebeu para ver a família que convidou você.',
  campo: 'Código ou link do convite',
  ajudaCampo: 'Pode colar o link inteiro ou só o código.',
  continuar: 'Continuar',
  guardado: 'Há um convite guardado neste aparelho. Entre ou crie uma conta para ver a família que convidou você.',
  entrar: 'Entrar',
  criarConta: 'Criar conta',
  descartar: 'Descartar convite',
  agoraNao: 'Agora não',
  aceitar: 'Aceitar convite',
  aceitando: 'Entrando…',
  semBebes: 'Nenhum bebê cadastrado ainda.',
  bebes: 'Bebês',
  convidouComo: 'Você foi convidado como',
  acessoAte: (data: string) => `Acesso até ${data}`,
  vence: (dataEHora: string) => `O convite vence em ${dataEHora}`,
  irParaFamilia: 'Ir para a família',
} as const

export const FAMILIA = {
  seletor: 'Família',
  voceE: (papel: string) => `Você é ${papel}.`,
  fuso: (fuso: string) => `Fuso: ${fuso}`,
  carregando: 'Carregando a família…',
  bebes: {
    titulo: 'Bebês',
    vazio: 'Nenhum bebê cadastrado.',
    nasceuEm: (data: string) => `nasceu em ${data}`,
    adicionar: 'Adicionar bebê',
    editar: 'Editar',
    arquivar: 'Arquivar',
    arquivados: 'Arquivados',
    desarquivar: 'Desarquivar',
    salvar: 'Salvar',
    cancelar: 'Cancelar',
    adicionado: (nome: string) => `${nome} foi adicionado.`,
    editado: (nome: string) => `Dados de ${nome} salvos.`,
    arquivado: (nome: string) => `${nome} foi arquivado.`,
    desarquivado: (nome: string) => `${nome} voltou para a lista.`,
  },
  membros: {
    titulo: 'Membros',
    voce: '(você)',
    acessoAte: (data: string) => `acesso até ${data}`,
    mudarPapel: 'Mudar papel',
    removerAcesso: 'Remover acesso',
    sairDaFamilia: 'Sair da família',
    papelMudado: (nome: string, papel: string) => `${nome} agora é ${papel}.`,
    acessoRemovido: (nome: string) => `O acesso de ${nome} foi removido.`,
  },
  convites: {
    titulo: 'Convites',
    vazio: 'Nenhum convite pendente.',
    novo: 'Novo convite',
    papel: 'Papel do convite',
    validade: 'Validade do acesso',
    ajudaValidade: (data: string) => `Opcional. A partir de ${data}. O acesso termina no fim desse dia.`,
    criar: 'Criar convite',
    criando: 'Criando…',
    venceEm: (dataEHora: string) => `vence em ${dataEHora}`,
    venceu: (dataEHora: string) => `venceu em ${dataEHora}`,
    acessoAte: (data: string) => `acesso até ${data}`,
    criadoPor: (nome: string) => `criado por ${nome}`,
    pessoaRemovida: 'pessoa removida',
    cancelar: 'Cancelar convite',
    cancelado: 'O convite foi cancelado.',
    criado: (papel: string) => `Convite de ${papel} criado.`,
    codigoTitulo: 'Código do convite',
    codigoAviso: 'Este código aparece só agora. Envie pelo canal que preferir.',
    codigoRotulo: 'Código',
    linkRotulo: 'Link',
    copiarLink: 'Copiar link',
    copiarCodigo: 'Copiar código',
    linkCopiado: 'Link copiado.',
    codigoCopiado: 'Código copiado.',
  },
  acoes: {
    titulo: 'Ações da família',
    editar: 'Editar família',
    sair: 'Sair da família',
    excluir: 'Excluir família',
    nome: 'Nome da família',
    fuso: 'Fuso da família',
    salvar: 'Salvar',
    cancelar: 'Cancelar',
    salva: 'Dados da família salvos.',
    saiu: (nome: string) => `Você saiu da família ${nome}.`,
    excluida: (nome: string) => `A família ${nome} foi excluída.`,
  },
  privacidade: 'Política de privacidade',
  dialogos: {
    cancelar: 'Cancelar',
    removerAcesso: {
      titulo: (nome: string) => `Remover o acesso de ${nome}?`,
      texto: 'A pessoa perde o acesso a esta família na hora. O que ela já viu não pode ser apagado.',
      confirmar: 'Remover acesso',
    },
    mudarPapel: {
      titulo: (nome: string) => `Mudar o papel de ${nome}`,
      tituloProprio: 'Mudar o seu papel',
      legenda: 'Papel',
      confirmar: 'Mudar papel',
    },
    sair: {
      titulo: (nome: string) => `Sair da família ${nome}?`,
      texto: 'Você deixa de ver os registros desta família. Para voltar, vai precisar de um novo convite.',
      confirmar: 'Sair da família',
    },
    excluirFamilia: {
      titulo: (nome: string) => `Excluir a família ${nome}?`,
      texto: 'Apagam-se a família, os bebês, os registros e os convites. Não dá para desfazer.',
      baixar: 'Baixar meus dados',
      campo: 'Digite o nome da família para confirmar',
      confirmar: 'Excluir família',
    },
    cancelarConvite: {
      titulo: 'Cancelar este convite?',
      texto: 'Quem ainda não usou o código não poderá mais entrar com ele.',
      confirmar: 'Cancelar convite',
      manter: 'Manter convite',
    },
    arquivarBebe: {
      titulo: (nome: string) => `Arquivar ${nome}?`,
      texto: 'O bebê sai da lista e os registros ficam guardados. Você pode desarquivar depois.',
      confirmar: 'Arquivar',
    },
  },
} as const

/** O aviso da caixa "mudar papel" aberta na própria linha: quem rebaixa o próprio papel não desfaz sozinho. */
export const AVISO_AUTORREBAIXAMENTO =
  'Você vai deixar de ser responsável e perderá estes controles. Só outro responsável poderá devolver o papel.'

export const CONTA = {
  indice: 'Nesta página',
  secoes: {
    perfil: 'Perfil',
    id: 'Id da conta',
    dados: 'Seus dados',
    excluir: 'Excluir conta',
    privacidade: 'Privacidade',
  },
  // Sem nome (conta que ficou com o nome em branco), só o e-mail: nada de ponto solto no começo.
  resumo: (nome: string, email: string) => (nome.trim() ? `${nome} · ${email}` : email),
  perfil: {
    titulo: 'Perfil',
    frase: 'Seu nome é o que a família vê. O e-mail é o da entrada e não muda por aqui.',
    nome: 'Seu nome',
    email: 'E-mail',
    fuso: 'Seu fuso',
    botao: 'Salvar',
    sucesso: 'Dados salvos.',
  },
  id: {
    titulo: 'Id da sua conta',
    botao: 'Copiar id',
    frase: 'Quem cuida da moderação pode pedir este número para dar a você um papel na equipe.',
  },
  exportar: {
    titulo: 'Seus dados',
    frase:
      'Baixe um arquivo com os seus dados, para guardar. Quem é responsável recebe a família inteira; os outros papéis recebem os próprios dados.',
    botao: 'Baixar meus dados',
    sucesso: 'Arquivo baixado.',
  },
  excluir: {
    titulo: 'Excluir conta',
    explicacao:
      'Ao excluir a conta, ela e os seus vínculos com famílias somem. Nos registros que você fez, o autor passa a aparecer como “pessoa removida”. Não dá para desfazer.',
    impedimento:
      'Você é a única pessoa responsável destas famílias. Antes de excluir a conta, torne outra pessoa responsável ou exclua a família:',
    lendo: 'Conferindo as suas famílias…',
    botao: 'Excluir minha conta',
    dialogo: {
      titulo: 'Excluir a sua conta?',
      texto: 'Para confirmar, digite a senha da conta.',
      senha: 'Senha atual',
      confirmar: 'Excluir conta',
      cancelar: 'Cancelar',
    },
  },
  privacidade: {
    titulo: 'Privacidade',
    contato: { antes: 'Dúvidas sobre seus dados: ', valor: CONTATO_PROVISORIO, depois: '.' },
    encarregado: { antes: 'Encarregado de dados: ', valor: 'Daniel Macedo', depois: '.' },
    politica: 'Política de privacidade',
  },
  sair: 'Sair',
} as const

/** O texto de cada linha do catálogo. `conta_inexistente` não tem texto: a tela nunca o mostra. */
export const TEXTOS_ERRO: Readonly<Record<string, string>> = {
  rede: 'Sem conexão com o servidor. Confira a internet e tente de novo.',
  tente_de_novo: 'Não deu certo desta vez. Tente de novo.',
  nao_encontrado: 'Não encontramos o que você pediu. Talvez tenha sido removido.',
  sem_permissao: 'Seu papel nesta família não permite fazer isso.',
  parametro_obrigatorio: 'Falta preencher um campo.',
  nome_vazio: 'Escreva um nome.',
  fuso_invalido: 'Escolha um fuso da lista.',
  nascimento_no_futuro: 'A data de nascimento não pode ser depois de hoje.',
  convite_invalido: 'Este código de convite não vale. Confira se copiou o código inteiro.',
  convite_revogado: 'Este convite foi cancelado. Peça um novo a quem convidou.',
  convite_usado: 'Este convite já foi usado. Peça um novo a quem convidou.',
  convite_vencido: 'Este convite venceu. Peça um novo a quem convidou.',
  ja_e_membro: 'Você já faz parte da família <familia_nome>.',
  convite_nao_pendente: 'Este convite não está mais pendente.',
  responsavel_sem_validade: 'Responsável não tem prazo de acesso. Tire a validade ou escolha outro papel.',
  validade_menor: 'O acesso precisa durar mais que os 7 dias do convite.',
  papel_igual: 'Essa pessoa já tem esse papel.',
  vinculo_inativo: 'Essa pessoa não está mais na família.',
  use_sair: 'Para deixar a família, use Sair da família.',
  ultimo_responsavel:
    'A família precisa de pelo menos um responsável. Antes, torne outra pessoa responsável ou exclua a família.',
  credenciais: 'E-mail ou senha não conferem.',
  email_nao_confirmado: 'Antes de entrar, confirme o e-mail pelo link que enviamos.',
  email_em_uso: 'Já existe uma conta com este e-mail.',
  senha_fraca: 'A senha precisa ter pelo menos 6 caracteres.',
  senha_igual: 'A nova senha precisa ser diferente da atual.',
  email_invalido: 'Confira o e-mail digitado.',
  muitas_tentativas: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  link_vencido: 'Este link venceu ou já foi usado. Peça outro.',
  sessao_encerrada: 'Sua sessão terminou. Entre de novo.',
  desconhecido: 'Algo deu errado. Tente de novo em instantes.',
}

/** A frase do erro, pelo catálogo; nunca o código nem a mensagem original do banco. */
export function textoDoErro(erro: ErroDados, familiaNome?: string): string {
  const texto = TEXTOS_ERRO[erro.chave] ?? TEXTOS_ERRO[erro.classe] ?? TEXTOS_ERRO.desconhecido
  return texto.replace('<familia_nome>', familiaNome ?? '')
}

/** As mensagens de passagem (lista fechada da 37a): nascem numa tela e aparecem na seguinte. */
const MENSAGENS_DE_PASSAGEM: Readonly<Record<string, string>> = {
  senha_trocada: 'Senha trocada.',
  saiu: 'Você saiu da conta.',
  sessao_encerrada: TEXTOS_ERRO.sessao_encerrada,
}

/** As duas da 37b levam o nome da família: `{ mensagem: 'entrou_na_familia', familia: '<nome>' }`. */
const PASSAGEM_COM_FAMILIA: Readonly<Record<string, (nome: string) => string>> = {
  entrou_na_familia: (nome) => (nome ? `Você entrou na família ${nome}.` : 'Você entrou na família.'),
  acesso_encerrado: (nome) => (nome ? `Seu acesso à família ${nome} foi encerrado.` : 'Seu acesso à família foi encerrado.'),
}

/** O texto da mensagem de passagem que veio no `state` da navegação, se for uma chave conhecida. */
export function textoDaPassagem(estado: unknown): string | null {
  const bruto = estado as { mensagem?: unknown; familia?: unknown } | null | undefined
  const chave = bruto?.mensagem
  if (typeof chave !== 'string') return null
  const comFamilia = PASSAGEM_COM_FAMILIA[chave]
  if (comFamilia) return comFamilia(typeof bruto?.familia === 'string' ? bruto.familia : '')
  return MENSAGENS_DE_PASSAGEM[chave] ?? null
}
