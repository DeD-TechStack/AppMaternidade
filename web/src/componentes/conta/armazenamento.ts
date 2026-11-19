// As chaves que a área de conta guarda no navegador. O armazenamento pode falhar (modo privado,
// cota, política do navegador): nada aqui lança, e a falha vale como "sem valor".

/** `localStorage`: a família que a tela Família mostra, entre as famílias com vínculo ativo. */
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

const PARAMETROS_DE_AUTENTICACAO = /(?:^|[?&#])(?:code|error_code|error_description)=/
const FRAGMENTO_DE_AUTENTICACAO = /(?:^|[#&])(?:access_token|error_code|error_description|type)=/

/**
 * Há motivo para falar com o Auth agora? É verdade quando o navegador guarda uma sessão do Supabase (`sb-...-auth-token`,
 * que cobre também o verificador do PKCE) ou quando a URL traz o retorno de um link de autenticação (`code=`, `access_token=`,
 * `type=`, `error_code=`, `error_description=`). Uma visita anônima nova dá falso, e o pacote do Supabase nem é pedido.
 * Armazenamento bloqueado dá falso: sem armazenamento não há sessão a retomar.
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
    if (PARAMETROS_DE_AUTENTICACAO.test(search)) return true
    if (FRAGMENTO_DE_AUTENTICACAO.test(hash)) return true
  } catch {
    // Sem `location`: sem sinal.
  }
  return false
}
