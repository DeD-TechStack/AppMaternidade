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
