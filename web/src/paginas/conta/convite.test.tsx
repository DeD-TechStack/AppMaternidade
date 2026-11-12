import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { CHAVE_CONVITE, CHAVE_FAMILIA_ATUAL } from '../../componentes/conta/armazenamento.ts'
import { formatarData } from '../../componentes/conta/datas.ts'
import { CONVITE, NOMES_DO_H1, PAPEIS, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import {
  CODIGO_CONVITE_PENDENTE,
  CODIGO_CONVITE_VENCIDO,
  FAMILIAS_DEMONSTRACAO,
} from '../../dados/conta.demonstracao.ts'
import { criarDadosContaMemoria, simularFalha, simularRespostaPerdida } from '../../dados/conta.memoria.ts'
import { PESSOAS, criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// RF-13: /convite. O código chega pelo fragmento ou pelo campo, vive no `sessionStorage`, e a prévia
// e o aceite só falam com o banco com sessão e conta completa. Tudo em modo memória, sem rede.

const CODIGO = CODIGO_CONVITE_PENDENTE
const CAMPO = 'Código ou link do convite'

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

const novaMemoria = () => criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
const campo = () => screen.getByLabelText(CAMPO, { selector: 'input' }) as HTMLInputElement
const botao = (nome: string) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const principal = () => within(document.querySelector('main')!)
const caminhoDe = (roteador: { state: { location: { pathname: string } } }) => roteador.state.location.pathname
const esperarAPrevia = () => screen.findByRole('heading', { level: 2, name: 'Família Exemplo' })
const continuar = (valor: string) => {
  fireEvent.change(campo(), { target: { value: valor } })
  fireEvent.click(botao('Continuar'))
}

/** O `Dados` com um convite novo de uma pessoa para a família, devolvendo o código. */
async function convidar(
  dados: ReturnType<typeof novaMemoria>,
  quem: keyof typeof PESSOAS,
  familiaId: string,
  papel: 'responsavel' | 'cuidador' | 'observador',
  validoAte: string | null = null,
) {
  dados.sessaoParaTeste(PESSOAS[quem].email)
  const criado = await dados.criarConvite(familiaId, papel, validoAte)
  if (!criado.ok) throw new Error('o convite não foi criado')
  return criado.valor.codigo
}

describe('sem sessão', () => {
  it('sem código: o h1, o título da aba, só o campo e "Continuar", e nenhuma chamada ao banco', async () => {
    const dados = novaMemoria()
    const ver = vi.spyOn(dados, 'verConvite')
    const familias = vi.spyOn(dados, 'minhasFamilias')
    renderizarComDados('/convite', { dados, sessao: null })

    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(NOMES_DO_H1.convite)
    expect(NOMES_DO_H1.convite).toBe('Convite para uma família')
    expect(document.title).toBe('Convite | AppMaternidade')
    await waitFor(() => expect(campo()).toBeTruthy())
    expect(botao('Continuar')).toBeTruthy()
    expect(principal().queryByRole('button', { name: 'Descartar convite' })).toBeNull()
    expect(ver).not.toHaveBeenCalled()
    expect(familias).not.toHaveBeenCalled()
  })

  it('o código pelo fragmento é guardado só no sessionStorage, o fragmento sai da barra e o banco não é chamado', async () => {
    const dados = novaMemoria()
    const ver = vi.spyOn(dados, 'verConvite')
    const { roteador } = renderizarComDados(`/convite#${CODIGO.toUpperCase()}`, { dados, sessao: null })

    await screen.findByText(CONVITE.guardado)
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBe(CODIGO)
    expect(localStorage.length).toBe(0)
    await waitFor(() => expect(roteador.state.location.hash).toBe(''))
    expect(roteador.state.location.pathname).toBe('/convite')
    expect(roteador.state.historyAction).toBe('REPLACE')
    expect(document.body.innerHTML).not.toContain(CODIGO)
    expect(ver).not.toHaveBeenCalled()
  })

  it('com o código guardado: "Entrar" e "Criar conta" levam junto o volta=/convite, e "Descartar convite" apaga e vai ao início', async () => {
    sessionStorage.setItem(CHAVE_CONVITE, CODIGO)
    const { roteador } = renderizarComDados('/convite', { sessao: null })

    await screen.findByText(CONVITE.guardado)
    expect(principal().getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe('/entrar?volta=%2Fconvite')
    expect(principal().getByRole('link', { name: 'Criar conta' }).getAttribute('href')).toBe('/criar-conta?volta=%2Fconvite')
    expect(principal().queryByLabelText(CAMPO)).toBeNull()

    fireEvent.click(botao('Descartar convite'))
    await waitFor(() => expect(caminhoDe(roteador)).toBe('/'))
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBeNull()
  })

  it('o campo aceita o código, o link inteiro, maiúsculas e espaços: guarda o código normalizado', async () => {
    for (const valor of [CODIGO, `  ${CODIGO.toUpperCase()}  `, `http://localhost/convite#${CODIGO}`, `Entre: https://exemplo.invalid/AppMaternidade/convite#${CODIGO.toUpperCase()}`]) {
      const { unmount } = renderizarComDados('/convite', { sessao: null })
      await screen.findByLabelText(CAMPO)
      continuar(valor)

      await screen.findByText(CONVITE.guardado)
      expect(sessionStorage.getItem(CHAVE_CONVITE), valor).toBe(CODIGO)
      unmount()
      sessionStorage.clear()
    }
  })

  it('formato inválido no campo: convite_invalido no campo, sem chamar o banco e sem guardar', async () => {
    const dados = novaMemoria()
    const ver = vi.spyOn(dados, 'verConvite')
    renderizarComDados('/convite', { dados, sessao: null })
    await screen.findByLabelText(CAMPO)

    for (const valor of ['abc', '', '   ', 'g'.repeat(64), CODIGO.slice(1)]) {
      continuar(valor)
      expect(screen.getByText(TEXTOS_ERRO.convite_invalido), valor).toBeTruthy()
      expect(campo().getAttribute('aria-invalid')).toBe('true')
      expect(document.activeElement).toBe(campo())
      expect(sessionStorage.getItem(CHAVE_CONVITE)).toBeNull()
    }
    expect(ver).not.toHaveBeenCalled()
  })

  it('um fragmento de formato inválido apaga o código guardado e mostra convite_invalido, sem chamar o banco', async () => {
    sessionStorage.setItem(CHAVE_CONVITE, CODIGO)
    const dados = novaMemoria()
    const ver = vi.spyOn(dados, 'verConvite')
    const { roteador } = renderizarComDados('/convite#abc', { dados, sessao: 'davi' })

    expect((await screen.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.convite_invalido)
    expect(campo()).toBeTruthy()
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBeNull()
    await waitFor(() => expect(roteador.state.location.hash).toBe(''))
    expect(ver).not.toHaveBeenCalled()
  })

  it('um código válido embutido num fragmento inválido não vale: convite_invalido, sem chamar o banco, e apaga o guardado', async () => {
    for (const fragmento of [`x${CODIGO}z`, `${CODIGO}z`, `x${CODIGO}`, `abc ${CODIGO}`]) {
      for (const guardado of [null, 'b'.repeat(64)]) {
        sessionStorage.clear()
        if (guardado) sessionStorage.setItem(CHAVE_CONVITE, guardado)
        const dados = novaMemoria()
        const ver = vi.spyOn(dados, 'verConvite')
        const { unmount } = renderizarComDados(`/convite#${encodeURIComponent(fragmento)}`, { dados, sessao: 'davi' })

        expect((await screen.findByRole('alert')).textContent, fragmento).toBe(TEXTOS_ERRO.convite_invalido)
        expect(campo()).toBeTruthy()
        expect(screen.queryByRole('button', { name: 'Aceitar convite' })).toBeNull()
        expect(sessionStorage.getItem(CHAVE_CONVITE)).toBeNull()
        expect(ver).not.toHaveBeenCalled()
        unmount()
      }
    }
  })

  it('um fragmento válido em maiúsculas e com espaços nas pontas continua aceito', async () => {
    renderizarComDados(`/convite#${encodeURIComponent(`  ${CODIGO.toUpperCase()}  `)}`, { sessao: null })

    await screen.findByText(CONVITE.guardado)
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBe(CODIGO)
  })

  it('um fragmento inválido que chega com a página já aberta também não vale, sem chamar o banco', async () => {
    const dados = novaMemoria()
    const ver = vi.spyOn(dados, 'verConvite')
    const { roteador } = renderizarComDados('/convite', { dados, sessao: 'davi' })
    await screen.findByLabelText(CAMPO)
    sessionStorage.setItem(CHAVE_CONVITE, 'b'.repeat(64))

    await act(async () => {
      await roteador.navigate(`/convite#x${CODIGO}z`)
    })

    expect((await screen.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.convite_invalido)
    await waitFor(() => expect(roteador.state.location.hash).toBe(''))
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Aceitar convite' })).toBeNull()
    expect(ver).not.toHaveBeenCalled()
  })

  it('um fragmento válido vale sobre o código guardado; um fragmento vazio (só "#") conta como sem fragmento', async () => {
    sessionStorage.setItem(CHAVE_CONVITE, 'b'.repeat(64))
    const primeiro = renderizarComDados(`/convite#${CODIGO}`, { sessao: null })
    await screen.findByText(CONVITE.guardado)
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBe(CODIGO)
    primeiro.unmount()

    sessionStorage.setItem(CHAVE_CONVITE, 'c'.repeat(64))
    renderizarComDados('/convite#', { sessao: null })
    await screen.findByText(CONVITE.guardado)
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBe('c'.repeat(64))
  })
})

describe('com sessão e conta completa', () => {
  it('sem código guardado: só o campo e "Continuar"; a página não chama a prévia, e "Continuar" a mostra', async () => {
    const dados = novaMemoria()
    const ver = vi.spyOn(dados, 'verConvite')
    renderizarComDados('/convite', { dados, sessao: 'davi' })

    await screen.findByLabelText(CAMPO)
    expect(ver).not.toHaveBeenCalled()
    expect(principal().queryByRole('button', { name: 'Aceitar convite' })).toBeNull()

    continuar(CODIGO)
    await esperarAPrevia()
    expect(ver).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBe(CODIGO)
  })

  it('carregando: o main fica ocupado, com o texto, até a prévia chegar', async () => {
    const dados = novaMemoria()
    let liberar!: () => void
    const original = dados.verConvite.bind(dados)
    vi.spyOn(dados, 'verConvite').mockImplementation(
      (codigo) => new Promise((resolver) => (liberar = () => resolver(original(codigo)))),
    )
    const { container } = renderizarComDados(`/convite#${CODIGO}`, { dados, sessao: 'davi' })

    await waitFor(() => expect(typeof liberar).toBe('function'))
    expect(screen.getByText('Carregando…')).toBeTruthy()
    expect(container.querySelector('main')!.getAttribute('aria-busy')).toBe('true')
    expect(container.querySelector('form')).toBeNull()

    await act(async () => liberar())
    await esperarAPrevia()
    expect(container.querySelector('main')!.hasAttribute('aria-busy')).toBe(false)
  })

  it('a prévia traz a família, os bebês, o papel, o que ele permite e quando o convite vence; e as lê no fuso da conta', async () => {
    const dados = novaMemoria()
    dados.sessaoParaTeste(PESSOAS.davi.email)
    await dados.atualizarMinhaConta('Davi', 'Asia/Tokyo')
    renderizarComDados(`/convite#${CODIGO}`, { dados, sessao: 'davi' })

    await esperarAPrevia()
    expect(principal().getByText('Heloísa')).toBeTruthy()
    expect(principal().getByText('observador')).toBeTruthy()
    expect(principal().getByText(PAPEIS.observador.permite)).toBeTruthy()
    expect(principal().queryByText(/^Acesso até/)).toBeNull()
    const vence = principal().getByText(/^O convite vence em/).textContent!
    const previa = await dados.verConvite(CODIGO)
    const hora = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(previa.ok ? previa.valor.expiraEm : 0))
    expect(vence).toBe(`O convite vence em ${formatarData(previa.ok ? previa.valor.expiraEm : '', 'Asia/Tokyo')} às ${hora}`)
    expect(principal().getByRole('button', { name: 'Aceitar convite' })).toBeTruthy()
    expect(principal().getByRole('button', { name: 'Agora não' })).toBeTruthy()
  })

  it('a prévia por papel: responsável, cuidador e observador, cada um com a frase do que permite', async () => {
    for (const papel of ['responsavel', 'cuidador', 'observador'] as const) {
      const dados = novaMemoria()
      const codigo = await convidar(dados, 'carla', FAMILIAS_DEMONSTRACAO.teste, papel)
      const { unmount } = renderizarComDados(`/convite#${codigo}`, { dados, sessao: 'davi' })

      await screen.findByRole('heading', { level: 2, name: 'Família Teste' })
      expect(principal().getByText(PAPEIS[papel].minusculo), papel).toBeTruthy()
      expect(principal().getByText(PAPEIS[papel].permite), papel).toBeTruthy()
      // A Família Teste não tem bebê.
      expect(principal().getByText(CONVITE.semBebes)).toBeTruthy()
      unmount()
    }
  })

  it('"Acesso até" aparece só com validade, no fuso da conta', async () => {
    const dados = novaMemoria()
    const validade = new Date(Date.now() + 12 * 86_400_000).toISOString()
    const codigo = await convidar(dados, 'juliana', FAMILIAS_DEMONSTRACAO.exemplo, 'cuidador', validade)
    renderizarComDados(`/convite#${codigo}`, { dados, sessao: 'davi' })

    await esperarAPrevia()
    expect(principal().getByText(`Acesso até ${formatarData(validade, 'America/Sao_Paulo')}`)).toBeTruthy()
  })

  it('"Aceitar convite" leva à Família com a família do convite e a mensagem de passagem; o código sai do sessionStorage', async () => {
    const dados = novaMemoria()
    const { roteador } = renderizarComDados(`/convite#${CODIGO}`, { dados, sessao: 'davi' })
    await esperarAPrevia()

    fireEvent.click(botao('Aceitar convite'))

    await screen.findByRole('heading', { level: 1, name: 'Família' })
    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/familia'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Você entrou na família Família Exemplo.'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Família Exemplo' })).toBeTruthy()
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBeNull()
    expect(localStorage.getItem(CHAVE_FAMILIA_ATUAL)).toBe(FAMILIAS_DEMONSTRACAO.exemplo)
    const familias = await dados.minhasFamilias()
    expect(familias.ok && familias.valor.map((f) => [f.nome, f.meuPapel])).toEqual([['Família Exemplo', 'observador']])
    // Observador: nenhum controle de escrita.
    expect(screen.queryByRole('button', { name: /Adicionar bebê|Mudar papel|Remover acesso|Criar convite/ })).toBeNull()
  })

  it('enviando: o botão fica desativado com o rótulo trocado e um segundo clique não chama o banco de novo', async () => {
    const dados = novaMemoria()
    let liberar!: () => void
    const original = dados.aceitarConvite.bind(dados)
    const aceitar = vi.spyOn(dados, 'aceitarConvite').mockImplementation(
      (codigo) => new Promise((resolver) => (liberar = () => resolver(original(codigo)))),
    )
    renderizarComDados(`/convite#${CODIGO}`, { dados, sessao: 'davi' })
    await esperarAPrevia()

    fireEvent.click(botao('Aceitar convite'))
    await waitFor(() => expect(botao('Entrando…').disabled).toBe(true))
    fireEvent.click(botao('Entrando…'))
    expect(aceitar).toHaveBeenCalledTimes(1)
    await act(async () => liberar())
    await screen.findByRole('heading', { level: 1, name: 'Família' })
  })

  it('"Agora não" apaga o código e vai à Família (com família) ou ao Começar (sem)', async () => {
    const comFamilia = renderizarComDados(`/convite#${CODIGO}`, { sessao: 'carla' })
    await esperarAPrevia()
    fireEvent.click(botao('Agora não'))
    await waitFor(() => expect(caminhoDe(comFamilia.roteador)).toBe('/app/familia'))
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBeNull()
    comFamilia.unmount()

    const semFamilia = renderizarComDados(`/convite#${CODIGO}`, { sessao: 'davi' })
    await esperarAPrevia()
    fireEvent.click(botao('Agora não'))
    await waitFor(() => expect(caminhoDe(semFamilia.roteador)).toBe('/app/comecar'))
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBeNull()
  })

  it('conta incompleta com sessão: vai ao passo "Seu nome" com volta=/convite e, depois de salvar, volta ao convite', async () => {
    const dados = novaMemoria()
    await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'x')
    const { roteador } = renderizarComDados(`/convite#${CODIGO}`, { dados })

    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    expect(caminhoDe(roteador)).toBe('/app/comecar')
    expect(roteador.state.location.search).toBe('?volta=%2Fconvite')
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBe(CODIGO)

    fireEvent.click(botao('Salvar'))
    await esperarAPrevia()
    expect(caminhoDe(roteador)).toBe('/convite')
  })
})

describe('os erros do convite (fail-closed)', () => {
  const alertaDe = async (texto: string) => {
    expect((await screen.findByRole('alert')).textContent).toBe(texto)
    // No lugar da prévia, o campo para tentar outro; e o código morto sai do sessionStorage.
    expect(campo()).toBeTruthy()
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Aceitar convite' })).toBeNull()
  }

  it('vencido', async () => {
    renderizarComDados(`/convite#${CODIGO_CONVITE_VENCIDO}`, { sessao: 'davi' })
    await alertaDe(TEXTOS_ERRO.convite_vencido)
  })

  it('usado', async () => {
    const dados = novaMemoria()
    dados.sessaoParaTeste(PESSOAS.carla.email)
    await dados.aceitarConvite(CODIGO)
    renderizarComDados(`/convite#${CODIGO}`, { dados, sessao: 'davi' })
    await alertaDe(TEXTOS_ERRO.convite_usado)
  })

  it('revogado (cancelado por quem convidou)', async () => {
    const dados = novaMemoria()
    dados.sessaoParaTeste(PESSOAS.juliana.email)
    const detalhe = await dados.detalheFamilia(FAMILIAS_DEMONSTRACAO.exemplo)
    const convite = detalhe.ok ? detalhe.valor.convites?.find((c) => !c.vencido) : undefined
    await dados.revogarConvite(convite!.id)
    renderizarComDados(`/convite#${CODIGO}`, { dados, sessao: 'davi' })
    await alertaDe(TEXTOS_ERRO.convite_revogado)
  })

  it('inexistente (64 caracteres que nenhum convite tem)', async () => {
    renderizarComDados(`/convite#${'f'.repeat(64)}`, { sessao: 'davi' })
    await alertaDe(TEXTOS_ERRO.convite_invalido)
  })

  it('o erro ao aceitar (o convite foi usado entre a prévia e o aceite) mostra a frase, apaga o código e pede outro', async () => {
    const dados = novaMemoria()
    renderizarComDados(`/convite#${CODIGO}`, { dados, sessao: 'davi' })
    await esperarAPrevia()

    simularFalha(dados, 'aceitarConvite', 'convite_usado')
    fireEvent.click(botao('Aceitar convite'))

    await alertaDe(TEXTOS_ERRO.convite_usado)
    // Tentar outro código: o campo volta a funcionar.
    continuar(CODIGO_CONVITE_VENCIDO)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(TEXTOS_ERRO.convite_vencido))
  })

  it('ja_e_membro: a frase com o nome da família e o link "Ir para a família", sem trocar a família atual', async () => {
    renderizarComDados(`/convite#${CODIGO}`, { sessao: 'bruno' })
    await esperarAPrevia()
    fireEvent.click(botao('Aceitar convite'))

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('Você já faz parte da família Família Exemplo.')
    const link = within(alerta).getByRole('link', { name: 'Ir para a família' })
    expect(link.getAttribute('href')).toBe('/app/familia')
    expect(localStorage.getItem(CHAVE_FAMILIA_ATUAL)).toBeNull()
  })

  it('rede na prévia: a frase e "Tentar de novo", que lê de novo', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'verConvite', 'rede')
    renderizarComDados(`/convite#${CODIGO}`, { dados, sessao: 'davi' })

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.rede)
    // Uma falha de rede não apaga o código: ele ainda vale.
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBe(CODIGO)
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await esperarAPrevia()
  })

  it('resposta perdida no aceite: "Tentar de novo" confere a lista e leva à família, uma vez só', async () => {
    const dados = novaMemoria()
    simularRespostaPerdida(dados, 'aceitarConvite')
    const aceitar = vi.spyOn(dados, 'aceitarConvite')
    const { roteador } = renderizarComDados(`/convite#${CODIGO}`, { dados, sessao: 'davi' })
    await esperarAPrevia()
    fireEvent.click(botao('Aceitar convite'))

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.rede)
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))

    await screen.findByRole('heading', { level: 1, name: 'Família' })
    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/familia'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Você entrou na família Família Exemplo.'))
    expect(aceitar).toHaveBeenCalledTimes(2)
    const familias = await dados.minhasFamilias()
    expect(familias.ok && familias.valor).toHaveLength(1)
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBeNull()
  })

  it('resposta perdida sem efeito no banco: a conferência não acha família nova e o aceite NÃO vale como sucesso', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'aceitarConvite', 'rede')
    simularFalha(dados, 'aceitarConvite', 'rede')
    const { roteador } = renderizarComDados(`/convite#${CODIGO}`, { dados, sessao: 'davi' })
    await esperarAPrevia()
    fireEvent.click(botao('Aceitar convite'))

    const alerta = await screen.findByRole('alert')
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(TEXTOS_ERRO.rede))
    expect(caminhoDe(roteador)).toBe('/convite')
    const familias = await dados.minhasFamilias()
    expect(familias.ok && familias.valor).toHaveLength(0)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
