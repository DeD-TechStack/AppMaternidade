import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { Link, useLocation } from 'react-router'
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, LINK_ALVO } from '../../componentes/conta/Partes.tsx'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { ErroDeLeitura, Esqueleto, ParaEntrar, ResumoDeErro } from '../../componentes/comunidade/Avisos.tsx'
import { CampoComContador, EscolhaDeFaixa } from '../../componentes/comunidade/Campos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { useEscrita } from '../../componentes/comunidade/escrita.ts'
import { useFocoPendente } from '../../componentes/comunidade/foco.ts'
import { Quadro, TituloDaTela } from '../../componentes/comunidade/Quadro.tsx'
import { ehEscritor, useSituacao } from '../../componentes/comunidade/situacao.ts'
import { Status } from '../../componentes/comunidade/Status.tsx'
import { useLeitura } from '../../componentes/comunidade/useLeitura.ts'
import { caminhoDeEntrada } from '../../componentes/comunidade/volta.ts'
import {
  COMUM_COMUNIDADE,
  ENTRAR_NA_COMUNIDADE,
  PERFIL,
  ROTULO_FAIXA,
  TX,
  textoDaPassagemComunidade,
} from '../../conteudo/comunidade.ts'
import type { Resultado } from '../../dados/comum.ts'
import { formatarDataHora, type PerfilPublico } from '../../dados/comunidade.ts'
import { LIMITES, apelidoValido, conferirLimite, type FaixaBebe } from '../../dados/comunidade.regras.ts'

const ID_DO_APELIDO = 'perfil-apelido'
const ID_DA_BIO = 'perfil-bio'
const LIMITE_DA_BIO = { min: 0, max: LIMITES.bio.max }

interface FormularioProps {
  perfil: PerfilPublico
  aoSalvar: () => Promise<void>
}

// Quem é escritor habilitado edita o perfil: apelido de 3 a 30, bio de até 160 e faixa.
function FormularioDoPerfil({ perfil, aoSalvar }: FormularioProps) {
  const dados = useDadosComunidade()
  const [apelido, setApelido] = useState(perfil.apelido)
  const [bio, setBio] = useState(perfil.bio ?? '')
  const [faixa, setFaixa] = useState<FaixaBebe | null>(perfil.faixa)
  const [tentou, setTentou] = useState(false)
  const envio = useEscrita<string>()
  const erro = envio.estado.fase === 'erro' ? envio.estado : null
  const apelidoEmUso = erro?.erro.chave === 'apelido_em_uso'
  const resumo = useFocoNoResumo(erro && !apelidoEmUso ? erro : null)
  const bioFinal = bio.trim() === '' ? null : bio
  const apelidoOk = apelidoValido(apelido)
  const bioOk = bioFinal === null || conferirLimite(bioFinal, LIMITES.bio) === 'ok'
  const erroDoApelido = apelidoEmUso ? erro.texto : (apelido !== '' || tentou) && !apelidoOk ? ENTRAR_NA_COMUNIDADE.erroApelido : null

  // O apelido em uso é erro do campo: o foco vai a ele.
  useEffect(() => {
    if (apelidoEmUso) document.getElementById(ID_DO_APELIDO)?.focus()
  }, [apelidoEmUso, envio.estado])

  function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setTentou(true)
    if (!apelidoOk) return document.getElementById(ID_DO_APELIDO)?.focus()
    if (!bioOk) return document.getElementById(ID_DA_BIO)?.focus()
    void envio.enviar({
      escrever: () => dados.editarPerfil(apelido, bioFinal, faixa),
      aoSucesso: () => aoSalvar(),
    })
  }

  return (
    <form onSubmit={salvar} noValidate className="flex max-w-[34rem] flex-col gap-5">
      {erro && !apelidoEmUso ? (
        <ResumoDeErro
          texto={erro.texto}
          rotuloDaAcao={erro.acao ? COMUM_COMUNIDADE.tentarDeNovo : undefined}
          aoAgir={() => void envio.tentarDeNovo()}
          refResumo={resumo}
        />
      ) : null}
      <CampoComContador
        id={ID_DO_APELIDO}
        rotulo={PERFIL.apelidoRotulo}
        valor={apelido}
        aoMudar={(valor) => {
          setApelido(valor)
          envio.limpar()
        }}
        limite={LIMITES.apelido}
        mensagemDoLimite={ENTRAR_NA_COMUNIDADE.erroApelido}
        erro={erroDoApelido}
        ajuda={TX.tx04}
        tentou={tentou}
        obrigatorio
      />
      <CampoComContador
        id={ID_DA_BIO}
        rotulo={PERFIL.bioRotulo}
        valor={bio}
        aoMudar={setBio}
        limite={LIMITE_DA_BIO}
        mensagemDoLimite={ENTRAR_NA_COMUNIDADE.erroBio}
        linhas={3}
      />
      <EscolhaDeFaixa rotulo={PERFIL.faixaRotulo} valor={faixa} aoMudar={setFaixa} />
      <button type="submit" disabled={envio.enviando} className={BOTAO_PRINCIPAL}>
        {envio.enviando ? COMUM_COMUNIDADE.enviando : PERFIL.salvar}
      </button>
    </form>
  )
}

interface DadosProps {
  perfilId: string
  escritor: boolean
  definirStatus: (mensagem: string | null) => void
}

function DadosDoPerfil({ perfilId, escritor, definirStatus }: DadosProps) {
  const dados = useDadosComunidade()
  const leitura = useLeitura(async (): Promise<Resultado<PerfilPublico | null>> => {
    const lidos = await dados.lerPerfis([perfilId])
    return lidos.ok ? { ok: true, valor: lidos.valor[0] ?? null } : lidos
  }, perfilId)
  const { estado } = leitura

  return (
    <section aria-labelledby="perfil" aria-busy={estado.fase === 'carregando' || undefined} className="mt-8 flex flex-col gap-4">
      <h2 id="perfil" className="cm-h4">
        {PERFIL.secao}
      </h2>
      {leitura.esqueleto ? <Esqueleto linhas={2} /> : null}
      {estado.fase === 'erro' ? <ErroDeLeitura erro={estado.erro} aoTentarDeNovo={() => void leitura.recarregar()} /> : null}
      {estado.fase === 'pronto' && estado.valor && escritor ? (
        <FormularioDoPerfil
          key={estado.valor.id}
          perfil={estado.valor}
          aoSalvar={async () => {
            definirStatus(TX.tx26)
            await leitura.reler()
          }}
        />
      ) : null}
      {estado.fase === 'pronto' && estado.valor && !escritor ? (
        <div className="flex max-w-[34rem] flex-col gap-3">
          <dl className="m-0 flex flex-col gap-3">
            <div>
              <dt className="cm-pequeno text-[var(--cor-texto-2)]">{PERFIL.apelidoRotulo}</dt>
              <dd className="m-0 wrap-anywhere">{estado.valor.apelido}</dd>
            </div>
            {estado.valor.bio ? (
              <div>
                <dt className="cm-pequeno text-[var(--cor-texto-2)]">{PERFIL.bioRotulo}</dt>
                <dd className="m-0 wrap-anywhere">{estado.valor.bio}</dd>
              </div>
            ) : null}
            {estado.valor.faixa ? (
              <div>
                <dt className="cm-pequeno text-[var(--cor-texto-2)]">{PERFIL.faixaRotulo}</dt>
                <dd className="m-0">{ROTULO_FAIXA[estado.valor.faixa]}</dd>
              </div>
            ) : null}
          </dl>
          <p>{PERFIL.somenteLeitura}</p>
          <Link to={caminhoDeEntrada('/app/comunidade/perfil')} className={LINK_ALVO}>
            {PERFIL.editarPerfil}
          </Link>
        </div>
      ) : null}
    </section>
  )
}

interface BloqueiosProps {
  definirStatus: (mensagem: string | null) => void
  pedirFoco: ReturnType<typeof useFocoPendente>
  refStatus: RefObject<HTMLDivElement | null>
}

// A lista de bloqueios: a data de cada um (sem o apelido: quem bloqueou não lê o perfil do bloqueado) e
// "Desbloquear", sem confirmação, porque desfaz.
function Bloqueios({ definirStatus, pedirFoco, refStatus }: BloqueiosProps) {
  const dados = useDadosComunidade()
  const leitura = useLeitura(() => dados.listarBloqueios(), 'bloqueios')
  const envio = useEscrita<null>()
  const erro = envio.estado.fase === 'erro' ? envio.estado : null
  const resumo = useFocoNoResumo(erro)
  const { estado } = leitura

  function desbloquear(perfilId: string, origem: HTMLElement) {
    const proximo = origem.closest('li')?.nextElementSibling?.querySelector<HTMLElement>('button') ?? null
    void envio.enviar({
      escrever: () => dados.desbloquear(perfilId),
      aoSucesso: async () => {
        definirStatus(PERFIL.desbloqueado)
        await leitura.reler()
        // O botão de origem some com a linha: o foco vai ao botão da linha seguinte, e depois à confirmação.
        pedirFoco([() => origem, () => proximo, () => refStatus.current])
      },
    })
  }

  return (
    <section
      aria-labelledby="bloqueios"
      aria-busy={estado.fase === 'carregando' || undefined}
      className="mt-10 border-t border-[var(--cor-fio-suave)] pt-8"
    >
      <h2 id="bloqueios" className="cm-h4">
        {PERFIL.bloqueios}
      </h2>
      <div className="mt-4 flex flex-col gap-3">
        {leitura.esqueleto ? <Esqueleto linhas={2} /> : null}
        {estado.fase === 'erro' ? <ErroDeLeitura erro={estado.erro} aoTentarDeNovo={() => void leitura.recarregar()} /> : null}
        {erro ? (
          <ResumoDeErro
            texto={erro.texto}
            rotuloDaAcao={erro.acao ? COMUM_COMUNIDADE.tentarDeNovo : undefined}
            aoAgir={() => void envio.tentarDeNovo()}
            refResumo={resumo}
          />
        ) : null}
        {estado.fase === 'pronto' && estado.valor.length === 0 ? <p>{TX.tx18}</p> : null}
        {estado.fase === 'pronto' && estado.valor.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {estado.valor.map((bloqueio) => (
              <li
                key={bloqueio.perfilId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-campo border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)] px-4 py-2"
              >
                <p className="tabular">{PERFIL.bloqueadoEm(formatarDataHora(bloqueio.criadoEm))}</p>
                <button
                  type="button"
                  disabled={envio.enviando}
                  className={BOTAO_SECUNDARIO}
                  data-tamanho="app"
                  onClick={(evento) => desbloquear(bloqueio.perfilId, evento.currentTarget)}
                >
                  {PERFIL.desbloquear}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}

// C6, /app/comunidade/perfil: o perfil público (editável para o escritor habilitado, só leitura sem o
// aceite) e a lista de bloqueios. Sem perfil próprio, só o bloco que leva à entrada na comunidade.
export function MeuPerfil() {
  const location = useLocation()
  const situacao = useSituacao()
  const [status, setStatus] = useState<string | null>(() => textoDaPassagemComunidade(location.state))
  const refStatus = useRef<HTMLDivElement>(null)
  const pedirFoco = useFocoPendente()
  const lida = situacao.estado.fase === 'pronto' ? situacao.estado.valor : null

  return (
    <Quadro voltar="/app/comunidade" ocupado={situacao.estado.fase === 'carregando'}>
      <TituloDaTela>{PERFIL.titulo}</TituloDaTela>
      <p className="cm-lide mt-3 max-w-[40rem] text-[var(--cor-texto-2)]">{PERFIL.frase}</p>
      <div className="mt-6">
        <Status mensagem={status} refStatus={refStatus} />
      </div>
      {situacao.esqueleto ? <Esqueleto linhas={2} /> : null}
      {situacao.estado.fase === 'erro' ? (
        <div className="mt-6 max-w-[40rem]">
          <ErroDeLeitura erro={situacao.estado.erro} aoTentarDeNovo={() => void situacao.recarregar()} />
        </div>
      ) : null}
      {lida && lida.perfilId === null ? (
        <div className="mt-8 flex flex-col gap-3">
          <p className="font-medium">{PERFIL.paraCriar}</p>
          <ParaEntrar destino="/app/comunidade/perfil" />
        </div>
      ) : null}
      {lida && lida.perfilId ? (
        <>
          <DadosDoPerfil perfilId={lida.perfilId} escritor={ehEscritor(lida)} definirStatus={setStatus} />
          <Bloqueios definirStatus={setStatus} pedirFoco={pedirFoco} refStatus={refStatus} />
        </>
      ) : null}
    </Quadro>
  )
}
