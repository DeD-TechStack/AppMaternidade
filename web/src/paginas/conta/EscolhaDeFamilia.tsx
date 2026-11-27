import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { DuasColunas } from '../../componentes/acesso/DuasColunas.tsx'
import { Manchete } from '../../componentes/acesso/Manchete.tsx'
import { AvisoDaTela } from '../../componentes/app/AvisoDaTela.tsx'
import { Pilha } from '../../componentes/base/layout/index.ts'
import { CHAVE_CONVITE, lerChave } from '../../componentes/conta/armazenamento.ts'
import { FormularioBebe } from '../../componentes/conta/FormularioBebe.tsx'
import { FormularioFamilia } from '../../componentes/conta/FormularioFamilia.tsx'
import { useFocoNoResumo, useFocoNoTitulo } from '../../componentes/conta/foco.ts'
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, LINK_ALVO, RegiaoStatus } from '../../componentes/conta/Partes.tsx'
import { useDadosConta, useFamiliaAtual } from '../../componentes/conta/sessao.tsx'
import { Carregando } from '../../componentes/estado/Carregando.tsx'
import { ErroDaConta } from '../../componentes/estado/ErroDaConta.tsx'
import { COMECAR_FAMILIA, COMUM, MANCHETES, textoDaPassagem } from '../../conteudo/conta.ts'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import type { Conta } from '../../dados/conta.ts'
import { erroDaChave } from '../../dados/conta.erros.ts'
import { ehUuid } from '../../dados/rotina.uuid.ts'

type Passo =
  | { tipo: 'escolha' }
  | { tipo: 'familia' }
  | { tipo: 'bebe'; familia: { id: string; fuso: string } }

// /app/comecar com a conta completa (RF-14): "Criar uma família" (nome, fuso e depois o primeiro
// bebê) ou "Tenho um convite". Com código de convite guardado, vai direto a /convite. A mensagem de
// passagem que chegar (`acesso_encerrado`, `senha_trocada`) aparece no status.
export function EscolhaDeFamilia({ conta }: { conta: Conta }) {
  return <EscolhaDaConta key={conta.id} conta={conta} />
}

function EscolhaDaConta({ conta }: { conta: Conta }) {
  const dados = useDadosConta()
  const familias = useFamiliaAtual()
  const location = useLocation()
  const navigate = useNavigate()
  const titulo = useFocoNoTitulo()
  const [passo, setPasso] = useState<Passo>({ tipo: 'escolha' })
  const [criacaoIncerta, setCriacaoIncerta] = useState<ErroDados | null>(null)
  const bloqueioDaCriacao = useRef<ErroDados | null>(null)
  const carregando = passo.tipo === 'escolha' && familias.estado === 'carregando'
  const erroDaEscolha = passo.tipo === 'escolha' && familias.estado === 'erro' ? familias.erro : null
  const resumoDaLeitura = useFocoNoResumo(erroDaEscolha)

  // O código guardado leva direto à prévia: quem tem convite não precisa escolher.
  if (lerChave('sessao', CHAVE_CONVITE)) return <Navigate to="/convite" replace />

  // A releitura ajuda a conferir a lista, mas o resultado da escrita pertence ao formulário.
  const relerAposRespostaPerdida = () => familias.recarregar().catch(() => undefined)
  const irParaAFamilia = (id: string) => void navigate(`/app/familia?familia=${encodeURIComponent(id)}`)

  async function criarFamilia(nome: string, fuso: string): Promise<Resultado<string>> {
    if (bloqueioDaCriacao.current) return { ok: false, erro: bloqueioDaCriacao.current }
    const resultado = await dados.criarFamilia(nome, fuso).catch(() => ({ ok: false as const, erro: erroDaChave('desconhecido') }))
    if (resultado.ok && ehUuid(resultado.valor)) return resultado
    const erro = resultado.ok ? erroDaChave('desconhecido') : resultado.erro
    if (erro.classe === 'rede' || erro.classe === 'desconhecido') {
      // A lista não confirma a identidade da operação. Não envie outra criação neste fluxo.
      bloqueioDaCriacao.current = erro
      setCriacaoIncerta(erro)
      await relerAposRespostaPerdida()
    }
    return { ok: false, erro }
  }

  return (
    <>
      <main aria-busy={carregando || undefined}>
        <DuasColunas>
          <Pilha vao="grupo">
            <Manchete texto={MANCHETES.comecarFamilia} refTitulo={titulo} />
            <RegiaoStatus mensagem={textoDaPassagem(location.state)} />

            {carregando ? (
              <Carregando texto={COMUM.carregando} />
            ) : erroDaEscolha ? (
              <ErroDaConta
                erro={erroDaEscolha}
                repetivel
                aoTentarDeNovo={() => void familias.recarregar()}
                refResumo={resumoDaLeitura}
              />
            ) : passo.tipo === 'escolha' ? (
              <Pilha as="section" vao="grupo" aria-labelledby="titulo-escolha">
                <Pilha vao="junto">
                  <h2 id="titulo-escolha" className="cm-h4">
                    {COMECAR_FAMILIA.titulo}
                  </h2>
                  <p>{COMECAR_FAMILIA.frase}</p>
                </Pilha>
                <Pilha vao="junto">
                  <button type="button" className={BOTAO_PRINCIPAL} onClick={() => setPasso({ tipo: 'familia' })}>
                    {COMECAR_FAMILIA.criar.botao}
                  </button>
                  <p className="cm-pequeno text-[var(--cor-texto-2)]">{COMECAR_FAMILIA.criar.texto}</p>
                </Pilha>
                <Pilha vao="junto">
                  <Link to="/convite" className={`${BOTAO_SECUNDARIO} w-full`} data-botao="contorno" data-tamanho="app">
                    {COMECAR_FAMILIA.convite.botao}
                  </Link>
                  <p className="cm-pequeno text-[var(--cor-texto-2)]">{COMECAR_FAMILIA.convite.texto}</p>
                </Pilha>
              </Pilha>
            ) : passo.tipo === 'familia' ? (
              <Pilha as="section" vao="pilha" aria-labelledby="titulo-criar-familia">
                <h2 id="titulo-criar-familia" className="cm-h4">
                  {COMECAR_FAMILIA.formulario.titulo}
                </h2>
                <FormularioFamilia
                  fuso={conta.fuso}
                  rotuloNome={COMECAR_FAMILIA.formulario.nome}
                  ajudaNome={COMECAR_FAMILIA.formulario.ajudaNome}
                  rotuloFuso={COMECAR_FAMILIA.formulario.fuso}
                  ajudaFuso={COMECAR_FAMILIA.formulario.ajudaFuso}
                  rotuloSalvar={COMECAR_FAMILIA.formulario.botao}
                  rotuloSecundario={COMECAR_FAMILIA.formulario.voltar}
                  aoSecundario={() => setPasso({ tipo: 'escolha' })}
                  escrever={criarFamilia}
                  criacaoIncerta={criacaoIncerta ? {
                    erro: criacaoIncerta,
                    texto: criacaoIncerta.classe === 'rede'
                      ? COMUM.conexaoCaiu
                      : COMECAR_FAMILIA.formulario.confirmacaoIncerta,
                  } : null}
                  aoSucesso={(id, _nome, fuso) => {
                    // A lista não confirma qual família foi criada. Só o id da resposta permite avançar.
                    if (id) setPasso({ tipo: 'bebe', familia: { id, fuso } })
                  }}
                  comAviso
                />
                {criacaoIncerta ? (
                  <button type="button" className={BOTAO_SECUNDARIO} onClick={() => void relerAposRespostaPerdida()}>
                    Atualizar lista de famílias
                  </button>
                ) : null}
              </Pilha>
            ) : (
              <Pilha as="section" vao="pilha" aria-labelledby="titulo-primeiro-bebe">
                <h2 id="titulo-primeiro-bebe" className="cm-h4">
                  {COMECAR_FAMILIA.bebe.titulo}
                </h2>
                <FormularioBebe
                  familiaId={passo.familia.id}
                  fuso={passo.familia.fuso}
                  frase={COMECAR_FAMILIA.bebe.frase}
                  rotuloSalvar={COMECAR_FAMILIA.bebe.salvar}
                  rotuloSecundario={COMECAR_FAMILIA.bebe.depois}
                  aoSecundario={() => irParaAFamilia(passo.familia.id)}
                  aoSalvo={() => irParaAFamilia(passo.familia.id)}
                  aoPerderResposta={relerAposRespostaPerdida}
                  comAviso
                />
              </Pilha>
            )}

            {!carregando && familias.familias.length > 0 ? (
              <Link to="/app/familia" className={`${LINK_ALVO} self-start`}>
                {COMECAR_FAMILIA.irParaFamilia}
              </Link>
            ) : null}
          </Pilha>
        </DuasColunas>
      </main>
      <AvisoDaTela />
    </>
  )
}
