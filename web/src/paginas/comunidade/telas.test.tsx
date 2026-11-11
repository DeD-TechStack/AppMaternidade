import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { COMUM_COMUNIDADE, ENTRAR_NA_COMUNIDADE, LISTA, TX, TEXTOS_ERRO_COMUNIDADE } from '../../conteudo/comunidade.ts'
import { CONTEUDO, ELENCO, criarElenco, type PessoaDoElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria, simularFalha, simularRespostaPerdida } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { fixtureDeContasDoElenco, renderizarComunidade } from './apoio.tsx'

// Uma falha mostra só o começo do HTML (o padrão despeja milhares de linhas).
process.env.DEBUG_PRINT_LIMIT = '300'

// MAT-40a: as telas C1 a C7 sobre a memória, com o elenco da MAT-47 (COM-08): selo, título e `noindex`,
// estados, fluxos de entrar, publicar, responder, denunciar e bloquear, o envio com resultado incerto e
// as regras que falham fechadas. O `fetch` abaixo falha o teste se alguma tela chamar a rede.

function proibirARede() {
  const fetchProibido = vi.fn(() => {
    throw new Error('o teste chamou a rede')
  })
  vi.stubGlobal('fetch', fetchProibido)
  return fetchProibido
}

function cena(pessoa: PessoaDoElenco, caminho: string, ajustar?: (estado: ReturnType<typeof criarElenco>) => void) {
  const estado = criarElenco()
  ajustar?.(estado)
  const comunidade = criarDadosComunidadeMemoria(estado, ELENCO[pessoa].conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO[pessoa].email)
  const tela = renderizarComunidade(caminho, { contas, comunidade })
  return { ...tela, estado, comunidade }
}

const topico = (id: string) => `/app/comunidade/topico/${id}`
const espaco = (slug: string) => `/app/comunidade/${slug}`
const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const campo = (rotulo: string | RegExp) => screen.getByLabelText(rotulo) as HTMLInputElement | HTMLTextAreaElement
const digitar = (rotulo: string | RegExp, texto: string) => fireEvent.change(campo(rotulo), { target: { value: texto } })
const semCarregando = () => waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
/** O `h1` sempre existe; a tela só está pronta quando as leituras acabam (o `<main>` deixa de estar ocupado). */
async function aguardarH1(nome?: string | RegExp) {
  const titulo = await screen.findByRole('heading', { level: 1, ...(nome ? { name: nome } : {}) })
  await semCarregando()
  return titulo
}

describe('selo, título da aba e noindex (MAT-40:RF-02, teste 10)', () => {
  const rotas: Array<[string, PessoaDoElenco, string | null]> = [
    ['/app/comunidade', 'autor', null],
    [espaco('sono'), 'autor', 'Sono'],
    [topico(CONTEUDO.topicoDoAutor), 'autor', 'Tópico do autor'],
    [`${espaco('sono')}/novo`, 'autor', 'Novo tópico'],
    [`${topico(CONTEUDO.topicoDoAutor)}/editar`, 'autor', 'Editar tópico'],
    ['/app/comunidade/entrar', 'nova', null],
    ['/app/comunidade/perfil', 'autor', 'Meu perfil público'],
    ['/app/comunidade/denuncias', 'autor', 'Minhas denúncias'],
  ]

  for (const [caminho, pessoa, h1] of rotas) {
    it(`${caminho} (${pessoa}): um main e um h1, o selo, o título da aba e a meta robots só enquanto está montada`, async () => {
      const { container, roteador } = cena(pessoa, caminho)
      const titulo = await aguardarH1(h1 ?? undefined)
      await semCarregando()

      expect(container.querySelectorAll('main')).toHaveLength(1)
      expect(container.querySelectorAll('h1')).toHaveLength(1)
      if (h1) expect(titulo.textContent).toBe(h1)
      expect(screen.getByText(TX.tx01)).toBeTruthy()
      expect(document.title).toBe('Comunidade | AppMaternidade')
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')

      await act(async () => {
        await roteador.navigate('/app/hoje')
      })
      await screen.findByRole('heading', { level: 1, name: 'Hoje' })
      expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
    })
  }

  it('o selo e o aviso de saúde (com o link de ajuda) aparecem na C1, na C2 e na C3', async () => {
    for (const caminho of ['/app/comunidade', espaco('sono'), topico(CONTEUDO.topicoDoAutor)]) {
      const { unmount } = cena('outro', caminho)
      await aguardarH1()
      await semCarregando()
      expect(screen.getByText(TX.tx02)).toBeTruthy()
      const ajuda = screen.getByRole('link', { name: TX.ajuda })
      expect(ajuda.getAttribute('href')).toBe('/regras-da-comunidade#secao-ajuda-agora')
      unmount()
    }
  })

  it('sem sessão, qualquer rota vai a /entrar?volta=... (a MAT-40 não cria tela de login)', async () => {
    const estado = criarElenco()
    const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.autor.conta)
    const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    const { roteador } = renderizarComunidade('/app/comunidade', { contas, comunidade })
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar'))
    expect(roteador.state.location.search).toBe(`?volta=${encodeURIComponent('/app/comunidade')}`)
  })

  it('nenhuma tela chama a rede', async () => {
    const fetchProibido = proibirARede()
    for (const caminho of ['/app/comunidade', espaco('sono'), topico(CONTEUDO.topicoDoAutor), '/app/comunidade/perfil', '/app/comunidade/denuncias']) {
      const { unmount } = cena('autor', caminho)
      await aguardarH1()
      await semCarregando()
      unmount()
    }
    expect(fetchProibido).not.toHaveBeenCalled()
  })
})

describe('subcaminho e "Voltar" (MAT-40:RF-18, teste 11)', () => {
  const todas: Array<[string, PessoaDoElenco]> = [
    ['/app/comunidade', 'moderador'],
    [espaco('sono'), 'autor'],
    [topico(CONTEUDO.topicoDoAutor), 'autor'],
    [`${espaco('sono')}/novo`, 'autor'],
    [`${topico(CONTEUDO.topicoDoAutor)}/editar`, 'autor'],
    ['/app/comunidade/entrar', 'nova'],
    ['/app/comunidade/perfil', 'autor'],
    ['/app/comunidade/denuncias', 'autor'],
  ]

  it('com o basename /AppMaternidade, todo link interno começa por /AppMaternidade/ (nada escrito à mão)', async () => {
    for (const [caminho, pessoa] of todas) {
      const estado = criarElenco()
      const comunidade = criarDadosComunidadeMemoria(estado, ELENCO[pessoa].conta)
      const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
      contas.sessaoParaTeste(ELENCO[pessoa].email)
      const { unmount } = renderizarComunidade(caminho, { contas, comunidade, basename: '/AppMaternidade' })
      await aguardarH1()
      // Os links da tela (o `<main>`); o nome do site no cabeçalho é da casca da base.
      const internos = [...document.querySelectorAll<HTMLAnchorElement>('main a[href]')].map((a) => a.getAttribute('href')!).filter((href) => href.startsWith('/'))
      expect(internos.length, caminho).toBeGreaterThan(0)
      for (const href of internos) expect(href, `${caminho}: ${href}`).toMatch(/^\/AppMaternidade\//)
      unmount()
    }
  })

  it('os links "Voltar" levam ao destino de cada tela; C1 não tem', async () => {
    const voltar = async (pessoa: PessoaDoElenco, caminho: string) => {
      const { unmount } = cena(pessoa, caminho)
      await aguardarH1()
      const link = within(document.querySelector('main')!).queryByRole('link', { name: COMUM_COMUNIDADE.voltar })
      const href = link?.getAttribute('href') ?? null
      unmount()
      return href
    }
    expect(await voltar('autor', '/app/comunidade')).toBeNull()
    expect(await voltar('autor', espaco('sono'))).toBe('/app/comunidade')
    expect(await voltar('autor', topico(CONTEUDO.topicoDoAutor))).toBe(espaco('sono'))
    expect(await voltar('autor', `${espaco('sono')}/novo`)).toBe(espaco('sono'))
    expect(await voltar('autor', `${topico(CONTEUDO.topicoDoAutor)}/editar`)).toBe(topico(CONTEUDO.topicoDoAutor))
    expect(await voltar('nova', '/app/comunidade/entrar')).toBe('/app/comunidade')
    expect(await voltar('semPerfil', `/app/comunidade/entrar?volta=${encodeURIComponent('/app/comunidade/perfil')}`)).toBe('/app/comunidade/perfil')
    expect(await voltar('autor', '/app/comunidade/perfil')).toBe('/app/comunidade')
    expect(await voltar('autor', '/app/comunidade/denuncias')).toBe('/app/comunidade')
    // Onde o espaço do tópico não é conhecido, volta à C1.
    expect(await voltar('outro', topico(CONTEUDO.topicoOculto))).toBe('/app/comunidade')
    expect(await voltar('outro', topico('nao-e-uuid'))).toBe('/app/comunidade')
    expect(await voltar('outro', `${topico('nao-e-uuid')}/editar`)).toBe('/app/comunidade')
  })
})

describe('C1: os espaços e as entradas', () => {
  it('os 7 espaços em ordem, e os links da pessoa; o painel só para a moderação', async () => {
    for (const [pessoa, painel] of [
      ['outro', false],
      ['moderador', true],
      ['admin', true],
      ['vencido', false],
    ] as const) {
      const { unmount } = cena(pessoa, '/app/comunidade')
      await aguardarH1(LISTA.manchete.join(' '))
      await screen.findByRole('link', { name: 'Sono' })
      const lista = screen.getByRole('heading', { name: LISTA.espacos }).closest('section')!
      expect(within(lista).getAllByRole('link').map((a) => a.textContent)).toEqual([
        'Sono',
        'Alimentação',
        'Banho',
        'Tummy time',
        'Organização da rotina',
        'Divisão dos cuidados',
        'Dificuldades do dia a dia',
      ])
      expect(screen.getByRole('link', { name: LISTA.meuPerfil }).getAttribute('href')).toBe('/app/comunidade/perfil')
      expect(screen.getByRole('link', { name: LISTA.minhasDenuncias }).getAttribute('href')).toBe('/app/comunidade/denuncias')
      expect(screen.queryByRole('link', { name: LISTA.painel }) !== null, pessoa).toBe(painel)
      unmount()
    }
  })

  it('quem não é escritor habilitado vê o bloco que leva à C5, com o volta da C1; o escritor não', async () => {
    const { unmount } = cena('semAceite', '/app/comunidade')
    const entrar = await screen.findByRole('link', { name: LISTA.entrar })
    expect(entrar.getAttribute('href')).toBe(`/app/comunidade/entrar?volta=${encodeURIComponent('/app/comunidade')}`)
    unmount()
    cena('autor', '/app/comunidade')
    await screen.findByRole('link', { name: 'Sono' })
    expect(screen.queryByRole('link', { name: LISTA.entrar })).toBeNull()
  })

  it('a lista de espaços vazia mostra TX-30', async () => {
    cena('autor', '/app/comunidade', (estado) => {
      estado.espacos = []
    })
    expect(await screen.findByText(TX.tx30)).toBeTruthy()
  })
})

describe('C2: os tópicos de um espaço', () => {
  it('lista título, autor, faixa, data e número de respostas; o espaço vazio mostra TX-16 e o "Novo tópico"', async () => {
    cena('outro', espaco('sono'))
    const doAutor = await screen.findByRole('article', { name: 'Tópico do autor' })
    expect(within(doAutor).getByText('autor_do_forum')).toBeTruthy()
    expect(within(doAutor).getByText(COMUM_COMUNIDADE.respostas(4))).toBeTruthy()
    expect(within(doAutor).getByText(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Novo tópico' }).getAttribute('href')).toBe('/app/comunidade/sono/novo')
  })

  it('o espaço sem tópicos mostra TX-16 e o botão "Novo tópico"', async () => {
    cena('outro', espaco('tummy-time'))
    expect(await screen.findByText(TX.tx16)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Novo tópico' })).toBeTruthy()
  })

  it('o filtro de faixa mostra só os tópicos da faixa', async () => {
    cena('outro', espaco('banho'))
    await screen.findByRole('article', { name: 'Tópico do outro' })
    fireEvent.click(botao('0 a 3 meses'))
    expect(await screen.findByText(TX.tx16)).toBeTruthy()
    fireEvent.click(botao('3 a 6 meses'))
    expect(await screen.findByRole('article', { name: 'Tópico do outro' })).toBeTruthy()
  })

  it('um slug fora dos 7 é "não encontrado", com o link para a C1', async () => {
    cena('outro', espaco('inexistente'))
    expect(await screen.findByText(TX.tx11)).toBeTruthy()
    expect(screen.getByRole('link', { name: COMUM_COMUNIDADE.irParaComunidade }).getAttribute('href')).toBe('/app/comunidade')
  })

  it('45 tópicos: 20 por página, "Carregar mais" até acabarem, sem repetir', async () => {
    const { estado } = cena('outro', espaco('tummy-time'), (e) => {
      const tummy = e.espacos.find((x) => x.slug === 'tummy-time')!.id
      for (let n = 0; n < 45; n++) {
        e.topicos.push({
          id: `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
          espacoId: tummy,
          autorId: ELENCO.autor.perfil,
          titulo: `Paginado ${String(n).padStart(2, '0')}`,
          corpo: 'Texto',
          faixa: null,
          estado: 'visivel',
          motivoModeracao: null,
          criadoEm: new Date(Date.now() - (100 - n) * 60_000).toISOString(),
          editadoEm: null,
        })
      }
    })
    expect(estado.topicos.length).toBeGreaterThan(45)
    await screen.findByRole('article', { name: 'Paginado 44' })
    expect(screen.getAllByRole('article')).toHaveLength(20)
    fireEvent.click(botao('Carregar mais'))
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(40))
    fireEvent.click(botao('Carregar mais'))
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(45))
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull()
  })
})

describe('estados das leituras (MAT-40:RF-15, teste 5)', () => {
  it('a leitura que devolve rede mostra a frase `rede`; "Tentar de novo" repete só ela', async () => {
    const estado = criarElenco()
    const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.outro.conta)
    simularFalha(comunidade, 'listarEspacos', 'rede')
    const situacao = vi.spyOn(comunidade, 'situacaoDaConta')
    const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    contas.sessaoParaTeste(ELENCO.outro.email)
    renderizarComunidade('/app/comunidade', { contas, comunidade })

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO_COMUNIDADE.rede)
    expect(situacao).toHaveBeenCalledTimes(1)
    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
    expect(await screen.findByRole('link', { name: 'Sono' })).toBeTruthy()
    expect(situacao).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('um erro que não é rede, não encontrado nem sem permissão mostra a frase `desconhecido` com o código, nunca lista vazia', async () => {
    const estado = criarElenco()
    const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.outro.conta)
    simularFalha(comunidade, 'listarTopicos', { classe: 'desconhecido', chave: 'desconhecido', codigo: '22P02', mensagemOriginal: 'invalid input' })
    const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    contas.sessaoParaTeste(ELENCO.outro.email)
    renderizarComunidade(espaco('sono'), { contas, comunidade })

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(`${TEXTOS_ERRO_COMUNIDADE.desconhecido} (22P02)`)
    expect(screen.queryByText(TX.tx16)).toBeNull()
    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
    expect(await screen.findByRole('article', { name: 'Tópico do autor' })).toBeTruthy()
  })

  it('sem permissão numa leitura mostra a frase, sem botão; P0002 vira "não encontrado"', async () => {
    const estado = criarElenco()
    const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.outro.conta)
    simularFalha(comunidade, 'lerTopico', 'sem_permissao')
    const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    contas.sessaoParaTeste(ELENCO.outro.email)
    const { unmount } = renderizarComunidade(topico(CONTEUDO.topicoDoAutor), { contas, comunidade })
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toBe(TEXTOS_ERRO_COMUNIDADE.sem_permissao)
    expect(within(alerta).queryByRole('button')).toBeNull()
    unmount()

    simularFalha(comunidade, 'lerTopico', 'nao_encontrado')
    renderizarComunidade(topico(CONTEUDO.topicoDoAutor), { contas, comunidade })
    expect(await screen.findByText(TX.tx11)).toBeTruthy()
  })

  it('o id da rota que não é UUID é "não encontrado", sem chamar o banco', async () => {
    const estado = criarElenco()
    const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.autor.conta)
    const espioes = (['lerTopico', 'lerRespostas', 'lerPerfis', 'situacaoDaConta'] as const).map((nome) => vi.spyOn(comunidade, nome))
    const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    contas.sessaoParaTeste(ELENCO.autor.email)
    for (const caminho of [topico('nao-e-uuid'), `${topico('nao-e-uuid')}/editar`, topico('1'), topico('c0000000-0000-4000-8000-0000000002zz')]) {
      const { unmount } = renderizarComunidade(caminho, { contas, comunidade })
      expect(await screen.findByText(TX.tx11)).toBeTruthy()
      unmount()
    }
    for (const espiao of espioes) expect(espiao).not.toHaveBeenCalled()
  })

  it('sessão encerrada: nada da MAT-40 na tela; o provedor da MAT-37 leva a /entrar?volta=...', async () => {
    const estado = criarElenco()
    const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.outro.conta)
    const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    contas.sessaoParaTeste(ELENCO.outro.email)
    simularFalha(comunidade, 'listarEspacos', 'sessao_encerrada')
    const { roteador } = renderizarComunidade('/app/comunidade', { contas, comunidade })
    // A sessão acaba por fora: a próxima leitura devolve `sessao_encerrada` e o provedor relê a sessão.
    contas.encerrarSessaoPorFora()
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar'))
    expect(roteador.state.location.search).toBe(`?volta=${encodeURIComponent('/app/comunidade')}`)
    expect(screen.queryByText(TEXTOS_ERRO_COMUNIDADE.desconhecido)).toBeNull()
  })

  it('o tópico que o banco não devolve é "não encontrado" (também o que a pessoa não pode ver)', async () => {
    cena('outro', topico(CONTEUDO.topicoOculto))
    expect(await screen.findByText(TX.tx11)).toBeTruthy()
  })

  it('o esqueleto só aparece depois de 300 ms; antes disso, nada novo na tela', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const estado = criarElenco()
    const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.outro.conta)
    const original = comunidade.listarEspacos.bind(comunidade)
    let liberar: () => void = () => undefined
    const travada = new Promise<void>((resolver) => {
      liberar = resolver
    })
    comunidade.listarEspacos = async () => {
      await travada
      return original()
    }
    const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    contas.sessaoParaTeste(ELENCO.outro.email)
    const { container } = renderizarComunidade('/app/comunidade', { contas, comunidade })

    // A tela só monta depois da sessão (promessas); o relógio da leitura conta daí.
    for (let volta = 0; volta < 100 && !container.querySelector('h1'); volta++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
    }
    expect(container.querySelector('h1')).not.toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(290)
    })
    expect(container.querySelector('[data-esqueleto]')).toBeNull()
    expect(container.querySelector('main')?.getAttribute('aria-busy')).toBe('true')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })
    expect(container.querySelector('[data-esqueleto]')).not.toBeNull()
    await act(async () => {
      liberar()
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(container.querySelector('[data-esqueleto]')).toBeNull()
    expect(screen.getByRole('link', { name: 'Sono' })).toBeTruthy()
  })
})

describe('C5: entrar na comunidade (MAT-40:RF-03, teste 7)', () => {
  it('a Nova chega pelo "Novo tópico", aceita, cria o perfil e volta à C4 vazia, com TX-25', async () => {
    const { roteador, estado } = cena('nova', espaco('sono'))
    fireEvent.click(await screen.findByRole('link', { name: 'Novo tópico' }))
    await aguardarH1(ENTRAR_NA_COMUNIDADE.manchete.join(' '))
    expect(roteador.state.location.search).toBe(`?volta=${encodeURIComponent('/app/comunidade/sono/novo')}`)

    // Sem a marca, nada vai ao banco.
    fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.aceitar))
    expect(screen.getByText(ENTRAR_NA_COMUNIDADE.marqueACaixa)).toBeTruthy()
    expect(estado.aceites.filter((a) => a.contaId === ELENCO.nova.conta)).toHaveLength(0)

    const principal = within(document.querySelector('main')!)
    expect(principal.getByRole('link', { name: 'Termos de uso' }).getAttribute('href')).toBe('/termos')
    expect(principal.getByRole('link', { name: 'Regras da comunidade' }).getAttribute('href')).toBe('/regras-da-comunidade')
    expect(screen.queryByText(/2026-11-05/)).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: TX.tx03 }))
    fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.aceitar))

    await screen.findByRole('heading', { name: ENTRAR_NA_COMUNIDADE.perfilTitulo })
    expect(screen.getByText(TX.tx04)).toBeTruthy()
    digitar(ENTRAR_NA_COMUNIDADE.apelido, 'ab')
    fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.criarPerfil))
    expect(screen.getAllByText(ENTRAR_NA_COMUNIDADE.erroApelido).length).toBeGreaterThan(0)
    expect(estado.perfis.some((p) => p.contaId === ELENCO.nova.conta)).toBe(false)
    digitar(ENTRAR_NA_COMUNIDADE.apelido, 'apelido_da_nova')
    fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.criarPerfil))

    await aguardarH1('Novo tópico')
    expect(roteador.state.location.pathname).toBe('/app/comunidade/sono/novo')
    expect(roteador.state.location.search).toBe('')
    expect((campo('Título') as HTMLInputElement).value).toBe('')
    expect((await screen.findAllByRole('status')).some((s) => s.textContent === TX.tx25)).toBe(true)
  })

  it('a entrada direta volta à C1; um volta inválido também', async () => {
    for (const volta of [null, '//x', 'https://x', '/moderacao', '/app/comunidade/entrar', '/app/comunidade/entrar?volta=/app/comunidade/perfil']) {
      const sufixo = volta === null ? '' : `?volta=${encodeURIComponent(volta)}`
      const { roteador, unmount } = cena('semPerfil', `/app/comunidade/entrar${sufixo}`)
      await screen.findByRole('heading', { name: ENTRAR_NA_COMUNIDADE.perfilTitulo })
      digitar(ENTRAR_NA_COMUNIDADE.apelido, 'apelido_novo')
      fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.criarPerfil))
      await aguardarH1(LISTA.manchete.join(' '))
      expect(roteador.state.location.pathname, String(volta)).toBe('/app/comunidade')
      unmount()
    }
  })

  it('quem já é escritor vai direto ao destino', async () => {
    const { roteador } = cena('autor', `/app/comunidade/entrar?volta=${encodeURIComponent('/app/comunidade/perfil')}`)
    await aguardarH1('Meu perfil público')
    expect(roteador.state.location.pathname).toBe('/app/comunidade/perfil')
  })

  it('"versao nao vigente" no aceite: a frase e o passo de novo', async () => {
    const { comunidade } = cena('nova', '/app/comunidade/entrar')
    simularFalha(comunidade, 'aceitarTermos', 'versao_nao_vigente')
    fireEvent.click(await screen.findByRole('checkbox', { name: TX.tx03 }))
    fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.aceitar))
    expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO_COMUNIDADE.versao_nao_vigente)
    expect(screen.getByRole('checkbox', { name: TX.tx03 })).toBeTruthy()
  })

  it('sem versão vigente, a C5 mostra a frase e não oferece o aceite', async () => {
    cena('nova', '/app/comunidade/entrar', (estado) => {
      estado.versoes.forEach((v) => (v.vigente = false))
    })
    expect(await screen.findByText(TEXTOS_ERRO_COMUNIDADE.termos_indisponiveis)).toBeTruthy()
    expect(screen.queryByRole('button', { name: ENTRAR_NA_COMUNIDADE.aceitar })).toBeNull()
  })

  it('o apelido em uso aparece no campo; o perfil criado noutra aba segue como se tivesse criado', async () => {
    const { comunidade, estado } = cena('semPerfil', '/app/comunidade/entrar')
    await screen.findByRole('heading', { name: ENTRAR_NA_COMUNIDADE.perfilTitulo })
    digitar(ENTRAR_NA_COMUNIDADE.apelido, 'AUTOR_DO_FORUM')
    fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.criarPerfil))
    expect(await screen.findByText(TEXTOS_ERRO_COMUNIDADE.apelido_em_uso)).toBeTruthy()
    expect(document.activeElement).toBe(campo(ENTRAR_NA_COMUNIDADE.apelido))

    // Outra aba cria o perfil primeiro: o `23505` da conta única não é erro para a pessoa.
    estado.perfis.push({ id: 'e0000000-0000-4000-8000-000000000001', contaId: ELENCO.semPerfil.conta, apelido: 'criado_noutra_aba', bio: null, faixa: null, criadoEm: new Date().toISOString() })
    expect(comunidade).toBeTruthy()
    digitar(ENTRAR_NA_COMUNIDADE.apelido, 'apelido_diferente')
    fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.criarPerfil))
    await aguardarH1(LISTA.manchete.join(' '))
  })
})

describe('publicar um tópico com prévia e confirmação (MAT-40:RF-04)', () => {
  it('"Ver prévia" só vale dentro dos limites; a prévia não grava; "Voltar e editar" mantém o texto; "Publicar" grava', async () => {
    const { estado, roteador } = cena('outro', `${espaco('sono')}/novo`)
    await aguardarH1('Novo tópico')
    const total = estado.topicos.length
    expect(botao('Ver prévia').disabled).toBe(true)

    digitar('Título', 'ab')
    digitar('Texto do tópico', 'Corpo do tópico')
    expect(screen.getByText('2 de 120')).toBeTruthy()
    expect(botao('Ver prévia').disabled).toBe(true)
    digitar('Título', 'Um título bom')
    expect(botao('Ver prévia').disabled).toBe(false)
    fireEvent.click(screen.getByRole('radio', { name: '3 a 6 meses' }))
    fireEvent.click(botao('Ver prévia'))

    expect(screen.getByText(TX.tx05)).toBeTruthy()
    const previa = document.querySelector('[data-previa="topico"]') as HTMLElement
    expect(within(previa).getByText('Um título bom')).toBeTruthy()
    expect(within(previa).getByText('Corpo do tópico')).toBeTruthy()
    expect(within(previa).getByText('3 a 6 meses')).toBeTruthy()
    expect(within(previa).getByText('outra_pessoa')).toBeTruthy()
    expect(within(previa).getByText(TX.tx01)).toBeTruthy()
    expect(estado.topicos).toHaveLength(total)

    fireEvent.click(botao('Voltar e editar'))
    expect((campo('Título') as HTMLInputElement).value).toBe('Um título bom')
    expect((campo('Texto do tópico') as HTMLTextAreaElement).value).toBe('Corpo do tópico')
    expect(estado.topicos).toHaveLength(total)

    fireEvent.click(botao('Ver prévia'))
    fireEvent.click(botao('Publicar'))
    await screen.findByRole('heading', { level: 1, name: 'Um título bom' })
    expect(estado.topicos).toHaveLength(total + 1)
    expect(roteador.state.location.pathname).toMatch(/^\/app\/comunidade\/topico\//)
    expect((await screen.findAllByRole('status')).some((s) => s.textContent === TX.tx06)).toBe(true)
  })

  it('os limites do corpo: 1 a 5000 caracteres, com o contador à vista', async () => {
    cena('outro', `${espaco('sono')}/novo`)
    await aguardarH1('Novo tópico')
    digitar('Título', 'Um título bom')
    digitar('Texto do tópico', 'x'.repeat(5001))
    expect(screen.getByText('5001 de 5000')).toBeTruthy()
    expect(botao('Ver prévia').disabled).toBe(true)
    digitar('Texto do tópico', 'x'.repeat(5000))
    expect(botao('Ver prévia').disabled).toBe(false)
    digitar('Texto do tópico', '   ')
    expect(botao('Ver prévia').disabled).toBe(true)
  })

  it('editar o tópico: valores atuais, a mesma prévia e "Salvar" com TX-26', async () => {
    const { estado } = cena('autor', `${topico(CONTEUDO.topicoDoAutor)}/editar`)
    await aguardarH1('Editar tópico')
    expect((campo('Título') as HTMLInputElement).value).toBe('Tópico do autor')
    digitar('Título', 'Título editado')
    fireEvent.click(botao('Ver prévia'))
    fireEvent.click(botao('Salvar'))
    await screen.findByRole('heading', { level: 1, name: 'Título editado' })
    expect(estado.topicos.find((t) => t.id === CONTEUDO.topicoDoAutor)!.titulo).toBe('Título editado')
    expect((await screen.findAllByRole('status')).some((s) => s.textContent === TX.tx26)).toBe(true)
  })

  it('o autor sem aceite vigente dos termos abre a rota de edição: sem formulário, só a entrada da C5', async () => {
    // Controle: com o aceite vigente, o formulário de edição aparece habilitado.
    const comAceite = cena('autor', `${topico(CONTEUDO.topicoDoAutor)}/editar`)
    await aguardarH1('Editar tópico')
    expect((document.getElementById('campo-titulo') as HTMLInputElement).disabled).toBe(false)
    expect(screen.queryByText(LISTA.paraPublicarFrase)).toBeNull()
    comAceite.unmount()

    // Sem nenhum aceite da conta do autor (o tópico continua sendo dele e visível).
    const semAceite = cena('autor', `${topico(CONTEUDO.topicoDoAutor)}/editar`, (estado) => {
      estado.aceites = estado.aceites.filter((a) => a.contaId !== ELENCO.autor.conta)
    })
    await aguardarH1('Editar tópico')
    expect(await screen.findByText(LISTA.paraPublicarFrase)).toBeTruthy()
    expect(screen.getByRole('link', { name: LISTA.entrar })).toBeTruthy()
    expect(document.getElementById('campo-titulo')).toBeNull()
    expect(screen.queryByLabelText('Título')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ver prévia' })).toBeNull()
    semAceite.unmount()

    // Aceite só de uma versão antiga: o mesmo resultado.
    cena('autor', `${topico(CONTEUDO.topicoDoAutor)}/editar`, (estado) => {
      for (const aceite of estado.aceites) if (aceite.contaId === ELENCO.autor.conta) aceite.versao = '2026-01-01'
    })
    await aguardarH1('Editar tópico')
    expect(await screen.findByText(LISTA.paraPublicarFrase)).toBeTruthy()
    expect(document.getElementById('campo-titulo')).toBeNull()
  })

  it('"Editar" só aparece para o autor e só com o tópico visível; a rota de edição dos outros é "não encontrado"', async () => {
    const { unmount } = cena('autor', topico(CONTEUDO.topicoDoAutor))
    await aguardarH1('Tópico do autor')
    await screen.findByRole('link', { name: 'Editar' })
    unmount()
    for (const [pessoa, id] of [
      ['outro', CONTEUDO.topicoDoAutor],
      ['autor', CONTEUDO.topicoOculto],
    ] as const) {
      const cenaDeOutro = cena(pessoa, `${topico(id)}/editar`)
      await semCarregando()
      expect(await screen.findByText(TX.tx11)).toBeTruthy()
      cenaDeOutro.unmount()
    }
    cena('autor', topico(CONTEUDO.topicoOculto))
    await aguardarH1('Tópico oculto')
    expect(screen.queryByRole('link', { name: 'Editar' })).toBeNull()
  })

  it('o banco não achou a linha para editar: a frase `nao_editavel` e o texto continua no formulário', async () => {
    const { comunidade } = cena('autor', `${topico(CONTEUDO.topicoDoAutor)}/editar`)
    await aguardarH1('Editar tópico')
    simularFalha(comunidade, 'editarTopico', 'nao_editavel')
    fireEvent.click(botao('Ver prévia'))
    fireEvent.click(botao('Salvar'))
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO_COMUNIDADE.nao_editavel)
    await waitFor(() => expect(document.activeElement).toBe(alerta))
    fireEvent.click(botao('Voltar e editar'))
    expect((campo('Título') as HTMLInputElement).value).toBe('Tópico do autor')
  })
})

describe('envio com resultado incerto (MAT-40:RF-19, teste 6)', () => {
  async function preencherEPublicar() {
    await aguardarH1('Novo tópico')
    digitar('Título', 'Tópico incerto')
    digitar('Texto do tópico', 'Texto incerto')
    fireEvent.click(botao('Ver prévia'))
    fireEvent.click(botao('Publicar'))
  }

  it('criar tópico, achou: a resposta se perdeu depois de gravar, e a tela segue como publicada (sem duplicar)', async () => {
    const { comunidade, estado } = cena('outro', `${espaco('sono')}/novo`)
    simularRespostaPerdida(comunidade, 'criarTopico')
    await preencherEPublicar()
    await screen.findByRole('heading', { level: 1, name: 'Tópico incerto' })
    expect(estado.topicos.filter((t) => t.titulo === 'Tópico incerto')).toHaveLength(1)
    expect((await screen.findAllByRole('status')).some((s) => s.textContent === TX.tx06)).toBe(true)
  })

  it('criar tópico, não achou: TX-23 e "Tentar de novo", que reenvia; o texto continua', async () => {
    const { comunidade, estado } = cena('outro', `${espaco('sono')}/novo`)
    simularFalha(comunidade, 'criarTopico', 'rede')
    await preencherEPublicar()
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TX.tx23)
    expect(estado.topicos.filter((t) => t.titulo === 'Tópico incerto')).toHaveLength(0)
    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
    await screen.findByRole('heading', { level: 1, name: 'Tópico incerto' })
    expect(estado.topicos.filter((t) => t.titulo === 'Tópico incerto')).toHaveLength(1)
  })

  it('criar tópico, a conferência também dá rede: TX-24 e "Conferir", que repete só a conferência', async () => {
    const { comunidade, estado } = cena('outro', `${espaco('sono')}/novo`)
    simularRespostaPerdida(comunidade, 'criarTopico')
    const original = comunidade.conferirTopicos.bind(comunidade)
    let chamadas = 0
    comunidade.conferirTopicos = async (...argumentos) => {
      chamadas += 1
      if (chamadas === 2) return { ok: false, erro: { classe: 'rede', chave: 'rede', codigo: 'rede', mensagemOriginal: '' } }
      return original(...argumentos)
    }
    const criar = vi.spyOn(comunidade, 'criarTopico')
    await preencherEPublicar()
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TX.tx24)
    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.conferir }))
    await screen.findByRole('heading', { level: 1, name: 'Tópico incerto' })
    expect(criar).toHaveBeenCalledTimes(1)
    expect(estado.topicos.filter((t) => t.titulo === 'Tópico incerto')).toHaveLength(1)
  })

  it('dois ids novos na conferência: vale o mais recente', async () => {
    const { comunidade, estado, roteador } = cena('outro', `${espaco('sono')}/novo`)
    const original = comunidade.criarTopico.bind(comunidade)
    comunidade.criarTopico = async (...argumentos) => {
      await original(...argumentos)
      await original(...argumentos)
      return { ok: false, erro: { classe: 'rede', chave: 'rede', codigo: 'rede', mensagemOriginal: '' } }
    }
    await preencherEPublicar()
    await screen.findByRole('heading', { level: 1, name: 'Tópico incerto' })
    const iguais = estado.topicos.filter((t) => t.titulo === 'Tópico incerto')
    expect(iguais).toHaveLength(2)
    const maisNovo = iguais.reduce((a, b) => (Date.parse(a.criadoEm) >= Date.parse(b.criadoEm) ? a : b))
    expect(roteador.state.location.pathname).toBe(topico(maisNovo.id))
  })

  it('editar tópico com rede não confere: a frase `rede` e "Tentar de novo", que reenvia', async () => {
    const { comunidade, estado } = cena('autor', `${topico(CONTEUDO.topicoDoAutor)}/editar`)
    await aguardarH1('Editar tópico')
    simularFalha(comunidade, 'editarTopico', 'rede')
    digitar('Título', 'Editado depois da rede')
    fireEvent.click(botao('Ver prévia'))
    fireEvent.click(botao('Salvar'))
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO_COMUNIDADE.rede)
    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
    await screen.findByRole('heading', { level: 1, name: 'Editado depois da rede' })
    expect(estado.topicos.find((t) => t.id === CONTEUDO.topicoDoAutor)!.titulo).toBe('Editado depois da rede')
  })

  it('aceitar termos com resposta perdida segue para o passo do perfil', async () => {
    const { comunidade } = cena('nova', '/app/comunidade/entrar')
    simularRespostaPerdida(comunidade, 'aceitarTermos')
    fireEvent.click(await screen.findByRole('checkbox', { name: TX.tx03 }))
    fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.aceitar))
    expect(await screen.findByRole('heading', { name: ENTRAR_NA_COMUNIDADE.perfilTitulo })).toBeTruthy()
  })

  it('criar perfil com resposta perdida segue como criado; sem ela, TX-23', async () => {
    const { comunidade, roteador } = cena('semPerfil', '/app/comunidade/entrar')
    await screen.findByRole('heading', { name: ENTRAR_NA_COMUNIDADE.perfilTitulo })
    simularRespostaPerdida(comunidade, 'criarPerfil')
    digitar(ENTRAR_NA_COMUNIDADE.apelido, 'apelido_perdido')
    fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.criarPerfil))
    await aguardarH1(LISTA.manchete.join(' '))
    expect(roteador.state.location.pathname).toBe('/app/comunidade')
  })

  it('criar perfil sem a resposta e sem gravar: TX-23 e "Tentar de novo"', async () => {
    const { comunidade } = cena('semPerfil', '/app/comunidade/entrar')
    await screen.findByRole('heading', { name: ENTRAR_NA_COMUNIDADE.perfilTitulo })
    simularFalha(comunidade, 'criarPerfil', 'rede')
    digitar(ENTRAR_NA_COMUNIDADE.apelido, 'apelido_incerto')
    fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.criarPerfil))
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TX.tx23)
    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
    await aguardarH1(LISTA.manchete.join(' '))
  })
})
