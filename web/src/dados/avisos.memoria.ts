import { erroSemMensagem, resultadoSemMensagem, type AutorDoAviso, type Aviso, type DadosAvisos } from './avisos.ts'
import type { Resultado } from './comum.ts'
import { erroDaChave } from './conta.erros.ts'
import { registrarFonteDeAvisos } from './conta.memoria.ts'
import type { DadosConta } from './conta.ts'
import type { DadosRotina, FamiliaDaRotina, Nota } from './rotina.tipos.ts'

// Os avisos no modo memória (RF14, spec 8.1): a preferência e o "visto até" ficam aqui, por conta. As notas e
// as famílias vêm das instâncias em memória da conta e da rotina, só pelas operações públicas
// (`sessaoAtual`, `minhaConta`, `contexto`, `notas`); nenhum arquivo da rotina muda. O "agora" é o relógio da
// memória. Limite aceito (RF14:RF-05): cada lista de notas da memória traz no máximo as 100 mais novas.

const HORA = 3_600_000
const JANELA = 168 * HORA
const MAXIMO_DE_AVISOS = 50

interface OpcoesMemoria {
  /** O relógio da memória; padrão `Date.now`. */
  agora?: () => number
  /** Outros objetos de conta cuja exportação deve ler daqui (a instância de dentro do provedor de sessão). */
  registrarTambemEm?: readonly object[]
}

interface EstadoDaConta {
  ligados: boolean
  /** Em milissegundos; `null` sem visto até. */
  vistosAte: number | null
}

const ok = <T>(valor: T): Resultado<T> => ({ ok: true, valor })

export function criarDadosAvisosMemoria(conta: DadosConta, rotina: DadosRotina, opcoes: OpcoesMemoria = {}): DadosAvisos {
  const agora = opcoes.agora ?? Date.now
  // Por id de conta: uma conta nova, mesmo com o mesmo e-mail, tem outro id e começa desligada.
  const estados = new Map<string, EstadoDaConta>()
  const estadoDe = (id: string): EstadoDaConta => estados.get(id) ?? { ligados: false, vistosAte: null }

  const fonte = (id: string) => {
    const { ligados, vistosAte } = estadoDe(id)
    return { ligados, vistosAte: vistosAte === null ? null : new Date(vistosAte).toISOString() }
  }
  for (const alvo of [conta, ...(opcoes.registrarTambemEm ?? [])]) registrarFonteDeAvisos(alvo, fonte)

  /** Toda chamada a uma dependência: a falha devolvida e a rejeição viram um erro sem a mensagem de origem. */
  async function chamar<T>(corpo: () => Promise<Resultado<T>>): Promise<Resultado<T>> {
    try {
      return resultadoSemMensagem(await corpo())
    } catch (origem) {
      return { ok: false, erro: erroSemMensagem(origem) }
    }
  }

  /** A conta que chama: a da sessão; sem sessão, o erro de sempre. */
  async function quemSou(): Promise<Resultado<string>> {
    const lida = await chamar(() => conta.sessaoAtual())
    if (!lida.ok) return lida
    if (!lida.valor) return { ok: false, erro: erroDaChave('sessao_encerrada') }
    return ok(lida.valor.id)
  }

  /** Quem escreve: além da sessão, a linha da conta tem de existir (como no banco). */
  async function minhaContaId(): Promise<Resultado<string>> {
    const eu = await quemSou()
    if (!eu.ok) return eu
    const minha = await chamar(() => conta.minhaConta())
    if (!minha.ok) return minha
    if (!minha.valor) return { ok: false, erro: erroDaChave('conta_inexistente') }
    return eu
  }

  const autorDe = (nota: Nota, familia: FamiliaDaRotina): AutorDoAviso => {
    if (nota.criadoPor === null) return { tipo: 'removido' }
    const membro = familia.membros.find((m) => m.contaId === nota.criadoPor)
    return membro ? { tipo: 'nome', nome: membro.nome } : { tipo: 'saiu' }
  }

  return {
    async lerEstado() {
      const eu = await quemSou()
      if (!eu.ok) return eu
      const meu = estadoDe(eu.valor)
      if (!meu.ligados) return ok({ ligados: false, avisos: [], maisDe50: false })

      const contexto = await chamar(() => rotina.contexto())
      if (!contexto.ok) return contexto
      const agoraMs = agora()
      const encontrados: Array<{ aviso: Aviso; criadaMs: number }> = []

      for (const familia of contexto.valor.familias) {
        // Uma leitura por bebê (arquivado inclusive) e uma para a família inteira, juntadas pelo id da nota.
        const lidas = await Promise.all([null, ...familia.bebes.map((bebe) => bebe.id)].map((bebe) => chamar(() => rotina.notas(familia.id, bebe))))
        const porId = new Map<string, Nota>()
        for (const lida of lidas) {
          if (!lida.ok) return lida
          for (const nota of lida.valor.itens) porId.set(nota.id, nota)
        }
        for (const nota of porId.values()) {
          const criadaMs = Date.parse(nota.criadaEm)
          const ehAviso =
            nota.excluidaEm === null &&
            nota.criadoPor !== eu.valor &&
            criadaMs > agoraMs - JANELA &&
            criadaMs <= agoraMs &&
            (meu.vistosAte === null || criadaMs > meu.vistosAte)
          if (!ehAviso) continue
          encontrados.push({
            criadaMs,
            aviso: {
              id: nota.id,
              texto: nota.texto,
              criadaEm: nota.criadaEm,
              destaqueAte: nota.destaqueAte,
              autor: autorDe(nota, familia),
              familiaNome: familia.nome,
              familiaFuso: familia.fuso,
            },
          })
        }
      }

      encontrados.sort((a, b) => b.criadaMs - a.criadaMs || (a.aviso.id < b.aviso.id ? 1 : a.aviso.id > b.aviso.id ? -1 : 0))
      return ok({
        ligados: true,
        avisos: encontrados.slice(0, MAXIMO_DE_AVISOS).map((achado) => achado.aviso),
        maisDe50: encontrados.length > MAXIMO_DE_AVISOS,
      })
    },

    async definirLigados(ligados) {
      const eu = await minhaContaId()
      if (!eu.ok) return eu
      estados.set(eu.valor, { ...estadoDe(eu.valor), ligados })
      return ok(null)
    },

    async marcarVistos(ate) {
      const eu = await minhaContaId()
      if (!eu.ok) return eu
      const enviado = Date.parse(ate)
      if (Number.isNaN(enviado)) return { ok: false, erro: erroDaChave('parametro_obrigatorio') }
      const atual = estadoDe(eu.valor)
      // O maior entre o guardado e o enviado, e nunca depois de agora (um valor do futuro vira agora).
      const novo = Math.max(atual.vistosAte ?? Number.NEGATIVE_INFINITY, Math.min(enviado, agora()))
      estados.set(eu.valor, { ...atual, vistosAte: novo })
      return ok(null)
    },
  }
}
