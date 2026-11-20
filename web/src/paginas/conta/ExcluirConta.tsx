import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import {
  apagarChave,
  CHAVE_CONVITE,
  CHAVE_FAMILIA_ATUAL,
  CHAVE_RECUPERACAO,
} from '../../componentes/conta/armazenamento.ts'
import { DialogoExcluirConta } from '../../componentes/conta/DialogoExcluirConta.tsx'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { BOTAO_PERIGO, LINK_ALVO } from '../../componentes/conta/Partes.tsx'
import { useDadosConta, useSessao } from '../../componentes/conta/sessao.tsx'
import { Cartao, Colunas, Pilha } from '../../componentes/base/layout/index.ts'
import { Carregando } from '../../componentes/estado/Carregando.tsx'
import { ErroDaConta } from '../../componentes/estado/ErroDaConta.tsx'
import { COMUM, CONTA, textoDoErro } from '../../conteudo/conta.ts'
import type { ErroDados } from '../../dados/comum.ts'

type LeituraDosImpedimentos =
  | { fase: 'lendo' }
  | { fase: 'erro'; erro: ErroDados }
  | { fase: 'pronto'; bloqueadoras: Array<{ id: string; nome: string }> }

const QUEBRA_DO_BOTAO = 'max-w-full whitespace-normal wrap-anywhere'

// A seção e o diálogo mantêm seus lugares no DOM: o diálogo é irmão do quadro, fora da pilha.
export function ExcluirConta({ children }: { children: (partes: { secao: ReactNode; dialogo: ReactNode }) => ReactNode }) {
  const sessao = useSessao()
  const dados = useDadosConta()
  const navigate = useNavigate()
  const { usuario } = sessao
  const [leitura, setLeitura] = useState<LeituraDosImpedimentos>({ fase: 'lendo' })
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [erroSenha, setErroSenha] = useState<string | null>(null)
  const botaoExcluir = useRef<HTMLButtonElement>(null)
  const senhaConferida = useRef(false)
  const aoDesmontar = useRef<(() => void) | null>(null)
  const exclusao = useEnvio()
  const campoDaSenha = useRef<HTMLInputElement>(null)
  const estadoDaExclusao = exclusao.estado
  const erroDaExclusao = estadoDaExclusao.fase === 'erro' ? estadoDaExclusao.erro : null
  const senhaErrada = erroDaExclusao?.chave === 'credenciais'
  // Erro geral (rede, tente de novo...): o foco vai ao resumo, dentro da caixa. Senha inválida: o
  // foco vai ao campo de senha, que mostra o erro.
  const resumoDaExclusao = useFocoNoResumo(estadoDaExclusao.fase === 'erro' && !senhaErrada ? estadoDaExclusao : null)
  useEffect(() => {
    if (estadoDaExclusao.fase === 'erro' && senhaErrada) campoDaSenha.current?.focus()
  }, [estadoDaExclusao, senhaErrada])

  // Avisa quem espera esta tela sair do ar (a exclusão da conta).
  const avisarDesmontagem = useCallback(() => aoDesmontar.current?.(), [])
  useEffect(() => avisarDesmontagem, [avisarDesmontagem])
  const resumoDaLeitura = useFocoNoResumo(leitura.fase === 'erro' ? leitura : null)

  // Lê as famílias e, na mesma leitura, os membros das que a pessoa é responsável (a tela não mostra
  // bebês nem convites, então não os pede): uma requisição de vínculos, qualquer que seja o número
  // de famílias. Se uma família responsável vier sem membros (uma fonte que não os traz), os lê dela
  // à parte. Uma leitura parcial nunca conta como "sem impedimento".
  // Uma leitura em andamento é compartilhada: pedir de novo antes de ela voltar (o efeito que roda
  // duas vezes, "Tentar de novo" clicado em dobro) não repete as requisições.
  const emAndamento = useRef<{ dados: typeof dados; leitura: Promise<void> } | null>(null)
  const ler = useCallback((): Promise<void> => {
    if (emAndamento.current?.dados === dados) return emAndamento.current.leitura
    const leitura = (async () => {
      const familias = await dados.minhasFamilias({ comMembros: true })
      if (!familias.ok) return setLeitura({ fase: 'erro', erro: familias.erro })
      const bloqueadoras: Array<{ id: string; nome: string }> = []
      for (const familia of familias.valor.filter((f) => f.meuPapel === 'responsavel')) {
        let membros = familia.membros
        if (!membros) {
          const detalhe = await dados.detalheFamilia(familia.id, 'membros')
          if (!detalhe.ok) return setLeitura({ fase: 'erro', erro: detalhe.erro })
          membros = detalhe.valor.membros
        }
        const responsaveis = membros.filter((m) => m.papel === 'responsavel')
        if (responsaveis.every((m) => m.souEu)) bloqueadoras.push({ id: familia.id, nome: familia.nome })
      }
      setLeitura({ fase: 'pronto', bloqueadoras })
    })().finally(() => {
      if (emAndamento.current?.leitura === leitura) emAndamento.current = null
    })
    emAndamento.current = { dados, leitura }
    return leitura
  }, [dados])

  useEffect(() => {
    queueMicrotask(() => void ler())
  }, [ler])

  function fecharDialogo() {
    senhaConferida.current = false
    exclusao.limpar()
    setSenha('')
    setErroSenha(null)
    setAberto(false)
  }

  function confirmarExclusao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!usuario) return
    if (!senha) {
      setErroSenha(COMUM.escrevaSenha)
      return campoDaSenha.current?.focus()
    }
    setErroSenha(null)
    void exclusao.enviar({
      // A senha se confere entrando de novo; depois de um `rede`, "Tentar de novo" repete só a exclusão.
      escrever: () =>
        sessao.suprimirEncerramento(async () => {
          if (!senhaConferida.current) {
            const conferida = await dados.entrar(usuario.email, senha)
            if (!conferida.ok) return conferida
            senhaConferida.current = true
          }
          return dados.excluirConta()
        }),
      // A conta existia antes da primeira tentativa: o que sobra dela na repetição é sinal de que foi.
      provaSucesso: (erro) => erro.chave === 'conta_inexistente' || erro.chave === 'sessao_encerrada',
      aoSucesso: async () => {
        apagarChave('local', CHAVE_FAMILIA_ATUAL)
        apagarChave('sessao', CHAVE_CONVITE)
        apagarChave('sessao', CHAVE_RECUPERACAO)
        // A sessão local só acaba depois de esta tela sair do ar: antes disso a guarda mandaria a
        // pessoa a /entrar, por cima de /conta-excluida.
        const saiuDoAr = new Promise<void>((resolver) => {
          aoDesmontar.current = resolver
        })
        void navigate('/conta-excluida', { replace: true })
        await saiuDoAr
        await sessao.sair()
      },
    })
  }

  const bloqueadoras = leitura.fase === 'pronto' ? leitura.bloqueadoras : []
  const botaoDesativado = leitura.fase !== 'pronto' || bloqueadoras.length > 0

  return children({
    secao: (
      <Cartao
        as="section"
        aria-labelledby="excluir-conta"
        className="border-[1.5px] border-[var(--cor-erro,var(--cor-texto))] bg-[var(--cor-papel-fundo)]"
      >
        <Colunas fracoes="5fr 7fr" vao="bloco" aPartirDe={1024}>
          <Pilha dataH="coluna" vao="pilha" className="wrap-anywhere">
            <h2 id="excluir-conta" className="cm-h4">
              {CONTA.excluir.titulo}
            </h2>
            <p className="cm-medida">{CONTA.excluir.explicacao}</p>
          </Pilha>
          <Pilha dataH="coluna" vao="pilha" className="items-start">
            {leitura.fase === 'lendo' ? <Carregando texto={CONTA.excluir.lendo} /> : null}
            {leitura.fase === 'erro' ? (
              <ErroDaConta
                erro={leitura.erro}
                repetivel
                aoTentarDeNovo={() => {
                  setLeitura({ fase: 'lendo' })
                  void ler()
                }}
                refResumo={resumoDaLeitura}
              />
            ) : null}
            {bloqueadoras.length > 0 ? (
              <Pilha id="impedimento-exclusao" vao="junto" className="cm-medida min-w-0 wrap-anywhere">
                <p className="wrap-anywhere">{CONTA.excluir.impedimento}</p>
                <ul className="list-disc pl-6">
                  {bloqueadoras.map((familia) => (
                    <li key={familia.id}>
                      <Link to={`/app/familia?familia=${encodeURIComponent(familia.id)}`} className={`${LINK_ALVO} wrap-anywhere`}>
                        {familia.nome}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Pilha>
            ) : null}
            <button
              ref={botaoExcluir}
              type="button"
              disabled={botaoDesativado}
              aria-describedby={bloqueadoras.length > 0 ? 'impedimento-exclusao' : undefined}
              className={`${BOTAO_PERIGO} ${QUEBRA_DO_BOTAO}`}
              data-tamanho="app"
              onClick={() => setAberto(true)}
            >
              <Trash2 size={20} aria-hidden="true" />
              {CONTA.excluir.botao}
            </button>
          </Pilha>
        </Colunas>
      </Cartao>
    ),
    dialogo: aberto ? (
      <DialogoExcluirConta
        senha={senha}
        aoMudarSenha={(valor) => {
          setSenha(valor)
          setErroSenha(null)
        }}
        erroSenha={erroSenha ?? (senhaErrada && erroDaExclusao ? textoDoErro(erroDaExclusao) : null)}
        resumo={
          erroDaExclusao && !senhaErrada && exclusao.estado.fase === 'erro' ? (
            <ErroDaConta
              erro={erroDaExclusao}
              repetivel={exclusao.estado.tentarDeNovo}
              aoTentarDeNovo={() => void exclusao.tentarDeNovo()}
              refResumo={resumoDaExclusao}
            />
          ) : null
        }
        enviando={exclusao.enviando}
        aoConfirmar={confirmarExclusao}
        aoCancelar={fecharDialogo}
        retorno={botaoExcluir}
        refSenha={campoDaSenha}
      />
    ) : null,
  })
}
