import type { SupabaseClient } from '@supabase/supabase-js'
import { erroSemMensagem, type AutorDoAviso, type Aviso, type DadosAvisos, type EstadoDosAvisos } from './avisos.ts'
import type { Resultado } from './comum.ts'
import { formatoInesperado } from './rotina.erros.ts'

// O adaptador do banco dos avisos (RF14). Cada operação é uma única chamada de função (`rpc`) e devolve
// `Resultado`: o que escapa (erro do Postgres, da rede, resposta fora do formato) passa por
// `classificarErroConta`. Nada lança para a tela. Um erro de formato diz só o nome do campo: nunca o texto
// de uma nota nem um nome (RF14:RN-06).

const MAXIMO_DE_AVISOS = 50

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

function texto(bruto: Record<string, unknown>, chave: string): string {
  const valor = bruto[chave]
  if (typeof valor !== 'string' || valor === '') formatoInesperado(chave)
  return valor
}

/** Um instante: o texto que o banco mandou, conferido e devolvido sem mudar (os microssegundos ficam). */
function instante(bruto: Record<string, unknown>, chave: string): string {
  const valor = texto(bruto, chave)
  if (Number.isNaN(Date.parse(valor))) formatoInesperado(chave)
  return valor
}

function lerAutor(bruto: Record<string, unknown>): AutorDoAviso {
  const tipo = bruto.autor
  if (tipo === 'nome') return { tipo: 'nome', nome: texto(bruto, 'autor_nome') }
  if (tipo === 'removido' || tipo === 'saiu') return { tipo }
  return formatoInesperado('autor')
}

function lerAviso(bruto: unknown): Aviso {
  if (!ehObjeto(bruto)) formatoInesperado('aviso')
  return {
    id: texto(bruto, 'id'),
    texto: texto(bruto, 'texto'),
    criadaEm: instante(bruto, 'criada_em'),
    destaqueAte: bruto.destaque_ate === null ? null : instante(bruto, 'destaque_ate'),
    autor: lerAutor(bruto),
    familiaNome: texto(bruto, 'familia_nome'),
    familiaFuso: texto(bruto, 'familia_fuso'),
  }
}

function lerEstado(bruto: unknown): EstadoDosAvisos {
  if (!ehObjeto(bruto)) formatoInesperado('estado')
  if (typeof bruto.ligados !== 'boolean') formatoInesperado('ligados')
  if (typeof bruto.mais_de_50 !== 'boolean') formatoInesperado('mais_de_50')
  if (!Array.isArray(bruto.avisos) || bruto.avisos.length > MAXIMO_DE_AVISOS) formatoInesperado('avisos')
  // Desligado, o banco traz zero avisos e a marca falsa: qualquer outra coisa não é o contrato.
  if (!bruto.ligados && (bruto.avisos.length > 0 || bruto.mais_de_50)) formatoInesperado('avisos')
  return { ligados: bruto.ligados, avisos: bruto.avisos.map(lerAviso), maisDe50: bruto.mais_de_50 }
}

async function executar<T>(corpo: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, valor: await corpo() }
  } catch (origem) {
    return { ok: false, erro: erroSemMensagem(origem) }
  }
}

export function criarDadosAvisosSupabase(cliente: SupabaseClient): DadosAvisos {
  async function chamar(nome: string, argumentos?: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await cliente.rpc(nome, argumentos)
    if (error) throw error
    return data
  }

  return {
    lerEstado: () => executar(async () => lerEstado(await chamar('avisos_ler_estado'))),
    definirLigados: (ligados) =>
      executar(async () => {
        await chamar('avisos_definir_ligados', { p_ligados: ligados })
        return null
      }),
    marcarVistos: (ate) =>
      executar(async () => {
        await chamar('avisos_marcar_vistos', { p_ate: ate })
        return null
      }),
  }
}
