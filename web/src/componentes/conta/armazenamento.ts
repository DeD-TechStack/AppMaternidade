// As chaves que a área de conta guarda no navegador. O armazenamento pode falhar (modo privado,
// cota, política do navegador): nada aqui lança, e a falha vale como "sem valor".

/** `localStorage`: a preferência de família, vinculada à conta que a escolheu. */
export const CHAVE_FAMILIA_ATUAL = 'appmaternidade:familia-atual'

/** `sessionStorage`: o código de convite que precisa sobreviver à entrada (37b). */
export const CHAVE_CONVITE = 'appmaternidade:convite'

/** `sessionStorage`: a marca de recuperação, com o id do usuário da sessão do link de recuperação. */
export const CHAVE_RECUPERACAO = 'appmaternidade:recuperacao'

type Tipo = 'local' | 'sessao'

function armazem(tipo: Tipo): Storage | null {
  try {
    return tipo === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function lerChave(tipo: Tipo, chave: string): string | null {
  try {
    return armazem(tipo)?.getItem(chave) ?? null
  } catch {
    return null
  }
}

export function gravarChave(tipo: Tipo, chave: string, valor: string): void {
  try {
    armazem(tipo)?.setItem(chave, valor)
  } catch {
    // Sem armazenamento, a escolha só vale nesta página.
  }
}

export function apagarChave(tipo: Tipo, chave: string): void {
  try {
    armazem(tipo)?.removeItem(chave)
  } catch {
    // Nada a apagar.
  }
}

export function lerFamiliaAtual(): { pessoa: string; familia: string } | null {
  const texto = lerChave('local', CHAVE_FAMILIA_ATUAL)
  if (texto === null) return null
  try {
    const escolha = JSON.parse(texto)
    if (typeof escolha?.pessoa === 'string' && typeof escolha.familia === 'string') return escolha
  } catch {
    // O formato antigo guardava somente o id da família.
  }
  return null
}

export function limparFamiliaAtual(pessoa: string | null): void {
  const escolha = lerFamiliaAtual()
  if (!escolha || escolha.pessoa === pessoa) apagarChave('local', CHAVE_FAMILIA_ATUAL)
}

const PARAMETROS_DE_AUTENTICACAO = ['code', 'access_token', 'error', 'error_code', 'error_description']

/**
 * Há motivo para falar com o Auth agora? É verdade quando o navegador guarda uma sessão do Supabase (`sb-...-auth-token`,
 * que cobre também o verificador do PKCE) ou quando a URL traz o retorno de um link de autenticação. Uma visita
 * anônima nova dá falso, e o pacote do Supabase nem é pedido.
 */
export function haSinalDeSessao(): boolean {
  try {
    const armazenamento = window.localStorage
    for (let i = 0; i < armazenamento.length; i++) {
      const chave = armazenamento.key(i)
      if (chave !== null && chave.startsWith('sb-') && chave.includes('-auth-token')) return true
    }
  } catch {
    // Armazenamento bloqueado: segue para a URL.
  }
  try {
    const { search, hash } = window.location
    const busca = new URLSearchParams(search)
    const fragmento = new URLSearchParams(hash.slice(1))
    return fragmento.has('type') || PARAMETROS_DE_AUTENTICACAO.some((nome) => busca.has(nome) || fragmento.has(nome))
  } catch {
    // Sem `location`: sem sinal.
    return false
  }
}
