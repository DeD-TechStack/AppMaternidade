import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { listaDeFusos } from '../../componentes/conta/fusos.ts'
import { CHAVE_CONVITE, CHAVE_FAMILIA_ATUAL, CHAVE_RECUPERACAO } from '../../componentes/conta/armazenamento.ts'
import { CONTA, NOMES_DO_H1, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { dataNoFuso, fusoValido, type Resultado } from '../../dados/comum.ts'
import { erroDaChave } from '../../dados/conta.erros.ts'
import { FAMILIAS_DEMONSTRACAO, SENHA_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import { criarDadosContaMemoria, simularFalha } from '../../dados/conta.memoria.ts'
import { PESSOAS, criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// RF-16: perfil, id da conta (e cópia), exportação, exclusão (bloqueada, com falha na leitura,
// senha errada e sucesso), pendências visíveis e sair.

const AGORA = Date.parse('2026-11-06T12:00:00.000Z')
const VINCULO_DO_BRUNO = 'b2222222-2222-4222-8222-222222222222'

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  Reflect.deleteProperty(navigator, 'clipboard')
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
})

const novaMemoria = () => criarDadosContaMemoria(criarFixtureDeTeste(AGORA), { agora: () => AGORA })
const campo = (rotulo: string) => screen.getByLabelText(rotulo, { selector: 'input, select' }) as HTMLInputElement
const digitar = (rotulo: string, texto: string) => fireEvent.change(campo(rotulo), { target: { value: texto } })
const status = () => screen.getByRole('status')
const caminhoDe = (roteador: { state: { location: { pathname: string } } }) => roteador.state.location.pathname

async function abrirConta(pessoa: keyof typeof PESSOAS = 'juliana', dados = novaMemoria()) {
  const renderizado = renderizarComDados('/app/conta', { dados, sessao: pessoa })
  await screen.findByRole('heading', { level: 1, name: 'Conta' })
  return renderizado
}

const botaoExcluir = () => screen.getByRole('button', { name: 'Excluir minha conta' }) as HTMLButtonElement

/** Espera a leitura dos impedimentos terminar (o botão sai do "lendo"). */
async function esperarALeitura() {
  await waitFor(() => expect(screen.queryByText('Conferindo as suas famílias…')).toBeNull())
}

describe('estrutura da tela', () => {
  it('h1, linha com o nome e o e-mail, cabeçalho da conta e seções na ordem', async () => {
    await abrirConta()

    expect(screen.getByText('Juliana · juliana@exemplo.invalid')).toBeTruthy()
    // Só as seções da tela: o rodapé da casca tem os próprios títulos (Produto, Ajuda e Legal).
    const secoes = within(document.querySelector('main')!)
      .getAllByRole('heading', { level: 2 })
      .map((titulo) => titulo.textContent)
    expect(secoes).toEqual(['Perfil', 'Id da sua conta', 'Seus dados', 'Excluir conta', 'Privacidade'])

    const cabecalho = within(screen.getByRole('navigation', { name: 'Conta' }))
    expect(cabecalho.getByRole('link', { name: 'Conta' }).getAttribute('aria-current')).toBe('page')
    expect(screen.queryByRole('link', { name: 'Ver o protótipo do Hoje' })).toBeNull()
    expect(cabecalho.getByRole('button', { name: 'Sair' })).toBeTruthy()
    // Um só "Sair" na página (o da barra): o do fim da página saiu.
    expect(screen.getAllByRole('button', { name: 'Sair' })).toHaveLength(1)
    // Não monta a navegação inferior do protótipo.
    expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull()
  })

  it('o índice das seções leva às âncoras, cada link com alvo de 44 px', async () => {
    await abrirConta()

    const indice = within(screen.getByRole('navigation', { name: 'Nesta página' }))
    const links = indice.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Perfil', 'Id da conta', 'Seus dados', 'Excluir conta', 'Privacidade'])
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['#perfil', '#id-conta', '#exportar', '#excluir-conta', '#privacidade'])
    for (const link of links) {
      expect(link.classList.contains('alvo-toque')).toBe(true)
      expect(document.querySelector(link.getAttribute('href')!)).not.toBeNull()
    }
  })
})

describe('barra da conta', () => {
  it('é uma barra fina dentro da casca: sem marca própria, com um só aviso de demonstração, e quebra a linha quando os controles não cabem', async () => {
    const { container, unmount } = await abrirConta()

    // Cabeçalho e rodapé são os da casca: um só de cada, e a tela não desenha outro.
    expect(container.querySelectorAll('header')).toHaveLength(1)
    expect(container.querySelectorAll('footer')).toHaveLength(1)
    expect(container.querySelectorAll('[data-nome-site]')).toHaveLength(1)
    // Em modo memória, UM aviso (o do rodapé não vale no app): acima da barra, fora do <main>.
    expect(container.querySelectorAll('[data-aviso="demonstracao"]')).toHaveLength(1)
    expect(container.querySelectorAll('main [data-aviso="demonstracao"]')).toHaveLength(0)
    unmount()

    // Com o banco (as duas variáveis), nenhum.
    vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-ficticia')
    const comBanco = await abrirConta()
    expect(comBanco.container.querySelectorAll('[data-aviso="demonstracao"]')).toHaveLength(0)
    comBanco.unmount()
    vi.unstubAllEnvs()
    const memoria = await abrirConta()
    const container2 = memoria.container

    // A barra: a navegação "Conta", com o link da Conta e o Sair, antes do <main>.
    const barra = screen.getByRole('navigation', { name: 'Conta' })
    expect(barra.closest('header')).toBeNull()
    expect(barra.compareDocumentPosition(container2.querySelector('main')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(barra.classList.contains('flex-wrap')).toBe(true)
    expect(barra.classList.contains('justify-between')).toBe(true)
    expect([...barra.querySelectorAll('a, button')].map((filho) => filho.textContent)).toEqual(['Conta', 'Sair'])
  })
})

describe('perfil', () => {
  it('traz o nome, o e-mail (só leitura) e o fuso da conta', async () => {
    await abrirConta()

    expect(campo('Seu nome').value).toBe('Juliana')
    expect(campo('E-mail').value).toBe('juliana@exemplo.invalid')
    expect(campo('E-mail').readOnly).toBe(true)
    expect(campo('Seu fuso').value).toBe('America/Sao_Paulo')
  })

  it('só o e-mail leva a marca de só leitura; o seletor de fuso, editável, não', async () => {
    await abrirConta()

    expect(campo('E-mail').className).toMatch(/read-only:/)
    expect(campo('Seu fuso').className).not.toMatch(/read-only:/)
  })

  it('salvar muda o nome e o fuso, mostra "Dados salvos." e atualiza a linha do alto', async () => {
    const dados = novaMemoria()
    await abrirConta('juliana', dados)

    digitar('Seu nome', '  Juliana Souza  ')
    digitar('Seu fuso', 'America/Manaus')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(status().textContent).toBe('Dados salvos.'))
    expect(screen.getByText('Juliana Souza · juliana@exemplo.invalid')).toBeTruthy()
    const conta = await dados.minhaConta()
    expect(conta.ok && conta.valor).toMatchObject({ nome: 'Juliana Souza', fuso: 'America/Manaus' })
    // O foco não se move para a confirmação.
    expect(document.activeElement).not.toBe(status())
  })

  it('nome vazio dá erro no campo, sem chamar o banco', async () => {
    const dados = novaMemoria()
    await abrirConta('juliana', dados)
    const atualizar = vi.spyOn(dados, 'atualizarMinhaConta')

    digitar('Seu nome', '   ')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.getByText('Escreva o seu nome.')).toBeTruthy()
    expect(campo('Seu nome').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(campo('Seu nome'))
    expect(atualizar).not.toHaveBeenCalled()
  })

  it('nome_vazio e fuso_invalido do banco ficam no campo certo', async () => {
    const dados = novaMemoria()
    await abrirConta('juliana', dados)

    simularFalha(dados, 'atualizarMinhaConta', 'nome_vazio')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(campo('Seu nome').getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText(TEXTOS_ERRO.nome_vazio)).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(campo('Seu nome')))

    simularFalha(dados, 'atualizarMinhaConta', 'fuso_invalido')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(campo('Seu fuso').getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText(TEXTOS_ERRO.fuso_invalido)).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(campo('Seu fuso')))
  })

  it('um fuso guardado fora da lista aparece primeiro, como atual, e salvar sem trocar o mantém', async () => {
    const fora = ['US/Pacific', 'America/Argentina/ComodRivadavia', 'Asia/Saigon'].find(
      (candidato) => fusoValido(candidato) && !listaDeFusos().includes(candidato),
    )
    expect(fora, 'um fuso válido que o navegador não lista').toBeDefined()

    const dados = novaMemoria()
    dados.sessaoParaTeste('juliana@exemplo.invalid')
    await dados.atualizarMinhaConta('Juliana', fora!)
    renderizarComDados('/app/conta', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    const opcoes = [...campo('Seu fuso').querySelectorAll('option')]
    expect(opcoes[0].value).toBe(fora)
    expect(opcoes[0].textContent).toBe(`${fora} (atual)`)
    expect(campo('Seu fuso').value).toBe(fora)
    expect(opcoes.slice(1).map((opcao) => opcao.value)).toEqual(listaDeFusos())

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(status().textContent).toBe('Dados salvos.'))
    const conta = await dados.minhaConta()
    expect(conta.ok && conta.valor?.fuso).toBe(fora)
  })
})

describe('id da conta', () => {
  it('mostra o id num elemento com data-id-conta, em números tabulares e com quebra só depois de cada hífen', async () => {
    await abrirConta()

    const id = document.querySelector('[data-id-conta]')!
    expect(id.textContent).toBe(PESSOAS.juliana.id)
    expect(id.classList.contains('tabular')).toBe(true)
    expect(id.className).not.toMatch(/break-all|wrap-anywhere/)

    // Uma oportunidade de quebra (`<wbr>`) logo depois de cada hífen, e em mais nenhum lugar.
    const hifens = PESSOAS.juliana.id.split('-').length - 1
    expect(hifens).toBe(4)
    const quebras = [...id.querySelectorAll('wbr')]
    expect(quebras).toHaveLength(hifens)
    for (const quebra of quebras) {
      expect(quebra.previousSibling?.textContent?.endsWith('-')).toBe(true)
    }
    expect(id.innerHTML.replaceAll('<wbr>', '')).toBe(PESSOAS.juliana.id)
    expect(screen.getByText('Quem cuida da moderação pode pedir este número para dar a você um papel na equipe.')).toBeTruthy()
  })

  it('"Copiar id" copia pela área de transferência e avisa na região de status', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: escrever } })
    await abrirConta()

    fireEvent.click(screen.getByRole('button', { name: 'Copiar id' }))
    await waitFor(() => expect(status().textContent).toBe('Id copiado.'))
    expect(escrever).toHaveBeenCalledWith(PESSOAS.juliana.id)
  })

  it('sem área de transferência, ou com ela negada, o id fica selecionado e o status diz "Copie manualmente."', async () => {
    await abrirConta()
    fireEvent.click(screen.getByRole('button', { name: 'Copiar id' }))
    await waitFor(() => expect(status().textContent).toBe('Copie manualmente.'))
    expect(window.getSelection()?.toString()).toContain(PESSOAS.juliana.id)

    window.getSelection()?.removeAllRanges()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new DOMException('negado', 'NotAllowedError')) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copiar id' }))
    await waitFor(() => expect(window.getSelection()?.toString()).toContain(PESSOAS.juliana.id))
    expect(status().textContent).toBe('Copie manualmente.')
  })
})

describe('exportação', () => {
  function simularDownload() {
    const blobs: Blob[] = []
    const baixados: Array<{ nome: string; endereco: string }> = []
    const criar = vi.fn((arquivo: Blob) => {
      blobs.push(arquivo)
      return 'blob:arquivo-ficticio'
    })
    const revogar = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: criar })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: revogar })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      baixados.push({ nome: this.download, endereco: this.getAttribute('href') ?? '' })
    })
    return { blobs, baixados, revogar }
  }

  const lerTexto = (arquivo: Blob) =>
    new Promise<string>((resolver) => {
      const leitor = new FileReader()
      leitor.onload = () => resolver(String(leitor.result))
      leitor.readAsText(arquivo)
    })

  it('"Baixar meus dados" baixa appmaternidade-dados-AAAA-MM-DD.json com o JSON sem mudança, em 2 espaços', async () => {
    const download = simularDownload()
    const dados = novaMemoria()
    await abrirConta('juliana', dados)

    fireEvent.click(screen.getByRole('button', { name: 'Baixar meus dados' }))
    await waitFor(() => expect(status().textContent).toBe('Arquivo baixado.'))

    expect(download.baixados).toHaveLength(1)
    expect(download.baixados[0].nome).toBe(`appmaternidade-dados-${dataNoFuso(Date.now(), 'America/Sao_Paulo')}.json`)
    expect(download.baixados[0].nome).toMatch(/^appmaternidade-dados-\d{4}-\d{2}-\d{2}\.json$/)
    expect(download.baixados[0].endereco).toBe('blob:arquivo-ficticio')

    const exportado = await dados.exportarDados()
    expect(download.blobs[0].type).toBe('application/json')
    expect(await lerTexto(download.blobs[0])).toBe(JSON.stringify(exportado.ok && exportado.valor, null, 2))
    expect(JSON.parse(await lerTexto(download.blobs[0])).formato).toBe('appmaternidade-exportacao-v1')
    expect(download.revogar).toHaveBeenCalledWith('blob:arquivo-ficticio')
    // O link temporário não fica na página.
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
  })

  it('a data do nome do arquivo é a do fuso da conta', async () => {
    const download = simularDownload()
    const dados = novaMemoria()
    dados.sessaoParaTeste('juliana@exemplo.invalid')
    await dados.atualizarMinhaConta('Juliana', 'Pacific/Kiritimati')
    renderizarComDados('/app/conta', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    fireEvent.click(screen.getByRole('button', { name: 'Baixar meus dados' }))
    await waitFor(() => expect(download.baixados).toHaveLength(1))
    expect(download.baixados[0].nome).toBe(`appmaternidade-dados-${dataNoFuso(Date.now(), 'Pacific/Kiritimati')}.json`)
  })

  it('quem não é responsável recebe só os próprios dados', async () => {
    const download = simularDownload()
    await abrirConta('bruno')

    fireEvent.click(screen.getByRole('button', { name: 'Baixar meus dados' }))
    await waitFor(() => expect(download.blobs).toHaveLength(1))
    const json = JSON.parse(await lerTexto(download.blobs[0])) as { familias: unknown[]; vinculos: unknown[] }
    expect(json.familias).toEqual([])
    expect(json.vinculos).toHaveLength(1)
  })

  it('explica o que cada papel recebe e leva a âncora #exportar no título da seção', async () => {
    await abrirConta()
    expect(screen.getByText(/^Baixe um arquivo com os seus dados, para guardar\. Quem é responsável recebe a família inteira/)).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Seus dados' }).id).toBe('exportar')
  })

  it('/app/conta#exportar rola até a seção e foca o título dela', async () => {
    const rolar = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: rolar })
    renderizarComDados('/app/conta#exportar', { sessao: 'juliana' })

    const titulo = await screen.findByRole('heading', { level: 2, name: 'Seus dados' })
    await waitFor(() => expect(document.activeElement).toBe(titulo))
    expect(rolar).toHaveBeenCalled()
    expect(titulo.getAttribute('tabindex')).toBe('-1')
  })
})

describe('excluir conta: impedimentos', () => {
  it('a única responsável de uma família não exclui a conta: o botão fica desativado e a explicação lista a família', async () => {
    await abrirConta('juliana')
    await esperarALeitura()

    expect(botaoExcluir().disabled).toBe(true)
    const explicacao = document.getElementById(botaoExcluir().getAttribute('aria-describedby')!)!
    expect(explicacao.textContent).toContain('Você é a única pessoa responsável destas famílias.')
    expect(explicacao.textContent).toContain('Família Exemplo')
    // RF-16, item 4 (37b): cada nome é um link para a Família, com a família pedida.
    const links = [...explicacao.querySelectorAll('a')]
    expect(links.map((link) => link.textContent)).toEqual(['Família Exemplo'])
    expect(links[0].getAttribute('href')).toBe(`/app/familia?familia=${FAMILIAS_DEMONSTRACAO.exemplo}`)
    expect(links[0].classList.contains('alvo-toque')).toBe(true)
    expect(screen.getByText(/^Ao excluir a conta, ela e os seus vínculos com famílias somem/).textContent).toContain('“pessoa removida”')
  })

  it('cada família em que ela é a única responsável entra na lista', async () => {
    const dados = novaMemoria()
    dados.sessaoParaTeste('juliana@exemplo.invalid')
    await dados.criarFamilia('Solo', 'UTC')
    await dados.mudarPapel(VINCULO_DO_BRUNO, 'responsavel')
    // Na Família Exemplo agora há dois responsáveis; só a Solo bloqueia.
    renderizarComDados('/app/conta', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await esperarALeitura()

    const explicacao = document.getElementById(botaoExcluir().getAttribute('aria-describedby')!)!
    expect([...explicacao.querySelectorAll('a')].map((link) => link.textContent)).toEqual(['Solo'])
  })

  it('com outro responsável ativo em cada família, o botão fica ativo', async () => {
    const dados = novaMemoria()
    dados.sessaoParaTeste('juliana@exemplo.invalid')
    await dados.mudarPapel(VINCULO_DO_BRUNO, 'responsavel')
    renderizarComDados('/app/conta', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await esperarALeitura()

    expect(botaoExcluir().disabled).toBe(false)
    expect(botaoExcluir().hasAttribute('aria-describedby')).toBe(false)
    expect(document.getElementById('impedimento-exclusao')).toBeNull()
  })

  it('quem não é responsável (Bruno) e quem não tem família (Davi) podem excluir', async () => {
    for (const pessoa of ['bruno', 'davi'] as const) {
      const { unmount } = await abrirConta(pessoa)
      await esperarALeitura()
      expect(botaoExcluir().disabled, pessoa).toBe(false)
      unmount()
    }
  })

  it('enquanto lê, mostra "Conferindo as suas famílias…" e o botão fica desativado', async () => {
    const dados = novaMemoria()
    let liberar!: () => void
    const original = dados.minhasFamilias.bind(dados)
    vi.spyOn(dados, 'minhasFamilias').mockImplementation(
      () => new Promise((resolver) => {
        liberar = () => resolver(original())
      }),
    )
    renderizarComDados('/app/conta', { dados, sessao: 'davi' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    await waitFor(() => expect(typeof liberar).toBe('function'))
    expect(screen.getByText('Conferindo as suas famílias…')).toBeTruthy()
    expect(botaoExcluir().disabled).toBe(true)
    liberar()
    await esperarALeitura()
    expect(botaoExcluir().disabled).toBe(false)
  })
})

describe('excluir conta: falha na leitura dos impedimentos', () => {
  it('mostra a frase e "Tentar de novo" na seção; o botão fica desativado e o resto da tela segue funcionando', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'minhasFamilias', 'rede')
    await abrirConta('davi', dados)

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.rede)
    expect(botaoExcluir().disabled).toBe(true)
    // Perfil, id, exportar e sair continuam funcionando.
    expect((screen.getByRole('button', { name: 'Salvar' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'Copiar id' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'Baixar meus dados' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getAllByRole('button', { name: 'Sair' })).toHaveLength(1)

    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    await esperarALeitura()
    expect(botaoExcluir().disabled).toBe(false)
  })

  it('uma leitura parcial nunca conta como "sem impedimento": se o detalhe de uma família falhar, o botão segue desativado', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'detalheFamilia', 'tente_de_novo')
    await abrirConta('juliana', dados)

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.tente_de_novo)
    expect(botaoExcluir().disabled).toBe(true)
    expect(document.getElementById('impedimento-exclusao')).toBeNull()

    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(document.getElementById('impedimento-exclusao')).not.toBeNull())
    expect(botaoExcluir().disabled).toBe(true)
    expect(document.getElementById('impedimento-exclusao')!.textContent).toContain('Família Exemplo')
  })
})

describe('excluir conta: a caixa de confirmação', () => {
  const dialogo = () => screen.getByRole('dialog', { name: 'Excluir a sua conta?' })

  async function abrirDialogo(pessoa: keyof typeof PESSOAS = 'davi', dados = novaMemoria()) {
    const renderizado = await abrirConta(pessoa, dados)
    await esperarALeitura()
    fireEvent.click(botaoExcluir())
    return { ...renderizado, dados }
  }

  it('abre com título, o texto, o campo de senha com o foco e os dois botões', async () => {
    await abrirDialogo()

    expect(within(dialogo()).getByText('Para confirmar, digite a senha da conta.')).toBeTruthy()
    const senha = within(dialogo()).getByLabelText('Senha atual', { selector: 'input' })
    expect(document.activeElement).toBe(senha)
    expect(within(dialogo()).getByRole('button', { name: 'Excluir conta' })).toBeTruthy()
    expect(within(dialogo()).getByRole('button', { name: 'Cancelar' })).toBeTruthy()
  })

  it('"Cancelar" fecha a caixa e o foco volta ao botão que a abriu', async () => {
    await abrirDialogo()
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(botaoExcluir())
  })

  it('Esc fecha a caixa e o foco volta ao botão que a abriu', async () => {
    await abrirDialogo()
    fireEvent.keyDown(dialogo(), { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(botaoExcluir())
  })

  it('senha vazia dá erro no campo, sem chamar o banco', async () => {
    const { dados } = await abrirDialogo()
    const excluir = vi.spyOn(dados, 'excluirConta')

    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Excluir conta' }))
    expect(within(dialogo()).getByText('Escreva a sua senha.')).toBeTruthy()
    expect(excluir).not.toHaveBeenCalled()
  })

  it('senha errada: credenciais no campo, a caixa continua aberta e a conta fica intacta', async () => {
    const { dados } = await abrirDialogo()
    const excluir = vi.spyOn(dados, 'excluirConta')

    fireEvent.change(within(dialogo()).getByLabelText('Senha atual', { selector: 'input' }), { target: { value: 'errada' } })
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Excluir conta' }))

    await waitFor(() => expect(within(dialogo()).getByText(TEXTOS_ERRO.credenciais)).toBeTruthy())
    expect(within(dialogo()).getByLabelText('Senha atual', { selector: 'input' }).getAttribute('aria-invalid')).toBe('true')
    expect(excluir).not.toHaveBeenCalled()
    expect((await dados.minhaConta()).ok).toBe(true)
  })

  it('ultimo_responsavel do banco mostra a frase do catálogo na caixa', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'excluirConta', 'ultimo_responsavel')
    await abrirDialogo('davi', dados)

    fireEvent.change(within(dialogo()).getByLabelText('Senha atual', { selector: 'input' }), { target: { value: SENHA_DEMONSTRACAO } })
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Excluir conta' }))

    const alerta = await within(dialogo()).findByRole('alert')
    expect(alerta.textContent).toBe(TEXTOS_ERRO.ultimo_responsavel)
  })

  describe('R3: o foco depois de um envio com erro', () => {
    const senhaDoDialogo = () => within(dialogo()).getByLabelText('Senha atual', { selector: 'input' }) as HTMLInputElement
    // O botão de enviar muda de nome ("Excluindo…") enquanto envia: acha-se pelo tipo.
    const confirmar = () => dialogo().querySelector<HTMLButtonElement>('button[type="submit"]')!

    /** Digita a senha e ativa "Excluir conta" com o foco no botão, como pelo teclado. */
    function enviarComSenha(senha: string) {
      fireEvent.change(senhaDoDialogo(), { target: { value: senha } })
      confirmar().focus()
      fireEvent.click(confirmar())
    }

    for (const chave of ['rede', 'tente_de_novo', 'desconhecido'] as const) {
      it(`erro geral (${chave}): o foco vai ao resumo do erro dentro da caixa`, async () => {
        const dados = novaMemoria()
        simularFalha(dados, 'excluirConta', chave)
        await abrirDialogo('davi', dados)

        enviarComSenha(SENHA_DEMONSTRACAO)

        const alerta = await within(dialogo()).findByRole('alert')
        expect(alerta.textContent).toContain(TEXTOS_ERRO[chave])
        await waitFor(() => expect(document.activeElement).toBe(alerta))
      })
    }

    it('erro de negócio sem campo (ultimo_responsavel): o foco também vai ao resumo', async () => {
      const dados = novaMemoria()
      simularFalha(dados, 'excluirConta', 'ultimo_responsavel')
      await abrirDialogo('davi', dados)

      enviarComSenha(SENHA_DEMONSTRACAO)

      const alerta = await within(dialogo()).findByRole('alert')
      await waitFor(() => expect(document.activeElement).toBe(alerta))
    })

    it('senha inválida: o campo de senha mostra o erro e fica com o foco, a cada tentativa', async () => {
      await abrirDialogo()

      for (const tentativa of ['errada', 'errada de novo']) {
        enviarComSenha(tentativa)
        await waitFor(() => expect(senhaDoDialogo().getAttribute('aria-invalid')).toBe('true'))
        await waitFor(() => expect(document.activeElement).toBe(senhaDoDialogo()))
        expect(within(dialogo()).queryByRole('alert')).toBeNull()
      }
    })

    it('senha vazia: o foco vai ao campo de senha', async () => {
      await abrirDialogo()
      confirmar().focus()
      fireEvent.click(confirmar())

      expect(within(dialogo()).getByText('Escreva a sua senha.')).toBeTruthy()
      expect(document.activeElement).toBe(senhaDoDialogo())
    })

    it('depois de um erro de rede, "Tentar de novo" repete só a exclusão: a senha não é conferida outra vez', async () => {
      const dados = novaMemoria()
      simularFalha(dados, 'excluirConta', 'rede')
      const entrar = vi.spyOn(dados, 'entrar')
      const excluir = vi.spyOn(dados, 'excluirConta')
      const { roteador } = await abrirDialogo('davi', dados)

      enviarComSenha(SENHA_DEMONSTRACAO)
      const alerta = await within(dialogo()).findByRole('alert')
      await waitFor(() => expect(document.activeElement).toBe(alerta))
      expect(entrar).toHaveBeenCalledTimes(1)

      fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))

      await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.contaExcluida })
      expect(caminhoDe(roteador)).toBe('/conta-excluida')
      expect(entrar).toHaveBeenCalledTimes(1)
      expect(excluir).toHaveBeenCalledTimes(2)
    })

    it('a trava de envio duplo continua: dois cliques seguidos chamam o banco uma vez', async () => {
      const dados = novaMemoria()
      let liberar!: (resultado: Resultado<null>) => void
      const espera = new Promise<Resultado<null>>((resolver) => {
        liberar = resolver
      })
      const excluir = vi.spyOn(dados, 'excluirConta').mockReturnValueOnce(espera)
      const entrar = vi.spyOn(dados, 'entrar')
      await abrirDialogo('davi', dados)

      enviarComSenha(SENHA_DEMONSTRACAO)
      fireEvent.click(confirmar())
      fireEvent.click(confirmar())
      await waitFor(() => expect(excluir).toHaveBeenCalledTimes(1))
      expect(entrar).toHaveBeenCalledTimes(1)

      liberar({ ok: false, erro: erroDaChave('rede') })
      await within(dialogo()).findByRole('alert')
    })

    it('Esc depois do erro fecha a caixa e devolve o foco ao botão que a abriu', async () => {
      const dados = novaMemoria()
      simularFalha(dados, 'excluirConta', 'rede')
      await abrirDialogo('davi', dados)
      enviarComSenha(SENHA_DEMONSTRACAO)
      const alerta = await within(dialogo()).findByRole('alert')
      await waitFor(() => expect(document.activeElement).toBe(alerta))

      fireEvent.keyDown(dialogo(), { key: 'Escape' })

      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.activeElement).toBe(botaoExcluir())
    })
  })

  it('sucesso: exclui a conta, encerra a sessão, apaga as chaves e vai a /conta-excluida', async () => {
    localStorage.setItem(CHAVE_FAMILIA_ATUAL, FAMILIAS_DEMONSTRACAO.exemplo)
    sessionStorage.setItem(CHAVE_CONVITE, 'a'.repeat(64))
    sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.davi.id)
    const { roteador, dados } = await abrirDialogo()

    fireEvent.change(within(dialogo()).getByLabelText('Senha atual', { selector: 'input' }), { target: { value: SENHA_DEMONSTRACAO } })
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Excluir conta' }))

    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.contaExcluida })
    expect(caminhoDe(roteador)).toBe('/conta-excluida')
    expect(screen.getByText('Sua conta foi excluída.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem(CHAVE_FAMILIA_ATUAL)).toBeNull()
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBeNull()
    expect(sessionStorage.getItem(CHAVE_RECUPERACAO)).toBeNull()
    expect(await dados.sessaoAtual()).toEqual({ ok: true, valor: null })
    expect((await dados.entrar(PESSOAS.davi.email, SENHA_DEMONSTRACAO)).ok).toBe(false)

    // A tela de saída não leva de volta a /entrar: a pessoa fica em /conta-excluida.
    await new Promise((resolver) => setTimeout(resolver, 20))
    expect(caminhoDe(roteador)).toBe('/conta-excluida')
  })
})

describe('privacidade e sair', () => {
  it('mostra o contato e o encarregado de dados provisórios, em texto simples, e o link da Política de privacidade', async () => {
    await abrirConta()

    const { valor } = CONTA.privacidade.contato
    expect(valor).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/)
    expect(valor).not.toMatch(/a definir|exemplo/i)
    const contato = document.querySelector('[data-contato]')!
    expect(contato.textContent).toBe(valor)
    expect(contato.parentElement!.textContent).toBe(`Dúvidas sobre seus dados: ${valor}.`)
    expect(contato.closest('a')).toBeNull()
    // O valor é uma palavra longa sem ponto de quebra: tem de poder quebrar dentro dela.
    expect(contato.classList.contains('wrap-anywhere')).toBe(true)
    expect(contato.innerHTML).toBe(valor)

    const encarregado = document.querySelector('[data-encarregado]')!
    expect(encarregado.textContent).toBe('Daniel Macedo')
    expect(encarregado.parentElement!.textContent).toBe('Encarregado de dados: Daniel Macedo.')
    expect(encarregado.classList.contains('wrap-anywhere')).toBe(true)
    expect(encarregado.innerHTML).toBe('Daniel Macedo')

    const privacidade = document.querySelector('#privacidade')!.closest('section')!
    expect(privacidade.textContent).not.toMatch(/a definir|canal de contato/i)
    expect(document.body.textContent).not.toMatch(/a definir|canal de contato/i)
    expect(screen.getByRole('link', { name: 'Política de privacidade' }).getAttribute('href')).toBe('/privacidade')
  })

  it('todo valor da conta sem ponto de quebra (e-mail da linha do alto, família do impedimento) quebra dentro da palavra', async () => {
    await abrirConta()
    await esperarALeitura()

    const resumo = screen.getByText(CONTA.resumo(PESSOAS.juliana.nome, PESSOAS.juliana.email))
    expect(resumo.classList.contains('wrap-anywhere')).toBe(true)
    const familia = document.querySelector('#impedimento-exclusao a')!
    expect(familia.textContent).toBe('Família Exemplo')
    expect(familia.classList.contains('wrap-anywhere')).toBe(true)
  })

  it('o único botão Sair da página, o da barra, encerra a sessão', async () => {
    const { roteador } = await abrirConta()

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(caminhoDe(roteador)).toBe('/entrar')
    expect(status().textContent).toBe('Você saiu da conta.')
  })

  it('sair com uma leitura em andamento que volta com sessao_encerrada mantém "Você saiu da conta."', async () => {
    const dados = novaMemoria()
    let liberar!: (resultado: Resultado<unknown>) => void
    const espera = new Promise<Resultado<unknown>>((resolver) => {
      liberar = resolver
    })
    vi.spyOn(dados as unknown as Record<string, (...argumentos: unknown[]) => unknown>, 'minhasFamilias').mockReturnValueOnce(espera)
    renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    // A saída é da pessoa; a leitura dos impedimentos, que ainda não voltou, chega depois dela.
    fireEvent.click(screen.getAllByRole('button', { name: 'Sair' })[0])
    liberar({ ok: false, erro: erroDaChave('sessao_encerrada') })
    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    await new Promise((resolver) => setTimeout(resolver, 20))

    expect(status().textContent).toBe('Você saiu da conta.')
  })
})
