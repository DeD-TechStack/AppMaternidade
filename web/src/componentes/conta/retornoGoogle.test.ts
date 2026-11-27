import { afterEach, describe, expect, it } from 'vitest'
import { TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { erroDoRetornoOAuth, lerParametrosDeRetorno, limparRetornoDaUrl, limparUrlDeRetorno } from './retornoGoogle.ts'

// A volta do Google: o que a URL traz (código, tokens, erro), a frase de cada erro e a limpeza do
// endereço depois que o retorno foi processado. A limpeza só tira os parâmetros de autenticação:
// o caminho, a base do site e o resto (o `volta`) ficam.

describe('lerParametrosDeRetorno', () => {
  it('sem parâmetro de autenticação, não há erro (nem com ?code= de uma volta com sucesso)', () => {
    expect(lerParametrosDeRetorno('', '')).toEqual({ temErro: false, erro: null })
    expect(lerParametrosDeRetorno('?volta=%2Fapp%2Fhoje', '')).toEqual({ temErro: false, erro: null })
    expect(lerParametrosDeRetorno('?code=abc', '#access_token=x&token_type=bearer')).toEqual({ temErro: false, erro: null })
  })

  it('acha o erro na busca ou no fragmento, e o valor de `error` quando ele vem', () => {
    expect(lerParametrosDeRetorno('?error=access_denied&error_code=x', '')).toEqual({ temErro: true, erro: 'access_denied' })
    expect(lerParametrosDeRetorno('', '#error=server_error&error_description=boom')).toEqual({ temErro: true, erro: 'server_error' })
    expect(lerParametrosDeRetorno('?error_code=unexpected_failure', '')).toEqual({ temErro: true, erro: null })
    expect(lerParametrosDeRetorno('?error_description=boom', '')).toEqual({ temErro: true, erro: null })
  })
})

describe('erroDoRetornoOAuth: a frase do catálogo, sem o texto cru', () => {
  it('sem erro na URL, nada', () => {
    expect(erroDoRetornoOAuth('?code=abc', '')).toBeNull()
  })

  it('access_denied (a pessoa cancelou) tem a sua frase; qualquer outro erro, a frase geral', () => {
    const cancelado = erroDoRetornoOAuth('?error=access_denied&error_description=boom', '')!
    expect([cancelado.classe, cancelado.chave]).toEqual(['negocio', 'login_google_cancelado'])
    expect(TEXTOS_ERRO[cancelado.chave]).toBe('Você cancelou a entrada com o Google. Se quiser, tente de novo ou use e-mail e senha.')

    for (const [busca, fragmento] of [
      ['?error=server_error&error_description=boom', ''],
      ['', '#error=server_error&error_description=boom'],
      ['?error_code=unexpected_failure', ''],
      ['?error=qualquer_coisa', ''],
    ]) {
      const geral = erroDoRetornoOAuth(busca, fragmento)!
      expect([geral.classe, geral.chave], `${busca}${fragmento}`).toEqual(['negocio', 'login_google'])
    }
    expect(TEXTOS_ERRO.login_google).toBe('Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha.')
  })

  it('access_denied também vale no fragmento', () => {
    expect(erroDoRetornoOAuth('', '#error=access_denied')!.chave).toBe('login_google_cancelado')
  })

  it('o erro devolvido não carrega o texto cru que veio na URL', () => {
    for (const erro of [
      erroDoRetornoOAuth('?error=server_error&error_description=boom', '')!,
      erroDoRetornoOAuth('?error=access_denied&error_description=boom', '')!,
    ]) {
      expect(JSON.stringify(erro)).not.toMatch(/boom|server_error/)
    }
  })
})

describe('limparUrlDeRetorno', () => {
  it('tira o código e o erro da busca e deixa o resto, na ordem', () => {
    expect(limparUrlDeRetorno('/entrar?code=x&volta=%2Fapp%2Fhoje', '', '/entrar')).toBe('/entrar?volta=%2Fapp%2Fhoje')
    expect(limparUrlDeRetorno('/entrar?volta=%2Fapp%2Fhoje&error=access_denied&error_code=a&error_description=b+c', '', '/entrar')).toBe(
      '/entrar?volta=%2Fapp%2Fhoje',
    )
  })

  it('tira os tokens do fragmento e o `#` junto, quando nada sobra', () => {
    expect(limparUrlDeRetorno('', '#access_token=a&refresh_token=b&token_type=bearer', '/entrar')).toBe('/entrar')
    expect(
      limparUrlDeRetorno('', '#access_token=a&expires_in=3600&expires_at=1&provider_token=p&provider_refresh_token=q&error=x', '/entrar'),
    ).toBe('/entrar')
  })

  it('mantém no fragmento o que não é de autenticação', () => {
    expect(limparUrlDeRetorno('', '#exportar', '/app/conta')).toBe('/app/conta#exportar')
    expect(limparUrlDeRetorno('', '#access_token=a&secao=2', '/app/conta')).toBe('/app/conta#secao=2')
  })

  it('remove nomes codificados e o identificador PKCE sem regravar os demais valores', () => {
    expect(limparUrlDeRetorno(
      '?modo=1&%63ode=x&volta=/app/hoje&sb_flow_id=fluxo&modo=2',
      '#access_token=falso&type=signup&nome=dois%20nomes',
      '/entrar',
    )).toBe('/entrar?modo=1&volta=/app/hoje&modo=2#nome=dois%20nomes')
    expect(limparUrlDeRetorno('?code=x&type=lista', '#exportar', '/entrar')).toBe('/entrar?type=lista#exportar')
  })

  it('devolve null quando não há nada a tirar', () => {
    expect(limparUrlDeRetorno('', '', '/entrar')).toBeNull()
    expect(limparUrlDeRetorno('?volta=%2Fapp%2Fhoje', '#exportar', '/entrar')).toBeNull()
  })
})

describe('limparRetornoDaUrl (history.replaceState)', () => {
  const BASE = import.meta.env.BASE_URL
  const inicio = window.location.href

  afterEach(() => {
    window.history.replaceState(null, '', inicio)
  })

  it('o fragmento com tokens fica limpo, sem empilhar o histórico e mantendo o state', () => {
    window.history.replaceState({ usr: 'x', key: 'k', idx: 0 }, '', `${BASE}entrar#access_token=a&refresh_token=b&token_type=bearer`)
    const antes = window.history.length

    expect(limparRetornoDaUrl()).toBe(true)

    expect(window.location.pathname).toBe(`${BASE}entrar`)
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('')
    expect(window.history.length).toBe(antes)
    expect(window.history.state).toEqual({ usr: 'x', key: 'k', idx: 0 })
  })

  it('?code= fica limpo e o `volta` (e a base do site) ficam', () => {
    window.history.replaceState(null, '', `${BASE}entrar?code=x&volta=/app/hoje`)
    const antes = window.history.length

    expect(limparRetornoDaUrl()).toBe(true)

    expect(window.location.pathname).toBe(`${BASE}entrar`)
    expect(window.location.search).toBe('?volta=/app/hoje')
    expect(window.location.href).not.toMatch(/code=|token|error/)
    expect(window.history.length).toBe(antes)
  })

  it('erro na busca e no fragmento ao mesmo tempo: os dois somem', () => {
    window.history.replaceState(null, '', `${BASE}criar-conta?error=access_denied&error_description=boom&volta=/app/hoje#error=access_denied`)
    expect(limparRetornoDaUrl()).toBe(true)
    expect(window.location.search).toBe('?volta=/app/hoje')
    expect(window.location.hash).toBe('')
  })

  it('URL sem parâmetro de autenticação: não mexe em nada (nem chama replaceState)', () => {
    window.history.replaceState(null, '', `${BASE}entrar?volta=/app/hoje#exportar`)
    const antes = window.location.href
    expect(limparRetornoDaUrl()).toBe(false)
    expect(window.location.href).toBe(antes)
  })
})
