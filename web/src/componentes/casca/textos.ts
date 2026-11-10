import { RODAPE } from '../../conteudo/textos.ts'

// Textos da casca do site: o nome, o cabeçalho, o menu e o rodapé. O texto de interface fica
// aqui, e não nos componentes.

export const NOME_SITE = 'AppMaternidade'

/** O aviso de protótipo da linha final do rodapé. */
export const AVISO_PROTOTIPO = RODAPE

export const ROTULO_EM_BREVE = '+ Em breve'
export const ETIQUETA_EM_BREVE = 'Em breve'
// O nome do botão é "Modo madrugada"; abaixo de 768 o prefixo some da vista e fica "madrugada"
// (o nome acessível continua inteiro).
export const PREFIXO_MADRUGADA = 'Modo '
export const NUCLEO_MADRUGADA = 'madrugada'
export const ROTULO_MADRUGADA = `${PREFIXO_MADRUGADA}${NUCLEO_MADRUGADA}`
export const ROTULO_ENTRAR = 'Entrar'
export const ROTULO_MENU = 'Menu'
export const ROTULO_NAVEGACAO = 'Site'
export const ROTULO_NAVEGACAO_RODAPE = 'Rodapé'

/** As áreas futuras, na ordem do submenu "+ Em breve". */
export const AREAS_EM_BREVE = ['Comunidade', 'Lembretes', 'Convites', 'Relatórios'] as const

export type Contexto = 'publico' | 'logado'

/** Um item do cabeçalho: um link, ou o submenu das áreas futuras. */
type ItemCabecalho = { tipo: 'link'; rotulo: string; para: string } | { tipo: 'em-breve' }

// Alvos: Início "/", Protótipo e Hoje "/app/hoje", Conta "/app/conta". As rotas Conta e Entrar vêm
// em outros cartões; até lá a rota 404 as atende. "Sair" fica na Conta, e não no cabeçalho.
export const ITENS_DO_CABECALHO: Record<Contexto, readonly ItemCabecalho[]> = {
  publico: [
    { tipo: 'link', rotulo: 'Início', para: '/' },
    { tipo: 'link', rotulo: 'Protótipo', para: '/app/hoje' },
    { tipo: 'em-breve' },
  ],
  logado: [
    { tipo: 'link', rotulo: 'Hoje', para: '/app/hoje' },
    { tipo: 'em-breve' },
    { tipo: 'link', rotulo: 'Conta', para: '/app/conta' },
  ],
}

export const DESTINO_ENTRAR = '/entrar'

interface ColunaDoRodape {
  titulo: string
  links: ReadonlyArray<{ rotulo: string; para: string }>
}

// Três colunas, em x=32, 208 e 384 (1440), mais um bloco em c7.
export const COLUNAS_DO_RODAPE: readonly ColunaDoRodape[] = [
  {
    titulo: 'Site',
    links: [
      { rotulo: 'Início', para: '/' },
      { rotulo: 'Sistema', para: '/sistema' },
    ],
  },
  {
    titulo: 'Protótipo',
    links: [
      { rotulo: 'Hoje', para: '/app/hoje' },
      { rotulo: 'Sessão', para: '/app/sessao' },
    ],
  },
  {
    titulo: 'Conta',
    links: [
      { rotulo: 'Entrar', para: '/entrar' },
      { rotulo: 'Conta', para: '/app/conta' },
    ],
  },
]

export const BLOCO_DO_RODAPE = {
  titulo: 'Próximas áreas',
  texto: 'Comunidade, lembretes, convites e relatórios chegam depois do protótipo.',
} as const
