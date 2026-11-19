import { useEffect, useRef } from 'react'
import { useMatches } from 'react-router'
import { useDadosConta } from '../conta/sessao.tsx'
import { AREA_DA_ROTINA, useMadrugada, type useLuaDaCasca } from '../rotina/madrugada.ts'

/**
 * A lua do cabeçalho: o mesmo que `useLuaDaCasca` (o estado da lua e o toque que a alterna), mas a escolha da
 * pessoa sobrevive a uma visita fora da Rotina. Dentro da Rotina a madrugada acompanha a escolha; ao sair
 * (Conta, Início, outra área) o `data-tema` vai embora e a lua não existe; ao voltar, a escolha é restaurada.
 * Quem estava com a madrugada desligada continua desligada. Fechar a página joga a escolha fora, e sair da
 * conta ("Sair") ou entrar como outra pessoa também: a próxima pessoa começa com a madrugada desligada.
 */
export function useLuaDoCabecalho(): ReturnType<typeof useLuaDaCasca> {
  const dentro = useMatches().some((rota) => (rota.handle as { area?: unknown } | undefined)?.area === AREA_DA_ROTINA)
  const { madrugada: ligada, definir } = useMadrugada()
  const madrugada = ligada && dentro

  // A escolha da pessoa e se a Rotina já a aplicou nesta visita.
  const escolha = useRef(false)
  const aplicada = useRef(false)

  // A casca fica montada depois do "Sair" e acima da sessão (sem `useSessao`): a troca de pessoa chega pelos
  // eventos da conta. A escolha era de quem saiu (ou de quem foi trocado por outra entrada sem `saiu`): a próxima
  // pessoa começa com a madrugada desligada. A mesma pessoa que entra de novo mantém a escolha.
  const dados = useDadosConta()
  const pessoa = useRef<string | null>(null)
  useEffect(() => {
    let viva = true
    // Quem já estava na sessão ao montar não gera evento: descobre-se o id por `sessaoAtual`.
    void dados.sessaoAtual().then((r) => {
      if (viva && pessoa.current === null && r.ok && r.valor) pessoa.current = r.valor.id
    })
    const cancelar = dados.aoMudarSessao((evento, usuario) => {
      if (evento === 'saiu') {
        pessoa.current = null
      } else if (usuario) {
        if (pessoa.current === usuario.id) return
        pessoa.current = usuario.id
      } else {
        return
      }
      escolha.current = false
      definir(false)
    })
    return () => {
      viva = false
      cancelar()
    }
  }, [dados, definir])

  useEffect(() => {
    if (!dentro) {
      aplicada.current = false
      definir(false)
    } else if (!aplicada.current) {
      aplicada.current = true
      definir(escolha.current)
    } else {
      // Já aplicada: quem liga ou desliga a madrugada dentro da Rotina muda a escolha.
      escolha.current = ligada
    }
  }, [dentro, ligada, definir])

  // Fechar a página (desmontar a casca) joga o estado fora.
  useEffect(
    () => () => {
      aplicada.current = false
      definir(false)
    },
    [definir],
  )

  useEffect(() => {
    if (!madrugada) return
    const raiz = document.documentElement
    raiz.setAttribute('data-tema', 'madrugada')
    return () => raiz.removeAttribute('data-tema')
  }, [madrugada])

  return {
    madrugada,
    alternar: () => {
      if (!dentro) return
      escolha.current = !ligada
      definir(escolha.current)
    },
  }
}
