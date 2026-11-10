import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
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
import { BotaoSair, MolduraLogada } from '../../componentes/conta/MolduraLogada.tsx'
import {
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
  | { fase: 'pronto'; bloqueadoras: string[] }

const SECOES_DO_INDICE = [
  ['perfil', CONTA.secoes.perfil],
  ['id-conta', CONTA.secoes.id],
  ['exportar', CONTA.secoes.dados],
  ['excluir-conta', CONTA.secoes.excluir],
  ['privacidade', CONTA.secoes.privacidade],
] as const

// /app/conta (RF-16): perfil, id da conta, exportação, exclusão, privacidade e sair, numa coluna
// com o índice das seções à esquerda a partir de 60 rem.
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

  // Lê as famílias e, de cada uma em que a pessoa é responsável, o detalhe. Uma leitura parcial
  // nunca conta como "sem impedimento".
  const ler = useCallback(async () => {
    const familias = await dados.minhasFamilias()
    if (!familias.ok) return setLeitura({ fase: 'erro', erro: familias.erro })
    const bloqueadoras: string[] = []
    for (const familia of familias.valor.filter((f) => f.meuPapel === 'responsavel')) {
      const detalhe = await dados.detalheFamilia(familia.id)
      if (!detalhe.ok) return setLeitura({ fase: 'erro', erro: detalhe.erro })
      const responsaveis = detalhe.valor.membros.filter((m) => m.papel === 'responsavel')
      if (responsaveis.every((m) => m.souEu)) bloqueadoras.push(familia.nome)
    }
    setLeitura({ fase: 'pronto', bloqueadoras })
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
      <h1 ref={titulo} tabIndex={-1} className="titulo-tela alvo-foco">
        {TITULOS.conta}
      </h1>
      <p className="wrap-anywhere">{CONTA.resumo(conta.nome, conta.email)}</p>
      <RegiaoStatus mensagem={status} />

      <div className="mt-8 grid gap-6 min-[60rem]:grid-cols-[13rem_minmax(0,1fr)] min-[60rem]:gap-12">
        <nav
          aria-label={CONTA.indice}
          className="hidden min-[60rem]:sticky min-[60rem]:top-4 min-[60rem]:block min-[60rem]:self-start"
        >
          <ol className="m-0 list-none border-l p-0">
            {SECOES_DO_INDICE.map(([id, rotulo]) => (
              <li key={id}>
                <a href={`#${id}`} className="alvo-toque flex items-center px-3 no-underline hover:underline">
                  {rotulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-col">
          <section aria-labelledby="perfil" className="pb-8">
            <h2 id="perfil" className="titulo-linha mb-4">
              {CONTA.perfil.titulo}
            </h2>
            <form onSubmit={salvarPerfil} noValidate className="flex max-w-[28rem] flex-col gap-5">
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
                valor={nome}
                aoMudar={(valor) => {
                  setNome(valor)
                  setErroNome(null)
                }}
                erro={erroNome ?? (campoDoPerfil === 'nome' && erroDoPerfil ? textoDoErro(erroDoPerfil) : null)}
                refEntrada={nomeRef}
              />
              <Campo rotulo={CONTA.perfil.email} tipo="email" valor={conta.email} aoMudar={() => undefined} somenteLeitura />
              <SeletorFuso
                rotulo={CONTA.perfil.fuso}
                valor={fuso}
                aoMudar={setFuso}
                guardado={conta.fuso}
                erro={campoDoPerfil === 'fuso' && erroDoPerfil ? textoDoErro(erroDoPerfil) : null}
                refEntrada={fusoRef}
              />
              <button type="submit" disabled={perfil.enviando} className={BOTAO_PRINCIPAL}>
                {perfil.enviando ? COMUM.salvando : CONTA.perfil.botao}
              </button>
            </form>
          </section>

          <section aria-labelledby="id-conta" className="flex flex-col items-start gap-3 border-t py-8">
            <h2 id="id-conta" className="titulo-linha">
              {CONTA.id.titulo}
            </h2>
            <p ref={idRef} data-id-conta className="tabular font-semibold">
              {conta.id.split('-').map((bloco, posicao, blocos) => (
                <Fragment key={posicao}>
                  {posicao < blocos.length - 1 ? `${bloco}-` : bloco}
                  {posicao < blocos.length - 1 ? <wbr /> : null}
                </Fragment>
              ))}
            </p>
            <button type="button" className={BOTAO_SECUNDARIO} onClick={() => void copiarId()}>
              {CONTA.id.botao}
            </button>
            <p className="texto-medida">{CONTA.id.frase}</p>
          </section>

          <section aria-labelledby="exportar" className="flex flex-col items-start gap-3 border-t py-8">
            <h2 id="exportar" tabIndex={-1} className="titulo-linha alvo-foco">
              {CONTA.exportar.titulo}
            </h2>
            <p className="texto-medida">{CONTA.exportar.frase}</p>
            {exportacao.estado.fase === 'erro' ? (
              <ResumoErro
                erro={exportacao.estado.erro}
                repetivel={exportacao.estado.tentarDeNovo}
                aoTentarDeNovo={() => void exportacao.tentarDeNovo()}
                refResumo={resumoDaExportacao}
              />
            ) : null}
            <button type="button" disabled={exportacao.enviando} className={BOTAO_SECUNDARIO} onClick={baixarDados}>
              {exportacao.enviando ? COMUM.preparandoArquivo : CONTA.exportar.botao}
            </button>
          </section>

          <section aria-labelledby="excluir-conta" className="flex flex-col items-start gap-3 border-t py-8">
            <h2 id="excluir-conta" className="titulo-linha">
              {CONTA.excluir.titulo}
            </h2>
            <p className="texto-medida">{CONTA.excluir.explicacao}</p>
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
              <div id="impedimento-exclusao" className="texto-medida">
                <p>{CONTA.excluir.impedimento}</p>
                <ul className="mt-2 list-disc pl-6">
                  {bloqueadoras.map((familia) => (
                    <li key={familia}>
                      <strong className="wrap-anywhere">{familia}</strong>
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
              className={BOTAO_SECUNDARIO}
              onClick={() => setAberto(true)}
            >
              {CONTA.excluir.botao}
            </button>
          </section>

          <section aria-labelledby="privacidade" className="flex flex-col items-start gap-2 border-t py-8">
            <h2 id="privacidade" className="titulo-linha mb-2">
              {CONTA.privacidade.titulo}
            </h2>
            <p>
              {CONTA.privacidade.contato.antes}
              <span data-contato className="wrap-anywhere">
                {CONTA.privacidade.contato.valor}
              </span>
              {CONTA.privacidade.contato.depois}
            </p>
            <p>
              {CONTA.privacidade.encarregado.antes}
              <span data-encarregado className="wrap-anywhere">
                {CONTA.privacidade.encarregado.valor}
              </span>
              {CONTA.privacidade.encarregado.depois}
            </p>
            <Link to="/privacidade" className={LINK_ALVO}>
              {CONTA.privacidade.politica}
            </Link>
          </section>

          <div className="border-t pt-8">
            <BotaoSair />
          </div>
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
