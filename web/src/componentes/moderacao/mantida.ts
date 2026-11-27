import { useState } from 'react'
import { ehRepetivel, type ErroDados } from '../../dados/comum.ts'

// O que a tela de uma denúncia ou de um conteúdo mostra enquanto uma releitura está em curso ou falhou por
// erro passageiro (MAT-40:RF-15): a última leitura que valeu. Assim a caixa aberta, o motivo digitado e a
// frase da recusa continuam na tela, em estado do React (nada vai ao navegador), e o erro da leitura aparece
// com o "Tentar de novo". Um erro que não é passageiro (não encontrado, sem permissão, sessão encerrada)
// descarta a leitura, como antes: o acesso fecha ou a tela passa ao estado próprio dele.

type EstadoDaLeitura<T> = { fase: 'carregando' } | { fase: 'pronto'; valor: T } | { fase: 'erro'; erro: ErroDados }

/** `null` enquanto nunca houve leitura; `{ valor }` com a última que valeu (o valor pode ser `null`: não encontrado). */
export function useLeituraMantida<T>(estado: EstadoDaLeitura<T>): { valor: T } | null {
  const [mantida, setMantida] = useState<{ valor: T } | null>(null)

  if (estado.fase === 'pronto') {
    if (mantida === null || mantida.valor !== estado.valor) {
      const nova = { valor: estado.valor }
      setMantida(nova)
      return nova
    }
  } else if (estado.fase === 'erro' && !ehRepetivel(estado.erro.classe) && mantida !== null) {
    setMantida(null)
    return null
  }
  return mantida
}
