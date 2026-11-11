// As fontes de saúde do conteúdo de Desenvolvimento (FONTES.md do MAT-39, consultadas em 05/11/2026).
// Só as que o texto da página usa; a AAP fica de fora (os termos dela não permitem o uso que fizemos).
import type { Fonte } from './tipos.ts'

export const CONSULTADO_EM = '05/11/2026'

export const FONTES = {
  oms: {
    nome: 'OMS, diretriz de atividade física, sono e comportamento sedentário até 5 anos (2019)',
    url: 'https://iris.who.int/server/api/core/bitstreams/60a1cbaa-2bef-4251-9557-e52ce22112b3/content',
  },
  guia: {
    nome: 'Ministério da Saúde, Guia de Atividade Física para a População Brasileira (2021)',
    url: 'https://rbafs.org.br/RBAFS/article/download/14563/11171/57773',
  },
  nhs: {
    nome: 'NHS, serviço de saúde do Reino Unido',
    url: 'https://www.nhs.uk/baby/babys-development/play-and-learning/keep-baby-or-toddler-active/',
  },
  sbp: {
    nome: 'Sociedade Brasileira de Pediatria (SBP)',
    url: 'https://www.sbp.com.br/fileadmin/user_upload/20226d-DocCient_-_Sindrome_Morte_Subita_do_Lactente.pdf',
  },
  spsp: {
    nome: 'Sociedade de Pediatria de São Paulo',
    url: 'https://spsp.org.br/PDF/AtividadeFi%CC%81sicacompletookgrupo1junho.pdf',
  },
  caderneta: {
    nome: 'Caderneta da Criança (Ministério da Saúde)',
    url: 'https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/cadernetas-e-cartoes/caderneta-da-crianca-menino-passaporte-da-cidadania-7a-edicao-revisada',
  },
  pathways: {
    nome: 'Pathways.org, página sobre tummy time',
    url: 'https://pathways.org/topics-of-development/tummy-time',
  },
  cdc: {
    nome: 'CDC, programa Learn the Signs. Act Early.',
    url: 'https://www.cdc.gov/act-early/milestones/index.html',
  },
  samu: {
    nome: 'Ministério da Saúde, serviço de atendimento móvel de urgência (192)',
    url: 'https://www.gov.br/saude/pt-br/composicao/saes/samu-192',
  },
} as const satisfies Record<string, Fonte>
