// Textos exclusivos da demo interativa nos telefones (carregados sob demanda com o motor).
// Sem promessas médicas, sem jargão de app e sem repetir avisos proibidos fora do rodapé.

import type { FluxoDemoTelefone } from './textosCasca.ts'

export const DEMO_TEXTOS = {
  voltarImagem: 'Voltar à imagem',
  reiniciar: 'Reiniciar',
  voltar: 'Voltar',
  regiao: (fluxo: FluxoDemoTelefone) => {
    const titulos: Record<FluxoDemoTelefone, string> = {
      historico: 'Tela interativa do Histórico',
      hoje: 'Tela interativa de Hoje à noite',
      familia: 'Tela interativa de Cuidado compartilhado',
      notas: 'Tela interativa de Notas',
    }
    return titulos[fluxo]
  },
  titulos: {
    historico: 'Histórico',
    hoje: 'Hoje',
    familia: 'Família',
    notas: 'Notas',
  },
  subtitulos: {
    historico: 'Heloísa · hoje, 17:30',
    hoje: 'Heloísa · 20:30, madrugada',
    familia: 'Família Exemplo · Heloísa',
    notas: 'Heloísa',
  },
  familia: {
    alternarGrupo: 'Escolher quem está olhando a tela',
    verComo: 'Ver como:',
    anotarFralda: (nome: string) => `Anotar fralda como ${nome}`,
    fraldaAnotada: (nome: string, hora: string) => `Fralda anotada por ${nome} às ${hora}.`,
    acaoSomenteNaConta: 'Na tela completa do site, este botão abre a confirmação de papel ou acesso.',
  },
  historico: {
    mamadaRegistrada: 'Mamada registrada',
    sonoRegistrado: 'Sono registrado',
    tummyRegistrado: 'Tummy time registrado',
    detalheTitulo: 'Detalhe do registro',
    detalheAutor: (autor: string, hora: string) => `Registrado por ${autor} às ${hora}.`,
    detalheNota: (nota: string) => `Observação: ${nota}`,
    irParaOutroFora: 'Na tela completa do site, esta opção abre o formulário de outro horário.',
  },
  hoje: {
    verSessaoAviso: 'Sessão em andamento na tela Hoje. Toque em Encerrar para somar ao total do dia.',
  },
  notas: {
    irParaHojeFora: 'Esta prévia mostra a tela de Notas. Use Nova nota para testar o cadastro.',
    editarFora: 'Na tela completa do site, este botão abre a edição da nota.',
  },
  rotaFora: 'Esta prévia mantém você na tela atual da página.',
} as const
