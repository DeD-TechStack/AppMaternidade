import type { RouteObject } from 'react-router'
import { criarRotas } from '../rotas.tsx'

// As rotas do site já com as páginas carregadas. No site cada página é um pacote à parte (`lazy`), e o roteador só
// mostra a tela depois de baixá-lo. Os testes que desenham o site num roteador em memória e consultam a tela na
// hora (`getBy...`) usam estas rotas: o `lazy` de cada rota é resolvido uma vez, aqui, e a rota passa a ter o
// `Component` direto. O que o teste afirma não muda; o comportamento com `lazy` de verdade fica em `rotasLazy.test.tsx`.

type Resolvidos = Map<string, Partial<RouteObject>>

// A chave de uma rota é a posição dela na árvore (índices dos pais e dela), igual em toda chamada de `criarRotas()`.
async function resolver(rotas: RouteObject[], pai: string, resolvidos: Resolvidos): Promise<void> {
  await Promise.all(
    rotas.map(async (rota, indice) => {
      const chave = `${pai}/${indice}`
      if (typeof rota.lazy === 'function') resolvidos.set(chave, (await rota.lazy()) as Partial<RouteObject>)
      if (rota.children) await resolver(rota.children, chave, resolvidos)
    }),
  )
}

function aplicar(rotas: RouteObject[], pai: string, resolvidos: Resolvidos): RouteObject[] {
  return rotas.map((rota, indice) => {
    const chave = `${pai}/${indice}`
    const { lazy, ...resto } = rota
    const carregada = lazy ? resolvidos.get(chave) : undefined
    const filhas = rota.children ? { children: aplicar(rota.children, chave, resolvidos) } : {}
    return { ...resto, ...carregada, ...filhas } as RouteObject
  })
}

const resolvidos: Resolvidos = new Map()
await resolver(criarRotas(), '', resolvidos)

/** Uma árvore nova a cada chamada (cada roteador recebe a sua), com todas as páginas já carregadas. */
export function criarRotasProntas(): RouteObject[] {
  return aplicar(criarRotas(), '', resolvidos)
}
