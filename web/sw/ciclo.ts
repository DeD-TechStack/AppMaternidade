// Instalação e ativação do service worker, sem depender do CacheStorage de verdade.

import { nomeDoCache, prefixoDoCache, type ConfigSw } from './config.ts'

interface CacheSw {
  put: (chave: string, resposta: Response) => Promise<void>
  match: (chave: string) => Promise<Response | undefined>
}

/** O que o `CacheStorage` dá ao service worker. */
export interface ArmazemSw {
  open: (nome: string) => Promise<CacheSw>
  delete: (nome: string) => Promise<boolean>
  keys: () => Promise<string[]>
}

/**
 * Guarda a casca inteira num cache com o nome da versão. Primeiro busca tudo: se qualquer arquivo
 * falhar (rede ou status diferente de 200) nada é gravado e a instalação falha, e o service worker
 * antigo continua. Se gravar falhar no meio, o cache pela metade é apagado.
 */
export async function instalarCasca(
  config: ConfigSw,
  buscar: (caminho: string) => Promise<Response>,
  armazem: ArmazemSw,
): Promise<void> {
  const respostas = await Promise.all(
    config.casca.map(async (caminho) => {
      const resposta = await buscar(caminho)
      if (resposta.status !== 200) throw new Error(`${caminho}: status ${resposta.status}`)
      return [caminho, resposta] as const
    }),
  )

  const nome = nomeDoCache(config)
  const cache = await armazem.open(nome)
  try {
    for (const [caminho, resposta] of respostas) await cache.put(caminho, resposta)
  } catch (erro) {
    await armazem.delete(nome)
    throw erro
  }
}

/** Apaga os caches das versões anteriores deste site (mesmo prefixo); não toca em outro nome. */
export async function ativarVersao(config: ConfigSw, armazem: ArmazemSw): Promise<string[]> {
  const prefixo = prefixoDoCache(config)
  const atual = nomeDoCache(config)
  const antigos = (await armazem.keys()).filter((nome) => nome.startsWith(prefixo) && nome !== atual)
  await Promise.all(antigos.map((nome) => armazem.delete(nome)))
  return antigos
}
