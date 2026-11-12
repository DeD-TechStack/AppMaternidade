// Textos da casca do site: o nome, o cabeçalho, o menu e o rodapé. O texto de interface fica
// aqui, e não nos componentes.

import { itensNavegacao } from '../../rotas/areas.tsx'

export const NOME_SITE = 'AppMaternidade'

// O nome do botão é "Modo madrugada" (o `aria-label`, em toda largura). De 640 para cima o texto
// visível é o longo; abaixo, o curto, "Madrugada". Os dois são texto de verdade no botão.
export const ROTULO_MADRUGADA = 'Modo madrugada'
export const ROTULO_MADRUGADA_CURTO = 'Madrugada'
export const ROTULO_ENTRAR = 'Entrar'
export const ROTULO_CRIAR_CONTA = 'Criar conta'
export const ROTULO_MENU = 'Menu'
export const ROTULO_NAVEGACAO = 'Site'
export const ROTULO_NAVEGACAO_RODAPE = 'Rodapé'

export type Contexto = 'publico' | 'logado'

interface Link {
  rotulo: string
  para: string
}

export const DESTINO_ENTRAR = '/entrar'
export const DESTINO_CRIAR_CONTA = '/criar-conta'

export const ITENS_DO_CABECALHO: Record<Contexto, readonly Link[]> = {
  publico: [
    { rotulo: 'Como funciona', para: '/como-funciona' },
    { rotulo: 'Cuidado compartilhado', para: '/cuidado-compartilhado' },
    { rotulo: 'Desenvolvimento', para: '/desenvolvimento' },
    { rotulo: 'Comunidade', para: '/regras-da-comunidade' },
  ],
  // Cada área declara os próprios itens (`rotas/<area>.tsx`); a junção vem de `itensNavegacao`.
  logado: itensNavegacao.map((item) => ({ rotulo: item.rotulo, para: item.destino })),
}

interface ColunaDoRodape {
  titulo: string
  links: readonly Link[]
}

// As três colunas do rodapé: toda rota pública aparece uma vez.
export const COLUNAS_DO_RODAPE: readonly ColunaDoRodape[] = [
  {
    titulo: 'Produto',
    links: [
      { rotulo: 'Como funciona', para: '/como-funciona' },
      { rotulo: 'Cuidado compartilhado', para: '/cuidado-compartilhado' },
      { rotulo: 'Desenvolvimento', para: '/desenvolvimento' },
    ],
  },
  {
    titulo: 'Ajuda',
    links: [
      { rotulo: 'Regras da comunidade', para: '/regras-da-comunidade' },
      { rotulo: 'Contato', para: '/contato' },
      { rotulo: 'Sobre', para: '/sobre' },
    ],
  },
  {
    titulo: 'Legal',
    links: [
      { rotulo: 'Privacidade', para: '/privacidade' },
      { rotulo: 'Termos', para: '/termos' },
      { rotulo: 'Exclusão de conta', para: '/exclusao-de-conta' },
    ],
  },
]

/** A frase do rodapé, com a segunda linha em itálico. */
export const FRASE_DO_RODAPE = ['A rotina do bebê,', 'dividida por quem cuida.'] as const
