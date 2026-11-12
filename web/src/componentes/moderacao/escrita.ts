import { useCallback, useRef, useState } from 'react'
import { ehRepetivel, type ErroDados, type Resultado } from '../../dados/comum.ts'
import { TX as TX_COMUNIDADE } from '../../conteudo/comunidade.ts'
import { textoDoErroModeracao } from '../../conteudo/moderacao.ts'

// O envio de uma escrita do painel (MAT-40:RF-19). Um segundo clique não chama o banco de novo. Quando a
// escrita devolve `rede`, a resposta pode ter se perdido depois de o banco gravar: a tela não repete sozinha
// e confere primeiro, com uma leitura. É o mesmo desenho do envio da Comunidade, com a tabela de frases da
// moderação (a da Comunidade não conhece as chaves da 40b).

interface PlanoDeEscrita<T> {
  escrever: () => Promise<Resultado<T>>
  /** Lê o que a escrita deixaria: `{ valor }` quando já existe, `null` quando ainda não. */
  conferir?: () => Promise<Resultado<{ valor: T } | null>>
  /** Roda no sucesso; `porConferencia` diz que o valor veio da conferência, e não da escrita. */
  aoSucesso: (valor: T, porConferencia: boolean) => void | Promise<void>
  /** Roda quando o banco devolveu um erro (a tela relê, ou perde o acesso). */
  aoErro?: (erro: ErroDados) => void
}

type AcaoPendente = 'reenviar' | 'conferir' | null

type EstadoDaEscrita =
  | { fase: 'ocioso' }
  | { fase: 'enviando' }
  | { fase: 'erro'; erro: ErroDados; texto: string; acao: AcaoPendente }

const SEM_RESPOSTA: ErroDados = { classe: 'rede', chave: 'rede', codigo: 'rede', mensagemOriginal: '' }

export function useEscritaModeracao<T = unknown>() {
  const [estado, setEstado] = useState<EstadoDaEscrita>({ fase: 'ocioso' })
  const emVoo = useRef(false)
  const plano = useRef<PlanoDeEscrita<T> | null>(null)
  const pendente = useRef<AcaoPendente>(null)

  const falhar = useCallback((erro: ErroDados, texto: string, acao: AcaoPendente) => {
    emVoo.current = false
    pendente.current = acao
    setEstado({ fase: 'erro', erro, texto, acao })
  }, [])

  const concluir = useCallback(async (atual: PlanoDeEscrita<T>, valor: T, porConferencia: boolean) => {
    pendente.current = null
    await atual.aoSucesso(valor, porConferencia)
    emVoo.current = false
    setEstado({ fase: 'ocioso' })
  }, [])

  const rodar = useCallback(
    async (atual: PlanoDeEscrita<T>, apenasConferir: boolean) => {
      if (emVoo.current) return
      emVoo.current = true
      setEstado({ fase: 'enviando' })

      let perdida: ErroDados | null = null
      if (!apenasConferir) {
        const escrita = await atual.escrever()
        if (escrita.ok) return concluir(atual, escrita.valor, false)
        const { erro } = escrita
        if (erro.classe !== 'rede' || !atual.conferir) {
          atual.aoErro?.(erro)
          return falhar(erro, textoDoErroModeracao(erro), ehRepetivel(erro.classe) ? 'reenviar' : null)
        }
        perdida = erro
      }

      // A escrita devolveu `rede` (ou a pessoa pediu "Conferir"): lê o que existe agora.
      if (!atual.conferir) return
      const conferida = await atual.conferir()
      if (!conferida.ok) {
        const texto = conferida.erro.classe === 'rede' ? TX_COMUNIDADE.tx24 : textoDoErroModeracao(conferida.erro)
        return falhar(conferida.erro, texto, 'conferir')
      }
      if (conferida.valor !== null) return concluir(atual, conferida.valor.valor, true)
      return falhar(perdida ?? SEM_RESPOSTA, TX_COMUNIDADE.tx23, 'reenviar')
    },
    [concluir, falhar],
  )

  /** Um envio novo: a pessoa apertou o botão do formulário. */
  const enviar = useCallback(
    (novo: PlanoDeEscrita<T>) => {
      if (emVoo.current) return Promise.resolve()
      plano.current = novo
      pendente.current = null
      return rodar(novo, false)
    },
    [rodar],
  )

  /** O botão do erro: reenvia a escrita ou, depois de uma conferência que falhou, só confere. */
  const tentarDeNovo = useCallback(() => {
    const atual = plano.current
    if (!atual || emVoo.current) return Promise.resolve()
    return rodar(atual, pendente.current === 'conferir')
  }, [rodar])

  /** Apaga o erro (a pessoa mexeu no formulário). */
  const limpar = useCallback(() => {
    if (!emVoo.current) setEstado({ fase: 'ocioso' })
  }, [])

  return { estado, enviar, tentarDeNovo, limpar, enviando: estado.fase === 'enviando' }
}
