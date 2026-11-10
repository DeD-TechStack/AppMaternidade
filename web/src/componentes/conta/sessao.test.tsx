import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { Resultado } from '../../dados/comum.ts'
import { criarDadosConta, type DadosConta, type FamiliaResumo } from '../../dados/conta.ts'
import { SENHA_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import { erroDaChave } from '../../dados/conta.erros.ts'
import { criarDadosContaMemoria, simularFalha } from '../../dados/conta.memoria.ts'
import { PESSOAS, criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { CHAVE_FAMILIA_ATUAL } from './armazenamento.ts'
import { ProvedorDadosConta, ProvedorSessao, useDadosConta, useFamiliaAtual, useSessao } from './sessao.tsx'

// Os ganchos que as MAT-38, 39 e 40 importam: `useSessao`, `useFamiliaAtual` e `useDadosConta`.

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

function Sonda() {
  const sessao = useSessao()
  const familia = useFamiliaAtual()
  const dados = useDadosConta()
  return (
    <div>
      <p data-testid="sessao">{`${sessao.estado}|${sessao.usuario?.email ?? '-'}|${sessao.conta?.nome ?? '-'}|${sessao.erro?.chave ?? '-'}`}</p>
      <p data-testid="familia">{`${familia.estado}|${familia.atual?.nome ?? '-'}|${familia.familias.map((f) => f.nome).join(',')}|${familia.erro?.chave ?? '-'}`}</p>
      {familia.familias.map((f) => (
        <button key={f.id} type="button" onClick={() => familia.escolher(f.id)}>
          {`escolher ${f.nome}`}
        </button>
      ))}
      <button type="button" onClick={() => void familia.recarregar()}>
        recarregar famílias
      </button>
      <button type="button" onClick={() => void sessao.recarregarConta()}>
        recarregar conta
      </button>
      <button type="button" onClick={() => void dados.atualizarMinhaConta('Juliana Souza', 'UTC')}>
        renomear
      </button>
    </div>
  )
}

function montar(caminho: string, email: string | null, dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))) {
  dados.sessaoParaTeste(email)
  const roteador = createMemoryRouter(
    [
      {
        element: <ProvedorSessao />,
        children: [
          { path: '/sonda', element: <Sonda /> },
          { path: '/app/familia', element: <Sonda /> },
        ],
      },
    ],
    { initialEntries: [caminho] },
  )
  const { unmount } = render(
    <ProvedorDadosConta dados={dados}>
      <RouterProvider router={roteador} />
    </ProvedorDadosConta>,
  )
  return { dados, roteador, unmount }
}

const sessao = () => screen.getByTestId('sessao').textContent
const familia = () => screen.getByTestId('familia').textContent

describe('useSessao', () => {
  it('começa carregando e depois traz o usuário e a conta', async () => {
    montar('/sonda', 'juliana@exemplo.invalid')
    expect(sessao()!.startsWith('carregando|-|-|-')).toBe(true)
    await waitFor(() => expect(sessao()).toBe('com_sessao|juliana@exemplo.invalid|Juliana|-'))
  })

  it('sem sessão, o estado é sem_sessao', async () => {
    montar('/sonda', null)
    await waitFor(() => expect(sessao()).toBe('sem_sessao|-|-|-'))
  })

  it('conta incompleta: com_sessao e conta null', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'x')
    montar('/sonda', 'nova@exemplo.invalid', dados)
    await waitFor(() => expect(sessao()).toBe('com_sessao|nova@exemplo.invalid|-|-'))
  })

  it('erro ao ler a sessão ou a conta: estado "erro" com o erro; recarregarConta lê de novo', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    simularFalha(dados, 'minhaConta', 'rede')
    montar('/sonda', 'juliana@exemplo.invalid', dados)
    // A sessão foi lida; só a conta falhou: o usuário já se sabe.
    await waitFor(() => expect(sessao()).toBe('erro|juliana@exemplo.invalid|-|rede'))

    fireEvent.click(screen.getByRole('button', { name: 'recarregar conta' }))
    await waitFor(() => expect(sessao()).toBe('com_sessao|juliana@exemplo.invalid|Juliana|-'))
  })

  it('recarregarConta relê a conta depois de ela mudar', async () => {
    const { dados } = montar('/sonda', 'juliana@exemplo.invalid')
    await waitFor(() => expect(sessao()).toContain('|Juliana|'))

    await dados.atualizarMinhaConta('Juliana Souza', 'UTC')
    fireEvent.click(screen.getByRole('button', { name: 'recarregar conta' }))
    await waitFor(() => expect(sessao()).toContain('|Juliana Souza|'))
  })

  it('os eventos da sessão atualizam o estado: entrar e sair', async () => {
    const { dados } = montar('/sonda', null)
    await waitFor(() => expect(sessao()).toBe('sem_sessao|-|-|-'))

    await act(async () => {
      await dados.entrar('bruno@exemplo.invalid', 'senha-local-ficticia')
    })
    await waitFor(() => expect(sessao()).toBe('com_sessao|bruno@exemplo.invalid|Bruno|-'))

    await act(async () => {
      dados.encerrarSessaoPorFora()
    })
    await waitFor(() => expect(sessao()).toBe('sem_sessao|-|-|-'))
  })

  it('fora do ProvedorSessao, o gancho avisa', () => {
    function Solta() {
      useSessao()
      return null
    }
    expect(() => render(<Solta />)).toThrow()
  })
})

describe('useDadosConta', () => {
  it('devolve a memória do provedor (as operações chegam a ela)', async () => {
    const { dados } = montar('/sonda', 'juliana@exemplo.invalid')
    await waitFor(() => expect(sessao()).toContain('|Juliana|'))

    fireEvent.click(screen.getByRole('button', { name: 'renomear' }))
    await waitFor(async () => {
      const conta = await dados.minhaConta()
      expect(conta.ok && conta.valor?.nome).toBe('Juliana Souza')
    })
  })

  it('sem provedor, vale a instância da página (criarDadosConta)', () => {
    function Solta() {
      return <p data-testid="igual">{String(useDadosConta() === criarDadosConta())}</p>
    }
    render(<Solta />)
    expect(screen.getByTestId('igual').textContent).toBe('true')
  })
})

describe('useFamiliaAtual', () => {
  const JULIANA = PESSOAS.juliana.email

  it('só carrega com sessão e conta completa', async () => {
    montar('/sonda', null)
    await waitFor(() => expect(sessao()).toBe('sem_sessao|-|-|-'))
    expect(familia()).toBe('carregando|-||-')
  })

  it('a família mais antiga é a atual por padrão', async () => {
    const { dados } = montar('/sonda', JULIANA)
    await waitFor(() => expect(familia()).toBe('pronto|Família Exemplo|Família Exemplo|-'))

    await dados.criarFamilia('Segunda', 'UTC')
    fireEvent.click(screen.getByRole('button', { name: 'recarregar famílias' }))
    await waitFor(() => expect(familia()).toBe('pronto|Família Exemplo|Família Exemplo,Segunda|-'))
  })

  it('escolher guarda a escolha neste navegador e a muda', async () => {
    const { dados } = montar('/sonda', JULIANA)
    await dados.criarFamilia('Segunda', 'UTC')
    fireEvent.click(await screen.findByRole('button', { name: 'recarregar famílias' }))
    fireEvent.click(await screen.findByRole('button', { name: 'escolher Segunda' }))

    await waitFor(() => expect(familia()).toContain('pronto|Segunda|'))
    const segunda = (await dados.minhasFamilias())
    expect(segunda.ok && localStorage.getItem(CHAVE_FAMILIA_ATUAL)).toBe(segunda.ok ? segunda.valor.find((f) => f.nome === 'Segunda')!.id : '')
  })

  it('a escolha guardada vale se a família ainda é ativa; senão, volta à mais antiga', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    dados.sessaoParaTeste(JULIANA)
    const segunda = await dados.criarFamilia('Segunda', 'UTC')
    expect(segunda.ok).toBe(true)

    localStorage.setItem(CHAVE_FAMILIA_ATUAL, segunda.ok ? segunda.valor : '')
    montar('/sonda', JULIANA, dados)
    await waitFor(() => expect(familia()).toBe('pronto|Segunda|Família Exemplo,Segunda|-'))
  })

  it('uma escolha guardada que não está entre as famílias ativas é ignorada', async () => {
    localStorage.setItem(CHAVE_FAMILIA_ATUAL, '99999999-9999-4999-8999-999999999999')
    montar('/sonda', JULIANA)
    await waitFor(() => expect(familia()).toBe('pronto|Família Exemplo|Família Exemplo|-'))
  })

  it('o parâmetro ?familia= de /app/familia vem antes da escolha guardada', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    dados.sessaoParaTeste(JULIANA)
    const segunda = await dados.criarFamilia('Segunda', 'UTC')
    const idDaSegunda = segunda.ok ? segunda.valor : ''
    montar(`/app/familia?familia=${idDaSegunda}`, JULIANA, dados)
    await waitFor(() => expect(familia()).toBe('pronto|Segunda|Família Exemplo,Segunda|-'))
  })

  it('um parâmetro que não é de uma família ativa é ignorado', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    dados.sessaoParaTeste(JULIANA)
    await dados.criarFamilia('Segunda', 'UTC')
    montar('/app/familia?familia=99999999-9999-4999-8999-999999999999', JULIANA, dados)
    await waitFor(() => expect(familia()).toBe('pronto|Família Exemplo|Família Exemplo,Segunda|-'))
  })

  it('fora de /app/familia o parâmetro não vale', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    dados.sessaoParaTeste(JULIANA)
    const segunda = await dados.criarFamilia('Segunda', 'UTC')
    montar(`/sonda?familia=${segunda.ok ? segunda.valor : ''}`, JULIANA, dados)
    await waitFor(() => expect(familia()).toBe('pronto|Família Exemplo|Família Exemplo,Segunda|-'))
  })

  it('erro ao ler as famílias: estado "erro" com o erro; recarregar lê de novo', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    simularFalha(dados, 'minhasFamilias', 'rede')
    montar('/sonda', JULIANA, dados)
    await waitFor(() => expect(familia()).toBe('erro|-||rede'))

    fireEvent.click(screen.getByRole('button', { name: 'recarregar famílias' }))
    await waitFor(() => expect(familia()).toBe('pronto|Família Exemplo|Família Exemplo|-'))
  })
})

describe('useFamiliaAtual: a carga pertence a uma pessoa e a uma geração', () => {
  const JULIANA = PESSOAS.juliana.email
  const CARLA = PESSOAS.carla.email
  const SEM_FAMILIA = 'carregando|-||-'
  const DE_CARLA = 'pronto|Família Teste|Família Teste|-'
  type RespostaDeFamilias = Resultado<FamiliaResumo[]>

  function pendente() {
    let liberar!: (resposta: RespostaDeFamilias) => void
    const promessa = new Promise<RespostaDeFamilias>((resolver) => {
      liberar = resolver
    })
    return { promessa, liberar }
  }

  const novaMemoria = () => criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))

  /** O que `minhasFamilias` daria a essa pessoa agora, para entregar mais tarde. */
  async function respostaDe(email: string): Promise<RespostaDeFamilias> {
    const outra = novaMemoria()
    outra.sessaoParaTeste(email)
    return outra.minhasFamilias()
  }

  async function entrarComo(dados: DadosConta, email: string) {
    await act(async () => {
      await dados.entrar(email, SENHA_DEMONSTRACAO)
    })
  }

  it('sair limpa as famílias, a atual e o estado (encerrada por fora ou pela operação sair)', async () => {
    for (const sair of [(d: ReturnType<typeof novaMemoria>) => d.encerrarSessaoPorFora(), (d: ReturnType<typeof novaMemoria>) => void d.sair()]) {
      const dados = novaMemoria()
      const { unmount } = montar('/sonda', JULIANA, dados)
      await waitFor(() => expect(familia()).toBe('pronto|Família Exemplo|Família Exemplo|-'))

      await act(async () => {
        sair(dados)
      })

      await waitFor(() => expect(sessao()).toBe('sem_sessao|-|-|-'))
      expect(familia()).toBe(SEM_FAMILIA)
      expect(screen.queryByRole('button', { name: /^escolher / })).toBeNull()
      unmount()
    }
  })

  it('a resposta atrasada de Juliana, depois de Carla entrar e carregar, não troca a família de Carla', async () => {
    const dados = novaMemoria()
    const deJuliana = await respostaDe(JULIANA)
    const antiga = pendente()
    vi.spyOn(dados, 'minhasFamilias').mockReturnValueOnce(antiga.promessa)
    montar('/sonda', JULIANA, dados)
    await waitFor(() => expect(sessao()).toContain('|Juliana|'))

    await entrarComo(dados, CARLA)
    await waitFor(() => expect(familia()).toBe(DE_CARLA))
    await act(async () => {
      antiga.liberar(deJuliana)
    })

    expect(sessao()).toContain('|Carla|')
    expect(familia()).toBe(DE_CARLA)
  })

  it('enquanto a carga de Carla está pendente nada da Juliana aparece, nem a resposta antiga que chega antes da nova', async () => {
    const dados = novaMemoria()
    const deJuliana = await respostaDe(JULIANA)
    const deCarla = await respostaDe(CARLA)
    const antiga = pendente()
    const nova = pendente()
    const leitura = vi.spyOn(dados, 'minhasFamilias').mockReturnValueOnce(antiga.promessa).mockReturnValueOnce(nova.promessa)
    montar('/sonda', JULIANA, dados)
    await waitFor(() => expect(sessao()).toContain('|Juliana|'))

    await entrarComo(dados, CARLA)
    await waitFor(() => expect(leitura).toHaveBeenCalledTimes(2))
    expect(familia()).toBe(SEM_FAMILIA)

    await act(async () => {
      antiga.liberar(deJuliana)
    })
    expect(familia()).toBe(SEM_FAMILIA)

    await act(async () => {
      nova.liberar(deCarla)
    })
    expect(familia()).toBe(DE_CARLA)
  })

  it('a resposta nova que chega antes da antiga é a que fica (a antiga é descartada)', async () => {
    const dados = novaMemoria()
    const deJuliana = await respostaDe(JULIANA)
    const deCarla = await respostaDe(CARLA)
    const antiga = pendente()
    const nova = pendente()
    const leitura = vi.spyOn(dados, 'minhasFamilias').mockReturnValueOnce(antiga.promessa).mockReturnValueOnce(nova.promessa)
    montar('/sonda', JULIANA, dados)
    await waitFor(() => expect(sessao()).toContain('|Juliana|'))
    await entrarComo(dados, CARLA)
    await waitFor(() => expect(leitura).toHaveBeenCalledTimes(2))

    await act(async () => {
      nova.liberar(deCarla)
    })
    expect(familia()).toBe(DE_CARLA)
    await act(async () => {
      antiga.liberar(deJuliana)
    })
    expect(familia()).toBe(DE_CARLA)
  })

  it('recarregar duas vezes: a primeira resposta, que chega depois da segunda, é descartada', async () => {
    const { dados } = montar('/sonda', JULIANA)
    await waitFor(() => expect(familia()).toBe('pronto|Família Exemplo|Família Exemplo|-'))
    const velha = await dados.minhasFamilias()
    const primeira = pendente()
    vi.spyOn(dados, 'minhasFamilias').mockReturnValueOnce(primeira.promessa)

    fireEvent.click(screen.getByRole('button', { name: 'recarregar famílias' }))
    await dados.criarFamilia('Segunda', 'UTC')
    fireEvent.click(screen.getByRole('button', { name: 'recarregar famílias' }))
    await waitFor(() => expect(familia()).toBe('pronto|Família Exemplo|Família Exemplo,Segunda|-'))

    await act(async () => {
      primeira.liberar(velha)
    })
    expect(familia()).toBe('pronto|Família Exemplo|Família Exemplo,Segunda|-')
  })

  it('desmontar antes da resposta não atualiza estado nem gera aviso do React', async () => {
    const aviso = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const dados = novaMemoria()
    const deJuliana = await respostaDe(JULIANA)
    const pendenteDaLeitura = pendente()
    vi.spyOn(dados, 'minhasFamilias').mockReturnValueOnce(pendenteDaLeitura.promessa)
    const { unmount } = montar('/sonda', JULIANA, dados)
    await waitFor(() => expect(sessao()).toContain('|Juliana|'))

    unmount()
    await act(async () => {
      pendenteDaLeitura.liberar(deJuliana)
    })

    expect(aviso).not.toHaveBeenCalled()
    aviso.mockRestore()
  })

  it('o erro atrasado de minhasFamilias da pessoa anterior não vira erro da pessoa atual', async () => {
    const dados = novaMemoria()
    const antiga = pendente()
    vi.spyOn(dados, 'minhasFamilias').mockReturnValueOnce(antiga.promessa)
    montar('/sonda', JULIANA, dados)
    await waitFor(() => expect(sessao()).toContain('|Juliana|'))

    await entrarComo(dados, CARLA)
    await waitFor(() => expect(familia()).toBe(DE_CARLA))
    await act(async () => {
      antiga.liberar({ ok: false, erro: erroDaChave('rede') })
    })

    expect(familia()).toBe(DE_CARLA)
  })

  it('a escolha guardada da pessoa anterior não escolhe família da atual, nem enquanto a carga está pendente', async () => {
    const dados = novaMemoria()
    dados.sessaoParaTeste(JULIANA)
    const segunda = await dados.criarFamilia('Segunda', 'UTC')
    localStorage.setItem(CHAVE_FAMILIA_ATUAL, segunda.ok ? segunda.valor : '')
    montar('/sonda', JULIANA, dados)
    await waitFor(() => expect(familia()).toBe('pronto|Segunda|Família Exemplo,Segunda|-'))

    const nova = pendente()
    vi.spyOn(dados, 'minhasFamilias').mockReturnValueOnce(nova.promessa)
    await entrarComo(dados, CARLA)
    await waitFor(() => expect(sessao()).toContain('|Carla|'))
    expect(familia()).toBe(SEM_FAMILIA)

    await act(async () => {
      nova.liberar(await respostaDe(CARLA))
    })
    expect(familia()).toBe(DE_CARLA)
  })

  it('a mesma pessoa que volta a entrar recomeça do carregando e lê as famílias de novo', async () => {
    const dados = novaMemoria()
    montar('/sonda', JULIANA, dados)
    await waitFor(() => expect(familia()).toBe('pronto|Família Exemplo|Família Exemplo|-'))

    await act(async () => {
      dados.encerrarSessaoPorFora()
    })
    await waitFor(() => expect(familia()).toBe(SEM_FAMILIA))
    await entrarComo(dados, JULIANA)

    await waitFor(() => expect(familia()).toBe('pronto|Família Exemplo|Família Exemplo|-'))
  })
})
