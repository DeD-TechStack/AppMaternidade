import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { Cartao } from '../../componentes/base/layout/Cartao.tsx'
import { BOTAO_PRINCIPAL, LINK_ALVO } from '../../componentes/conta/Partes.tsx'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { ErroDeLeitura, ResumoDeErro } from '../../componentes/comunidade/Avisos.tsx'
import { CampoComContador, EscolhaDeFaixa } from '../../componentes/comunidade/Campos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { useEscrita } from '../../componentes/comunidade/escrita.ts'
import { Faixa } from '../../componentes/comunidade/Faixa.tsx'
import { Quadro, TituloDaTela } from '../../componentes/comunidade/Quadro.tsx'
import { ehEscritor, useSituacao } from '../../componentes/comunidade/situacao.ts'
import { voltaDaComunidade } from '../../componentes/comunidade/volta.ts'
import {
  COMUM_COMUNIDADE,
  ENTRAR_NA_COMUNIDADE,
  TEXTOS_ERRO_COMUNIDADE,
  TX,
} from '../../conteudo/comunidade.ts'
import { ehPerfilJaCriado } from '../../dados/comunidade.erros.ts'
import { LIMITES, apelidoValido, conferirLimite, type FaixaBebe } from '../../dados/comunidade.regras.ts'

const ID_DO_APELIDO = 'campo-apelido'
const ID_DA_BIO = 'campo-bio'
const LIMITE_DA_BIO = { min: 0, max: LIMITES.bio.max }

interface PassoProps {
  versao: string
  /** O passo mudou a situação da conta: a tela a relê. */
  aoMudar: () => Promise<void>
}

function PassoDosTermos({ versao, aoMudar }: PassoProps) {
  const dados = useDadosComunidade()
  const [aceito, setAceito] = useState(false)
  const [tentou, setTentou] = useState(false)
  const envio = useEscrita<boolean>()
  const erro = envio.estado.fase === 'erro' ? envio.estado : null
  const resumo = useFocoNoResumo(erro)
  const marcaFaltando = tentou && !aceito

  function aoAceitar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    // Sem a marca, nada vai ao banco.
    if (!aceito) {
      setTentou(true)
      return
    }
    void envio.enviar({
      escrever: async () => {
        const feita = await dados.aceitarTermos(versao)
        // A versão mudou entre a leitura e o envio: a tela relê a situação e mostra o passo de novo.
        if (!feita.ok && feita.erro.chave === 'versao_nao_vigente') void aoMudar()
        return feita.ok ? { ok: true, valor: true } : feita
      },
      conferir: async () => {
        const lida = await dados.situacaoDaConta()
        if (!lida.ok) return lida
        return { ok: true, valor: lida.valor.aceiteVigente ? { valor: true } : null }
      },
      aoSucesso: () => aoMudar(),
    })
  }

  return (
    <form onSubmit={aoAceitar} noValidate aria-labelledby="passo-termos" className="max-w-[34rem]">
      <Cartao className="flex flex-col gap-esp-pilha border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)]">
        <h2 id="passo-termos" className="cm-h4 text-titulo-4">
          {ENTRAR_NA_COMUNIDADE.termosTitulo}
        </h2>
        <p>{ENTRAR_NA_COMUNIDADE.termosFrase}</p>
        <ul className="m-0 flex list-none flex-col p-0">
          <li>
            <Link to="/termos" className={LINK_ALVO}>
              {COMUM_COMUNIDADE.linkTermos}
            </Link>
          </li>
          <li>
            <Link to="/regras-da-comunidade" className={LINK_ALVO}>
              {COMUM_COMUNIDADE.linkRegras}
            </Link>
          </li>
        </ul>
        {erro ? (
          <ResumoDeErro
            texto={erro.texto}
            rotuloDaAcao={erro.acao === 'conferir' ? COMUM_COMUNIDADE.conferir : erro.acao ? COMUM_COMUNIDADE.tentarDeNovo : undefined}
            aoAgir={() => void envio.tentarDeNovo()}
            refResumo={resumo}
          />
        ) : null}
        <div className="flex flex-col gap-1">
          <label className="alvo-toque flex cursor-pointer items-start gap-3 py-2">
            <input
              type="checkbox"
              checked={aceito}
              onChange={(evento) => setAceito(evento.target.checked)}
              aria-invalid={marcaFaltando ? true : undefined}
              aria-describedby={marcaFaltando ? 'erro-da-marca' : undefined}
              className="mt-1 size-5 shrink-0 accent-[var(--cor-texto)]"
            />
            <span>{TX.tx03}</span>
          </label>
          {marcaFaltando ? (
            <p id="erro-da-marca" className="cm-campo-erro cm-pequeno">
              {ENTRAR_NA_COMUNIDADE.marqueACaixa}
            </p>
          ) : null}
        </div>
        <button type="submit" disabled={envio.enviando} className={BOTAO_PRINCIPAL}>
          {envio.enviando ? COMUM_COMUNIDADE.enviando : ENTRAR_NA_COMUNIDADE.aceitar}
        </button>
      </Cartao>
    </form>
  )
}

function PassoDoPerfil({ aoMudar, focarNoApelido }: Pick<PassoProps, 'aoMudar'> & { focarNoApelido: boolean }) {
  const dados = useDadosComunidade()
  const [apelido, setApelido] = useState('')
  const [bio, setBio] = useState('')
  const [faixa, setFaixa] = useState<FaixaBebe | null>(null)
  const [tentou, setTentou] = useState(false)
  const envio = useEscrita<boolean>()
  const erro = envio.estado.fase === 'erro' ? envio.estado : null
  const apelidoEmUso = erro?.erro.chave === 'apelido_em_uso'
  const resumo = useFocoNoResumo(erro && !apelidoEmUso ? erro : null)

  useEffect(() => {
    if (apelidoEmUso) document.getElementById(ID_DO_APELIDO)?.focus()
  }, [apelidoEmUso, envio.estado])

  // Depois do aceite o formulário dos termos some e leva o foco: o passo do perfil o recebe no apelido.
  useEffect(() => {
    if (focarNoApelido) document.getElementById(ID_DO_APELIDO)?.focus()
  }, [focarNoApelido])

  const bioFinal = bio.trim() === '' ? null : bio
  const apelidoOk = apelidoValido(apelido)
  const bioOk = bioFinal === null || conferirLimite(bioFinal, LIMITES.bio) === 'ok'
  const erroDoApelido = apelidoEmUso
    ? erro.texto
    : apelido !== '' && !apelidoOk
      ? ENTRAR_NA_COMUNIDADE.erroApelido
      : tentou && !apelidoOk
        ? ENTRAR_NA_COMUNIDADE.erroApelido
        : null

  function aoCriar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setTentou(true)
    if (!apelidoOk) return document.getElementById(ID_DO_APELIDO)?.focus()
    if (!bioOk) return document.getElementById(ID_DA_BIO)?.focus()
    void envio.enviar({
      escrever: async () => {
        const feita = await dados.criarPerfil(apelido, bioFinal, faixa)
        // O perfil já existe (criado noutra aba): a tela segue como se tivesse criado.
        if (!feita.ok && ehPerfilJaCriado(feita.erro)) return { ok: true, valor: true }
        return feita.ok ? { ok: true, valor: true } : feita
      },
      conferir: async () => {
        const lida = await dados.situacaoDaConta()
        if (!lida.ok) return lida
        return { ok: true, valor: lida.valor.perfilId !== null ? { valor: true } : null }
      },
      aoSucesso: () => aoMudar(),
    })
  }

  return (
    <form onSubmit={aoCriar} noValidate aria-labelledby="passo-perfil" className="max-w-[34rem]">
      <Cartao className="flex flex-col gap-esp-pilha border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)]">
        <h2 id="passo-perfil" className="cm-h4 text-titulo-4">
          {ENTRAR_NA_COMUNIDADE.perfilTitulo}
        </h2>
        {erro && !apelidoEmUso ? (
          <ResumoDeErro
            texto={erro.texto}
            rotuloDaAcao={erro.acao === 'conferir' ? COMUM_COMUNIDADE.conferir : erro.acao ? COMUM_COMUNIDADE.tentarDeNovo : undefined}
            aoAgir={() => void envio.tentarDeNovo()}
            refResumo={resumo}
          />
        ) : null}
        <CampoComContador
          id={ID_DO_APELIDO}
          rotulo={ENTRAR_NA_COMUNIDADE.apelido}
          valor={apelido}
          aoMudar={(valor) => {
            setApelido(valor)
            envio.limpar()
          }}
          limite={LIMITES.apelido}
          mensagemDoLimite={ENTRAR_NA_COMUNIDADE.erroApelido}
          erro={erroDoApelido}
          ajuda={TX.tx04}
          autoComplete="nickname"
          tentou={tentou}
        />
        <CampoComContador
          id={ID_DA_BIO}
          rotulo={ENTRAR_NA_COMUNIDADE.bio}
          valor={bio}
          aoMudar={setBio}
          limite={LIMITE_DA_BIO}
          mensagemDoLimite={ENTRAR_NA_COMUNIDADE.erroBio}
          linhas={3}
        />
        <EscolhaDeFaixa rotulo={COMUM_COMUNIDADE.faixaOpcional} valor={faixa} aoMudar={setFaixa} />
        <button type="submit" disabled={envio.enviando} className={BOTAO_PRINCIPAL}>
          {envio.enviando ? COMUM_COMUNIDADE.enviando : ENTRAR_NA_COMUNIDADE.criarPerfil}
        </button>
      </Cartao>
    </form>
  )
}

// C5, /app/comunidade/entrar: o aceite dos termos e a criação do perfil, cada passo só quando falta.
// Depois dos dois, vai ao `volta` (o destino da ação que trouxe a pessoa) ou à C1, com TX-25.
export function EntrarNaComunidade() {
  const [parametros] = useSearchParams()
  const navegar = useNavigate()
  const destino = voltaDaComunidade(parametros.get('volta')) ?? '/app/comunidade'
  const situacao = useSituacao()
  const lida = situacao.estado.fase === 'pronto' ? situacao.estado.valor : null
  // Quem já chega habilitado não tem o que fazer aqui: vai direto ao destino.
  const [chegouHabilitado, setChegouHabilitado] = useState<boolean | null>(null)
  if (lida && chegouHabilitado === null) setChegouHabilitado(ehEscritor(lida))
  // O aceite foi feito nesta tela: o passo do perfil que vem depois recebe o foco no apelido.
  const [aceitouAqui, setAceitouAqui] = useState(false)

  // Os dois passos feitos: vai ao destino, com a confirmação TX-25.
  useEffect(() => {
    if (lida && ehEscritor(lida) && chegouHabilitado === false) {
      void navegar(destino, { replace: true, state: { mensagemComunidade: 'perfil_pronto' } })
    }
  }, [lida, chegouHabilitado, destino, navegar])

  if (chegouHabilitado === true) return <Navigate to={destino} replace />

  const semTermos = lida !== null && !lida.aceiteVigente && lida.versaoVigente === null
  const passoDoAceite = lida !== null && !lida.aceiteVigente && lida.versaoVigente !== null
  const passoDoPerfil = lida !== null && lida.aceiteVigente && lida.perfilId === null

  return (
    <Quadro
      voltar={destino}
      ocupado={situacao.estado.fase === 'carregando'}
      titulo={<TituloDaTela linhas={ENTRAR_NA_COMUNIDADE.manchete} />}
      cabeca={
        <>
          {situacao.estado.fase === 'erro' ? (
            <ErroDeLeitura erro={situacao.estado.erro} aoTentarDeNovo={() => void situacao.recarregar()} />
          ) : null}
          {semTermos ? <p className="max-w-[34rem] font-medium">{TEXTOS_ERRO_COMUNIDADE.termos_indisponiveis}</p> : null}
        </>
      }
    >
      {passoDoAceite && lida.versaoVigente ? (
        <Faixa>
          <PassoDosTermos
            versao={lida.versaoVigente}
            aoMudar={() => {
              setAceitouAqui(true)
              return situacao.reler()
            }}
          />
        </Faixa>
      ) : null}
      {passoDoPerfil ? (
        <Faixa>
          <PassoDoPerfil aoMudar={() => situacao.reler()} focarNoApelido={aceitouAqui} />
        </Faixa>
      ) : null}
    </Quadro>
  )
}
