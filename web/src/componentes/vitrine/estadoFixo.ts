import { MINIATURAS } from '../../conteudo/textos.ts'
import type { EstadoPrototipo } from '../../prototipo/estado.ts'

// O estado fixo e o relógio parado das telas dos aparelhos do Início, montados a partir dos dados
// de MINIATURAS (textos.ts). Cada tela é a de verdade, vista num instante só:
//  - hoje e sessao: a sessão de Sono de Bruno, iniciada às 21:48, com o relógio parado às 23:00;
//  - madrugada: a Mamada de Heloísa, iniciada às 03:10:00, com o relógio parado às 03:24:32.
// As horas são locais (new Date com partes, nunca uma string com fuso), como as de formatarHora.

type TelaDaVitrine = 'hoje' | 'sessao' | 'madrugada'

interface DadosDaTela {
  estado: EstadoPrototipo
  /** O instante (ms) em que o relógio parado marca. */
  agora: number
}

// Um dia qualquer: só a hora do dia aparece nas telas. 6 de novembro de 2026.
const ANO = 2026
const MES = 10
const DIA = 6

function instanteDe(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number)
  return new Date(ANO, MES, DIA, horas, minutos, 0).getTime()
}

/** "1:12:00" ou "14:32" em milissegundos. */
function duracaoDe(cronometro: string): number {
  const partes = cronometro.split(':').map(Number)
  const [horas, minutos, segundos] = partes.length === 3 ? partes : [0, ...partes]
  return ((horas * 60 + minutos) * 60 + segundos) * 1000
}

const [AUTOR_DA_NOTA, HORA_DA_NOTA] = MINIATURAS.hoje.nota.autor.split(', ')

const BASE: EstadoPrototipo = {
  sessao: null,
  nota: { texto: MINIATURAS.hoje.nota.texto, autor: AUTOR_DA_NOTA, hora: HORA_DA_NOTA },
  ultimos: MINIATURAS.hoje.ultimos.itens.map((item) => ({
    chave: item.rotulo,
    rotulo: item.rotulo,
    quando: item.quando,
  })),
  madrugada: false,
  confirmacao: null,
}

function dadosDoSono(): DadosDaTela {
  const inicio = instanteDe(MINIATURAS.sessao.hora)
  return {
    estado: { ...BASE, sessao: { tipo: 'sono', inicio, pessoa: MINIATURAS.sessao.pessoa } },
    agora: inicio + duracaoDe(MINIATURAS.sessao.cronometro),
  }
}

function dadosDaMadrugada(): DadosDaTela {
  const inicio = instanteDe(MINIATURAS.madrugada.hora)
  return {
    estado: { ...BASE, madrugada: true, sessao: { tipo: 'mamada', inicio, pessoa: MINIATURAS.madrugada.pessoa } },
    agora: inicio + duracaoDe(MINIATURAS.madrugada.cronometro),
  }
}

const DADOS: Record<TelaDaVitrine, DadosDaTela> = {
  hoje: dadosDoSono(),
  sessao: dadosDoSono(),
  madrugada: dadosDaMadrugada(),
}

export function dadosDaVitrine(tela: TelaDaVitrine): DadosDaTela {
  return DADOS[tela]
}
