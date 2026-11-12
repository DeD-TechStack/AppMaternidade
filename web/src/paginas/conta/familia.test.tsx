import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { CHAVE_FAMILIA_ATUAL } from '../../componentes/conta/armazenamento.ts'
import { fimDoDia, formatarData, formatarNascimento, hojeNoFuso, somarDias } from '../../componentes/conta/datas.ts'
import { AVISO_AUTORREBAIXAMENTO, PAPEIS, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { dataNoFuso } from '../../dados/comum.ts'
import { FAMILIAS_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import { criarDadosContaMemoria, simularFalha } from '../../dados/conta.memoria.ts'
import { PESSOAS, criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// RF-15: a Família com Juliana (responsável), Bruno (cuidador) e um observador, em modo memória.

const VINCULO_DO_BRUNO = 'b2222222-2222-4222-8222-222222222222'
const EXEMPLO = FAMILIAS_DEMONSTRACAO.exemplo
const TESTE = FAMILIAS_DEMONSTRACAO.teste
const FUSO = 'America/Sao_Paulo'

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  Reflect.deleteProperty(navigator, 'clipboard')
})

type Memoria = ReturnType<typeof novaMemoria>
const novaMemoria = () => criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const talvezBotao = (nome: string | RegExp) => screen.queryByRole('button', { name: nome })
const campo = (rotulo: string) => screen.getByLabelText(rotulo, { selector: 'input, select' }) as HTMLInputElement
const digitar = (rotulo: string, texto: string) => fireEvent.change(campo(rotulo), { target: { value: texto } })
const status = () => screen.getByRole('status')
const caminhoDe = (roteador: { state: { location: { pathname: string } } }) => roteador.state.location.pathname
const secao = (nome: string) => within(screen.getByRole('region', { name: nome }))

async function abrir(pessoa: keyof typeof PESSOAS = 'juliana', dados: Memoria = novaMemoria(), caminho = '/app/familia') {
  const renderizado = renderizarComDados(caminho, { dados, sessao: pessoa })
  await screen.findByRole('heading', { level: 1, name: 'Família' })
  await screen.findByRole('heading', { level: 2, name: 'Bebês' })
  return { ...renderizado, dados }
}

/** Uma pessoa entra na família por um convite novo de quem convida. */
async function entrarNaFamilia(
  dados: Memoria,
  quem: keyof typeof PESSOAS,
  papel: 'responsavel' | 'cuidador' | 'observador',
  validoAte: string | null = null,
  familiaId: string = EXEMPLO,
  quemConvida: keyof typeof PESSOAS = familiaId === EXEMPLO ? 'juliana' : 'carla',
) {
  dados.sessaoParaTeste(PESSOAS[quemConvida].email)
  const criado = await dados.criarConvite(familiaId, papel, validoAte)
  if (!criado.ok) throw new Error(`convite não criado: ${criado.erro.chave}`)
  dados.sessaoParaTeste(PESSOAS[quem].email)
  const aceito = await dados.aceitarConvite(criado.valor.codigo)
  if (!aceito.ok) throw new Error(`convite não aceito: ${aceito.erro.chave}`)
}

async function memoriaComObservador() {
  const dados = novaMemoria()
  await entrarNaFamilia(dados, 'davi', 'observador')
  return dados
}

async function memoriaComDoisResponsaveis() {
  const dados = novaMemoria()
  dados.sessaoParaTeste(PESSOAS.juliana.email)
  await dados.mudarPapel(VINCULO_DO_BRUNO, 'responsavel')
  return dados
}

describe('os blocos e a ordem (responsável)', () => {
  it('cabeçalho, bebês, membros, convites e ações da família, nesta ordem, e o rodapé da área', async () => {
    await abrir()

    const titulos = within(document.querySelector('main')!)
      .getAllByRole('heading', { level: 2 })
      .map((titulo) => titulo.textContent)
    expect(titulos).toEqual(['Família Exemplo', 'Bebês', 'Membros', 'Convites', 'Ações da família'])
    expect(screen.getByText(`Fuso: ${FUSO}`)).toBeTruthy()
    expect(screen.getByText('Você é responsável.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Política de privacidade' }).getAttribute('href')).toBe('/privacidade')
    expect(document.title).toBe('Família | AppMaternidade')
  })

  it('bebês: o nome e "nasceu em DD/MM/AAAA", com Editar e Arquivar para o responsável', async () => {
    await abrir()

    const bebes = secao('Bebês')
    expect(bebes.getByText('Heloísa')).toBeTruthy()
    expect(bebes.getByText('nasceu em 05/08/2026')).toBeTruthy()
    expect(bebes.getByRole('button', { name: 'Editar Heloísa' })).toBeTruthy()
    expect(bebes.getByRole('button', { name: 'Arquivar Heloísa' })).toBeTruthy()
    expect(bebes.getByRole('button', { name: 'Adicionar bebê' })).toBeTruthy()
  })

  it('membros: o responsável primeiro, depois cuidadores e observadores, e por nome em cada papel; "(você)" na própria linha', async () => {
    const dados = await memoriaComObservador()
    await entrarNaFamilia(dados, 'carla', 'cuidador')
    await abrir('juliana', dados)

    const linhas = secao('Membros').getAllByRole('listitem')
    expect(linhas.map((linha) => linha.querySelector('p')!.textContent)).toEqual([
      'Juliana (você)',
      'Bruno',
      'Carla',
      'Davi',
    ])
    expect(linhas.map((linha) => linha.querySelectorAll('p')[1].textContent)).toEqual([
      'Responsável',
      'Cuidador',
      'Cuidador',
      'Observador',
    ])
  })

  it('membros: "acesso até DD/MM/AAAA" quando há validade, no fuso da família', async () => {
    const dados = novaMemoria()
    const validade = fimDoDia(somarDias(hojeNoFuso(FUSO), 12), FUSO)
    await entrarNaFamilia(dados, 'davi', 'observador', validade)
    await abrir('juliana', dados)

    const linha = secao('Membros').getByText('Davi').closest('li')!
    expect(within(linha).getByText(`acesso até ${formatarData(validade, FUSO)}`)).toBeTruthy()
  })

  it('responsável: "Mudar papel" em toda linha, inclusive a própria; "Remover acesso" só nas outras; o link "Sair da família" na própria', async () => {
    await abrir()

    const membros = secao('Membros')
    expect(membros.getByRole('button', { name: 'Mudar papel de Juliana' })).toBeTruthy()
    expect(membros.getByRole('button', { name: 'Mudar papel de Bruno' })).toBeTruthy()
    expect(membros.getByRole('button', { name: 'Remover acesso de Bruno' })).toBeTruthy()
    expect(membros.queryByRole('button', { name: 'Remover acesso de Juliana' })).toBeNull()
    const sair = membros.getByRole('link', { name: 'Sair da família' })
    expect(sair.getAttribute('href')).toBe('#sair-da-familia')
    // O link leva o foco ao botão do bloco de ações.
    fireEvent.click(sair)
    expect(document.activeElement).toBe(secao('Ações da família').getByRole('button', { name: 'Sair da família' }))
  })

  it('convites: do mais novo ao mais antigo, com papel, vencimento e quem criou; o vencido aparece com "venceu" e Cancelar', async () => {
    await abrir()

    const linhas = secao('Convites').getAllByRole('listitem')
    expect(linhas).toHaveLength(2)
    expect(within(linhas[0]).getByText('Observador')).toBeTruthy()
    expect(within(linhas[0]).getByText(/^vence em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/)).toBeTruthy()
    expect(within(linhas[0]).getByText('criado por Juliana')).toBeTruthy()
    expect(within(linhas[1]).getByText('Cuidador')).toBeTruthy()
    expect(within(linhas[1]).getByText(/^venceu em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/)).toBeTruthy()
    for (const linha of linhas) expect(within(linha).getByRole('button', { name: /^Cancelar convite de / })).toBeTruthy()
  })

  it('convite sem criador (conta excluída): "pessoa removida"', async () => {
    const fixture = criarFixtureDeTeste(Date.now())
    fixture.convites[0].criadoPor = null
    await abrir('juliana', criarDadosContaMemoria(fixture))

    expect(secao('Convites').getByText('criado por pessoa removida')).toBeTruthy()
  })

  it('família sem bebê nem convite: os textos de vazio', async () => {
    const dados = novaMemoria()
    dados.sessaoParaTeste(PESSOAS.davi.email)
    await dados.criarFamilia('Casa Nova', 'UTC')
    await abrir('davi', dados)

    expect(secao('Bebês').getByText('Nenhum bebê cadastrado.')).toBeTruthy()
    expect(secao('Convites').getByText('Nenhum convite pendente.')).toBeTruthy()
  })
})

describe('cuidador e observador: nenhum controle de escrita no DOM', () => {
  const ESCRITA = /Adicionar bebê|Editar|Arquivar|Desarquivar|Mudar papel|Remover acesso|Criar convite|Cancelar convite|Excluir família/

  for (const [nome, pessoa] of [
    ['cuidador (Bruno)', 'bruno'],
    ['observador (Davi)', 'davi'],
  ] as const) {
    it(`${nome}: vê o cabeçalho, os bebês e os membros, e só "Sair da família"`, async () => {
      const dados = await memoriaComObservador()
      await abrir(pessoa, dados)

      const titulos = within(document.querySelector('main')!)
        .getAllByRole('heading', { level: 2 })
        .map((titulo) => titulo.textContent)
      expect(titulos).toEqual(['Família Exemplo', 'Bebês', 'Membros', 'Ações da família'])
      expect(secao('Bebês').getByText('Heloísa')).toBeTruthy()
      expect(secao('Membros').getAllByRole('listitem')).toHaveLength(3)
      expect(screen.queryAllByRole('button', { name: ESCRITA })).toEqual([])
      expect(screen.queryByRole('heading', { name: 'Convites' })).toBeNull()
      expect(document.querySelector('form')).toBeNull()
      expect(secao('Membros').queryByRole('link', { name: 'Sair da família' })).toBeNull()
      expect(botao('Sair da família')).toBeTruthy()
      expect(screen.getByText(`Você é ${PAPEIS[pessoa === 'bruno' ? 'cuidador' : 'observador'].minusculo}.`)).toBeTruthy()
    })
  }
})

describe('o seletor de família e a família atual', () => {
  async function comDuasFamilias() {
    const dados = novaMemoria()
    await entrarNaFamilia(dados, 'carla', 'cuidador')
    return dados
  }

  it('com mais de uma família, o seletor "Família" troca a atual, grava a escolha e deixa o foco nele', async () => {
    await abrir('carla', await comDuasFamilias())

    // Sem escolha guardada, vale a de criada_em mais antiga.
    expect(screen.getByRole('heading', { level: 2, name: 'Família Exemplo' })).toBeTruthy()
    const seletor = campo('Família') as unknown as HTMLSelectElement
    expect([...seletor.options].map((opcao) => opcao.textContent)).toEqual(['Família Exemplo', 'Família Teste'])

    seletor.focus()
    fireEvent.change(seletor, { target: { value: TESTE } })
    await screen.findByRole('heading', { level: 2, name: 'Família Teste' })
    expect(localStorage.getItem(CHAVE_FAMILIA_ATUAL)).toBe(TESTE)
    expect(document.activeElement).toBe(seletor)
    // Nela, Carla é responsável.
    expect(await screen.findByRole('button', { name: 'Adicionar bebê' })).toBeTruthy()
  })

  it('com uma família só, não há seletor', async () => {
    await abrir()
    expect(screen.queryByLabelText('Família', { selector: 'select' })).toBeNull()
  })

  it('?familia=<id> vale sobre a guardada, grava a escolha e tira o parâmetro sem criar entrada no histórico', async () => {
    localStorage.setItem(CHAVE_FAMILIA_ATUAL, EXEMPLO)
    const { roteador } = await abrir('carla', await comDuasFamilias(), `/app/familia?familia=${TESTE}`)

    await screen.findByRole('heading', { level: 2, name: 'Família Teste' })
    await waitFor(() => expect(roteador.state.location.search).toBe(''))
    expect(roteador.state.historyAction).toBe('REPLACE')
    expect(localStorage.getItem(CHAVE_FAMILIA_ATUAL)).toBe(TESTE)
  })

  it('a família guardada vale quando ainda está entre as famílias; um id que não é delas é ignorado', async () => {
    localStorage.setItem(CHAVE_FAMILIA_ATUAL, TESTE)
    const guardada = await abrir('carla', await comDuasFamilias())
    await screen.findByRole('heading', { level: 2, name: 'Família Teste' })
    guardada.unmount()

    localStorage.setItem(CHAVE_FAMILIA_ATUAL, 'f9999999-9999-4999-8999-999999999999')
    const alheia = await abrir('carla', await comDuasFamilias(), '/app/familia?familia=f8888888-8888-4888-8888-888888888888')
    await screen.findByRole('heading', { level: 2, name: 'Família Exemplo' })
    await waitFor(() => expect(alheia.roteador.state.location.search).toBe(''))
  })

  it('sem família ativa, /app/familia vai a /app/comecar', async () => {
    const { roteador } = renderizarComDados('/app/familia', { sessao: 'davi' })

    await screen.findByRole('heading', { level: 1, name: 'Vamos começar a sua família.' })
    expect(caminhoDe(roteador)).toBe('/app/comecar')
  })
})

describe('mudar papel', () => {
  it('abre a caixa com os três papéis, o atual marcado e o foco no primeiro controle; muda o papel e mostra a confirmação', async () => {
    await abrir()
    const abridor = botao('Mudar papel de Bruno')
    fireEvent.click(abridor)

    const dialogo = screen.getByRole('dialog', { name: 'Mudar o papel de Bruno' })
    expect(dialogo.tagName).toBe('DIALOG')
    expect(dialogo.getAttribute('aria-modal')).toBe('true')
    const opcoes = within(dialogo).getAllByRole('radio') as HTMLInputElement[]
    expect(opcoes.map((opcao) => opcao.value)).toEqual(['responsavel', 'cuidador', 'observador'])
    expect(opcoes.map((opcao) => opcao.checked)).toEqual([false, true, false])
    expect(document.activeElement).toBe(opcoes[0])
    // Bruno não é a própria pessoa: sem o aviso de autorrebaixamento.
    expect(within(dialogo).queryByText(AVISO_AUTORREBAIXAMENTO)).toBeNull()

    fireEvent.click(within(dialogo).getByRole('radio', { name: /Observador/ }))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Mudar papel' }))

    await waitFor(() => expect(status().textContent).toBe('Bruno agora é observador.'))
    expect(screen.queryByRole('dialog')).toBeNull()
    const linha = secao('Membros').getByText('Bruno').closest('li')!
    expect(within(linha).getByText('Observador')).toBeTruthy()
  })

  it('Esc fecha a caixa e o foco volta ao botão que a abriu', async () => {
    await abrir()
    const abridor = botao('Mudar papel de Bruno')
    fireEvent.click(abridor)

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(abridor)
  })

  it('o mesmo papel: papel_igual dentro da caixa, que fica aberta', async () => {
    await abrir()
    fireEvent.click(botao('Mudar papel de Bruno'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mudar papel' }))

    const alerta = await within(screen.getByRole('dialog')).findByRole('alert')
    expect(alerta.textContent).toBe(TEXTOS_ERRO.papel_igual)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('na própria linha, a caixa traz o aviso de autorrebaixamento antes do botão de confirmar', async () => {
    await abrir()
    fireEvent.click(botao('Mudar papel de Juliana'))

    const dialogo = screen.getByRole('dialog', { name: 'Mudar o seu papel' })
    const aviso = within(dialogo).getByText(AVISO_AUTORREBAIXAMENTO)
    const confirmar = within(dialogo).getByRole('button', { name: 'Mudar papel' })
    expect(aviso.compareDocumentPosition(confirmar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a única responsável não se rebaixa: ultimo_responsavel dentro da caixa', async () => {
    await abrir()
    fireEvent.click(botao('Mudar papel de Juliana'))
    const dialogo = screen.getByRole('dialog')
    fireEvent.click(within(dialogo).getByRole('radio', { name: /Cuidador/ }))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Mudar papel' }))

    expect((await within(dialogo).findByRole('alert')).textContent).toBe(TEXTOS_ERRO.ultimo_responsavel)
  })

  it('com outro responsável, a pessoa pode rebaixar o próprio papel e perde os controles de responsável', async () => {
    await abrir('juliana', await memoriaComDoisResponsaveis())
    fireEvent.click(botao('Mudar papel de Juliana'))
    const dialogo = screen.getByRole('dialog')
    fireEvent.click(within(dialogo).getByRole('radio', { name: /Cuidador/ }))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Mudar papel' }))

    await waitFor(() => expect(status().textContent).toBe('Você agora é cuidador.'))
    await waitFor(() => expect(talvezBotao('Adicionar bebê')).toBeNull())
    expect(screen.queryByRole('heading', { name: 'Convites' })).toBeNull()
    expect(screen.queryAllByRole('button', { name: /Mudar papel|Remover acesso/ })).toEqual([])
    expect(screen.getByText('Você é cuidador.')).toBeTruthy()
  })
})

describe('remover acesso', () => {
  it('explica o que acontece, tira a pessoa de Membros e mostra a confirmação', async () => {
    await abrir()
    fireEvent.click(botao('Remover acesso de Bruno'))

    const dialogo = screen.getByRole('dialog', { name: 'Remover o acesso de Bruno?' })
    expect(within(dialogo).getByText(/perde o acesso a esta família na hora/)).toBeTruthy()
    expect(within(dialogo).getByText(/não pode ser apagado/)).toBeTruthy()
    // Sem campo: o foco inicial é o primeiro controle, "Cancelar".
    expect(document.activeElement).toBe(within(dialogo).getByRole('button', { name: 'Cancelar' }))

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Remover acesso' }))
    await waitFor(() => expect(status().textContent).toBe('O acesso de Bruno foi removido.'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(secao('Membros').queryByText('Bruno')).toBeNull()
  })

  it('"Cancelar" fecha a caixa sem mudar nada', async () => {
    const { dados } = await abrir()
    fireEvent.click(botao('Remover acesso de Bruno'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    const detalhe = await dados.detalheFamilia(EXEMPLO)
    expect(detalhe.ok && detalhe.valor.membros).toHaveLength(2)
  })

  it('use_sair do banco aparece dentro da caixa, com a frase do catálogo', async () => {
    const dados = novaMemoria()
    await abrir('juliana', dados)
    simularFalha(dados, 'revogarVinculo', 'use_sair')
    fireEvent.click(botao('Remover acesso de Bruno'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover acesso' }))

    expect((await within(screen.getByRole('dialog')).findByRole('alert')).textContent).toBe(TEXTOS_ERRO.use_sair)
  })
})

describe('novo convite', () => {
  it('papel (cada um com a frase do que permite), validade só para cuidador e observador, com a data mínima de hoje + 7 dias', async () => {
    await abrir()

    const novo = within(screen.getByRole('form', { name: 'Novo convite' }))
    for (const papel of Object.values(PAPEIS)) expect(novo.getByText(papel.permite)).toBeTruthy()
    const validade = campo('Validade do acesso')
    expect(validade.type).toBe('date')
    expect(validade.min).toBe(somarDias(hojeNoFuso(FUSO), 7))

    fireEvent.click(novo.getByRole('radio', { name: /Responsável/ }))
    expect(screen.queryByLabelText('Validade do acesso')).toBeNull()
    fireEvent.click(novo.getByRole('radio', { name: /Observador/ }))
    expect(campo('Validade do acesso')).toBeTruthy()
  })

  it('cria o convite: o código aparece uma vez, com o link, a frase e a data de vencimento; a lista ganha o convite', async () => {
    const { dados, unmount } = await abrir()
    fireEvent.click(botao('Criar convite'))

    const bloco = await screen.findByRole('region', { name: 'Código do convite' })
    expect(within(bloco).getByText('Este código aparece só agora. Envie pelo canal que preferir.')).toBeTruthy()
    const codigo = bloco.querySelector('[data-codigo-convite]')!.textContent!
    const link = bloco.querySelector('[data-link-convite]')!.textContent!
    expect(codigo).toMatch(/^[0-9a-f]{64}$/)
    expect(link).toBe(`${window.location.origin}/convite#${codigo}`)
    expect(within(bloco).getByText(/^vence em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/)).toBeTruthy()
    await waitFor(() => expect(status().textContent).toBe('Convite de cuidador criado.'))
    await waitFor(() => expect(secao('Convites').getAllByRole('listitem')).toHaveLength(3))
    expect((await dados.verConvite(codigo)).ok).toBe(true)

    // Criar outro faz o código anterior sumir; sair da página também.
    fireEvent.click(botao('Criar convite'))
    await waitFor(() => expect(secao('Convites').getAllByRole('listitem')).toHaveLength(4))
    const novo = screen.getByRole('region', { name: 'Código do convite' })
    expect(novo.querySelector('[data-codigo-convite]')!.textContent).not.toBe(codigo)
    expect(document.body.textContent).not.toContain(codigo)
    unmount()
    await abrir('juliana', dados)
    expect(screen.queryByRole('region', { name: 'Código do convite' })).toBeNull()
  })

  it('a validade gravada é o fim do dia escolhido no fuso da família', async () => {
    const dados = novaMemoria()
    const criar = vi.spyOn(dados, 'criarConvite')
    await abrir('juliana', dados)
    const dia = somarDias(hojeNoFuso(FUSO), 10)

    digitar('Validade do acesso', dia)
    fireEvent.click(botao('Criar convite'))

    await screen.findByRole('region', { name: 'Código do convite' })
    const [, papel, validoAte] = criar.mock.calls[0]
    expect(papel).toBe('cuidador')
    expect(dataNoFuso(Date.parse(validoAte!), FUSO)).toBe(dia)
    expect(new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(validoAte!))).toBe('23:59:59')
  })

  it('uma validade menor que o convite: validade_menor no campo, ligado por aria-describedby', async () => {
    await abrir()
    digitar('Validade do acesso', somarDias(hojeNoFuso(FUSO), 3))
    fireEvent.click(botao('Criar convite'))

    await waitFor(() => expect(campo('Validade do acesso').getAttribute('aria-invalid')).toBe('true'))
    const ligados = campo('Validade do acesso').getAttribute('aria-describedby')!.split(' ').map((id) => document.getElementById(id)!.textContent)
    expect(ligados).toContain(TEXTOS_ERRO.validade_menor)
    expect(document.activeElement).toBe(campo('Validade do acesso'))
  })

  it('"Copiar link" e "Copiar código" usam a área de transferência e confirmam no status', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: escrever } })
    await abrir()
    fireEvent.click(botao('Criar convite'))
    const bloco = within(await screen.findByRole('region', { name: 'Código do convite' }))
    const codigo = document.querySelector('[data-codigo-convite]')!.textContent!

    fireEvent.click(bloco.getByRole('button', { name: 'Copiar link' }))
    await waitFor(() => expect(status().textContent).toBe('Link copiado.'))
    expect(escrever).toHaveBeenLastCalledWith(`${window.location.origin}/convite#${codigo}`)
    fireEvent.click(bloco.getByRole('button', { name: 'Copiar código' }))
    await waitFor(() => expect(status().textContent).toBe('Código copiado.'))
    expect(escrever).toHaveBeenLastCalledWith(codigo)
  })

  it('sem área de transferência: "Copie manualmente." e o texto fica selecionado', async () => {
    await abrir()
    fireEvent.click(botao('Criar convite'))
    const bloco = within(await screen.findByRole('region', { name: 'Código do convite' }))
    const codigo = document.querySelector('[data-codigo-convite]')!.textContent!

    fireEvent.click(bloco.getByRole('button', { name: 'Copiar código' }))
    await waitFor(() => expect(status().textContent).toBe('Copie manualmente.'))
    expect(window.getSelection()!.toString()).toBe(codigo)
  })

  it('o convite de um papel de responsável não leva validade', async () => {
    const dados = novaMemoria()
    const criar = vi.spyOn(dados, 'criarConvite')
    await abrir('juliana', dados)
    fireEvent.click(within(screen.getByRole('form', { name: 'Novo convite' })).getByRole('radio', { name: /Responsável/ }))
    fireEvent.click(botao('Criar convite'))

    await screen.findByRole('region', { name: 'Código do convite' })
    expect(criar.mock.calls[0].slice(1)).toEqual(['responsavel', null])
  })
})

describe('cancelar convite', () => {
  it('pede confirmação, tira o convite da lista e mostra a confirmação; o vencido também se cancela', async () => {
    await abrir()
    const abridor = within(secao('Convites').getAllByRole('listitem')[1]).getByRole('button', { name: /^Cancelar convite/ })
    fireEvent.click(abridor)

    const dialogo = screen.getByRole('dialog', { name: 'Cancelar este convite?' })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar convite' }))

    await waitFor(() => expect(status().textContent).toBe('O convite foi cancelado.'))
    expect(secao('Convites').getAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('"Manter convite" fecha a caixa e devolve o foco ao botão', async () => {
    await abrir()
    const abridor = secao('Convites').getAllByRole('button', { name: /^Cancelar convite/ })[0]
    fireEvent.click(abridor)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Manter convite' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(abridor)
    expect(secao('Convites').getAllByRole('listitem')).toHaveLength(2)
  })
})

describe('bebês', () => {
  it('adicionar: nome e nascimento obrigatórios (sem chamar o banco), e o bebê entra na lista com a confirmação', async () => {
    const dados = novaMemoria()
    const cadastrar = vi.spyOn(dados, 'cadastrarBebe')
    await abrir('juliana', dados)
    fireEvent.click(botao('Adicionar bebê'))

    expect(document.activeElement).toBe(campo('Nome ou apelido'))
    fireEvent.click(botao('Salvar'))
    expect(screen.getByText('Escreva um nome.')).toBeTruthy()
    expect(cadastrar).not.toHaveBeenCalled()
    digitar('Nome ou apelido', 'Mel')
    fireEvent.click(botao('Salvar'))
    expect(screen.getByText('Escolha a data de nascimento.')).toBeTruthy()
    expect(campo('Data de nascimento').max).toBe(hojeNoFuso(FUSO))
    expect(cadastrar).not.toHaveBeenCalled()

    const nascimento = somarDias(hojeNoFuso(FUSO), -20)
    digitar('Data de nascimento', nascimento)
    fireEvent.click(botao('Salvar'))
    await waitFor(() => expect(status().textContent).toBe('Mel foi adicionado.'))
    const bebes = secao('Bebês')
    expect(bebes.getByText('Mel')).toBeTruthy()
    expect(bebes.getByText(`nasceu em ${formatarNascimento(nascimento)}`)).toBeTruthy()
    expect(bebes.queryByLabelText('Nome ou apelido')).toBeNull()
  })

  it('um nascimento depois do hoje da família: o erro fica no campo', async () => {
    await abrir()
    fireEvent.click(botao('Adicionar bebê'))
    digitar('Nome ou apelido', 'Mel')
    digitar('Data de nascimento', somarDias(hojeNoFuso(FUSO), 2))
    fireEvent.click(botao('Salvar'))

    await waitFor(() => expect(campo('Data de nascimento').getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText(TEXTOS_ERRO.nascimento_no_futuro)).toBeTruthy()
    // O foco vai ao campo num efeito depois da renderização do erro: com a máquina carregada ele chegava depois da asserção.
    await waitFor(() => expect(document.activeElement).toBe(campo('Data de nascimento')))
  })

  it('editar: o formulário traz os dados, e salvar mostra a confirmação e o novo nome', async () => {
    await abrir()
    fireEvent.click(botao('Editar Heloísa'))

    expect(campo('Nome ou apelido').value).toBe('Heloísa')
    expect(campo('Data de nascimento').value).toBe('2026-08-05')
    digitar('Nome ou apelido', 'Helô')
    fireEvent.click(botao('Salvar'))

    await waitFor(() => expect(status().textContent).toBe('Dados de Helô salvos.'))
    expect(secao('Bebês').getByText('Helô')).toBeTruthy()
    expect(secao('Bebês').queryByText('Heloísa')).toBeNull()
  })

  it('arquivar pede confirmação; o arquivado vai para "Arquivados" (fechado), de onde se desarquiva', async () => {
    await abrir()
    fireEvent.click(botao('Arquivar Heloísa'))
    const dialogo = screen.getByRole('dialog', { name: 'Arquivar Heloísa?' })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Arquivar' }))

    await waitFor(() => expect(status().textContent).toBe('Heloísa foi arquivado.'))
    expect(secao('Bebês').getByText('Nenhum bebê cadastrado.')).toBeTruthy()
    const arquivados = document.querySelector('details')!
    expect(arquivados.hasAttribute('open')).toBe(false)
    expect(within(arquivados).getByText('Arquivados')).toBeTruthy()

    arquivados.open = true
    fireEvent.click(within(arquivados).getByRole('button', { name: 'Desarquivar Heloísa' }))
    await waitFor(() => expect(status().textContent).toBe('Heloísa voltou para a lista.'))
    expect(secao('Bebês').getByText('nasceu em 05/08/2026')).toBeTruthy()
    expect(document.querySelector('details')).toBeNull()
  })
})

describe('as ações da família', () => {
  it('editar família: nome e fuso, a confirmação e o novo nome no cabeçalho', async () => {
    await abrir()
    fireEvent.click(botao('Editar família'))

    expect(campo('Nome da família').value).toBe('Família Exemplo')
    expect(campo('Fuso da família').value).toBe(FUSO)
    digitar('Nome da família', 'Família Aurora')
    digitar('Fuso da família', 'America/Manaus')
    fireEvent.click(botao('Salvar'))

    await waitFor(() => expect(status().textContent).toBe('Dados da família salvos.'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Família Aurora' })).toBeTruthy()
    expect(screen.getByText('Fuso: America/Manaus')).toBeTruthy()
  })

  it('editar família: nome vazio dá erro no campo, sem chamar o banco', async () => {
    const dados = novaMemoria()
    const atualizar = vi.spyOn(dados, 'atualizarFamilia')
    await abrir('juliana', dados)
    fireEvent.click(botao('Editar família'))
    digitar('Nome da família', '   ')
    fireEvent.click(botao('Salvar'))

    expect(screen.getByText('Escreva um nome.')).toBeTruthy()
    expect(atualizar).not.toHaveBeenCalled()
  })

  it('excluir família: só confirma com o nome digitado exatamente, oferece "Baixar meus dados" e leva ao Começar quando não sobra família', async () => {
    const { dados, roteador } = await abrir()
    fireEvent.click(botao('Excluir família'))

    const dialogo = screen.getByRole('dialog', { name: 'Excluir a família Família Exemplo?' })
    expect(within(dialogo).getByText(/Apagam-se a família, os bebês, os registros e os convites/)).toBeTruthy()
    expect(within(dialogo).getByRole('link', { name: 'Baixar meus dados' }).getAttribute('href')).toBe('/app/conta#exportar')
    const confirmar = within(dialogo).getByRole('button', { name: 'Excluir família' }) as HTMLButtonElement
    const nome = within(dialogo).getByLabelText('Digite o nome da família para confirmar', { selector: 'input' })
    expect(document.activeElement).toBe(nome)
    expect(confirmar.disabled).toBe(true)
    fireEvent.change(nome, { target: { value: 'família exemplo' } })
    expect(confirmar.disabled).toBe(true)
    fireEvent.change(nome, { target: { value: 'Família Exemplo' } })
    expect(confirmar.disabled).toBe(false)

    fireEvent.click(confirmar)
    await screen.findByRole('heading', { level: 1, name: 'Vamos começar a sua família.' })
    expect(caminhoDe(roteador)).toBe('/app/comecar')
    const familias = await dados.minhasFamilias()
    expect(familias.ok && familias.valor).toEqual([])
  })

  it('sair da família (cuidador): pede confirmação e, sem outra família, vai ao Começar', async () => {
    const { roteador } = await abrir('bruno')
    fireEvent.click(botao('Sair da família'))

    const dialogo = screen.getByRole('dialog', { name: 'Sair da família Família Exemplo?' })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Sair da família' }))

    await screen.findByRole('heading', { level: 1, name: 'Vamos começar a sua família.' })
    expect(caminhoDe(roteador)).toBe('/app/comecar')
  })

  it('sair de uma das famílias: a confirmação e a próxima família atual', async () => {
    const dados = novaMemoria()
    await entrarNaFamilia(dados, 'carla', 'cuidador')
    await abrir('carla', dados)
    fireEvent.click(botao('Sair da família'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sair da família' }))

    await waitFor(() => expect(status().textContent).toBe('Você saiu da família Família Exemplo.'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Família Teste' })).toBeTruthy()
    expect(screen.queryByLabelText('Família', { selector: 'select' })).toBeNull()
  })
})

describe('acesso encerrado, sem permissão e objeto sumido', () => {
  /** Juliana remove o vínculo da pessoa por fora da tela dela. */
  async function removerPorFora(dados: Memoria, quem: keyof typeof PESSOAS, familiaId: string = EXEMPLO) {
    dados.sessaoParaTeste(PESSOAS.juliana.email)
    const detalhe = await dados.detalheFamilia(familiaId)
    const vinculo = detalhe.ok ? detalhe.valor.membros.find((membro) => membro.contaId === PESSOAS[quem].id) : undefined
    await dados.revogarVinculo(vinculo!.vinculoId)
    dados.sessaoParaTeste(PESSOAS[quem].email)
  }

  it('sem outra família: vai ao Começar com "Seu acesso à família <nome> foi encerrado." na região de status', async () => {
    const dados = novaMemoria()
    const { roteador } = await abrir('bruno', dados)
    await removerPorFora(dados, 'bruno')

    fireEvent.click(botao('Sair da família'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sair da família' }))

    await screen.findByRole('heading', { level: 1, name: 'Vamos começar a sua família.' })
    expect(caminhoDe(roteador)).toBe('/app/comecar')
    expect(status().textContent).toBe('Seu acesso à família Família Exemplo foi encerrado.')
  })

  it('com outra família: passa para ela, avisa na região de status e leva o foco ao h1', async () => {
    const dados = novaMemoria()
    await entrarNaFamilia(dados, 'carla', 'cuidador')
    await abrir('carla', dados)
    await removerPorFora(dados, 'carla')

    fireEvent.click(botao('Sair da família'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sair da família' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Família Teste' })).toBeTruthy()
    await waitFor(() => expect(status().textContent).toBe('Seu acesso à família Família Exemplo foi encerrado.'))
    const titulo = screen.getByRole('heading', { level: 1, name: 'Família' })
    await waitFor(() => expect(document.activeElement).toBe(titulo))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('sem permissão com vínculo: a frase do catálogo e os controles passam a seguir o papel relido', async () => {
    const dados = await memoriaComDoisResponsaveis()
    await abrir('bruno', dados)
    dados.sessaoParaTeste(PESSOAS.juliana.email)
    await dados.mudarPapel(VINCULO_DO_BRUNO, 'observador')
    dados.sessaoParaTeste(PESSOAS.bruno.email)

    fireEvent.click(botao('Criar convite'))

    expect((await screen.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.sem_permissao)
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Convites' })).toBeNull())
    expect(screen.queryAllByRole('button', { name: /Adicionar bebê|Criar convite|Mudar papel/ })).toEqual([])
    expect(screen.getByText('Você é observador.')).toBeTruthy()
    // A família continua na lista: a pessoa segue nela.
    expect(screen.getByRole('heading', { level: 2, name: 'Família Exemplo' })).toBeTruthy()
  })

  it('rebaixado com o editor de bebê aberto: a escrita é negada e o editor some, com "Você é cuidador."', async () => {
    const dados = await memoriaComDoisResponsaveis()
    await abrir('bruno', dados)
    fireEvent.click(botao('Editar Heloísa'))
    expect(campo('Nome ou apelido').value).toBe('Heloísa')
    digitar('Nome ou apelido', 'Helô')

    dados.sessaoParaTeste(PESSOAS.juliana.email)
    await dados.mudarPapel(VINCULO_DO_BRUNO, 'cuidador')
    dados.sessaoParaTeste(PESSOAS.bruno.email)
    fireEvent.click(botao('Salvar'))

    expect((await screen.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.sem_permissao)
    await waitFor(() => expect(screen.getByText('Você é cuidador.')).toBeTruthy())
    expect(screen.queryByLabelText('Nome ou apelido')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Salvar/ })).toBeNull()
    expect(screen.queryAllByRole('button', { name: /Editar|Arquivar|Adicionar bebê/ })).toEqual([])
    // O bebê não foi alterado.
    expect(secao('Bebês').getByText('Heloísa')).toBeTruthy()
  })

  it('rebaixado com o formulário de novo bebê aberto: o formulário some assim que o papel é relido', async () => {
    const dados = await memoriaComDoisResponsaveis()
    await abrir('bruno', dados)
    fireEvent.click(botao('Adicionar bebê'))
    expect(campo('Nome ou apelido')).toBeTruthy()

    dados.sessaoParaTeste(PESSOAS.juliana.email)
    await dados.mudarPapel(VINCULO_DO_BRUNO, 'cuidador')
    dados.sessaoParaTeste(PESSOAS.bruno.email)
    digitar('Nome ou apelido', 'Mel')
    digitar('Data de nascimento', somarDias(hojeNoFuso(FUSO), -5))
    fireEvent.click(botao('Salvar'))

    await waitFor(() => expect(screen.getByText('Você é cuidador.')).toBeTruthy())
    expect(screen.queryByLabelText('Nome ou apelido')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Salvar/ })).toBeNull()
  })

  it('P0002 de um convite (já cancelado por outro) com vínculo: a frase do catálogo, a caixa fecha e a lista é relida', async () => {
    const dados = novaMemoria()
    await abrir('juliana', dados)
    simularFalha(dados, 'revogarConvite', 'nao_encontrado')
    fireEvent.click(secao('Convites').getAllByRole('button', { name: /^Cancelar convite/ })[0])
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar convite' }))

    expect((await screen.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.nao_encontrado)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'Família Exemplo' })).toBeTruthy()
  })

  it('um convite já cancelado noutra aba (convite_nao_pendente): a frase e a lista relida, sem ele', async () => {
    const dados = novaMemoria()
    await abrir('juliana', dados)
    const lista = await dados.detalheFamilia(EXEMPLO)
    // O de cima da lista é o pendente de observador (o outro venceu há um dia).
    const alvo = lista.ok ? lista.valor.convites!.find((convite) => convite.papel === 'observador') : undefined
    await dados.revogarConvite(alvo!.id)
    fireEvent.click(secao('Convites').getAllByRole('button', { name: /^Cancelar convite/ })[0])
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar convite' }))

    expect((await screen.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.convite_nao_pendente)
    await waitFor(() => expect(secao('Convites').getAllByRole('listitem')).toHaveLength(1))
  })
})

describe('carregando e erro de leitura', () => {
  it('carregando: o main fica ocupado, com o texto, sem formulário, até o detalhe chegar', async () => {
    const dados = novaMemoria()
    let liberar!: () => void
    const original = dados.detalheFamilia.bind(dados)
    vi.spyOn(dados, 'detalheFamilia').mockImplementation(
      (id) => new Promise((resolver) => (liberar = () => resolver(original(id)))),
    )
    const { container } = renderizarComDados('/app/familia', { dados, sessao: 'juliana' })

    await waitFor(() => expect(typeof liberar).toBe('function'))
    expect(container.querySelector('main')!.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Carregando…')).toBeTruthy()
    expect(container.querySelector('form')).toBeNull()
    expect(container.querySelectorAll('main input')).toHaveLength(0)

    await act(async () => liberar())
    await screen.findByRole('heading', { level: 2, name: 'Bebês' })
    expect(container.querySelector('main')!.hasAttribute('aria-busy')).toBe(false)
  })

  it('rede ao ler o detalhe: a frase e "Tentar de novo", que lê de novo', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'detalheFamilia', 'rede')
    renderizarComDados('/app/familia', { dados, sessao: 'juliana' })

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.rede)
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await screen.findByRole('heading', { level: 2, name: 'Bebês' })
  })
})

describe('a mensagem de passagem entrou_na_familia', () => {
  it('chega na região de status da Família sem mover o foco', async () => {
    const { roteador } = renderizarComDados('/app/comecar', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 2, name: 'Como você quer começar?' })

    await act(async () => {
      await roteador.navigate('/app/familia', { state: { mensagem: 'entrou_na_familia', familia: 'Família Exemplo' } })
    })
    await screen.findByRole('heading', { level: 2, name: 'Bebês' })
    expect(status().textContent).toBe('Você entrou na família Família Exemplo.')
  })
})
