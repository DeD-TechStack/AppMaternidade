// Textos da casca do site: o nome, o cabeçalho, o menu e o rodapé. O texto de interface fica
// aqui, e não nos componentes.

import { itensNavegacao } from '../../rotas/areas.tsx'

export const NOME_SITE = 'AppMaternidade'

// O nome do botão é "Modo madrugada" (o `aria-label`, em toda largura). De 640 para cima o texto
// visível é o longo; abaixo, o curto, "Madrugada". Os dois são texto de verdade no botão.
export const ROTULO_MADRUGADA = 'Modo madrugada'
export const ROTULO_MADRUGADA_CURTO = 'Madrugada'
export const ROTULO_ENTRAR = 'Entrar'
export const ROTULO_CRIAR_CONTA = 'Criar conta' // casca.pilula
// Com sessão, o espaço da conta no cabeçalho (e no menu) traz "Conta" e "Sair" em toda página.
export const ROTULO_CONTA = 'Conta'
export const ROTULO_SAIR = 'Sair'
export const ROTULO_SAINDO = 'Saindo…'
export const ROTULO_MENU = 'Menu'
export const ROTULO_NAVEGACAO = 'Site'
export const ROTULO_NAVEGACAO_RODAPE = 'Rodapé'
export const ROTULO_PULAR = 'Pular para o conteúdo'

export type Contexto = 'publico' | 'logado'

interface Link {
  rotulo: string
  para: string
}

export const DESTINO_ENTRAR = '/entrar'
export const DESTINO_CRIAR_CONTA = '/criar-conta'
export const DESTINO_CONTA = '/app/conta'

/**
 * O que o espaço da conta mostra, pela sessão: `carregando` (nada: sem piscar visitante nem conta),
 * `com_sessao` ("Conta" e "Sair") e `visitante` (sem sessão ou com erro ao lê-la: "Entrar" e "Criar conta").
 */
export type SituacaoDaConta = 'carregando' | 'com_sessao' | 'visitante'

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

// Os quatro grupos do RodapeMapa, na ordem da spec §3.8 (Produto, Conta, Ajuda, Legal; não a ordem do deck).
// Cada rótulo e destino é o do deck COPY_casca.md §2.3 (ids no comentário de cada linha).
export const COLUNAS_DO_RODAPE: readonly ColunaDoRodape[] = [
  {
    titulo: 'Produto', // casca.rod.g1
    links: [
      { rotulo: 'Como funciona', para: '/como-funciona' }, // casca.rod.g1.1
      { rotulo: 'Cuidado compartilhado', para: '/cuidado-compartilhado' }, // casca.rod.g1.2
      { rotulo: 'Desenvolvimento', para: '/desenvolvimento' }, // casca.rod.g1.3
    ],
  },
  {
    titulo: 'Conta', // casca.rod.g4
    links: [
      { rotulo: 'Entrar', para: '/entrar' }, // casca.rod.g4.1
      { rotulo: ROTULO_CRIAR_CONTA, para: '/criar-conta' }, // casca.rod.g4.2
      { rotulo: 'Recuperar acesso', para: '/recuperar-acesso' }, // casca.rod.g4.3
      { rotulo: 'Tenho um convite', para: '/convite' }, // casca.rod.g4.4
    ],
  },
  {
    titulo: 'Ajuda', // casca.rod.g2
    links: [
      { rotulo: 'Regras da comunidade', para: '/regras-da-comunidade' }, // casca.rod.g2.1
      { rotulo: 'Contato', para: '/contato' }, // casca.rod.g2.2
      { rotulo: 'Sobre', para: '/sobre' }, // casca.rod.g2.3
    ],
  },
  {
    titulo: 'Legal', // casca.rod.g3
    links: [
      { rotulo: 'Privacidade', para: '/privacidade' }, // casca.rod.g3.1
      { rotulo: 'Termos', para: '/termos' }, // casca.rod.g3.2
      { rotulo: 'Exclusão de conta', para: '/exclusao-de-conta' }, // casca.rod.g3.3
    ],
  },
]

// O rodapé compacto de /app/* guarda os nove links de Produto, Ajuda e Legal: o grupo Conta é só do rodapé público.
export const LINKS_DO_RODAPE_COMPACTO: readonly Link[] = COLUNAS_DO_RODAPE.filter((coluna) =>
  ['Produto', 'Ajuda', 'Legal'].includes(coluna.titulo),
).flatMap((coluna) => coluna.links)

// A linha de copyright e o aviso de avaliação do rodapé público (deck COPY_casca.md §2.3).
export const COPYRIGHT_RODAPE = '© 2026 DeD TechStack' // casca.rod.copy
export const AVISO_RODAPE = 'Nesta versão de avaliação, use só dados fictícios.' // casca.rod.aviso
