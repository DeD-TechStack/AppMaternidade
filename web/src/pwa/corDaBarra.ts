// RF-09: o <meta name="theme-color"> segue o tema. A cor é a variável de uso --cor-fundo, que o tema
// da madrugada (data-tema no <html>) já troca: papel no claro, o fundo escuro na madrugada. Assim a
// barra do navegador nunca destoa da página e a cor continua num lugar só (tokens.css).

function aplicar(meta: HTMLMetaElement) {
  const cor = getComputedStyle(document.documentElement).getPropertyValue('--cor-fundo').trim()
  if (cor && meta.getAttribute('content') !== cor) meta.setAttribute('content', cor)
}

/** Liga o acompanhamento do tema. Devolve a função que o desliga. */
export function acompanharCorDaBarra(): () => void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
  }
  const alvo = meta

  aplicar(alvo)
  const observador = new MutationObserver(() => aplicar(alvo))
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] })
  return () => observador.disconnect()
}
