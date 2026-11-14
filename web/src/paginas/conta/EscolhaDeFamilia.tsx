import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { DuasColunas } from '../../componentes/acesso/DuasColunas.tsx'
import { Manchete } from '../../componentes/acesso/Manchete.tsx'
import { Cartao, Pilha } from '../../componentes/base/layout/index.ts'
import { CHAVE_CONVITE, lerChave } from '../../componentes/conta/armazenamento.ts'
import { FormularioBebe } from '../../componentes/conta/FormularioBebe.tsx'
import { FormularioFamilia } from '../../componentes/conta/FormularioFamilia.tsx'
import { useFocoNoResumo, useFocoNoTitulo } from '../../componentes/conta/foco.ts'
import { MolduraLogada } from '../../componentes/conta/MolduraLogada.tsx'
import {
  BOTAO_PRINCIPAL,
  BOTAO_SECUNDARIO,
  Carregando,
  LINK_ALVO,
  RegiaoStatus,
  ResumoErro,
} from '../../componentes/conta/Partes.tsx'
import { useDadosConta, useFamiliaAtual } from '../../componentes/conta/sessao.tsx'
import { COMECAR_FAMILIA, MANCHETES, textoDaPassagem } from '../../conteudo/conta.ts'
import type { Conta } from '../../dados/conta.ts'

type Passo =
  | { tipo: 'escolha' }
  | { tipo: 'familia' }
  | { tipo: 'bebe'; familia: { id: string; fuso: string } }

const CARTAO = 'max-w-[32rem] border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)]'

// /app/comecar com a conta completa (RF-14): "Criar uma família" (nome, fuso e depois o primeiro
// bebê) ou "Tenho um convite". Com código de convite guardado, vai direto a /convite. A mensagem de
// passagem que chegar (`acesso_encerrado`, `senha_trocada`) aparece no status.
export function EscolhaDeFamilia({ conta }: { conta: Conta }) {
  const dados = useDadosConta()
  const familias = useFamiliaAtual()
  const location = useLocation()
  const navigate = useNavigate()
  const titulo = useFocoNoTitulo()
  const [passo, setPasso] = useState<Passo>({ tipo: 'escolha' })
  const resumoDaLeitura = useFocoNoResumo(familias.estado === 'erro' ? familias.erro : null)

  // O código guardado leva direto à prévia: quem tem convite não precisa escolher.
  if (lerChave('sessao', CHAVE_CONVITE)) return <Navigate to="/convite" replace />

  const carregando = familias.estado === 'carregando'
  const irParaAFamilia = (id: string) => void navigate(`/app/familia?familia=${encodeURIComponent(id)}`)

  return (
    <MolduraLogada ocupado={carregando}>
      <DuasColunas>
        <Pilha vao="grupo">
        <Manchete linhas={MANCHETES.comecarFamilia} refTitulo={titulo} />
        <RegiaoStatus mensagem={textoDaPassagem(location.state)} />

        {carregando ? (
          <Carregando />
        ) : familias.estado === 'erro' && familias.erro ? (
          <div className="max-w-[32rem]">
            <ResumoErro
              erro={familias.erro}
              repetivel
              aoTentarDeNovo={() => void familias.recarregar()}
              refResumo={resumoDaLeitura}
            />
          </div>
        ) : passo.tipo === 'escolha' ? (
          <Cartao as="section" aria-labelledby="titulo-escolha" className={CARTAO}>
           <Pilha vao="grupo">
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
          </Cartao>
        ) : passo.tipo === 'familia' ? (
          <Cartao as="section" aria-labelledby="titulo-criar-familia" className={CARTAO}>
           <Pilha vao="pilha">
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
              escrever={(nome, fuso) => dados.criarFamilia(nome, fuso)}
              aoPerderResposta={familias.recarregar}
              aoSucesso={(id, _nome, fuso) => {
                if (id) setPasso({ tipo: 'bebe', familia: { id, fuso } })
              }}
              comAviso
            />
           </Pilha>
          </Cartao>
        ) : (
          <Cartao as="section" aria-labelledby="titulo-primeiro-bebe" className={CARTAO}>
           <Pilha vao="pilha">
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
              aoPerderResposta={familias.recarregar}
              comAviso
            />
           </Pilha>
          </Cartao>
        )}

        {!carregando && familias.familias.length > 0 ? (
          <Link to="/app/familia" className={`${LINK_ALVO} self-start`}>
            {COMECAR_FAMILIA.irParaFamilia}
          </Link>
        ) : null}
        </Pilha>
      </DuasColunas>
    </MolduraLogada>
  )
}
