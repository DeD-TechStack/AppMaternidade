import { describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { EMAIL_CONTATO } from '../../conteudo/publicas.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// Os textos das 9 páginas novas (MAT-36): textos fixos nos lugares certos, o e-mail de contato (lido da
// constante, nunca escrito), frases e números que não podem aparecer, links e o tamanho dos parágrafos.

const NOVAS = [
  '/como-funciona',
  '/cuidado-compartilhado',
  '/desenvolvimento',
  '/regras-da-comunidade',
  '/privacidade',
  '/termos',
  '/exclusao-de-conta',
  '/contato',
  '/sobre',
]

/** As páginas em que o e-mail de contato aparece (e só nelas). */
const COM_EMAIL = ['/contato', '/regras-da-comunidade', '/privacidade', '/termos']

/** Abre a página, depois de desmontar a anterior (o RolagemEFoco procura o primeiro `main h1` do documento). */
async function abrir(caminho: string): Promise<HTMLElement> {
  cleanup()
  const { container } = renderizarRota(caminho)
  await screen.findAllByRole('heading', { level: 1 })
  return container
}

const principal = (container: HTMLElement) => container.querySelector('main')!

/**
 * O texto do main: cada trecho de texto separado por quebra de linha (células vizinhas não se juntam).
 * Um `<wbr>` (a quebra possível do e-mail, depois do "@") não separa nada: o texto de um lado e do outro é um só.
 */
function textoDoMain(container: HTMLElement): string {
  const trechos: string[] = []
  const percurso = document.createTreeWalker(principal(container), NodeFilter.SHOW_TEXT)
  for (let no = percurso.nextNode(); no; no = percurso.nextNode()) {
    const apos = no.previousSibling
    if (apos instanceof HTMLElement && apos.tagName === 'WBR' && trechos.length > 0) trechos[trechos.length - 1] += no.textContent ?? ''
    else trechos.push(no.textContent ?? '')
  }
  return trechos.join('\n')
}

/** O texto sem o endereço de e-mail dado (todas as ocorrências): o endereço não é texto da página que as regras conferem. */
function semOEmail(texto: string, email: string): string {
  // Cada ocorrência vira um espaço, para que o que estava colado ao endereço não se junte (3 + endereço + 00).
  return texto.split(email).join(' ')
}

/** O texto do main sem o e-mail de contato: o que as regras de texto (frases, algarismos, nomes de arquivo) conferem. */
const textoSemEmail = (container: HTMLElement): string => semOEmail(textoDoMain(container), EMAIL_CONTATO)

/** As sequências de algarismos do texto que não estão na lista aceita. */
const ALGARISMOS_ACEITOS = ['3', '7', '100', '180', '188', '192']
const algarismosForaDaLista = (texto: string): string[] =>
  (texto.match(/\d+/g) ?? []).filter((sequencia) => !ALGARISMOS_ACEITOS.includes(sequencia))

describe('semOEmail', () => {
  // Um endereço de exemplo só deste teste (com algarismos, ponto e hífen); nunca o valor de EMAIL_CONTATO.
  const ENDERECO_DE_EXEMPLO = 'maria.souza-11@caixa-22.exemplo.invalid'
  const TEXTO = `Fale conosco: ${ENDERECO_DE_EXEMPLO}\nPara falar sobre os seus dados: ${ENDERECO_DE_EXEMPLO}.\nLigue 188 ou 192.`

  it('sem a auxiliar, a conferência de algarismos reprova o endereço', () => {
    expect(algarismosForaDaLista(TEXTO)).toEqual(['11', '22', '11', '22'])
  })

  it('com a auxiliar, todas as ocorrências do endereço saem e a conferência passa', () => {
    const limpo = semOEmail(TEXTO, ENDERECO_DE_EXEMPLO)

    expect(limpo).not.toContain(ENDERECO_DE_EXEMPLO)
    expect(limpo).not.toContain('@')
    expect(algarismosForaDaLista(limpo)).toEqual([])
  })

  it('só o endereço sai: qualquer outro algarismo continua reprovando', () => {
    const limpo = semOEmail(`${TEXTO}\nFalta 11 dias.`, ENDERECO_DE_EXEMPLO)

    expect(algarismosForaDaLista(limpo)).toEqual(['11'])
    expect(limpo).toContain('Ligue 188 ou 192.')
  })

  it('o endereço colado a um algarismo não junta sequências (3 + endereço + 00 não vira 300)', () => {
    const limpo = semOEmail(`3${ENDERECO_DE_EXEMPLO}00`, ENDERECO_DE_EXEMPLO)

    expect(algarismosForaDaLista(limpo)).toEqual(['00'])
  })
})

const TF = {
  responsavel: 'Responsável pelo AppMaternidade: a definir.',
  encarregado: 'Encarregado pelo tratamento de dados: Daniel Macedo.',
  idadeMinima: 'Idade mínima para usar o AppMaternidade: a definir.',
  prazoExclusao: 'O prazo da exclusão ainda será definido e publicado nesta página.',
  pedidoExclusao:
    'O pedido de exclusão ainda não pode ser feito por este site. Ele vai ficar na tela Família e conta, para quem entrou na conta.',
  contaIndisponivel: 'Criar conta e entrar ainda não estão disponíveis neste site.',
  dadosFicticios: 'Nesta versão de avaliação, use só dados fictícios.',
  construcao: 'Em construção: algumas funções descritas aqui ainda não estão no ar.',
  semDiagnostico: 'O AppMaternidade não faz diagnóstico e não substitui a orientação de um profissional de saúde.',
  telasFicticias: 'As telas mostradas aqui são exemplos com uma família fictícia.',
  rascunho: 'Rascunho, sem revisão jurídica',
  regiaoDosDados:
    'Nesta fase de avaliação, a demonstração roda num projeto Supabase nos Estados Unidos (região us-east-1), só com dados fictícios.',
}

/** Os parágrafos (p) do main que têm exatamente este texto. */
const paragrafosCom = (container: HTMLElement, texto: string) =>
  [...principal(container).querySelectorAll('p')].filter((p) => p.textContent === texto)

describe('textos fixos nos lugares certos', () => {
  const ONDE: Array<[string, string, string[]]> = [
    ['TF-02', TF.responsavel, ['/privacidade', '/termos', '/exclusao-de-conta', '/sobre']],
    ['TF-03', TF.encarregado, ['/privacidade']],
    ['TF-04', TF.idadeMinima, ['/termos']],
    ['TF-05', TF.prazoExclusao, ['/exclusao-de-conta']],
    ['TF-06', TF.pedidoExclusao, ['/exclusao-de-conta']],
    ['TF-07', TF.contaIndisponivel, ['/como-funciona']],
    ['TF-08', TF.rascunho, ['/privacidade', '/termos', '/exclusao-de-conta']],
    ['TF-09', TF.dadosFicticios, ['/privacidade', '/termos']],
    ['TF-10', TF.construcao, NOVAS],
    ['TF-11', TF.semDiagnostico, ['/desenvolvimento', '/termos', '/sobre']],
    // TF-12 só vale numa página com aparelho no main (`[data-aparelho]`); nenhuma das 9 tem: em nenhuma.
    ['TF-12', TF.telasFicticias, []],
    ['TF-15', TF.regiaoDosDados, ['/privacidade']],
  ]

  for (const [nome, texto, paginas] of ONDE) {
    it(`${nome} aparece, como um parágrafo inteiro, só em: ${paginas.join(', ')}`, async () => {
      for (const caminho of NOVAS) {
        const container = await abrir(caminho)
        expect(paragrafosCom(container, texto), `${nome} em ${caminho}`).toHaveLength(paginas.includes(caminho) ? 1 : 0)
      }
    }, 30000)
  }

  it('TF-13 ("E-mail") é o rótulo da 1ª linha do Contato, e o texto da linha é só o link de e-mail', async () => {
    const container = await abrir('/contato')

    const rotulo = document.getElementById('secao-e-mail')!
    expect(rotulo.textContent).toBe('E-mail')
    const linha = rotulo.closest('section')!
    expect(linha.previousElementSibling).toBe(principal(container).firstElementChild)
    const texto = linha.querySelector('.sb-linha-texto')!
    expect(texto.textContent).toBe(EMAIL_CONTATO)
    expect(texto.querySelector('a')!.getAttribute('href')).toBe(`mailto:${EMAIL_CONTATO}`)
    expect(container.querySelector('.sb-abertura-lateral a')).toBeNull()
  })

  it('a Privacidade e os Termos dizem o contato do dono: encarregado, e o e-mail depois da frase de cada um', async () => {
    const privacidade = await abrir('/privacidade')
    expect(paragrafosCom(privacidade, `Para falar sobre os seus dados: ${EMAIL_CONTATO}.`)).toHaveLength(1)
    expect(paragrafosCom(privacidade, `Quando forem definidos, o nome de quem responde`)).toHaveLength(0)
    const termos = await abrir('/termos')
    expect(paragrafosCom(termos, `Para falar sobre estes termos: ${EMAIL_CONTATO}.`)).toHaveLength(1)
    const regras = await abrir('/regras-da-comunidade')
    expect(paragrafosCom(regras, `Canal para denúncias: ${EMAIL_CONTATO}.`)).toHaveLength(1)
  }, 30000)

  it('o Contato: "Para que serve este canal" tem só a primeira frase', async () => {
    const container = await abrir('/contato')

    const texto = document.getElementById('secao-para-que-serve-este-canal')!.closest('section')!.querySelector('.sb-linha-texto')!
    expect(texto.textContent).toBe(
      'Este canal vai atender pedidos de suporte, dúvidas sobre privacidade e denúncias sobre a comunidade.',
    )
    expect(container.textContent).not.toContain('Canal de contato a definir')
  })

  it('o Desenvolvimento, "De onde vem o conteúdo": dois parágrafos, sem selo e sem revisão pendente', async () => {
    await abrir('/desenvolvimento')

    const texto = document.getElementById('secao-de-onde-vem-o-conteudo')!.closest('section')!.querySelectorAll('p')
    expect([...texto].map((p) => p.textContent)).toEqual([
      'O conteúdo educativo vai ser texto próprio, escrito em português a partir das fontes de saúde. Cada item vai mostrar quem escreveu, a versão e as fontes usadas.',
      'A intenção é não usar inteligência artificial para responder às famílias.',
    ])
  })

  it('"tummy time" é explicado na primeira menção de cada página que fala dele', async () => {
    const desenvolvimento = await abrir('/desenvolvimento')
    const apresentacao = principal(desenvolvimento).querySelector('[data-apresentacao]')!.textContent!
    expect(apresentacao.indexOf('Tummy time é o tempo que o bebê passa de bruços, acordado e com um adulto olhando.')).toBe(0)

    const sobre = await abrir('/sobre')
    const texto = principal(sobre).textContent!
    const primeira = texto.search(/tummy time/i)
    expect(primeira).toBeGreaterThan(0)
    expect(texto.slice(primeira, primeira + 120)).toContain('o tempo que o bebê passa de bruços, acordado e com um adulto olhando')
  }, 30000)
})

describe('o e-mail de contato', () => {
  it('é um link mailto: que lê a constante EMAIL_CONTATO, nas 4 páginas certas, e só nelas', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      const links = [...principal(container).querySelectorAll('a[href^="mailto:"]')]

      if (COM_EMAIL.includes(caminho)) {
        expect(links.length, caminho).toBeGreaterThanOrEqual(1)
        for (const link of links) {
          expect(link.getAttribute('href'), caminho).toBe(`mailto:${EMAIL_CONTATO}`)
          expect(link.textContent, caminho).toBe(EMAIL_CONTATO)
          expect(link.hasAttribute('data-contato'), caminho).toBe(true)
        }
      } else {
        expect(links, caminho).toHaveLength(0)
        expect(principal(container).textContent, caminho).not.toContain(EMAIL_CONTATO)
      }
    }
  }, 30000)

  it('o endereço só aparece dentro do link: nenhum "@" solto no texto', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      const soltos = [...principal(container).querySelectorAll('p, li, td, span')].filter(
        (e) => e.closest('a') === null && e.textContent!.includes('@') && e.querySelector('a[href^="mailto:"]') === null,
      )
      expect(soltos, caminho).toHaveLength(0)
    }
  }, 30000)

  it('o rodapé da casca não muda: sem e-mail', async () => {
    const container = await abrir('/contato')

    expect(container.querySelector('footer')!.textContent).not.toContain(EMAIL_CONTATO)
  })
})

const FRASES_PROIBIDAS = [
  'comprovad',
  'cientificamente',
  'clinicamente',
  'garantimos',
  'melhor app',
  'recomendado por',
  'revisado por profissional',
  'antes de ser publicad',
  'só sai depois',
  'rascunho',
  'revisão pendente',
]

describe('o que não pode aparecer', () => {
  it('nenhuma das frases proibidas, nem "rascunho" nem "revisão pendente", fora da linha TF-08 da lateral das 3 jurídicas', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      // O TF-08 ("Rascunho, sem revisão jurídica") é o único trecho que pode dizer "rascunho": sai do texto antes da conferência.
      const texto = textoSemEmail(container).toLowerCase().split(TF.rascunho.toLowerCase()).join(' ')
      for (const frase of FRASES_PROIBIDAS) expect(texto, `${caminho}: ${frase}`).not.toContain(frase)
    }
  }, 30000)

  it('as únicas sequências de algarismos são 3, 7, 100, 180, 188 e 192 (e o us-east-1 do TF-15)', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      // Sem o e-mail de contato (que pode ter algarismos) e sem a frase do TF-15; nenhum outro algarismo é aceito.
      const texto = textoSemEmail(container).replace(TF.regiaoDosDados, '')
      expect(algarismosForaDaLista(texto), caminho).toEqual([])
    }
  }, 30000)

  it('nenhum link externo, nenhum link de telefone, nenhum formulário e nenhuma imagem de arquivo', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      for (const link of principal(container).querySelectorAll('a[href]')) {
        const href = link.getAttribute('href')!
        const email = href.startsWith('mailto:') && link.hasAttribute('data-contato')
        expect(/^[/#]/.test(href) || email, `${caminho}: ${href}`).toBe(true)
      }
      expect(container.querySelectorAll('a[href^="tel:"]'), caminho).toHaveLength(0)
      expect(container.querySelectorAll('main form, main input, main textarea, main img'), caminho).toHaveLength(0)
    }
  }, 30000)

  it('as páginas não citam chaves de tarefa, nomes de arquivo nem códigos de fonte', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      const texto = textoSemEmail(container)
      expect(texto, caminho).not.toMatch(/\bMAT-\d+|\bTF-\d+|\.(tsx?|css|md|png|svg)\b/)
      expect(texto, caminho).not.toMatch(/\bLia\b|\bAna\b/)
      expect(texto, caminho).not.toMatch(/conta de teste|senha fornecida/i)
    }
  }, 30000)
})

describe('parágrafos', () => {
  const palavras = (texto: string) => texto.split(/\s+/).filter((trecho) => /[\p{L}\p{N}]/u.test(trecho))

  it('nenhum <p> do main, fora de uma mídia, passa de 120 palavras', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      const paragrafos = [...principal(container).querySelectorAll('p')].filter((p) => p.closest('[data-midia]') === null)
      expect(paragrafos.length, caminho).toBeGreaterThan(0)
      for (const p of paragrafos) {
        expect(palavras(p.textContent ?? '').length, `${caminho}: ${p.textContent}`).toBeLessThanOrEqual(120)
      }
    }
  }, 30000)

  it('nenhum parágrafo do main está vazio', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      for (const p of principal(container).querySelectorAll('p')) expect(p.textContent!.trim(), caminho).not.toBe('')
    }
  }, 30000)

  it('os nomes da família de exemplo são Heloísa, Juliana, Bruno e Carla', async () => {
    const container = await abrir('/como-funciona')

    const texto = textoDoMain(container)
    expect(texto).toContain('Bruno')
    expect(texto).not.toMatch(/\bLia\b|\bAna\b/)
  })
})
