import { useEffect, useLayoutEffect, useState } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router'
import { erroDaChave } from '../../dados/conta.erros.ts'
import { urlDoSite } from './destino.ts'

const PARAMETROS_DE_ERRO = ['error', 'error_code', 'error_description']
const PARAMETROS_IMPLICITOS = ['access_token', 'refresh_token', 'token_type', 'expires_in', 'expires_at', 'provider_token', 'provider_refresh_token']
const PARAMETROS_OAUTH = new Set(['code', 'sb_flow_id', ...PARAMETROS_DE_ERRO, ...PARAMETROS_IMPLICITOS])

// Aceita a busca com ou sem o caminho e mantém a precedência do SDK (busca antes do fragmento).
function extrairBusca(busca: string): string {
  const inicio = busca.indexOf('?')
  if (busca.startsWith('/')) return inicio === -1 ? '' : busca.slice(inicio + 1)
  return busca.replace(/^\?/, '')
}

export function lerParametrosDeRetorno(busca: string, fragmento: string) {
  const query = new URLSearchParams(extrairBusca(busca))
  const hash = new URLSearchParams(fragmento.includes('=') ? fragmento.replace(/^#/, '') : '')
  return {
    temErro: PARAMETROS_DE_ERRO.some((nome) => query.has(nome) || hash.has(nome)),
    erro: query.get('error') ?? hash.get('error'),
  }
}

/** Só a chave localizada sai da leitura do retorno. */
export function erroDoRetornoOAuth(busca: string, fragmento: string) {
  const { temErro, erro } = lerParametrosDeRetorno(busca, fragmento)
  if (!temErro) return null
  return erroDaChave(erro === 'access_denied' ? 'login_google_cancelado' : 'login_google')
}

// Compara os nomes decodificados e mantém os demais parâmetros na ordem e na grafia originais.
function retirarParametros(texto: string, fragmento: boolean): string {
  const campos = texto.split('&')
  const nomes = campos.map((campo) => {
    if (fragmento && !campo.includes('=')) return undefined
    return new URLSearchParams(campo).keys().next().value
  })
  const implicito = nomes.some((nome) => nome !== undefined && PARAMETROS_IMPLICITOS.includes(nome))
  return campos
    .filter((_, i) => {
      const nome = nomes[i]
      return nome === undefined || (!PARAMETROS_OAUTH.has(nome) && !(implicito && nome === 'type'))
    })
    .join('&')
}

/** Calcula a substituição ou preserva o endereço de um fragmento isolado que já está limpo. */
export function limparUrlDeRetorno(busca: string, fragmento: string, caminho: string): string | null {
  const query = extrairBusca(busca)
  const hash = fragmento.replace(/^#/, '')
  const queryLimpa = retirarParametros(query, false)
  const hashLimpo = retirarParametros(hash, true)
  if (queryLimpa === query && hashLimpo === hash) return !query && hash ? `${caminho}#${hash}` : null
  return `${caminho}${queryLimpa ? `?${queryLimpa}` : ''}${hashLimpo ? `#${hashLimpo}` : ''}`
}

export function limparRetornoDaUrl(): boolean {
  const { pathname, search, hash } = window.location
  const limpa = limparUrlDeRetorno(search, hash, pathname)
  if (limpa === null || limpa === `${pathname}${search}${hash}`) return false
  window.history.replaceState(window.history.state, '', limpa)
  return true
}

export function useRetornoGoogle(comBanco: boolean, carregando: boolean, entrando: boolean) {
  const { pathname, search, hash, key, state } = useLocation()
  const navegar = useNavigate()
  const tipo = useNavigationType()
  const endereco = `${pathname}${search}${hash}`
  const destino = limparUrlDeRetorno(search, hash, pathname)
  const [aviso, setAviso] = useState<{
    erro: NonNullable<ReturnType<typeof erroDoRetornoOAuth>>
    chave: string
    destinoPendente: string | null
  } | null>(null)

  // O aviso pertence apenas à entrada limpa. Voltar a ela depois de sair não reapresenta o erro.
  if (aviso && aviso.chave !== key) {
    setAviso(tipo === 'REPLACE' && aviso.destinoPendente === endereco
      ? { ...aviso, chave: key, destinoPendente: null }
      : null)
  }

  useLayoutEffect(() => {
    // No sucesso, limpe o endereço depois da inicialização do SDK, antes de sair da tela.
    if (carregando || !entrando || `${window.location.origin}${window.location.pathname}` !== urlDoSite(pathname.slice(1))) return
    limparRetornoDaUrl()
  }, [carregando, entrando, pathname])

  useEffect(() => {
    // Quem já está autenticado sai por Navigate replace e leva apenas o destino validado.
    if (carregando || entrando || destino === null || destino === endereco) return
    let vigente = true
    queueMicrotask(() => {
      if (!vigente) return
      const erro = comBanco ? erroDoRetornoOAuth(search, hash) : null
      setAviso(erro ? { erro, chave: key, destinoPendente: destino } : null)
      void navegar(destino, { replace: true, state, preventScrollReset: true })
    })
    return () => { vigente = false }
  }, [carregando, entrando, destino, endereco, comBanco, search, hash, key, navegar, state])

  return {
    erro: aviso?.chave === key && aviso.destinoPendente === null ? aviso.erro : null,
    dispensarErro: () => setAviso(null),
  }
}
