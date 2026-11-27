import { useCallback, useRef, useState } from 'react'
import { ehRepetivel, type ErroDados, type Resultado } from '../../dados/comum.ts'
import { TX, textoDoErroComunidade } from '../../conteudo/comunidade.ts'

// O envio de uma escrita (MAT-40:RF-19). Um segundo clique não chama o banco de novo. Quando a escrita
// devolve `rede`, a resposta pode ter se perdido depois de o banco gravar: a tela não repete sozinha
// e não reenvia às cegas, e confere primeiro, comparando com o que já existia ANTES da 1ª tentativa.

interface PlanoDeEscrita<T, A> {
  /** O "antes" da conferência: lido logo antes da 1ª tentativa, só uma vez por envio. */
  antes?: () => Promise<Resultado<A>>
  escrever: () => Promise<Resultado<T>>
  /** Lê o que a escrita deixaria: `{ valor }` quando já existe, `null` quando ainda não. Sem ela, não se confere. */
  conferir?: (antes: A | undefined) => Promise<Resultado<{ valor: T } | null>>
  /** Roda no sucesso; `porConferencia` diz que o valor veio da conferência, e não da escrita. */
  aoSucesso: (valor: T, porConferencia: boolean) => void | Promise<void>
}

type AcaoPendente = 'reenviar' | 'conferir' | null
type Etapa = 'inicio' | 'escrita' | 'conferencia'

type EstadoDaEscrita =
  | { fase: 'ocioso' }
  | { fase: 'enviando' }
  | { fase: 'erro'; erro: ErroDados; texto: string; acao: AcaoPendente }

const SEM_RESPOSTA: ErroDados = { classe: 'rede', chave: 'rede', codigo: 'rede', mensagemOriginal: '' }

export function useEscrita<T = unknown, A = undefined>() {
  const [estado, setEstado] = useState<EstadoDaEscrita>({ fase: 'ocioso' })
  const emVoo = useRef(false)
  const plano = useRef<PlanoDeEscrita<T, A> | null>(null)
  const antes = useRef<{ valor: A } | null>(null)
  const pendente = useRef<AcaoPendente>(null)

  const falhar = useCallback((erro: ErroDados, texto: string, acao: AcaoPendente) => {
    emVoo.current = false
    pendente.current = acao
    setEstado({ fase: 'erro', erro, texto, acao })
  }, [])

  const concluir = useCallback(async (atual: PlanoDeEscrita<T, A>, valor: T, porConferencia: boolean) => {
    pendente.current = null
    await atual.aoSucesso(valor, porConferencia)
    emVoo.current = false
    setEstado({ fase: 'ocioso' })
  }, [])

  const rodar = useCallback(
    async (atual: PlanoDeEscrita<T, A>, etapa: Etapa) => {
      if (emVoo.current) return
      emVoo.current = true
      setEstado({ fase: 'enviando' })

      if (etapa === 'inicio' && atual.antes) {
        const lido = await atual.antes()
        if (!lido.ok) return falhar(lido.erro, textoDoErroComunidade(lido.erro), 'reenviar')
        antes.current = { valor: lido.valor }
      }

      let perdida: ErroDados | null = null
      if (etapa !== 'conferencia') {
        const escrita = await atual.escrever()
        if (escrita.ok) return concluir(atual, escrita.valor, false)
        const { erro } = escrita
        if (erro.classe !== 'rede' || !atual.conferir) {
          return falhar(erro, textoDoErroComunidade(erro), ehRepetivel(erro.classe) ? 'reenviar' : null)
        }
        perdida = erro
      }

      // A escrita devolveu `rede` (ou a pessoa pediu "Conferir"): lê o que existe agora.
      if (!atual.conferir) return
      const conferida = await atual.conferir(antes.current?.valor)
      if (!conferida.ok) {
        const texto = conferida.erro.classe === 'rede' ? TX.tx24 : textoDoErroComunidade(conferida.erro)
        return falhar(conferida.erro, texto, 'conferir')
      }
      if (conferida.valor !== null) return concluir(atual, conferida.valor.valor, true)
      return falhar(perdida ?? SEM_RESPOSTA, TX.tx23, 'reenviar')
    },
    [concluir, falhar],
  )

  /** Um envio novo: a pessoa apertou o botão do formulário. */
  const enviar = useCallback(
    (novo: PlanoDeEscrita<T, A>) => {
      if (emVoo.current) return Promise.resolve()
      plano.current = novo
      antes.current = null
      pendente.current = null
      return rodar(novo, 'inicio')
    },
    [rodar],
  )

  /** O botão do erro: reenvia a escrita ou, depois de uma conferência que falhou, só confere. */
  const tentarDeNovo = useCallback(() => {
    const atual = plano.current
    if (!atual || emVoo.current) return Promise.resolve()
    if (pendente.current === 'conferir') return rodar(atual, 'conferencia')
    // Sem o "antes" (a leitura dele falhou), recomeça do início; senão repete só a escrita.
    return rodar(atual, atual.antes && antes.current === null ? 'inicio' : 'escrita')
  }, [rodar])

  /** Apaga o erro (a pessoa mexeu no formulário). */
  const limpar = useCallback(() => {
    if (!emVoo.current) setEstado({ fase: 'ocioso' })
  }, [])

  return { estado, enviar, tentarDeNovo, limpar, enviando: estado.fase === 'enviando' }
}
