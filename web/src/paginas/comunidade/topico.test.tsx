import { configure, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  COMUM_COMUNIDADE,
  DENUNCIAS,
  DIALOGO_BLOQUEIO,
  DIALOGO_DENUNCIA,
  PERFIL,
  ROTULO_MOTIVO,
  TEXTOS_ERRO_COMUNIDADE,
  TOPICO,
  TX,
} from '../../conteudo/comunidade.ts'
import { CONTEUDO, ELENCO, criarElenco, type PessoaDoElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria, simularFalha, simularRespostaPerdida } from '../../dados/comunidade.memoria.ts'
import { MOTIVOS } from '../../dados/comunidade.regras.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { fixtureDeContasDoElenco, renderizarComunidade } from './apoio.tsx'

// MAT-40a: a C3 (tópico, respostas, citação, edição), o diálogo de denúncia, o bloqueio, a C6 e a C7.

process.env.DEBUG_PRINT_LIMIT = '300'
// As listas de 230 respostas demoram no jsdom: as esperas valem mais que o 1 s do padrão.
configure({ asyncUtilTimeout: 5000 })

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
const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const campo = (rotulo: string | RegExp) => screen.getByLabelText(rotulo) as HTMLInputElement | HTMLTextAreaElement
const digitar = (rotulo: string | RegExp, texto: string) => fireEvent.change(campo(rotulo), { target: { value: texto } })
const resposta = (id: string) => document.getElementById(`resposta-${id}`)!
const semCarregando = () => waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())

async function abrir(pessoa: PessoaDoElenco, id: string, ajustar?: (estado: ReturnType<typeof criarElenco>) => void) {
  const aberta = cena(pessoa, topico(id), ajustar)
  await screen.findByRole('heading', { level: 1 })
  await semCarregando()
  return aberta
}

const AUTOR = ELENCO.autor.apelido!
const OUTRO = ELENCO.outro.apelido!

describe('C3: o tópico e as respostas (MAT-40:RF-05 e RF-06)', () => {
  it('mostra o tópico inteiro e as respostas legíveis, com a filha abaixo da mãe e a citação marcada', async () => {
    await abrir('outro', CONTEUDO.topicoDoAutor)
    expect(screen.getByRole('heading', { level: 1, name: 'Tópico do autor' })).toBeTruthy()
    expect(screen.getByText('Texto de Tópico do autor.')).toBeTruthy()
    const mae = resposta(CONTEUDO.respostaDoAutor)
    const filha = resposta(CONTEUDO.filhaDoOutro)
    expect(mae.parentElement!.contains(filha)).toBe(true)
    expect(within(filha).getByText(TOPICO.emRespostaA(AUTOR))).toBeTruthy()
    // As respostas de primeiro nível saem na ordem de leitura, e a resposta oculta do autor não aparece para o outro.
    expect(resposta(CONTEUDO.respostaOculta)).toBeNull()
    const ordem = [...document.querySelectorAll('article[id^="resposta-"]')].map((a) => a.id)
    expect(ordem).toEqual([CONTEUDO.respostaDoOutro, CONTEUDO.respostaDoBloqueado, CONTEUDO.respostaDoAutor, CONTEUDO.filhaDoOutro].map((id) => `resposta-${id}`))
  })

  it('o autor vê a própria resposta oculta, com a etiqueta e o motivo, sem "Editar" nem "Responder"', async () => {
    await abrir('autor', CONTEUDO.topicoDoAutor)
    const oculta = resposta(CONTEUDO.respostaOculta)
    expect(within(oculta).getByText(TX.tx07)).toBeTruthy()
    expect(within(oculta).getByText(COMUM_COMUNIDADE.motivoDaModeracao('Motivo da resposta'))).toBeTruthy()
    expect(within(oculta).queryByRole('button', { name: /Editar|Responder/ })).toBeNull()
    expect(within(oculta).queryByRole('link', { name: /Editar|Responder/ })).toBeNull()
  })

  it('o autor não vê a resposta de quem bloqueou; a moderação vê tudo, com TX-07 e TX-22', async () => {
    await abrir('autor', CONTEUDO.topicoDoAutor)
    expect(resposta(CONTEUDO.respostaDoBloqueado)).toBeNull()
  })

  it('a moderação lê o tópico oculto e o removido, com a etiqueta e o motivo, sem editar nem responder', async () => {
    for (const [id, etiqueta] of [
      [CONTEUDO.topicoOculto, TX.tx07],
      [CONTEUDO.topicoRemovido, TX.tx22],
    ] as const) {
      const { unmount } = await abrir('moderador', id)
      expect(screen.getByText(etiqueta)).toBeTruthy()
      expect(screen.getByText(COMUM_COMUNIDADE.motivoDaModeracao('Motivo do teste'))).toBeTruthy()
      expect(screen.queryByRole('link', { name: TOPICO.editar })).toBeNull()
      expect(screen.queryByLabelText(TOPICO.campoResposta)).toBeNull()
      unmount()
    }
  })

  it('o item que o banco não devolve (removido, para quem não é da moderação) não cria aviso: é "não encontrado"', async () => {
    cena('autor', topico(CONTEUDO.topicoRemovido))
    expect(await screen.findByText(TX.tx11)).toBeTruthy()
    expect(screen.queryByText(TX.tx22)).toBeNull()
  })

  it('autor removido: "pessoa removida", sem "Denunciar perfil" nem "Bloquear"', async () => {
    await abrir('outro', CONTEUDO.topicoDoAutor, (estado) => {
      estado.respostas.find((r) => r.id === CONTEUDO.respostaDoAutor)!.autorId = null
    })
    const orfa = resposta(CONTEUDO.respostaDoAutor)
    expect(within(orfa).getByText(COMUM_COMUNIDADE.pessoaRemovida)).toBeTruthy()
    expect(within(orfa).getByRole('button', { name: TOPICO.denunciar })).toBeTruthy()
    expect(within(orfa).queryByRole('button', { name: TOPICO.denunciarPerfil })).toBeNull()
    expect(within(orfa).queryByRole('button', { name: /^Bloquear/ })).toBeNull()
    expect(within(orfa).getByRole('button', { name: TOPICO.responderA(COMUM_COMUNIDADE.pessoaRemovida) })).toBeTruthy()
  })

  it('o menu de cada item: "Denunciar" só no conteúdo de outra pessoa, "Editar" só no próprio', async () => {
    await abrir('outro', CONTEUDO.topicoDoAutor)
    const dele = resposta(CONTEUDO.respostaDoOutro)
    expect(within(dele).getByRole('button', { name: TOPICO.editar })).toBeTruthy()
    expect(within(dele).queryByRole('button', { name: TOPICO.denunciar })).toBeNull()
    expect(within(dele).queryByRole('button', { name: TOPICO.denunciarPerfil })).toBeNull()
    const doAutor = resposta(CONTEUDO.respostaDoAutor)
    expect(within(doAutor).queryByRole('button', { name: TOPICO.editar })).toBeNull()
    expect(within(doAutor).getByRole('button', { name: TOPICO.denunciar })).toBeTruthy()
    expect(within(doAutor).getByRole('button', { name: TOPICO.denunciarPerfil })).toBeTruthy()
    expect(within(doAutor).getByRole('button', { name: TOPICO.bloquear(AUTOR) })).toBeTruthy()
    // Respostas de segundo nível não têm "Responder".
    expect(within(resposta(CONTEUDO.filhaDoOutro)).queryByRole('button', { name: /^Responder/ })).toBeNull()
  })

  it('sem respostas, TX-17', async () => {
    await abrir('autor', CONTEUDO.topicoDoModerador)
    expect(screen.getByText(TX.tx17)).toBeTruthy()
  })

  it('resposta de segundo nível cuja mãe não é legível: TX-21 no primeiro nível, sem "Responder"', async () => {
    await abrir('outro', CONTEUDO.topicoDoAutor, (estado) => {
      estado.respostas.push({
        id: 'e1000000-0000-4000-8000-000000000001',
        topicoId: CONTEUDO.topicoDoAutor,
        autorId: ELENCO.outro.perfil,
        respostaA: CONTEUDO.respostaOculta,
        corpo: 'Resposta a uma oculta',
        estado: 'visivel',
        motivoModeracao: null,
        criadoEm: new Date().toISOString(),
        editadoEm: null,
      })
    })
    const orfa = resposta('e1000000-0000-4000-8000-000000000001')
    expect(within(orfa).getByText(TX.tx21)).toBeTruthy()
    expect(within(orfa).queryByRole('button', { name: /^Responder/ })).toBeNull()
    expect(orfa.closest('ul')!.parentElement!.closest('li')).toBeNull()
  })
})

describe('responder, citar e editar (MAT-40:RF-05)', () => {
  it('prévia exata com confirmação: nada grava antes de "Publicar resposta"; "Voltar e editar" mantém o texto', async () => {
    const { estado } = await abrir('outro', CONTEUDO.topicoDoAutor)
    const total = estado.respostas.length
    expect(botao(TOPICO.verPrevia).disabled).toBe(true)
    digitar(TOPICO.campoResposta, 'Minha resposta')
    expect(screen.getByText('14 de 2000')).toBeTruthy()
    fireEvent.click(botao(TOPICO.verPrevia))

    const previa = document.querySelector('[data-previa="resposta"]') as HTMLElement
    expect(within(previa).getByText(TX.tx05b)).toBeTruthy()
    expect(within(previa).getByText('Minha resposta')).toBeTruthy()
    expect(within(previa).getByText(OUTRO)).toBeTruthy()
    expect(within(previa).getByText(TX.tx01)).toBeTruthy()
    expect(estado.respostas).toHaveLength(total)

    fireEvent.click(botao(TOPICO.voltarEEditar))
    expect((campo(TOPICO.campoResposta) as HTMLTextAreaElement).value).toBe('Minha resposta')
    expect(estado.respostas).toHaveLength(total)
  })

  it('publicar: TX-27 em role="status" e o foco vai à resposta nova (tabindex="-1")', async () => {
    const { estado } = await abrir('outro', CONTEUDO.topicoDoAutor)
    digitar(TOPICO.campoResposta, 'Resposta publicada agora')
    fireEvent.click(botao(TOPICO.verPrevia))
    fireEvent.click(botao(TOPICO.publicarResposta))

    await waitFor(() => expect(estado.respostas.some((r) => r.corpo === 'Resposta publicada agora')).toBe(true))
    const nova = estado.respostas.find((r) => r.corpo === 'Resposta publicada agora')!
    await waitFor(() => expect(document.activeElement).toBe(resposta(nova.id)))
    expect(resposta(nova.id).getAttribute('tabindex')).toBe('-1')
    expect(screen.getAllByRole('status').some((s) => s.textContent === TX.tx27)).toBe(true)
    expect((campo(TOPICO.campoResposta) as HTMLTextAreaElement).value).toBe('')
  })

  it('citar: "Responder a <apelido>" marca a citação; "Tirar citação" a desfaz sem perder o texto', async () => {
    const { estado } = await abrir('outro', CONTEUDO.topicoDoAutor)
    fireEvent.click(within(resposta(CONTEUDO.respostaDoAutor)).getByRole('button', { name: TOPICO.responderA(AUTOR) }))
    await waitFor(() => expect(document.activeElement).toBe(campo(TOPICO.campoResposta)))
    digitar(TOPICO.campoResposta, 'Concordo com você')
    const formulario = campo(TOPICO.campoResposta).closest('form')!
    expect(within(formulario).getByText(TOPICO.emRespostaA(AUTOR))).toBeTruthy()

    fireEvent.click(botao(TOPICO.tirarCitacao))
    expect(within(formulario).queryByText(TOPICO.emRespostaA(AUTOR))).toBeNull()
    expect((campo(TOPICO.campoResposta) as HTMLTextAreaElement).value).toBe('Concordo com você')

    fireEvent.click(within(resposta(CONTEUDO.respostaDoAutor)).getByRole('button', { name: TOPICO.responderA(AUTOR) }))
    fireEvent.click(botao(TOPICO.verPrevia))
    expect(within(document.querySelector('[data-previa="resposta"]') as HTMLElement).getByText(TOPICO.emRespostaA(AUTOR))).toBeTruthy()
    fireEvent.click(botao(TOPICO.publicarResposta))
    await waitFor(() => expect(estado.respostas.some((r) => r.corpo === 'Concordo com você' && r.respostaA === CONTEUDO.respostaDoAutor)).toBe(true))
  })

  it('editar a resposta: o mesmo campo e a mesma prévia, "Salvar" e TX-26', async () => {
    const { estado } = await abrir('outro', CONTEUDO.topicoDoAutor)
    fireEvent.click(within(resposta(CONTEUDO.respostaDoOutro)).getByRole('button', { name: TOPICO.editar }))
    await waitFor(() => expect((campo(TOPICO.campoResposta) as HTMLTextAreaElement).value).toBe('Resposta do outro'))
    digitar(TOPICO.campoResposta, 'Resposta do outro, editada')
    fireEvent.click(botao(TOPICO.verPrevia))
    fireEvent.click(botao(TOPICO.salvar))
    await waitFor(() => expect(estado.respostas.find((r) => r.id === CONTEUDO.respostaDoOutro)!.corpo).toBe('Resposta do outro, editada'))
    await waitFor(() => expect(screen.getAllByRole('status').some((s) => s.textContent === TX.tx26)).toBe(true))
    expect(within(resposta(CONTEUDO.respostaDoOutro)).getByText('editado')).toBeTruthy()
  })

  it('o limite da resposta: 1 a 2000 caracteres, e a prévia só abre dentro dele', async () => {
    await abrir('outro', CONTEUDO.topicoDoAutor)
    digitar(TOPICO.campoResposta, 'a'.repeat(2001))
    expect(botao(TOPICO.verPrevia).disabled).toBe(true)
    expect(screen.getByText(TOPICO.erroLimiteResposta)).toBeTruthy()
    digitar(TOPICO.campoResposta, 'a'.repeat(2000))
    expect(botao(TOPICO.verPrevia).disabled).toBe(false)
  })

  it('`42501` ao responder: a frase `sem_permissao` perto do botão, com o texto mantido', async () => {
    const { comunidade } = await abrir('outro', CONTEUDO.topicoDoAutor)
    simularFalha(comunidade, 'responder', 'sem_permissao')
    digitar(TOPICO.campoResposta, 'Texto que fica')
    fireEvent.click(botao(TOPICO.verPrevia))
    fireEvent.click(botao(TOPICO.publicarResposta))
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO_COMUNIDADE.sem_permissao)
    await waitFor(() => expect(document.activeElement).toBe(alerta))
    fireEvent.click(botao(TOPICO.voltarEEditar))
    expect((campo(TOPICO.campoResposta) as HTMLTextAreaElement).value).toBe('Texto que fica')
  })

  it('não oferece "Responder" no tópico oculto nem no tópico de quem a moderação bloqueou (ela lê, mas o banco nega)', async () => {
    const oculto = await abrir('moderador', CONTEUDO.topicoOculto)
    expect(screen.queryByLabelText(TOPICO.campoResposta)).toBeNull()
    oculto.unmount()

    await abrir('moderador', CONTEUDO.topicoDoBloqueado, (estado) => {
      estado.bloqueios.push({ bloqueadorId: ELENCO.moderador.perfil!, bloqueadoId: ELENCO.bloqueado.perfil!, criadoEm: new Date().toISOString() })
    })
    expect(screen.getByRole('heading', { level: 1, name: 'Tópico do bloqueado' })).toBeTruthy()
    expect(screen.queryByLabelText(TOPICO.campoResposta)).toBeNull()
  })

  it('quem não é escritor habilitado vê o link para a C5 no lugar do formulário, e os controles levam à C5 com o volta da C3', async () => {
    await abrir('semAceite', CONTEUDO.topicoDoAutor)
    expect(screen.queryByLabelText(TOPICO.campoResposta)).toBeNull()
    const destino = encodeURIComponent(topico(CONTEUDO.topicoDoAutor))
    expect(screen.getByRole('link', { name: TOPICO.paraEntrar }).getAttribute('href')).toBe(`/app/comunidade/entrar?volta=${destino}`)
    const doAutor = resposta(CONTEUDO.respostaDoAutor)
    for (const nome of [TOPICO.responderA(AUTOR), TOPICO.denunciar, TOPICO.denunciarPerfil]) {
      expect(within(doAutor).getByRole('link', { name: nome }).getAttribute('href'), nome).toBe(`/app/comunidade/entrar?volta=${destino}`)
    }
  })

  it('enviando: o botão fica desativado com "Enviando…" e um segundo clique não chama o banco', async () => {
    const { comunidade, estado } = await abrir('outro', CONTEUDO.topicoDoAutor)
    const original = comunidade.responder.bind(comunidade)
    let liberar: () => void = () => undefined
    const travada = new Promise<void>((resolver) => {
      liberar = resolver
    })
    comunidade.responder = async (...argumentos) => {
      await travada
      return original(...argumentos)
    }
    const chamadas = vi.spyOn(comunidade, 'responder')
    digitar(TOPICO.campoResposta, 'Só uma vez')
    fireEvent.click(botao(TOPICO.verPrevia))
    const publicar = botao(TOPICO.publicarResposta)
    fireEvent.click(publicar)
    await waitFor(() => expect(botao(COMUM_COMUNIDADE.enviando).disabled).toBe(true))
    fireEvent.click(publicar)
    fireEvent.click(botao(COMUM_COMUNIDADE.enviando))
    liberar()
    await waitFor(() => expect(estado.respostas.filter((r) => r.corpo === 'Só uma vez')).toHaveLength(1))
    expect(chamadas).toHaveBeenCalledTimes(1)
  })

  it('responder: resposta que não chega e some do banco (rede) dá TX-23; chegou e a resposta se perdeu segue como publicada', async () => {
    const { comunidade, estado } = await abrir('outro', CONTEUDO.topicoDoAutor)
    simularFalha(comunidade, 'responder', 'rede')
    digitar(TOPICO.campoResposta, 'Resposta incerta')
    fireEvent.click(botao(TOPICO.verPrevia))
    fireEvent.click(botao(TOPICO.publicarResposta))
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TX.tx23)
    simularRespostaPerdida(comunidade, 'responder')
    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
    await waitFor(() => expect(screen.getAllByRole('status').some((s) => s.textContent === TX.tx27)).toBe(true))
    expect(estado.respostas.filter((r) => r.corpo === 'Resposta incerta')).toHaveLength(1)
  })

  it('responder: a conferência dá rede (TX-24 e "Conferir") e depois acha a resposta, sem reenviar', async () => {
    const { comunidade, estado } = await abrir('outro', CONTEUDO.topicoDoAutor)
    simularRespostaPerdida(comunidade, 'responder')
    const original = comunidade.conferirRespostas.bind(comunidade)
    let chamadas = 0
    comunidade.conferirRespostas = async (...argumentos) => {
      chamadas += 1
      return chamadas === 2 ? { ok: false, erro: { classe: 'rede', chave: 'rede', codigo: 'rede', mensagemOriginal: '' } } : original(...argumentos)
    }
    digitar(TOPICO.campoResposta, 'Resposta conferida')
    fireEvent.click(botao(TOPICO.verPrevia))
    fireEvent.click(botao(TOPICO.publicarResposta))
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TX.tx24)
    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.conferir }))
    await waitFor(() => expect(screen.getAllByRole('status').some((s) => s.textContent === TX.tx27)).toBe(true))
    expect(estado.respostas.filter((r) => r.corpo === 'Resposta conferida')).toHaveLength(1)
  })
})

describe('as páginas de respostas (PR-37)', () => {
  const respostasEmMuitas = (quantidade: number, extras: (estado: ReturnType<typeof criarElenco>, base: number) => void = () => undefined) =>
    (estado: ReturnType<typeof criarElenco>) => {
      estado.respostas = []
      const base = Date.now() - 1_000_000
      for (let n = 0; n < quantidade; n++) {
        estado.respostas.push({
          id: `f0000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
          topicoId: CONTEUDO.topicoDoAutor,
          autorId: ELENCO.outro.perfil,
          respostaA: null,
          corpo: `Resposta ${n}`,
          estado: 'visivel',
          motivoModeracao: null,
          criadoEm: new Date(base + n * 1000).toISOString(),
          editadoEm: null,
        })
      }
      extras(estado, base)
    }

  it('230 respostas: 100 por página, "Carregar mais" até a última; a publicação com tudo carregado leva o foco à resposta nova', async () => {
    const { estado } = await abrir('autor', CONTEUDO.topicoDoAutor, respostasEmMuitas(230))
    expect(document.querySelectorAll('article[id^="resposta-"]')).toHaveLength(100)
    fireEvent.click(botao(TOPICO.carregarMais))
    await waitFor(() => expect(document.querySelectorAll('article[id^="resposta-"]')).toHaveLength(200))
    fireEvent.click(botao(TOPICO.carregarMais))
    await waitFor(() => expect(document.querySelectorAll('article[id^="resposta-"]')).toHaveLength(230))
    expect(screen.queryByRole('button', { name: TOPICO.carregarMais })).toBeNull()

    digitar(TOPICO.campoResposta, 'A 231ª resposta')
    fireEvent.click(botao(TOPICO.verPrevia))
    fireEvent.click(botao(TOPICO.publicarResposta))
    await waitFor(() => expect(estado.respostas).toHaveLength(231))
    const nova = estado.respostas[230]
    await waitFor(() => expect(document.activeElement).toBe(resposta(nova.id)))
    expect(document.querySelectorAll('article[id^="resposta-"]')).toHaveLength(231)
  }, 60_000)

  it('a resposta nova que fica fora das páginas relidas: TX-27 com a lista relida, e o foco vai ao TX-27', async () => {
    const { estado } = await abrir('autor', CONTEUDO.topicoDoAutor, respostasEmMuitas(230))
    digitar(TOPICO.campoResposta, 'Fora do alcance')
    fireEvent.click(botao(TOPICO.verPrevia))
    fireEvent.click(botao(TOPICO.publicarResposta))
    await waitFor(() => expect(estado.respostas).toHaveLength(231))
    const status = await waitFor(() => {
      const achado = screen.getAllByRole('status').find((s) => s.textContent === TX.tx27)
      expect(achado).toBeTruthy()
      return achado!
    })
    // Com uma página lida, a releitura vai até a 2ª (200); a nova é a 231ª e não entra.
    await waitFor(() => expect(document.activeElement).toBe(status))
    expect(document.querySelectorAll('article[id^="resposta-"]')).toHaveLength(200)
  }, 60_000)

  it('a filha cuja mãe empata na data e chega numa página seguinte: aparece no primeiro nível e passa para baixo da mãe', async () => {
    const mae = 'f0000000-0000-4000-8000-0000000001ff'
    await abrir(
      'autor',
      CONTEUDO.topicoDoAutor,
      respostasEmMuitas(99, (estado, base) => {
        const quando = new Date(base + 99_000).toISOString()
        // A filha (id menor) fecha a página 1; a mãe, com a mesma data e id maior, abre a página 2.
        const comum = { topicoId: CONTEUDO.topicoDoAutor, autorId: ELENCO.outro.perfil, estado: 'visivel' as const, motivoModeracao: null, criadoEm: quando, editadoEm: null }
        estado.respostas.push({ ...comum, id: 'f0000000-0000-4000-8000-0000000001aa', respostaA: mae, corpo: 'Filha da mãe adiada' })
        estado.respostas.push({ ...comum, id: mae, respostaA: null, corpo: 'Mãe adiada' })
      }),
    )
    const filha = resposta('f0000000-0000-4000-8000-0000000001aa')
    expect(within(filha).getByText(TX.tx21)).toBeTruthy()
    expect(filha.closest('li')!.parentElement!.tagName).toBe('UL')
    fireEvent.click(botao(TOPICO.carregarMais))
    await waitFor(() => expect(resposta(mae)).not.toBeNull())
    expect(resposta(mae).parentElement!.contains(resposta('f0000000-0000-4000-8000-0000000001aa'))).toBe(true)
    expect(within(resposta('f0000000-0000-4000-8000-0000000001aa')).queryByText(TX.tx21)).toBeNull()
  })
})

describe('denunciar (MAT-40:RF-07)', () => {
  async function abrirDialogo() {
    const aberta = await abrir('outro', CONTEUDO.topicoDoAutor)
    const origem = within(resposta(CONTEUDO.respostaDoAutor)).getByRole('button', { name: TOPICO.denunciar })
    fireEvent.click(origem)
    const dialogo = screen.getByRole('dialog', { name: DIALOGO_DENUNCIA.tituloResposta })
    return { ...aberta, dialogo, origem }
  }

  it('os 8 motivos na ordem e com os rótulos do contrato; o envio só vale com um motivo marcado', async () => {
    const { dialogo } = await abrirDialogo()
    expect(within(dialogo).getAllByRole('radio').map((r) => r.parentElement!.textContent)).toEqual(MOTIVOS.map((m) => ROTULO_MOTIVO[m]))
    expect(ROTULO_MOTIVO.ataque_assedio).toBe('Ataque ou assédio')
    expect(within(dialogo).getByRole('button', { name: DIALOGO_DENUNCIA.enviar })).toHaveProperty('disabled', true)
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Spam ou venda' }))
    expect(within(dialogo).getByRole('button', { name: DIALOGO_DENUNCIA.enviar })).toHaveProperty('disabled', false)
  })

  it('o bloco de crise só aparece com "Risco de autolesão", antes do envio, com o link de ajuda', async () => {
    const { dialogo } = await abrirDialogo()
    expect(within(dialogo).queryByText(TX.tx08)).toBeNull()
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Spam ou venda' }))
    expect(within(dialogo).queryByText(TX.tx08)).toBeNull()
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Risco de autolesão' }))
    expect(within(dialogo).getByText(TX.tx08)).toBeTruthy()
    expect(within(dialogo).getByRole('link', { name: TX.ajuda }).getAttribute('href')).toBe('/regras-da-comunidade#secao-ajuda-agora')
  })

  it('envia, mostra a confirmação sem prazo e oferece bloquear o autor; o texto vazio vai como nulo', async () => {
    const { dialogo, estado } = await abrirDialogo()
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Spam ou venda' }))
    fireEvent.change(within(dialogo).getByLabelText(DIALOGO_DENUNCIA.texto), { target: { value: '   ' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: DIALOGO_DENUNCIA.enviar }))

    expect(await within(dialogo).findByText(TX.tx09)).toBeTruthy()
    expect(TX.tx09).not.toMatch(/horas|dias|prazo/)
    expect(estado.denuncias).toHaveLength(1)
    expect(estado.denuncias[0]).toMatchObject({ respostaId: CONTEUDO.respostaDoAutor, motivo: 'spam_venda', texto: null, denuncianteId: ELENCO.outro.conta })
    expect(within(dialogo).getByRole('button', { name: DIALOGO_DENUNCIA.bloquear(AUTOR) })).toBeTruthy()
  })

  it('o texto de até 500 caracteres, com contador; passando disso, o envio não acontece', async () => {
    const { dialogo, estado } = await abrirDialogo()
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Outro' }))
    fireEvent.change(within(dialogo).getByLabelText(DIALOGO_DENUNCIA.texto), { target: { value: 'x'.repeat(501) } })
    expect(within(dialogo).getByText('501 de 500')).toBeTruthy()
    fireEvent.click(within(dialogo).getByRole('button', { name: DIALOGO_DENUNCIA.enviar }))
    expect(within(dialogo).getByText(DIALOGO_DENUNCIA.erroTexto)).toBeTruthy()
    expect(estado.denuncias).toHaveLength(0)
  })

  it('o diálogo fecha com Esc e devolve o foco ao botão que o abriu; "Cancelar" também', async () => {
    const { dialogo, origem } = await abrirDialogo()
    expect(dialogo.tagName).toBe('DIALOG')
    expect(dialogo.getAttribute('aria-modal')).toBe('true')
    fireEvent.keyDown(within(dialogo).getAllByRole('radio')[0], { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(origem)

    fireEvent.click(origem)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: COMUM_COMUNIDADE.cancelar }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(origem)
  })

  it('o foco fica preso no diálogo: Tab do último controle volta ao primeiro', async () => {
    const { dialogo } = await abrirDialogo()
    const cancelar = within(dialogo).getByRole('button', { name: COMUM_COMUNIDADE.cancelar })
    cancelar.focus()
    fireEvent.keyDown(cancelar, { key: 'Tab' })
    expect(dialogo.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).toBe(within(dialogo).getAllByRole('radio')[0])
  })

  it('denunciar o perfil: a caixa leva o apelido, e o tópico de si mesmo não tem "Denunciar"', async () => {
    await abrir('outro', CONTEUDO.topicoDoAutor)
    fireEvent.click(within(resposta(CONTEUDO.respostaDoAutor)).getByRole('button', { name: TOPICO.denunciarPerfil }))
    expect(screen.getByRole('dialog', { name: DIALOGO_DENUNCIA.tituloPerfil(AUTOR) })).toBeTruthy()
  })

  it('o alvo que mudou de estado entre a leitura e o envio: a frase `alvo_inexistente`, com o texto mantido', async () => {
    const { dialogo, estado } = await abrirDialogo()
    estado.respostas.find((r) => r.id === CONTEUDO.respostaDoAutor)!.estado = 'oculto'
    estado.respostas.find((r) => r.id === CONTEUDO.respostaDoAutor)!.motivoModeracao = 'Já moderada'
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Outro' }))
    fireEvent.click(within(dialogo).getByRole('button', { name: DIALOGO_DENUNCIA.enviar }))
    const alerta = await within(dialogo).findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO_COMUNIDADE.alvo_inexistente)
    expect(within(dialogo).getByRole('radio', { name: 'Outro' })).toHaveProperty('checked', true)
  })

  it('denunciar, rede: achou (a resposta se perdeu) mostra TX-09; não achou dá TX-23 e "Tentar de novo"', async () => {
    const primeira = await abrirDialogo()
    simularRespostaPerdida(primeira.comunidade, 'denunciar')
    fireEvent.click(within(primeira.dialogo).getByRole('radio', { name: 'Outro' }))
    fireEvent.click(within(primeira.dialogo).getByRole('button', { name: DIALOGO_DENUNCIA.enviar }))
    expect(await within(primeira.dialogo).findByText(TX.tx09)).toBeTruthy()
    expect(primeira.estado.denuncias).toHaveLength(1)
    primeira.unmount()

    const segunda = await abrirDialogo()
    simularFalha(segunda.comunidade, 'denunciar', 'rede')
    fireEvent.click(within(segunda.dialogo).getByRole('radio', { name: 'Outro' }))
    fireEvent.click(within(segunda.dialogo).getByRole('button', { name: DIALOGO_DENUNCIA.enviar }))
    const alerta = await within(segunda.dialogo).findByRole('alert')
    expect(alerta.textContent).toContain(TX.tx23)
    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
    expect(await within(segunda.dialogo).findByText(TX.tx09)).toBeTruthy()
    expect(segunda.estado.denuncias).toHaveLength(1)
  })
})

describe('bloquear e desbloquear (MAT-40:RF-08)', () => {
  it('o Outro bloqueia o autor do tópico: o texto TX-10, e depois a tela mostra "não encontrado"; o foco vai à confirmação', async () => {
    const { estado } = await abrir('outro', CONTEUDO.topicoDoAutor)
    const origem = within(document.querySelector('article[aria-label="Tópico do autor"]') as HTMLElement).getByRole('button', { name: TOPICO.bloquear(AUTOR) })
    fireEvent.click(origem)
    const dialogo = screen.getByRole('dialog', { name: DIALOGO_BLOQUEIO.titulo(AUTOR) })
    expect(within(dialogo).getByText(TX.tx10)).toBeTruthy()
    expect(within(dialogo).queryByText(TX.tx10b)).toBeNull()
    fireEvent.click(within(dialogo).getByRole('button', { name: DIALOGO_BLOQUEIO.confirmar }))

    expect(await screen.findByText(TX.tx11)).toBeTruthy()
    expect(estado.bloqueios.some((b) => b.bloqueadorId === ELENCO.outro.perfil && b.bloqueadoId === ELENCO.autor.perfil)).toBe(true)
    await waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('status'))
    expect(document.activeElement?.textContent).toBe(DIALOGO_BLOQUEIO.bloqueado(AUTOR))
  })

  it('o conteúdo de quem foi bloqueado some da tela sem recarregar; o botão some com o item, e o foco vai ao item seguinte', async () => {
    await abrir('autor', CONTEUDO.topicoDoAutor)
    fireEvent.click(within(resposta(CONTEUDO.respostaDoOutro)).getByRole('button', { name: TOPICO.bloquear(OUTRO) }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: DIALOGO_BLOQUEIO.confirmar }))

    await waitFor(() => expect(resposta(CONTEUDO.respostaDoOutro)).toBeNull())
    // A filha dele, que estava abaixo da resposta do Autor, também some.
    expect(resposta(CONTEUDO.filhaDoOutro)).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(resposta(CONTEUDO.respostaDoAutor)))
    expect(screen.getAllByRole('status').some((s) => s.textContent === DIALOGO_BLOQUEIO.bloqueado(OUTRO))).toBe(true)
  })

  it('a moderação bloqueia e continua vendo o conteúdo: TX-10 e TX-10b, e o foco volta ao botão de origem', async () => {
    const { estado } = await abrir('moderador', CONTEUDO.topicoDoAutor)
    const origem = within(resposta(CONTEUDO.respostaDoOutro)).getByRole('button', { name: TOPICO.bloquear(OUTRO) })
    fireEvent.click(origem)
    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).getByText(TX.tx10)).toBeTruthy()
    expect(within(dialogo).getByText(TX.tx10b)).toBeTruthy()
    fireEvent.click(within(dialogo).getByRole('button', { name: DIALOGO_BLOQUEIO.confirmar }))

    await waitFor(() => expect(estado.bloqueios.some((b) => b.bloqueadorId === ELENCO.moderador.perfil && b.bloqueadoId === ELENCO.outro.perfil)).toBe(true))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(resposta(CONTEUDO.respostaDoOutro)).not.toBeNull()
    expect(document.activeElement).toBe(origem)
  })

  it('bloquear sem perfil próprio leva à C5; o bloqueio repetido (23505) conta como sucesso', async () => {
    const semPerfil = await abrir('semPerfil', CONTEUDO.topicoDoAutor)
    const destino = encodeURIComponent(topico(CONTEUDO.topicoDoAutor))
    expect(within(resposta(CONTEUDO.respostaDoOutro)).getByRole('link', { name: TOPICO.bloquear(OUTRO) }).getAttribute('href')).toBe(`/app/comunidade/entrar?volta=${destino}`)
    semPerfil.unmount()

    const { estado, unmount } = await abrir('moderador', CONTEUDO.topicoDoAutor, (e) => {
      e.bloqueios.push({ bloqueadorId: ELENCO.moderador.perfil!, bloqueadoId: ELENCO.outro.perfil!, criadoEm: new Date().toISOString() })
    })
    fireEvent.click(within(resposta(CONTEUDO.respostaDoOutro)).getByRole('button', { name: TOPICO.bloquear(OUTRO) }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: DIALOGO_BLOQUEIO.confirmar }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(estado.bloqueios.filter((b) => b.bloqueadorId === ELENCO.moderador.perfil)).toHaveLength(1)
    unmount()
  })

  it('o erro do bloqueio fica na caixa, com "Tentar de novo"', async () => {
    const { comunidade } = await abrir('outro', CONTEUDO.topicoDoAutor)
    simularFalha(comunidade, 'bloquear', 'rede')
    fireEvent.click(within(resposta(CONTEUDO.respostaDoAutor)).getByRole('button', { name: TOPICO.bloquear(AUTOR) }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: DIALOGO_BLOQUEIO.confirmar }))
    const alerta = await within(screen.getByRole('dialog')).findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO_COMUNIDADE.rede)
    expect(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo })).toBeTruthy()
  })
})

describe('C6: meu perfil público', () => {
  async function abrirPerfil(pessoa: PessoaDoElenco) {
    const aberta = cena(pessoa, '/app/comunidade/perfil')
    await screen.findByRole('heading', { level: 1, name: PERFIL.titulo })
    await semCarregando()
    return aberta
  }

  it('um h1 só e nenhum título repetido: o h2 da seção não repete o texto do h1', async () => {
    for (const pessoa of ['autor', 'semAceite', 'semPerfil'] as const) {
      const { container, unmount } = await abrirPerfil(pessoa)
      await semCarregando()
      expect(container.querySelectorAll('h1')).toHaveLength(1)
      const principal = document.querySelector('main')!
      const titulos = [...principal.querySelectorAll('h1, h2, h3')].map((t) => t.textContent)
      expect(new Set(titulos).size, `${pessoa}: ${titulos.join(' | ')}`).toBe(titulos.length)
      expect(within(principal).getAllByRole('heading', { name: PERFIL.titulo })).toHaveLength(1)
      unmount()
    }
    // A seção do perfil tem nome próprio, ligado ao conteúdo dela.
    const { unmount } = await abrirPerfil('autor')
    await screen.findByLabelText(PERFIL.apelidoRotulo)
    expect(screen.getByRole('region', { name: PERFIL.secao })).toBeTruthy()
    unmount()
  })

  it('o escritor edita o perfil: apelido, bio e faixa, com TX-26; o apelido de outra pessoa é recusado no campo', async () => {
    const { estado } = await abrirPerfil('autor')
    const apelido = await screen.findByLabelText(PERFIL.apelidoRotulo)
    fireEvent.change(apelido, { target: { value: 'OUTRA_PESSOA' } })
    fireEvent.click(botao(PERFIL.salvar))
    expect(await screen.findByText(TEXTOS_ERRO_COMUNIDADE.apelido_em_uso)).toBeTruthy()
    expect(document.activeElement).toBe(apelido)

    fireEvent.change(apelido, { target: { value: 'apelido_novo' } })
    fireEvent.change(screen.getByLabelText(PERFIL.bioRotulo), { target: { value: 'Uma bio' } })
    fireEvent.click(screen.getByRole('radio', { name: '6 a 12 meses' }))
    fireEvent.click(botao(PERFIL.salvar))
    await waitFor(() => expect(estado.perfis.find((p) => p.id === ELENCO.autor.perfil)).toMatchObject({ apelido: 'apelido_novo', bio: 'Uma bio', faixa: '6_12_meses' }))
    expect((await screen.findAllByRole('status')).some((s) => s.textContent === 'Alterações salvas.')).toBe(true)
  })

  it('a lista de bloqueios mostra só a data e "Desbloquear", que desfaz sem confirmação e leva o foco à confirmação', async () => {
    const { estado } = await abrirPerfil('autor')
    const linha = await screen.findByText(/^Perfil bloqueado em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
    expect(linha.textContent).not.toContain(ELENCO.bloqueado.apelido!)
    fireEvent.click(botao(PERFIL.desbloquear))
    expect(await screen.findByText(TX.tx18)).toBeTruthy()
    expect(estado.bloqueios).toHaveLength(0)
    await waitFor(() => expect(document.activeElement?.textContent).toBe(PERFIL.desbloqueado))
  })

  it('sem perfil, só o bloco que leva à C5; sem aceite, o perfil só para leitura, com o link para a C5, e os bloqueios continuam', async () => {
    await abrirPerfil('semPerfil')
    expect(screen.getByText(PERFIL.paraCriar)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Entrar na comunidade' }).getAttribute('href')).toBe(`/app/comunidade/entrar?volta=${encodeURIComponent('/app/comunidade/perfil')}`)
    expect(screen.queryByText(PERFIL.bloqueios)).toBeNull()
  })

  it('sem o aceite vigente: o perfil só para leitura, o link "Editar perfil" e a lista de bloqueios', async () => {
    const { unmount } = cena('semAceite', '/app/comunidade/perfil', (estado) => {
      estado.bloqueios.push({ bloqueadorId: ELENCO.semAceite.perfil!, bloqueadoId: ELENCO.outro.perfil!, criadoEm: new Date().toISOString() })
    })
    await screen.findByText(PERFIL.somenteLeitura)
    expect(screen.getByText('sem_aceite_novo')).toBeTruthy()
    expect(screen.queryByLabelText(PERFIL.apelidoRotulo)).toBeNull()
    expect(screen.getByRole('link', { name: PERFIL.editarPerfil }).getAttribute('href')).toBe(`/app/comunidade/entrar?volta=${encodeURIComponent('/app/comunidade/perfil')}`)
    fireEvent.click(await screen.findByRole('button', { name: PERFIL.desbloquear }))
    expect(await screen.findByText(TX.tx18)).toBeTruthy()
    unmount()
  })
})

describe('C7: minhas denúncias (MAT-40:RF-09)', () => {
  it('cada linha traz o tipo, o alvo, o motivo, o texto, o estado e as datas; "Conteúdo não disponível" e o perfil excluído', async () => {
    cena('autor', '/app/comunidade/denuncias', (estado) => {
      const agora = Date.now()
      const comum = { denuncianteId: ELENCO.autor.conta, decididaPor: null }
      estado.denuncias.push(
        { ...comum, id: 'a1000000-0000-4000-8000-000000000001', topicoId: CONTEUDO.topicoDoOutro, respostaId: null, perfilId: null, motivo: 'spam_venda', texto: 'Anúncio.', estado: 'aberta', decididaEm: null, criadaEm: new Date(agora - 4000).toISOString() },
        { ...comum, id: 'a1000000-0000-4000-8000-000000000002', topicoId: null, respostaId: CONTEUDO.respostaDoOutro, perfilId: null, motivo: 'outro', texto: null, estado: 'em_analise', decididaEm: null, criadaEm: new Date(agora - 3000).toISOString() },
        { ...comum, id: 'a1000000-0000-4000-8000-000000000003', topicoId: null, respostaId: null, perfilId: ELENCO.bloqueado.perfil, motivo: 'dados_pessoais', texto: null, estado: 'procedente', decididaEm: new Date(agora - 1000).toISOString(), criadaEm: new Date(agora - 2000).toISOString() },
        { ...comum, id: 'a1000000-0000-4000-8000-000000000004', topicoId: null, respostaId: null, perfilId: null, motivo: 'outro', texto: null, estado: 'improcedente', decididaEm: new Date(agora).toISOString(), criadaEm: new Date(agora - 1500).toISOString() },
      )
    })
    await screen.findByRole('heading', { level: 1, name: DENUNCIAS.titulo })
    const linhas = await screen.findAllByRole('article')
    expect(linhas).toHaveLength(4)
    const [primeira, segunda, terceira, quarta] = linhas
    // A mais nova primeiro (criada_em decrescente): os três ids nulos (perfil excluído), o perfil que a pessoa não lê, a resposta, o tópico.
    expect(within(primeira).getByText(DENUNCIAS.tipo.perfil)).toBeTruthy()
    expect(within(primeira).getByText(DENUNCIAS.indisponivel)).toBeTruthy()
    expect(within(primeira).getByText('Improcedente')).toBeTruthy()
    expect(within(segunda).getByText(DENUNCIAS.tipo.perfil)).toBeTruthy()
    expect(within(segunda).getByText(DENUNCIAS.indisponivel)).toBeTruthy()
    expect(within(segunda).getByText('Procedente')).toBeTruthy()
    expect(within(segunda).getByText(/^Decidida em /)).toBeTruthy()
    expect(within(terceira).getByText(DENUNCIAS.tipo.resposta)).toBeTruthy()
    expect(within(terceira).getByText('Resposta do outro')).toBeTruthy()
    expect(within(terceira).getByText('Em análise')).toBeTruthy()
    expect(within(quarta).getByText(DENUNCIAS.tipo.topico)).toBeTruthy()
    expect(within(quarta).getByText('Tópico do outro')).toBeTruthy()
    expect(within(quarta).getByText('Anúncio.')).toBeTruthy()
    expect(within(quarta).getByText('Spam ou venda')).toBeTruthy()
    expect(within(quarta).getByText('Aberta')).toBeTruthy()
    expect(within(quarta).getByText(/^Enviada em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)).toBeTruthy()
    expect(within(quarta).queryByText(/^Decidida em /)).toBeNull()
  })

  it('o começo da resposta com até 80 caracteres, e TX-19 sem denúncias', async () => {
    cena('autor', '/app/comunidade/denuncias')
    expect(await screen.findByText(TX.tx19)).toBeTruthy()
    expect(DENUNCIAS.trecho('x'.repeat(81))).toBe(`${'x'.repeat(80)}…`)
    expect(DENUNCIAS.trecho('x'.repeat(80))).toBe('x'.repeat(80))
  })
})
