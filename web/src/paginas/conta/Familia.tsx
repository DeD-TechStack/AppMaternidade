import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Colunas, Pilha, QuadroLayout, Secao } from '../../componentes/base/layout/index.ts'
import { familiaMudou, useAoFalharNaFamilia, type AcoesDaFamilia, type DialogoAberto } from '../../componentes/conta/acoesFamilia.ts'
import { BlocoAcoes } from '../../componentes/conta/BlocoAcoes.tsx'
import { BlocoBebes } from '../../componentes/conta/BlocoBebes.tsx'
import { BlocoConvites } from '../../componentes/conta/BlocoConvites.tsx'
import { BlocoMembros } from '../../componentes/conta/BlocoMembros.tsx'
import { SeletorDeOpcoes } from '../../componentes/conta/Campos.tsx'
import { DialogoDaFamilia } from '../../componentes/conta/DialogoDaFamilia.tsx'
import { useFocoNoResumo, useFocoNoTitulo } from '../../componentes/conta/foco.ts'
import { MolduraLogada } from '../../componentes/conta/MolduraLogada.tsx'
import { Carregando, LINK_ALVO, RegiaoStatus, ResumoErro } from '../../componentes/conta/Partes.tsx'
import { useDadosConta, useFamiliaAtual } from '../../componentes/conta/sessao.tsx'
import { FAMILIA, PAPEIS, TITULOS, textoDaPassagem } from '../../conteudo/conta.ts'
import type { ErroDados } from '../../dados/comum.ts'
import type { DetalheFamilia } from '../../dados/conta.ts'

type LeituraDoDetalhe =
  | { familiaId: string; fase: 'pronto'; valor: DetalheFamilia }
  | { familiaId: string; fase: 'erro'; erro: ErroDados }

// /app/familia (RF-15): a família atual, com bebês, membros, convites (só o responsável) e as ações da
// família. Toda ação relê as famílias e a família; se a pessoa perdeu o vínculo, a tela passa para a
// próxima família e avisa, ou vai a /app/comecar quando não sobra nenhuma.
export function Familia() {
  const dados = useDadosConta()
  const familias = useFamiliaAtual()
  const location = useLocation()
  const navigate = useNavigate()
  const [parametros, setParametros] = useSearchParams()
  const titulo = useFocoNoTitulo()

  // Uma região de status só: a confirmação da última ação (ou a mensagem de passagem recebida).
  const [status, setStatus] = useState<string | null>(() => textoDaPassagem(location.state))
  const [erroDaPagina, setErroDaPagina] = useState<ErroDados | null>(null)
  const [detalhe, setDetalhe] = useState<LeituraDoDetalhe | null>(null)
  const [dialogo, setDialogo] = useState<DialogoAberto | null>(null)
  const retorno = useRef<HTMLElement | null>(null)
  const focoNoTitulo = useRef(false)
  const resumoDaPagina = useFocoNoResumo(erroDaPagina)

  const { atual, escolher, recarregar: recarregarFamilias } = familias
  const atualId = atual?.id ?? null
  const nomeAtual = atual?.nome ?? ''
  // A leitura de uma família que já não é a atual não vale mais.
  const alvo = useRef(atualId)
  useEffect(() => {
    alvo.current = atualId
  })

  const carregarDetalhe = useCallback(
    async (id: string) => {
      const lida = await dados.detalheFamilia(id)
      if (id !== alvo.current) return
      setDetalhe(lida.ok ? { familiaId: id, fase: 'pronto', valor: lida.valor } : { familiaId: id, fase: 'erro', erro: lida.erro })
    },
    [dados],
  )

  // Relê as famílias; sem a família atual na lista, a pessoa perdeu o vínculo.
  const reler = useCallback(
    async (voluntaria = false) => {
      const lida = await dados.minhasFamilias()
      if (!lida.ok) return setErroDaPagina(lida.erro)
      if (atualId && !lida.valor.some((familia) => familia.id === atualId)) {
        setErroDaPagina(null)
        if (lida.valor.length === 0) {
          void navigate('/app/comecar', {
            replace: true,
            state: voluntaria ? null : { mensagem: 'acesso_encerrado', familia: nomeAtual },
          })
          return
        }
        // A próxima família atual segue a regra do glossário: a de `criada_em` mais antiga.
        escolher(lida.valor[0].id)
        if (!voluntaria) {
          setStatus(textoDaPassagem({ mensagem: 'acesso_encerrado', familia: nomeAtual }))
          focoNoTitulo.current = true
        }
        setDetalhe(null)
        await recarregarFamilias()
        return
      }
      await recarregarFamilias()
      if (atualId) await carregarDetalhe(atualId)
    },
    [dados, atualId, nomeAtual, navigate, escolher, recarregarFamilias, carregarDetalhe],
  )

  const acoes = useMemo<AcoesDaFamilia>(
    () => ({
      abrirDialogo(novo, botao) {
        retorno.current = botao
        setErroDaPagina(null)
        setDialogo(novo)
      },
      async aposAcao(mensagem, voluntaria = false) {
        setStatus(mensagem)
        setErroDaPagina(null)
        await reler(voluntaria)
      },
      async aposFalha(erro) {
        setDialogo(null)
        setStatus(null)
        setErroDaPagina(erro)
        await reler()
      },
      async relerDetalhe() {
        if (atualId) await carregarDetalhe(atualId)
      },
      dizer: setStatus,
    }),
    [reler, atualId, carregarDetalhe],
  )

  // A leitura da família atual, ao montar e quando a atual muda.
  useEffect(() => {
    if (!atualId) return
    queueMicrotask(() => void carregarDetalhe(atualId))
  }, [atualId, carregarDetalhe])

  // `?familia=<id>`: a tela grava a escolha e tira o parâmetro, sem criar entrada no histórico.
  const parametro = parametros.get('familia')
  const listaPronta = familias.estado === 'pronto'
  const idsDasFamilias = familias.familias.map((familia) => familia.id).join(',')
  useEffect(() => {
    if (!parametro || !listaPronta) return
    queueMicrotask(() => {
      if (idsDasFamilias.split(',').includes(parametro)) escolher(parametro)
      setParametros(
        (anteriores) => {
          const novos = new URLSearchParams(anteriores)
          novos.delete('familia')
          return novos
        },
        { replace: true },
      )
    })
  }, [parametro, listaPronta, idsDasFamilias, escolher, setParametros])

  const leitura = detalhe && detalhe.familiaId === atualId ? detalhe : null
  const erroDaLeitura = leitura?.fase === 'erro' ? leitura.erro : null
  const pronto = leitura?.fase === 'pronto' ? leitura.valor : null
  const resumoDaLeitura = useFocoNoResumo(erroDaLeitura && !familiaMudou(erroDaLeitura) ? erroDaLeitura : null)
  useAoFalharNaFamilia(erroDaLeitura, acoes.aposFalha)

  // O acesso encerrado leva o foco ao h1, mas só quando a família nova já está na tela: antes disso a
  // caixa que fechou ainda devolve o foco ao botão que a abriu.
  useEffect(() => {
    if (!focoNoTitulo.current || !pronto) return
    focoNoTitulo.current = false
    titulo.current?.focus()
  })

  // Com sessão e sem família ativa, a Família leva a /app/comecar (RF-09).
  if (familias.estado === 'pronto' && familias.familias.length === 0) {
    return <Navigate to="/app/comecar" replace state={location.state} />
  }

  const carregando = familias.estado === 'carregando' || (atual !== null && leitura === null)
  const responsavel = pronto?.familia.meuPapel === 'responsavel'

  return (
    <MolduraLogada ocupado={carregando}>
      <Secao as="div">
        <QuadroLayout>
          <Pilha vao="bloco">
            <Pilha vao="grupo" className="max-w-medio">
              <h1 ref={titulo} tabIndex={-1} className="cm-h1 alvo-foco wrap-anywhere">
                {TITULOS.familia}
              </h1>
              <RegiaoStatus mensagem={status} />
              {erroDaPagina ? (
                <div className="max-w-[40rem]">
                  <ResumoErro erro={erroDaPagina} refResumo={resumoDaPagina} />
                </div>
              ) : null}
            </Pilha>

            {/* O seletor fica fora do que carrega: trocar de família deixa o foco nele. */}
            {atual && familias.familias.length > 1 ? (
              <div className="max-w-[24rem]">
                <SeletorDeOpcoes
                  rotulo={FAMILIA.seletor}
                  valor={atual.id}
                  opcoes={familias.familias.map((familia) => ({ valor: familia.id, texto: familia.nome }))}
                  aoMudar={escolher}
                />
              </div>
            ) : null}

            {familias.estado === 'erro' && familias.erro ? (
              <div className="max-w-[40rem]">
                <ResumoErro erro={familias.erro} repetivel aoTentarDeNovo={() => void recarregarFamilias()} />
              </div>
            ) : carregando ? (
              <Carregando />
            ) : erroDaLeitura && !familiaMudou(erroDaLeitura) ? (
              <div className="max-w-[40rem]">
                <ResumoErro
                  erro={erroDaLeitura}
                  repetivel
                  aoTentarDeNovo={() => atualId && void carregarDetalhe(atualId)}
                  refResumo={resumoDaLeitura}
                />
              </div>
            ) : pronto ? (
              <Colunas fracoes="5fr 7fr" vao="bloco" aPartirDe={1024}>
                <Pilha
                  as="section"
                  dataH="coluna"
                  vao="junto"
                  aria-labelledby="familia-atual"
                  className="lg:sticky lg:top-28 lg:self-start"
                >
                  <h2 id="familia-atual" className="cm-h3 wrap-anywhere">
                    {pronto.familia.nome}
                  </h2>
                  <p className="text-[var(--cor-texto-2)]">{FAMILIA.fuso(pronto.familia.fuso)}</p>
                  <p className="font-medium">{FAMILIA.voceE(PAPEIS[pronto.familia.meuPapel].minusculo)}</p>
                </Pilha>

                <Pilha
                  dataH="coluna"
                  vao="bloco"
                  className="[&>*]:border-t [&>*]:border-[var(--cor-fio-suave)] [&>*]:pt-esp-bloco"
                >
                  <BlocoBebes key={`bebes-${pronto.familia.id}`} detalhe={pronto} responsavel={responsavel} acoes={acoes} />
                  <BlocoMembros detalhe={pronto} responsavel={responsavel} acoes={acoes} />
                  {responsavel ? <BlocoConvites key={`convites-${pronto.familia.id}`} detalhe={pronto} acoes={acoes} /> : null}
                  <BlocoAcoes key={`acoes-${pronto.familia.id}`} detalhe={pronto} responsavel={responsavel} acoes={acoes} />
                  <div>
                    <Link to="/privacidade" className={LINK_ALVO}>
                      {FAMILIA.privacidade}
                    </Link>
                  </div>
                </Pilha>
              </Colunas>
            ) : null}
          </Pilha>
        </QuadroLayout>

        {dialogo && pronto ? (
          <DialogoDaFamilia
            dialogo={dialogo}
            detalhe={pronto}
            acoes={acoes}
            aoFechar={() => setDialogo(null)}
            retorno={retorno}
          />
        ) : null}
      </Secao>
    </MolduraLogada>
  )
}
