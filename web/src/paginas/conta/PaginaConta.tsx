import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { SecaoAvisosDaConta } from '../../componentes/avisos/SecaoAvisosDaConta.tsx'
import { Campo, SeletorFuso } from '../../componentes/conta/Campos.tsx'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo, useFocoNoTitulo } from '../../componentes/conta/foco.ts'
import { IndiceDaConta } from '../../componentes/conta/IndiceDaConta.tsx'
import { NOME_DA_CONTA_MAX } from '../../componentes/conta/limitesDeNome.ts'
import { MolduraLogada } from '../../componentes/conta/MolduraLogada.tsx'
import {
  BOTAO_PRINCIPAL,
  BOTAO_SECUNDARIO,
  LINK_ALVO,
  RegiaoStatus,
} from '../../componentes/conta/Partes.tsx'
import { ErroDaConta } from '../../componentes/estado/ErroDaConta.tsx'
import { Coluna, Colunas, Pilha, QuadroLayout, Secao } from '../../componentes/base/layout/index.ts'
import { useDadosConta, useSessao } from '../../componentes/conta/sessao.tsx'
import { AVISOS_TEXTOS } from '../../conteudo/avisos.ts'
import { COMUM, CONTA, TITULOS, textoDaPassagem, textoDoErro } from '../../conteudo/conta.ts'
import { ExportarMeusDados } from './ExportarMeusDados.tsx'
import { ExcluirConta } from './ExcluirConta.tsx'

const SECOES_DO_INDICE = [
  ['perfil', CONTA.secoes.perfil],
  ['avisos', AVISOS_TEXTOS.indiceDaConta],
  ['id-conta', CONTA.secoes.id],
  ['exportar', CONTA.secoes.dados],
  ['excluir-conta', CONTA.secoes.excluir],
  ['privacidade', CONTA.secoes.privacidade],
] as const

// Cada seção é uma linha de duas colunas 5/7 (o texto, depois os controles: `Colunas` com o vão de bloco, a
// partir de 1024) sobre um fio de 1 px, numa pilha de bloco; a zona de perigo (excluir a conta) é um
// `Cartao` com contorno, separado das outras. As colunas são `minmax(0, Nfr)`: o texto mais largo (o botão,
// o id) não alarga a trilha nem faz a página rolar de lado com a fonte a 200%.
// Os botões de uma seção quebram o rótulo dentro da coluna em vez de passar dela (`.cm-botao` é nowrap).
const QUEBRA_DO_BOTAO = 'max-w-full whitespace-normal wrap-anywhere'
const SECAO = 'border-t border-[var(--cor-fio-suave)] pt-esp-bloco'
// Os controles de uma seção (campos, caixa do id) têm todos a mesma largura: a borda direita se alinha.
const COLUNA_DOS_CONTROLES = 'w-full min-w-0 max-w-[28rem]'

// /app/conta (RF-16): perfil, id da conta, exportação, exclusão, privacidade e sair, numa coluna
// com o índice das seções à esquerda a partir de 64 rem.
export function PaginaConta() {
  const sessao = useSessao()
  const dados = useDadosConta()
  const location = useLocation()
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

  // `/app/conta#exportar` e `/app/conta#avisos` rolam até a seção e focam o título dela.
  const { hash, key } = location
  useEffect(() => {
    if (hash !== '#exportar' && hash !== '#avisos') return
    const alvo = document.getElementById(hash.slice(1))
    alvo?.scrollIntoView?.()
    alvo?.focus()
  }, [hash, key])

  function salvarPerfil(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) {
      setErroNome(COMUM.escrevaNome)
      return nomeRef.current?.focus()
    }
    setErroNome(null)
    void perfil.enviar({
      aoComecar: () => setStatus(null),
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
    if (!conta) return
    setStatus(null)
    try {
      await navigator.clipboard.writeText(conta.id)
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

  return (
    <ExcluirConta>
      {({ secao, dialogo }) => {
        if (!conta || !usuario) return null
        return (
    <MolduraLogada>
      <Secao as="div">
        <QuadroLayout>
          <Pilha vao="bloco">
            <Pilha vao="grupo" className="max-w-medio">
              <Pilha vao="pilha">
                <h1 ref={titulo} tabIndex={-1} className="cm-h1 alvo-foco wrap-anywhere">
                  {TITULOS.conta}
                </h1>
                <p className="cm-lide wrap-anywhere text-[var(--cor-texto-2)]">{CONTA.resumo(conta.nome, conta.email)}</p>
              </Pilha>
              <RegiaoStatus mensagem={status} />
            </Pilha>

            <Colunas fracoes="16rem 1fr" vao="bloco" aPartirDe={1024}>
              <Coluna>
                <IndiceDaConta secoes={SECOES_DO_INDICE} />
              </Coluna>

              <Coluna>
                <Pilha vao="bloco">
          <section aria-labelledby="perfil" className={SECAO}>
            <Colunas fracoes="5fr 7fr" vao="bloco" aPartirDe={1024}>
            <Pilha dataH="coluna" vao="pilha" className="wrap-anywhere">
              <h2 id="perfil" className="cm-h4">
                {CONTA.perfil.titulo}
              </h2>
              <p className="cm-medida">{CONTA.perfil.frase}</p>
            </Pilha>
            <Pilha dataH="coluna" vao="pilha">
            <form onSubmit={salvarPerfil} noValidate className={`flex ${COLUNA_DOS_CONTROLES} flex-col gap-5`}>
              {erroDoPerfil && !campoDoPerfil ? (
                <ErroDaConta
                  erro={erroDoPerfil}
                  repetivel={perfil.estado.fase === 'erro' && perfil.estado.tentarDeNovo}
                  aoTentarDeNovo={() => void perfil.tentarDeNovo()}
                  refResumo={resumoDoPerfil}
                />
              ) : null}
              <Campo
                rotulo={CONTA.perfil.nome}
                maxLength={NOME_DA_CONTA_MAX}
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
            </Pilha>
            </Colunas>
          </section>

          <SecaoAvisosDaConta aoStatus={setStatus} />

          <section aria-labelledby="id-conta" className={SECAO}>
            <Colunas fracoes="5fr 7fr" vao="bloco" aPartirDe={1024}>
            <Pilha dataH="coluna" vao="pilha" className="wrap-anywhere">
              <h2 id="id-conta" className="cm-h4">
                {CONTA.id.titulo}
              </h2>
              <p className="cm-medida">{CONTA.id.frase}</p>
            </Pilha>
            <Pilha dataH="coluna" vao="pilha" className="items-start">
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
            </Pilha>
            </Colunas>
          </section>

          <ExportarMeusDados aoStatus={setStatus} />

          {secao}

          <section aria-labelledby="privacidade" className={SECAO}>
            <Colunas fracoes="5fr 7fr" vao="bloco" aPartirDe={1024}>
            <Pilha dataH="coluna" vao="pilha" className="wrap-anywhere">
              <h2 id="privacidade" className="cm-h4">
                {CONTA.privacidade.titulo}
              </h2>
            </Pilha>
            <Pilha dataH="coluna" vao="junto" className="items-start">
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
            </Pilha>
            </Colunas>
          </section>
                </Pilha>
              </Coluna>
            </Colunas>
          </Pilha>
        </QuadroLayout>

      {dialogo}
      </Secao>
    </MolduraLogada>
        )
      }}
    </ExcluirConta>
  )
}
