import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CONTA } from '../conteudo/conta.ts'
import { EMAIL_CONTATO, TEXTO_APOIO_CONTATO } from '../conteudo/publicas-texto.ts'
import { criarDadosContaMemoria } from '../dados/conta.memoria.ts'
import { renderizarComDados, criarFixtureDeTeste } from './renderizarComDados.tsx'
import { renderizarRota } from './renderizarRota.tsx'

// LEGAL-D54a: as respostas jurídicas de Daniel nas páginas de leitura e na tela Conta. Cada verificação é um
// auxiliar que lança; o controle negativo prova que o auxiliar recusa o texto antigo.

const ROTAS_DE_LEITURA = [
  '/regras-da-comunidade',
  '/privacidade',
  '/termos',
  '/exclusao-de-conta',
  '/contato',
  '/sobre',
] as const

const ENDERECO = 'contato@appmaternidade.example'
const A2 = 'Não há idade mínima para usar o AppMaternidade. Quem tem menos de 18 anos usa o site com o pai, a mãe ou o responsável legal.'
const A3 = 'O AppMaternidade é para quem cuida de um bebê. O bebê não vai ter conta, e nesta versão de avaliação os dados dele também devem ser fictícios.'
const A7 = 'Este e-mail é fictício e não recebe mensagens.'
const A8 =
  'Na tela Conta, quem entrou na conta já pode baixar uma cópia dos seus dados num arquivo JSON, que não é um formato regulamentado de portabilidade, e excluir a conta. A confirmação de que seus dados são tratados, a correção e a revogação do consentimento ainda não têm tela própria. O endereço de e-mail da página Contato é fictício e não recebe mensagens. Por enquanto, o que dá para pedir é o que a tela Conta já faz: baixar os dados ou excluir a conta.'

const ANTIGO_TERMOS = 'O plano é que só adultos tenham conta. Não vai haver conta de criança.'
const ANTIGO_IDADE = 'Idade mínima para usar o AppMaternidade: a definir.'
const ANTIGO_DIREITOS = 'peça pelo contato desta página'
const ENDERECO_DE_OUTRO_DOMINIO = 'x@' + 'gmail' + '.com'

const paragrafosDaSecao = (titulo: string): string[] => {
  const secao = screen.getByRole('heading', { level: 2, name: titulo }).closest('section')!
  return [...secao.querySelector('.pt-texto')!.children].map((no) => no.textContent ?? '')
}

const ocorrencias = (texto: string, trecho: string) => texto.split(trecho).length - 1

function conferirQuemPodeUsar(paragrafos: string[]) {
  expect(paragrafos[0]).toBe(A3)
  expect(paragrafos[1]).toBe(A2)
  expect(paragrafos.filter((p) => p === A3)).toHaveLength(1)
  expect(paragrafos.filter((p) => p === A2)).toHaveLength(1)
  expect(paragrafos.join('\n')).not.toContain(ANTIGO_TERMOS)
  expect(paragrafos.join('\n')).not.toContain(ANTIGO_IDADE)
}

function conferirSemTextoAntigo(texto: string) {
  expect(texto).not.toContain(ANTIGO_TERMOS)
  expect(texto).not.toContain(ANTIGO_IDADE)
}

function conferirEndereco(endereco: string) {
  expect(endereco).toBe(ENDERECO)
}

function conferirLinhaDoContato(linha: string) {
  expect(linha).toBe(`Dúvidas sobre seus dados: ${ENDERECO}.`)
}

function conferirDireitos(paragrafo: string, paginaInteira: string) {
  expect(paragrafo).toBe(A8)
  expect(ocorrencias(paginaInteira, A8)).toBe(1)
}

function conferirSemPedidoAntigo(texto: string) {
  expect(texto).not.toContain(ANTIGO_DIREITOS)
}

describe('LEGAL-D54a', () => {
  it('LEGA-I-01 Termos, "Quem pode usar": a frase do bebê e a da idade, uma vez cada; nenhum texto antigo em nenhuma página de leitura', () => {
    renderizarRota('/termos')
    conferirQuemPodeUsar(paragrafosDaSecao('Quem pode usar'))
  })

  it('LEGA-I-01 nenhuma página de leitura mostra a frase antiga dos adultos nem a idade "a definir"', () => {
    for (const rota of ROTAS_DE_LEITURA) {
      const { container, unmount } = renderizarRota(rota)
      conferirSemTextoAntigo(container.querySelector('main')!.textContent ?? '')
      unmount()
    }
  })

  it('LEGA-I-01 controle negativo: o auxiliar recusa a frase antiga dos Termos', () => {
    expect(() => conferirQuemPodeUsar([ANTIGO_TERMOS, A2])).toThrow()
    expect(() => conferirQuemPodeUsar([A3, ANTIGO_IDADE])).toThrow()
    expect(() => conferirSemTextoAntigo(`texto ${ANTIGO_TERMOS}`)).toThrow()
    expect(() => conferirSemTextoAntigo(`texto ${ANTIGO_IDADE}`)).toThrow()
  })

  it('LEGA-I-02 Contato: o endereço fictício aparece uma vez como texto, o botão leva ao mesmo endereço e a frase de apoio aparece uma vez', () => {
    expect(EMAIL_CONTATO).toBe(ENDERECO)
    const { container } = renderizarRota('/contato')
    const principal = container.querySelector('main')!
    const texto = principal.textContent ?? ''

    const enderecos = [...principal.querySelectorAll('.pt-email-endereco')]
    expect(enderecos).toHaveLength(1)
    conferirEndereco(enderecos[0].textContent ?? '')
    expect(ocorrencias(texto, ENDERECO)).toBe(1)

    const botao = principal.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')!
    expect(botao.getAttribute('href')).toBe(`mailto:${ENDERECO}`)
    conferirEndereco((botao.getAttribute('href') ?? '').replace('mailto:', ''))

    expect(TEXTO_APOIO_CONTATO).toBe(A7)
    expect(ocorrencias(texto, A7)).toBe(1)
  })

  it('LEGA-I-02 controle negativo: o auxiliar recusa um endereço de outro domínio', () => {
    expect(() => conferirEndereco(ENDERECO_DE_OUTRO_DOMINIO)).toThrow()
  })

  it('LEGA-I-03 Conta: a linha de contato diz "Dúvidas sobre seus dados: contato@appmaternidade.example."', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.parse('2026-11-06T12:00:00.000Z')), {
      agora: () => Date.parse('2026-11-06T12:00:00.000Z'),
    })
    renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    const contato = document.querySelector('[data-contato]')!
    expect(contato.textContent).toBe(ENDERECO)
    expect(CONTA.privacidade.contato.valor).toBe(ENDERECO)
    conferirLinhaDoContato(contato.parentElement!.textContent ?? '')
  })

  it('LEGA-I-03 controle negativo: o auxiliar recusa a linha sem o ponto final', () => {
    expect(() => conferirLinhaDoContato(`Dúvidas sobre seus dados: ${ENDERECO}`)).toThrow()
  })

  it('LEGA-I-12 Privacidade, "Seus direitos": o primeiro parágrafo é o texto novo, uma vez; o pedido "pelo contato desta página" não está em nenhuma página', () => {
    const { container } = renderizarRota('/privacidade')
    const [primeiro] = paragrafosDaSecao('Seus direitos')
    conferirDireitos(primeiro, container.querySelector('main')!.textContent ?? '')

    for (const rota of ROTAS_DE_LEITURA) {
      const outra = renderizarRota(rota)
      conferirSemPedidoAntigo(outra.container.querySelector('main')!.textContent ?? '')
      outra.unmount()
    }
  })

  it('LEGA-I-12 controle negativo: o auxiliar recusa o texto antigo', () => {
    const antigo = `${A8.split(' O endereço de e-mail')[0].replace('própria.', `própria: ${ANTIGO_DIREITOS}.`)}`
    expect(() => conferirDireitos(antigo, antigo)).toThrow()
    expect(() => conferirSemPedidoAntigo(`ainda não têm tela própria: ${ANTIGO_DIREITOS}.`)).toThrow()
  })
})
