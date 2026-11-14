import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { DialogoBloquear } from '../../componentes/comunidade/DialogoBloquear.tsx'
import { ProvedorDadosConta, ProvedorSessao } from '../../componentes/conta/sessao.tsx'
import { DIALOGO_BLOQUEIO, FORMULARIO_TOPICO, TOPICO } from '../../conteudo/comunidade.ts'
import { ProvedorDadosComunidade } from '../../dados/comunidade.ts'
import { CONTEUDO, ELENCO, criarElenco, type PessoaDoElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { pressionar } from '../conta/tabular.ts'
import { fixtureDeContasDoElenco, renderizarComunidade } from './apoio.tsx'

// A11Y-F4 (resíduo da A11Y-015): depois de enviar, voltar ou fechar, o foco nunca cai no <body>.

process.env.DEBUG_PRINT_LIMIT = '300'

function cena(pessoa: PessoaDoElenco, caminho: string) {
  const comunidade = criarDadosComunidadeMemoria(criarElenco(), ELENCO[pessoa].conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO[pessoa].email)
  return renderizarComunidade(caminho, { contas, comunidade })
}

const semCarregando = () => waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
const campoPorId = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement
const digitar = (id: string, texto: string) => fireEvent.change(campoPorId(id), { target: { value: texto } })
const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome }) as HTMLButtonElement

async function abrirNovoTopico() {
  cena('outro', '/app/comunidade/sono/novo')
  await screen.findByRole('heading', { level: 1, name: 'Novo tópico' })
  await semCarregando()
  digitar('campo-titulo', 'Um título bom')
  digitar('campo-corpo', 'Corpo do tópico')
}

async function abrirTopico(pessoa: PessoaDoElenco = 'outro') {
  cena(pessoa, `/app/comunidade/topico/${CONTEUDO.topicoDoAutor}`)
  await screen.findByRole('heading', { level: 1 })
  await semCarregando()
}

describe('FormularioDeTopico: o foco ao trocar de passo', () => {
  it('Enter em "Ver prévia": o foco vai ao título da prévia', async () => {
    await abrirNovoTopico()
    pressionar(botao(FORMULARIO_TOPICO.verPrevia), 'Enter')

    const titulo = await screen.findByRole('heading', { level: 2, name: FORMULARIO_TOPICO.previa })
    expect(titulo.getAttribute('tabindex')).toBe('-1')
    await waitFor(() => expect(document.activeElement).toBe(titulo))
    expect(document.activeElement).not.toBe(document.body)
  })

  it('"Voltar e editar": o foco vai ao primeiro campo do formulário', async () => {
    await abrirNovoTopico()
    pressionar(botao(FORMULARIO_TOPICO.verPrevia), 'Enter')
    await screen.findByRole('heading', { level: 2, name: FORMULARIO_TOPICO.previa })

    pressionar(botao(FORMULARIO_TOPICO.voltarEEditar), 'Enter')

    await waitFor(() => expect(document.activeElement).toBe(campoPorId('campo-titulo')))
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe('FormularioDeResposta: o foco ao trocar de passo', () => {
  it('Enter em "Ver prévia": o foco vai ao título da prévia', async () => {
    await abrirTopico()
    digitar('campo-resposta', 'Minha resposta')
    pressionar(botao(TOPICO.verPrevia), 'Enter')

    const titulo = await screen.findByRole('heading', { level: 3, name: TOPICO.previa })
    expect(titulo.getAttribute('tabindex')).toBe('-1')
    await waitFor(() => expect(document.activeElement).toBe(titulo))
    expect(document.activeElement).not.toBe(document.body)
  })

  it('"Voltar e editar": o foco vai ao campo da resposta', async () => {
    await abrirTopico()
    digitar('campo-resposta', 'Minha resposta')
    pressionar(botao(TOPICO.verPrevia), 'Enter')
    await screen.findByRole('heading', { level: 3, name: TOPICO.previa })

    pressionar(botao(TOPICO.voltarEEditar), 'Enter')

    await waitFor(() => expect(document.activeElement).toBe(campoPorId('campo-resposta')))
    expect(document.activeElement).not.toBe(document.body)
  })
})

// Uma tela mínima como a do tópico (Topico.tsx + Protecao.tsx): o botão de origem, a confirmação em
// `role="status"` e a caixa. Quando o bloqueio vale, a tela tira o item (e o botão), escreve a confirmação e pede o
// foco para ela, tudo ainda com a caixa aberta; só depois a caixa fecha.
function TelaDoBloqueio({
  comunidade,
  apelido,
  perfilId,
}: {
  comunidade: ReturnType<typeof criarDadosComunidadeMemoria>
  apelido: string
  perfilId: string
}) {
  const origem = useRef<HTMLButtonElement>(null)
  const status = useRef<HTMLDivElement>(null)
  const [aberta, setAberta] = useState(false)
  const [comItem, setComItem] = useState(true)
  const [mensagem, setMensagem] = useState<string | null>(null)
  return (
    <ProvedorDadosComunidade dados={comunidade}>
      <main>
        <h1 tabIndex={-1}>Tópico</h1>
        <div ref={status} role="status" tabIndex={-1}>
          {mensagem}
        </div>
        {comItem ? (
          <button ref={origem} type="button" onClick={() => setAberta(true)}>
            {TOPICO.bloquear(apelido)}
          </button>
        ) : null}
        {aberta ? (
          <DialogoBloquear
            autor={{ id: perfilId, apelido }}
            moderacao={false}
            origem={origem}
            aoFechar={() => setAberta(false)}
            aoBloqueado={async () => {
              flushSync(() => {
                setComItem(false)
                setMensagem(DIALOGO_BLOQUEIO.bloqueado(apelido))
              })
              status.current?.focus()
              setAberta(false)
            }}
          />
        ) : null}
      </main>
    </ProvedorDadosComunidade>
  )
}

describe('DialogoBloquear: o foco depois de confirmar', () => {
  afterEach(() => vi.restoreAllMocks())

  it('o botão de origem some com o item bloqueado e o foco pedido com a caixa aberta se perde: o foco vai à confirmação (role="status") quando a caixa fecha', async () => {
    // O que o navegador faz e o jsdom não faz:
    // 1. com a caixa modal aberta, o resto da página fica inerte e `focus()` fora dela não faz nada;
    // 2. ao fechar, a caixa que tinha o foco o larga, e o foco cai no <body>.
    const focarOriginal = HTMLElement.prototype.focus
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, ...argumentos) {
      const modal = document.querySelector('dialog[open]')
      if (modal && !modal.contains(this)) return
      focarOriginal.apply(this, argumentos)
    })
    const fecharOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      writable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open')
        if (this.contains(document.activeElement)) (document.activeElement as HTMLElement).blur()
      },
    })

    try {
      const apelido = ELENCO.autor.apelido!
      const comunidade = criarDadosComunidadeMemoria(criarElenco(), ELENCO.outro.conta)
      const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
      contas.sessaoParaTeste(ELENCO.outro.email)
      const roteador = createMemoryRouter([
        {
          element: <ProvedorSessao />,
          children: [{ path: '/', element: <TelaDoBloqueio comunidade={comunidade} apelido={apelido} perfilId={ELENCO.autor.perfil!} /> }],
        },
      ])
      render(
        <ProvedorDadosConta dados={contas}>
          <RouterProvider router={roteador} />
        </ProvedorDadosConta>,
      )
      await screen.findByRole('button', { name: TOPICO.bloquear(apelido) })
      const origem = botao(TOPICO.bloquear(apelido))
      fireEvent.click(origem)
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: DIALOGO_BLOQUEIO.confirmar }))

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      await waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('status'))
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement?.textContent).toBe(DIALOGO_BLOQUEIO.bloqueado(apelido))
      expect(origem.isConnected).toBe(false)
    } finally {
      if (fecharOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'close', fecharOriginal)
      else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
    }
  })
})
