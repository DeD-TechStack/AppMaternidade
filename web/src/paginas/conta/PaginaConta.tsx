import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Botao } from '../../componentes/base/Botao.tsx'
import { baixarJson, nomeDoArquivoDeDados } from '../../componentes/conta/arquivo.ts'
import {
  apagarChave,
  CHAVE_CONVITE,
  CHAVE_FAMILIA_ATUAL,
  CHAVE_RECUPERACAO,
} from '../../componentes/conta/armazenamento.ts'
import { CampoAcesso } from '../../componentes/conta/CampoAcesso.tsx'
import { DialogoExcluirConta } from '../../componentes/conta/DialogoExcluirConta.tsx'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { useIndiceAoLado, useSecaoAtiva } from '../../componentes/conta/indice.ts'
import { IndiceDaConta, type ItemDoIndice } from '../../componentes/conta/IndiceDaConta.tsx'
import { MolduraPublica } from '../../componentes/conta/MolduraPublica.tsx'
import { AcaoDaLinha, LinhaDaConta, SecaoDaConta } from '../../componentes/conta/PartesConta.tsx'
import { BotaoEnvio, RegiaoStatusAcesso, ResumoErroAcesso } from '../../componentes/conta/PartesAcesso.tsx'
import { SeletorFusoAcesso } from '../../componentes/conta/SeletorFusoAcesso.tsx'
import { useDadosConta, useSessao } from '../../componentes/conta/sessao.tsx'
import { COMUM, CONTA, TITULOS, textoDaPassagem, textoDoErro } from '../../conteudo/conta.ts'
import type { ErroDados } from '../../dados/comum.ts'

type LeituraDosImpedimentos =
  | { fase: 'lendo' }
  | { fase: 'erro'; erro: ErroDados }
  | { fase: 'pronto'; bloqueadoras: string[] }

// As 6 seções da tela, na ordem em que aparecem: cada âncora do índice leva a uma que existe.
const ITENS_DO_INDICE: readonly ItemDoIndice[] = [
  { id: 'perfil', rotulo: CONTA.secoes.perfil },
  { id: 'id-conta', rotulo: CONTA.secoes.id },
  { id: 'exportar', rotulo: CONTA.secoes.dados },
  { id: 'privacidade', rotulo: CONTA.secoes.privacidade },
  { id: 'sair', rotulo: CONTA.secoes.sair },
  { id: 'excluir-conta', rotulo: CONTA.secoes.excluir },
]
const IDS_DAS_SECOES = ITENS_DO_INDICE.map((item) => item.id)

/** O `id` de um `#hash` que é de uma das seções, ou nulo. */
function secaoDoHash(hash: string): string | null {
  let id = hash.slice(1)
  try {
    id = decodeURIComponent(id)
  } catch {
    /* o hash cru serve */
  }
  return IDS_DAS_SECOES.includes(id) ? id : null
}

// /app/conta (RF-16): perfil, id da conta, exportação, privacidade, sair e exclusão, em seções
// de título em c2 e linhas rótulo + texto, com o índice das seções na coluna lateral da abertura.
export function PaginaConta() {
  const sessao = useSessao()
  const dados = useDadosConta()
  const location = useLocation()
  const navigate = useNavigate()
  const { conta, usuario } = sessao

  // Uma região de status só: a confirmação da última ação (ou a mensagem de passagem recebida).
  const [status, setStatus] = useState<string | null>(() => textoDaPassagem(location.state))

  // ---- índice ----
  const aoLado = useIndiceAoLado()
  const [ativo, escolherSecao] = useSecaoAtiva(IDS_DAS_SECOES, Boolean(conta && usuario))

  // Um clique no índice, ou a entrada por `#id`, rola até a seção e foca o título dela. O destino fica
  // travado até a pessoa rolar por conta própria (R6); o `scroll` da navegação não o desfaz.
  const irParaSecao = useCallback(
    (id: string) => {
      escolherSecao(id)
      void navigate({ hash: `#${id}` })
    },
    [escolherSecao, navigate],
  )
  const { hash, key } = location
  useEffect(() => {
    const id = secaoDoHash(hash)
    const alvo = id ? document.getElementById(id) : null
    if (!id || !alvo) return
    escolherSecao(id)
    alvo.scrollIntoView?.()
    alvo.focus({ preventScroll: true })
  }, [hash, key, escolherSecao])

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

  // ---- sair ----
  const [saindo, setSaindo] = useState(false)
  const [falhaAoSair, setFalhaAoSair] = useState<ErroDados | null>(null)
  const resumoDaSaida = useFocoNoResumo(falhaAoSair)

  // ---- exclusão ----
  const [leitura, setLeitura] = useState<LeituraDosImpedimentos>({ fase: 'lendo' })
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [erroSenha, setErroSenha] = useState<string | null>(null)
  const acaoDeExcluir = useRef<HTMLDivElement>(null)
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

  async function sairDaConta() {
    if (saindo) return
    setSaindo(true)
    setFalhaAoSair(null)
    const resultado = await sessao.sair()
    // Com sucesso, a guarda leva a /entrar e esta tela sai do ar.
    if (!resultado.ok) setFalhaAoSair(resultado.erro)
    setSaindo(false)
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
  const motivoDoBotao =
    leitura.fase === 'lendo'
      ? CONTA.excluir.lendo
      : leitura.fase === 'erro'
        ? CONTA.excluir.naoConferiu
        : bloqueadoras.length > 0
          ? CONTA.excluir.impedimento.motivo
          : undefined

  const indice = <IndiceDaConta itens={ITENS_DO_INDICE} ativo={ativo} aoEscolher={irParaSecao} aoLado={aoLado} />

  return (
    <MolduraPublica
      titulo={TITULOS.conta}
      subtitulo={CONTA.resumo(conta.nome, conta.email)}
      quebraLonga
      antes={aoLado ? indice : null}
      colunaLateral={aoLado ? null : indice}
    >
      <SecaoDaConta id="perfil" titulo={CONTA.perfil.titulo} primeira>
        <RegiaoStatusAcesso mensagem={status} />
        <form onSubmit={salvarPerfil} noValidate>
          {erroDoPerfil && !campoDoPerfil ? (
            <ResumoErroAcesso
              erro={erroDoPerfil}
              repetivel={perfil.estado.fase === 'erro' && perfil.estado.tentarDeNovo}
              aoTentarDeNovo={() => void perfil.tentarDeNovo()}
              refResumo={resumoDoPerfil}
            />
          ) : null}
          <div className="sb-acesso-campos">
            <CampoAcesso
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
            <CampoAcesso rotulo={CONTA.perfil.email} tipo="email" valor={conta.email} aoMudar={() => undefined} somenteLeitura />
            <SeletorFusoAcesso
              rotulo={CONTA.perfil.fuso}
              valor={fuso}
              aoMudar={setFuso}
              guardado={conta.fuso}
              erro={campoDoPerfil === 'fuso' && erroDoPerfil ? textoDoErro(erroDoPerfil) : null}
              refEntrada={fusoRef}
            />
          </div>
          <div className="sb-acesso-acao">
            <BotaoEnvio enviando={perfil.enviando}>{perfil.enviando ? COMUM.salvando : CONTA.perfil.botao}</BotaoEnvio>
          </div>
        </form>
      </SecaoDaConta>

      <SecaoDaConta id="id-conta" titulo={CONTA.id.titulo}>
        <LinhaDaConta rotulo={CONTA.id.rotulo}>
          <p ref={idRef} data-id-conta className="tabular font-semibold">
            {conta.id.split('-').map((bloco, posicao, blocos) => (
              <Fragment key={posicao}>
                {posicao < blocos.length - 1 ? `${bloco}-` : bloco}
                {posicao < blocos.length - 1 ? <wbr /> : null}
              </Fragment>
            ))}
          </p>
          <p>{CONTA.id.frase}</p>
          <AcaoDaLinha>
            <Botao variante="moldura" alto className="alvo-toque" onClick={() => void copiarId()}>
              {CONTA.id.botao}
            </Botao>
          </AcaoDaLinha>
        </LinhaDaConta>
      </SecaoDaConta>

      <SecaoDaConta id="exportar" titulo={CONTA.exportar.titulo}>
        <LinhaDaConta rotulo={CONTA.exportar.rotulo}>
          <p>{CONTA.exportar.frase}</p>
          {exportacao.estado.fase === 'erro' ? (
            <ResumoErroAcesso
              erro={exportacao.estado.erro}
              repetivel={exportacao.estado.tentarDeNovo}
              aoTentarDeNovo={() => void exportacao.tentarDeNovo()}
              refResumo={resumoDaExportacao}
            />
          ) : null}
          <AcaoDaLinha>
            <Botao variante="moldura" alto className="alvo-toque" desativado={exportacao.enviando} onClick={baixarDados}>
              {exportacao.enviando ? COMUM.preparandoArquivo : CONTA.exportar.botao}
            </Botao>
          </AcaoDaLinha>
        </LinhaDaConta>
      </SecaoDaConta>

      <SecaoDaConta id="privacidade" titulo={CONTA.privacidade.titulo}>
        <LinhaDaConta rotulo={CONTA.privacidade.rotulo}>
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
          <AcaoDaLinha>
            <Botao to="/privacidade" variante="moldura" alto className="alvo-toque">
              {CONTA.privacidade.politica}
            </Botao>
          </AcaoDaLinha>
        </LinhaDaConta>
      </SecaoDaConta>

      <SecaoDaConta id="sair" titulo={CONTA.saida.titulo}>
        <LinhaDaConta rotulo={CONTA.saida.rotulo}>
          <p>{CONTA.saida.frase}</p>
          {falhaAoSair ? (
            <ResumoErroAcesso erro={falhaAoSair} refResumo={resumoDaSaida} repetivel aoTentarDeNovo={() => void sairDaConta()} />
          ) : null}
          <AcaoDaLinha>
            <Botao variante="moldura" alto className="alvo-toque" desativado={saindo} onClick={() => void sairDaConta()}>
              {saindo ? COMUM.saindo : CONTA.sair}
            </Botao>
          </AcaoDaLinha>
        </LinhaDaConta>
      </SecaoDaConta>

      <SecaoDaConta id="excluir-conta" titulo={CONTA.excluir.titulo} perigo>
        <LinhaDaConta rotulo={CONTA.excluir.rotulo}>
          <p>{CONTA.excluir.explicacao}</p>
          {leitura.fase === 'erro' ? (
            <ResumoErroAcesso
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
            <div id="impedimento-exclusao">
              <p>{CONTA.excluir.impedimento.explicacao}</p>
              <ul className="conta-familias">
                {bloqueadoras.map((familia) => (
                  <li key={familia}>
                    <strong className="wrap-anywhere">{familia}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <AcaoDaLinha ref={acaoDeExcluir}>
            {botaoDesativado ? (
              // Desativado (2.9): o botão do sistema, de fundo sólido e apagado, com `aria-disabled="true"` e
              // o motivo ao lado. Nunca tracejado.
              <Botao desativado motivo={motivoDoBotao} className="alvo-toque">
                {CONTA.excluir.botao}
              </Botao>
            ) : (
              <Botao variante="moldura" alto className="alvo-toque" onClick={() => setAberto(true)}>
                {CONTA.excluir.botao}
              </Botao>
            )}
          </AcaoDaLinha>
        </LinhaDaConta>
      </SecaoDaConta>

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
              <ResumoErroAcesso
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
          retorno={acaoDeExcluir}
          refSenha={campoDaSenha}
        />
      ) : null}
    </MolduraPublica>
  )
}
