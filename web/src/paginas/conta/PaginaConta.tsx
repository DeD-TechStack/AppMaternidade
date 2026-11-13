import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { baixarJson, nomeDoArquivoDeDados } from '../../componentes/conta/arquivo.ts'
import {
  apagarChave,
  CHAVE_CONVITE,
  CHAVE_FAMILIA_ATUAL,
  CHAVE_RECUPERACAO,
} from '../../componentes/conta/armazenamento.ts'
import { Campo, SeletorFuso } from '../../componentes/conta/Campos.tsx'
import { DialogoExcluirConta } from '../../componentes/conta/DialogoExcluirConta.tsx'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo, useFocoNoTitulo } from '../../componentes/conta/foco.ts'
import { IndiceDaConta } from '../../componentes/conta/IndiceDaConta.tsx'
import { MolduraLogada } from '../../componentes/conta/MolduraLogada.tsx'
import {
  BOTAO_PERIGO,
  BOTAO_PRINCIPAL,
  BOTAO_SECUNDARIO,
  LINK_ALVO,
  RegiaoStatus,
  ResumoErro,
} from '../../componentes/conta/Partes.tsx'
import { useDadosConta, useSessao } from '../../componentes/conta/sessao.tsx'
import { COMUM, CONTA, TITULOS, textoDaPassagem, textoDoErro } from '../../conteudo/conta.ts'
import type { ErroDados } from '../../dados/comum.ts'

type LeituraDosImpedimentos =
  | { fase: 'lendo' }
  | { fase: 'erro'; erro: ErroDados }
  | { fase: 'pronto'; bloqueadoras: Array<{ id: string; nome: string }> }

const SECOES_DO_INDICE = [
  ['perfil', CONTA.secoes.perfil],
  ['id-conta', CONTA.secoes.id],
  ['exportar', CONTA.secoes.dados],
  ['excluir-conta', CONTA.secoes.excluir],
  ['privacidade', CONTA.secoes.privacidade],
] as const

// Cada seção é uma linha de duas colunas (o texto, depois os controles) sobre um fio de 1 px; a
// zona de perigo (excluir a conta) é um cartão de raio 20 com contorno, separado das outras. No celular
// (uma página de tarefa) os grupos ficam mais juntos.
// A coluna única do celular é `minmax(0,1fr)`: sem isso a trilha cresce até o texto mais largo (o botão,
// o id) e a página rola de lado com a fonte a 200%.
const SECAO_GRADE = 'grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12'
// Os botões de uma seção quebram o rótulo dentro da coluna em vez de passar dela (`.cm-botao` é nowrap).
const QUEBRA_DO_BOTAO = 'max-w-full whitespace-normal wrap-anywhere'
const SECAO = `${SECAO_GRADE} border-t border-[var(--cor-fio-suave)] py-5 lg:py-8`
const TEXTO_DA_SECAO = 'flex min-w-0 flex-col gap-2 wrap-anywhere lg:gap-3'
// Os controles de uma seção (campos, caixa do id) têm todos a mesma largura: a borda direita se alinha.
const COLUNA_DOS_CONTROLES = 'w-full min-w-0 max-w-[28rem]'

// /app/conta (RF-16): perfil, id da conta, exportação, exclusão, privacidade e sair, numa coluna
// com o índice das seções à esquerda a partir de 64 rem.
export function PaginaConta() {
  const sessao = useSessao()
  const dados = useDadosConta()
  const location = useLocation()
  const navigate = useNavigate()
  const titulo = useFocoNoTitulo()
  const { conta, usuario } = sessao

  // Uma região de status só: a confirmação da última ação (ou a mensagem de passagem recebida).
  const [status, setStatus] = useState<string | null>(() => textoDaPassagem(location.state))

  // ---- perfil ----
  const [nome, setNome] = useState(conta?.nome ?? '')
  const [fuso, setFuso] = useState(conta?.fuso ?? '')
  const [erroNome, setErroNome] = useState<string | null>(null)
  const nomeRef = useRef<HTMLInputElement>(null)
  const fusoRef = useRef<HTMLSelectElement>(null)
  const perfil = useEnvio()
  const erroDoPerfil = perfil.estado.fase === 'erro' ? perfil.estado.erro : null
  const campoDoPerfil = erroDoPerfil?.chave === 'nome_vazio' ? 'nome' : erroDoPerfil?.chave === 'fuso_invalido' ? 'fuso' : null
  const resumoDoPerfil = useFocoNoResumo(perfil.estado.fase === 'erro' && !campoDoPerfil ? perfil.estado : null)

  useEffect(() => {
    if (perfil.estado.fase !== 'erro') return
    if (campoDoPerfil === 'nome') nomeRef.current?.focus()
    if (campoDoPerfil === 'fuso') fusoRef.current?.focus()
  }, [perfil.estado, campoDoPerfil])

  // ---- id ----
  const idRef = useRef<HTMLParagraphElement>(null)

  // ---- exportação ----
  const exportacao = useEnvio()
  const resumoDaExportacao = useFocoNoResumo(exportacao.estado.fase === 'erro' ? exportacao.estado : null)

  // ---- exclusão ----
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

  // `/app/conta#exportar` rola até a seção e foca o título dela.
  const { hash, key } = location
  useEffect(() => {
    if (hash !== '#exportar') return
    const alvo = document.getElementById('exportar')
    alvo?.scrollIntoView?.()
    alvo?.focus()
  }, [hash, key])

  if (!conta || !usuario) return null

  function salvarPerfil(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) {
      setErroNome(COMUM.escrevaNome)
      return nomeRef.current?.focus()
    }
    setErroNome(null)
    setStatus(null)
    void perfil.enviar({
      escrever: () => dados.atualizarMinhaConta(nomeLimpo, fuso),
      conferir: async () => {
        const lida = await dados.minhaConta()
        return lida.ok ? { ok: true, valor: lida.valor?.nome === nomeLimpo && lida.valor.fuso === fuso } : lida
      },
      aoSucesso: async () => {
        await sessao.recarregarConta()
        setStatus(CONTA.perfil.sucesso)
      },
    })
  }

  async function copiarId() {
    setStatus(null)
    try {
      await navigator.clipboard.writeText(conta!.id)
      setStatus(COMUM.idCopiado)
    } catch {
      // Sem área de transferência (ou negada): o texto fica selecionado para copiar à mão.
      const alvo = idRef.current
      const selecao = window.getSelection()
      if (alvo && selecao) {
        const faixa = document.createRange()
        faixa.selectNodeContents(alvo)
        selecao.removeAllRanges()
        selecao.addRange(faixa)
      }
      setStatus(COMUM.copieManualmente)
    }
  }

  function baixarDados() {
    setStatus(null)
    void exportacao.enviar({
      escrever: () => dados.exportarDados(),
      aoSucesso: (conteudo) => {
        baixarJson(conteudo, nomeDoArquivoDeDados(conta!.fuso))
        setStatus(CONTA.exportar.sucesso)
      },
    })
  }

  function fecharDialogo() {
    senhaConferida.current = false
    exclusao.limpar()
    setSenha('')
    setErroSenha(null)
    setAberto(false)
  }

  function confirmarExclusao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
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
            const conferida = await dados.entrar(usuario!.email, senha)
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

  return (
    <MolduraLogada>
      <h1
        ref={titulo}
        tabIndex={-1}
        className="cm-h1 alvo-foco wrap-anywhere max-sm:text-[48px] max-sm:leading-[52px]"
      >
        {TITULOS.conta}
      </h1>
      <p className="cm-lide mt-3 wrap-anywhere text-[var(--cor-texto-2)]">{CONTA.resumo(conta.nome, conta.email)}</p>
      <div className={status ? 'mt-6 max-w-[40rem]' : undefined}>
        <RegiaoStatus mensagem={status} />
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 lg:mt-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <IndiceDaConta secoes={SECOES_DO_INDICE} />

        <div className="flex min-w-0 flex-col">
          <section aria-labelledby="perfil" className={SECAO}>
            <div className={TEXTO_DA_SECAO}>
              <h2 id="perfil" className="cm-h4">
                {CONTA.perfil.titulo}
              </h2>
              <p className="cm-medida">{CONTA.perfil.frase}</p>
            </div>
            <form onSubmit={salvarPerfil} noValidate className={`flex ${COLUNA_DOS_CONTROLES} flex-col gap-5`}>
              {erroDoPerfil && !campoDoPerfil ? (
                <ResumoErro
                  erro={erroDoPerfil}
                  repetivel={perfil.estado.fase === 'erro' && perfil.estado.tentarDeNovo}
                  aoTentarDeNovo={() => void perfil.tentarDeNovo()}
                  refResumo={resumoDoPerfil}
                />
              ) : null}
              <Campo
                rotulo={CONTA.perfil.nome}
                autoComplete="name"
                tamanho="app"
                valor={nome}
                aoMudar={(valor) => {
                  setNome(valor)
                  setErroNome(null)
                }}
                erro={erroNome ?? (campoDoPerfil === 'nome' && erroDoPerfil ? textoDoErro(erroDoPerfil) : null)}
                refEntrada={nomeRef}
              />
              <Campo
                rotulo={CONTA.perfil.email}
                tipo="email"
                valor={conta.email}
                aoMudar={() => undefined}
                somenteLeitura
                tamanho="app"
              />
              <SeletorFuso
                rotulo={CONTA.perfil.fuso}
                valor={fuso}
                aoMudar={setFuso}
                guardado={conta.fuso}
                tamanho="app"
                erro={campoDoPerfil === 'fuso' && erroDoPerfil ? textoDoErro(erroDoPerfil) : null}
                refEntrada={fusoRef}
              />
              <button type="submit" disabled={perfil.enviando} className={BOTAO_PRINCIPAL}>
                {perfil.enviando ? COMUM.salvando : CONTA.perfil.botao}
              </button>
            </form>
          </section>

          <section aria-labelledby="id-conta" className={SECAO}>
            <div className={TEXTO_DA_SECAO}>
              <h2 id="id-conta" className="cm-h4">
                {CONTA.id.titulo}
              </h2>
              <p className="cm-medida">{CONTA.id.frase}</p>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-4">
              <p
                ref={idRef}
                data-id-conta
                className={`tabular wrap-anywhere box-border rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3 font-medium ${COLUNA_DOS_CONTROLES}`}
              >
                {conta.id.split('-').map((bloco, posicao, blocos) => (
                  <Fragment key={posicao}>
                    {posicao < blocos.length - 1 ? `${bloco}-` : bloco}
                    {posicao < blocos.length - 1 ? <wbr /> : null}
                  </Fragment>
                ))}
              </p>
              <button type="button" className={`${BOTAO_SECUNDARIO} ${QUEBRA_DO_BOTAO}`} data-tamanho="app" onClick={() => void copiarId()}>
                {CONTA.id.botao}
              </button>
            </div>
          </section>

          <section aria-labelledby="exportar" className={SECAO}>
            <div className={TEXTO_DA_SECAO}>
              <h2 id="exportar" tabIndex={-1} className="cm-h4 alvo-foco">
                {CONTA.exportar.titulo}
              </h2>
              <p className="cm-medida">{CONTA.exportar.frase}</p>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-4">
              {exportacao.estado.fase === 'erro' ? (
                <ResumoErro
                  erro={exportacao.estado.erro}
                  repetivel={exportacao.estado.tentarDeNovo}
                  aoTentarDeNovo={() => void exportacao.tentarDeNovo()}
                  refResumo={resumoDaExportacao}
                />
              ) : null}
              <button type="button" disabled={exportacao.enviando} className={`${BOTAO_SECUNDARIO} ${QUEBRA_DO_BOTAO}`} data-tamanho="app" onClick={baixarDados}>
                {exportacao.enviando ? COMUM.preparandoArquivo : CONTA.exportar.botao}
              </button>
            </div>
          </section>

          <section
            aria-labelledby="excluir-conta"
            className={`${SECAO_GRADE} my-5 rounded-cartao border-[1.5px] border-[var(--cor-erro,var(--cor-texto))] bg-[var(--cor-papel-fundo)] p-5 lg:my-10 lg:p-8`}
          >
            <div className={TEXTO_DA_SECAO}>
              <h2 id="excluir-conta" className="cm-h4">
                {CONTA.excluir.titulo}
              </h2>
              <p className="cm-medida">{CONTA.excluir.explicacao}</p>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-4">
              {leitura.fase === 'lendo' ? <p>{CONTA.excluir.lendo}</p> : null}
              {leitura.fase === 'erro' ? (
                <ResumoErro
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
                <div id="impedimento-exclusao" className="cm-medida min-w-0 wrap-anywhere">
                  <p className="wrap-anywhere">{CONTA.excluir.impedimento}</p>
                  <ul className="mt-2 list-disc pl-6">
                    {bloqueadoras.map((familia) => (
                      <li key={familia.id}>
                        <Link to={`/app/familia?familia=${encodeURIComponent(familia.id)}`} className={`${LINK_ALVO} wrap-anywhere`}>
                          {familia.nome}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
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
            </div>
          </section>

          <section aria-labelledby="privacidade" className={SECAO}>
            <div className={TEXTO_DA_SECAO}>
              <h2 id="privacidade" className="cm-h4">
                {CONTA.privacidade.titulo}
              </h2>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-2">
              <p className="wrap-anywhere">
                {CONTA.privacidade.contato.antes}
                <span data-contato className="wrap-anywhere">
                  {CONTA.privacidade.contato.valor}
                </span>
                {CONTA.privacidade.contato.depois}
              </p>
              <p className="wrap-anywhere">
                {CONTA.privacidade.encarregado.antes}
                <span data-encarregado className="wrap-anywhere">
                  {CONTA.privacidade.encarregado.valor}
                </span>
                {CONTA.privacidade.encarregado.depois}
              </p>
              <Link to="/privacidade" className={`${LINK_ALVO} wrap-anywhere`}>
                {CONTA.privacidade.politica}
              </Link>
            </div>
          </section>

        </div>
      </div>

      {aberto ? (
        <DialogoExcluirConta
          senha={senha}
          aoMudarSenha={(valor) => {
            setSenha(valor)
            setErroSenha(null)
          }}
          erroSenha={erroSenha ?? (senhaErrada && erroDaExclusao ? textoDoErro(erroDaExclusao) : null)}
          resumo={
            erroDaExclusao && !senhaErrada && exclusao.estado.fase === 'erro' ? (
              <ResumoErro
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
      ) : null}
    </MolduraLogada>
  )
}
