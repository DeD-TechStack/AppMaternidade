import { FORMULARIO } from '../../conteudo/rotina.ts'
import type { ConteudoFralda, ConteudoMamadeira, DetalhesRegistro, LadoMamada, Registro, TipoRegistro } from '../../dados/rotina.tipos.ts'
import { ehTipoDeSessao } from '../../dados/rotina.tipos.ts'
import { dividirDataEHora, juntarDataEHora } from './formatos.ts'
import type { Horario } from './CampoHorario.tsx'

// A validação do formulário de registro (R38-10), antes de enviar: fim antes do início, horário mais de
// 5 minutos no futuro, ml fora de 1 a 500 ou não inteiro, texto obrigatório vazio ou só com espaços e
// texto acima do limite. Os textos são cortados nas pontas antes de contar.

const TOLERANCIA_DO_FUTURO = 5 * 60_000

export interface CamposDoRegistro {
  tipo: TipoRegistro | ''
  inicio: Horario
  /** Data e hora vazias: sem fim (sessão em andamento). */
  fim: Horario
  lado: LadoMamada | ''
  ml: string
  conteudoDaMamadeira: ConteudoMamadeira | ''
  conteudoDaFralda: ConteudoFralda | ''
  alimento: string
  /** O texto da observação: ele é a nota dela. */
  texto: string
  nota: string
}

type CampoComErro = 'tipo' | 'inicio' | 'fim' | 'ml' | 'conteudoDaFralda' | 'alimento' | 'texto' | 'nota'

export type ErrosDoRegistro = Partial<Record<CampoComErro, string>>

interface ContextoDaValidacao {
  modo: 'novo' | 'editar'
  /** Na edição: a sessão ainda está em andamento (o campo de fim não aparece). */
  emAndamento: boolean
  agora: number
}

export interface EntradaValidada {
  inicio: string
  fim: string | null
  detalhes: DetalhesRegistro
  nota: string | null
}

const VAZIO: Horario = { data: '', hora: '' }

export const camposVazios = (agora: number): CamposDoRegistro => ({
  tipo: '',
  inicio: dividirDataEHora(agora),
  fim: VAZIO,
  lado: '',
  ml: '',
  conteudoDaMamadeira: '',
  conteudoDaFralda: '',
  alimento: '',
  texto: '',
  nota: '',
})

/** Os campos de um registro que já existe (edição): o estado completo das colunas editáveis. */
export function camposDoRegistro(registro: Registro): CamposDoRegistro {
  const { detalhes } = registro
  const conteudo = detalhes.conteudo
  return {
    tipo: registro.tipo,
    inicio: dividirDataEHora(Date.parse(registro.inicio)),
    fim: registro.fim === null ? VAZIO : dividirDataEHora(Date.parse(registro.fim)),
    lado: detalhes.lado ?? '',
    ml: detalhes.ml === undefined ? '' : String(detalhes.ml),
    conteudoDaMamadeira: registro.tipo === 'mamadeira' && (conteudo === 'leite_materno' || conteudo === 'formula') ? conteudo : '',
    conteudoDaFralda: registro.tipo === 'fralda' && (conteudo === 'xixi' || conteudo === 'coco' || conteudo === 'ambos') ? conteudo : '',
    alimento: detalhes.alimento ?? '',
    texto: registro.tipo === 'observacao' ? (registro.nota ?? '') : '',
    nota: registro.tipo === 'observacao' ? '' : (registro.nota ?? ''),
  }
}

/** O campo de fim aparece nas sessões, menos na edição de uma sessão em andamento (D-28). */
export const temCampoDeFim = (tipo: TipoRegistro | '', contexto: ContextoDaValidacao): boolean =>
  tipo !== '' && ehTipoDeSessao(tipo) && !(contexto.modo === 'editar' && contexto.emAndamento)

export function validarRegistro(
  campos: CamposDoRegistro,
  contexto: ContextoDaValidacao,
): { erros: ErrosDoRegistro; entrada: EntradaValidada | null } {
  const erros: ErrosDoRegistro = {}
  const { tipo } = campos
  if (tipo === '') {
    erros.tipo = FORMULARIO.erroTipo
    return { erros, entrada: null }
  }

  const limite = contexto.agora + TOLERANCIA_DO_FUTURO
  const inicio = juntarDataEHora(campos.inicio.data, campos.inicio.hora)
  if (Number.isNaN(inicio)) erros.inicio = FORMULARIO.erroInicioObrigatorio
  else if (inicio > limite) erros.inicio = FORMULARIO.erroNoFuturo

  let fim: number | null = null
  if (temCampoDeFim(tipo, contexto)) {
    const vazio = campos.fim.data === '' && campos.fim.hora === ''
    // Na edição de uma sessão encerrada o fim é obrigatório: apagá-lo não a devolve a "em andamento" (DR-24).
    if (vazio && contexto.modo === 'editar') erros.fim = FORMULARIO.erroSessaoEncerradaSemFim
    else if (!vazio) {
      fim = juntarDataEHora(campos.fim.data, campos.fim.hora)
      if (Number.isNaN(fim)) {
        erros.fim = FORMULARIO.erroFimIncompleto
        fim = null
      } else if (fim > limite) erros.fim = FORMULARIO.erroNoFuturo
      else if (!Number.isNaN(inicio) && fim < inicio) erros.fim = FORMULARIO.erroFimAntesDoInicio
    }
  }

  const detalhes: DetalhesRegistro = {}
  if (tipo === 'mamada' && campos.lado) detalhes.lado = campos.lado
  if (tipo === 'mamadeira') {
    const ml = campos.ml.trim()
    if (ml !== '') {
      const valor = Number(ml)
      if (!/^\d+$/.test(ml) || valor < 1 || valor > 500) erros.ml = FORMULARIO.erroMl
      else detalhes.ml = valor
    }
    if (campos.conteudoDaMamadeira) detalhes.conteudo = campos.conteudoDaMamadeira
  }
  if (tipo === 'fralda') {
    if (campos.conteudoDaFralda === '') erros.conteudoDaFralda = FORMULARIO.escolhaObrigatoria
    else detalhes.conteudo = campos.conteudoDaFralda
  }
  if (tipo === 'solido') {
    const alimento = campos.alimento.trim()
    if (alimento.length > 100) erros.alimento = FORMULARIO.erroAlimentoLongo
    else if (alimento !== '') detalhes.alimento = alimento
  }

  let nota: string | null = null
  if (tipo === 'observacao') {
    const texto = campos.texto.trim()
    if (texto === '') erros.texto = FORMULARIO.erroTextoObrigatorio
    else if (texto.length > 500) erros.texto = FORMULARIO.erroTextoLongo
    else nota = texto
  } else {
    const texto = campos.nota.trim()
    if (texto.length > 500) erros.nota = FORMULARIO.erroNotaLonga
    else if (texto !== '') nota = texto
  }

  if (Object.keys(erros).length > 0) return { erros, entrada: null }
  return {
    erros,
    entrada: {
      inicio: new Date(inicio).toISOString(),
      fim: fim === null ? null : new Date(fim).toISOString(),
      detalhes,
      nota,
    },
  }
}
