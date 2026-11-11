import { useCallback, useRef, useState } from 'react'
import { ehRepetivel, type ErroDados, type Resultado } from '../../dados/comum.ts'
import { erroDaChave } from '../../dados/conta.erros.ts'

// O envio de um formulário (RF-17): um segundo clique não chama o banco de novo; a rede, o
// "tente de novo" e o desconhecido oferecem "Tentar de novo"; e, numa escrita, a repetição que
// falha passa pela conferência do efeito pedido antes de a tela mostrar o erro ("rede numa
// escrita": a resposta pode ter se perdido depois de o banco gravar).

interface PlanoEnvio<T> {
  escrever: () => Promise<Resultado<T>>
  /** Lê o efeito pedido: `true` quando ele já existe. Sem ela, a repetição não se confere. */
  conferir?: () => Promise<Resultado<boolean>>
  /** Um erro da repetição que prova que a escrita anterior já valia (por exemplo `senha_igual`). */
  provaSucesso?: (erro: ErroDados) => boolean
  /** Roda no sucesso, também quando ele vem pela repetição. `valor` falta se veio da conferência. */
  aoSucesso: (valor: T | undefined) => void | Promise<void>
}

type EstadoEnvio =
  | { fase: 'ocioso' }
  | { fase: 'enviando' }
  | { fase: 'erro'; erro: ErroDados; tentarDeNovo: boolean }

export function useEnvio() {
  const [estado, setEstado] = useState<EstadoEnvio>({ fase: 'ocioso' })
  const emVoo = useRef(false)
  const plano = useRef<PlanoEnvio<unknown> | null>(null)
  // A tentativa anterior falhou de um jeito que pede repetição (a resposta pode ter se perdido).
  const repetindo = useRef(false)
  // O que o "Tentar de novo" repete: a escrita ou, se a conferência falhou, só a conferência.
  const alvo = useRef<'escrita' | 'conferencia'>('escrita')
  const erroDaRepeticao = useRef<ErroDados | null>(null)

  const falhar = useCallback((erro: ErroDados) => {
    repetindo.current = repetindo.current || ehRepetivel(erro.classe)
    emVoo.current = false
    setEstado({ fase: 'erro', erro, tentarDeNovo: ehRepetivel(erro.classe) })
  }, [])

  const concluir = useCallback(async (atual: PlanoEnvio<unknown>, valor: unknown) => {
    repetindo.current = false
    alvo.current = 'escrita'
    erroDaRepeticao.current = null
    await atual.aoSucesso(valor)
    emVoo.current = false
    setEstado({ fase: 'ocioso' })
  }, [])

  const rodar = useCallback(
    async (atual: PlanoEnvio<unknown>) => {
      if (emVoo.current) return
      emVoo.current = true
      setEstado({ fase: 'enviando' })

      if (alvo.current === 'conferencia' && atual.conferir) {
        const conferida = await atual.conferir()
        if (!conferida.ok) return falhar(conferida.erro)
        if (conferida.valor) return concluir(atual, undefined)
        alvo.current = 'escrita'
        return falhar(erroDaRepeticao.current ?? erroDaChave('desconhecido'))
      }

      const escrita = await atual.escrever()
      if (escrita.ok) return concluir(atual, escrita.valor)

      const repeticao = repetindo.current
      if (repeticao && atual.provaSucesso?.(escrita.erro)) return concluir(atual, undefined)
      if (repeticao && atual.conferir) {
        const conferida = await atual.conferir()
        if (conferida.ok && conferida.valor) return concluir(atual, undefined)
        if (!conferida.ok) {
          erroDaRepeticao.current = escrita.erro
          alvo.current = 'conferencia'
          return falhar(conferida.erro)
        }
      }
      return falhar(escrita.erro)
    },
    [concluir, falhar],
  )

  /** Um envio novo (a pessoa apertou o botão do formulário). */
  const enviar = useCallback(
    <T>(novo: PlanoEnvio<T>) => {
      if (emVoo.current) return Promise.resolve()
      plano.current = novo as PlanoEnvio<unknown>
      repetindo.current = false
      alvo.current = 'escrita'
      erroDaRepeticao.current = null
      return rodar(novo as PlanoEnvio<unknown>)
    },
    [rodar],
  )

  /** O botão "Tentar de novo": repete o último envio. */
  const tentarDeNovo = useCallback(() => {
    if (!plano.current) return Promise.resolve()
    return rodar(plano.current)
  }, [rodar])

  /** Apaga o erro (a pessoa mexeu no formulário). */
  const limpar = useCallback(() => {
    if (!emVoo.current) setEstado({ fase: 'ocioso' })
  }, [])

  return { estado, enviar, tentarDeNovo, limpar, enviando: estado.fase === 'enviando' }
}
