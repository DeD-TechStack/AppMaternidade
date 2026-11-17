import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { COMUM_COMUNIDADE, FORMULARIO_TOPICO, RESUMO_NA_COMUNIDADE, TX } from '../../conteudo/comunidade.ts'
import type { Resultado } from '../../dados/comum.ts'
import type { Espaco, PerfilPublico } from '../../dados/comunidade.ts'
import { LIMITES, conferirLimite, type FaixaBebe } from '../../dados/comunidade.regras.ts'
import { Cartao } from '../base/layout/Cartao.tsx'
import { Pilha } from '../base/layout/Pilha.tsx'
import { useFocoNoResumo } from '../conta/foco.ts'
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from '../conta/Partes.tsx'
import { PainelDoResumo, anexarBloco } from '../resumo-rotina/index.ts'
import { ResumoDeErro, Selo } from './Avisos.tsx'
import { CampoComContador, EscolhaDeFaixa } from './Campos.tsx'
import { useDadosComunidade } from './dados.ts'
import { useEscrita } from './escrita.ts'
import { Meta, Texto } from './Itens.tsx'
import { useLeitura } from './useLeitura.ts'

interface Props {
  espaco: Espaco
  /** O id do perfil próprio: a prévia mostra o apelido dele como autor. */
  perfilId: string
  /** Na edição, o tópico com os valores atuais; no novo tópico, `null` e o formulário abre vazio. */
  edicao: { id: string; titulo: string; corpo: string; faixa: FaixaBebe | null } | null
  /** O banco não achou a linha para editar: a tela relê o tópico. */
  aoNaoEditavel?: () => void
  /** O aviso de status da página (RF12:RF-11): o novo tópico o mostra em `role="status"`. */
  aoAvisar?: (mensagem: string) => void
}

const ID_DO_CAMPO_DO_CORPO = 'campo-corpo'
// O `.cm-botao` é `nowrap`: a 390 px com 200 % de fonte o rótulo passava da tela. Estas classes o deixam quebrar; em texto (F10), para "Ver prévia" ser o único primário.
const BOTAO_DO_RESUMO = 'cm-botao cm-botao-texto alvo-toque h-auto max-w-full text-start whitespace-normal wrap-anywhere'

// O formulário de C4 (MAT-40:RF-04), de novo tópico e de edição: título de 3 a 120 caracteres, corpo de
// 1 a 5000 e faixa opcional, cada campo com contador. "Ver prévia" só vale com tudo dentro do limite. A
// prévia mostra o tópico como vai aparecer, e só o botão dela grava ("Publicar" ou "Salvar"). No tópico novo
// (não na edição), o botão "Incluir resumo da rotina" abre o painel do resumo (RF12): este formulário é dono do
// botão, do estado aberto, da marca "houve inserção" e do foco; do painel só recebe o texto do bloco.
export function FormularioDeTopico({ espaco, perfilId, edicao, aoNaoEditavel, aoAvisar }: Props) {
  const dados = useDadosComunidade()
  const navegar = useNavigate()
  const [titulo, setTitulo] = useState(edicao?.titulo ?? '')
  const [corpo, setCorpo] = useState(edicao?.corpo ?? '')
  const [faixa, setFaixa] = useState<FaixaBebe | null>(edicao?.faixa ?? null)
  const [previa, setPrevia] = useState(false)
  const envio = useEscrita<string, string[]>()
  const erro = envio.estado.fase === 'erro' ? envio.estado : null
  const resumo = useFocoNoResumo(erro)
  const eu = useLeitura(async (): Promise<Resultado<PerfilPublico | null>> => {
    const lidos = await dados.lerPerfis([perfilId])
    return lidos.ok ? { ok: true, valor: lidos.valor[0] ?? null } : lidos
  }, perfilId)
  const apelido = eu.estado.fase === 'pronto' ? (eu.estado.valor?.apelido ?? '') : ''

  const tituloOk = conferirLimite(titulo, LIMITES.titulo) === 'ok'
  const corpoOk = conferirLimite(corpo, LIMITES.corpoTopico) === 'ok'
  const valido = tituloOk && corpoOk
  const dicaId = useId()
  const dica = valido
    ? null
    : tituloOk
      ? FORMULARIO_TOPICO.dicaPrevia.texto
      : corpoOk
        ? FORMULARIO_TOPICO.dicaPrevia.titulo
        : FORMULARIO_TOPICO.dicaPrevia.ambos
  const botaoDoErro =
    erro?.acao === 'conferir' ? COMUM_COMUNIDADE.conferir : erro?.acao ? COMUM_COMUNIDADE.tentarDeNovo : undefined

  // O resumo da rotina (RF12): o painel, a marca de que houve inserção (vale até publicar) e o foco.
  const comResumo = edicao === null
  const [painelAberto, setPainelAberto] = useState(false)
  const [houveResumo, setHouveResumo] = useState(false)
  const botaoDoResumo = useRef<HTMLButtonElement>(null)
  const focoNoCorpo = useRef(false)
  const idDoPainel = useId()
  const idDoTituloDoPainel = useId()

  function abrirOuFocarPainel() {
    if (painelAberto) document.getElementById(idDoTituloDoPainel)?.focus()
    else setPainelAberto(true)
  }

  function fecharPainel() {
    setPainelAberto(false)
    botaoDoResumo.current?.focus()
  }

  function inserirResumo(bloco: string) {
    setCorpo((atual) => anexarBloco(atual, bloco))
    setHouveResumo(true)
    setPainelAberto(false)
    focoNoCorpo.current = true
    aoAvisar?.(RESUMO_NA_COMUNIDADE.inserido)
  }

  // Depois da inserção o foco vai ao campo do corpo, com o cursor no fim do texto.
  useLayoutEffect(() => {
    if (!focoNoCorpo.current) return
    focoNoCorpo.current = false
    const campo = document.getElementById(ID_DO_CAMPO_DO_CORPO) as HTMLTextAreaElement | null
    campo?.focus()
    campo?.setSelectionRange(campo.value.length, campo.value.length)
  })

  // A11Y-F4: o passo que some leva o foco com ele; o foco vai ao título da prévia, ou ao primeiro campo na volta.
  const tituloDaPrevia = useRef<HTMLHeadingElement>(null)
  const trocouDePasso = useRef(false)
  useEffect(() => {
    if (!trocouDePasso.current) return
    trocouDePasso.current = false
    if (previa) tituloDaPrevia.current?.focus()
    else document.getElementById('campo-titulo')?.focus()
  }, [previa])

  function aoVerPrevia(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!valido) return
    setPainelAberto(false)
    trocouDePasso.current = true
    setPrevia(true)
  }

  function gravar() {
    if (!valido) return
    if (edicao) {
      void envio.enviar({
        escrever: async () => {
          const feita = await dados.editarTopico(edicao.id, titulo, corpo, faixa)
          if (!feita.ok && feita.erro.chave === 'nao_editavel') aoNaoEditavel?.()
          return feita
        },
        aoSucesso: (id) => {
          void navegar(`/app/comunidade/topico/${id}`, { state: { mensagemComunidade: 'alteracoes_salvas' } })
        },
      })
      return
    }
    // Achou = um tópico igual, do perfil próprio, que não estava lá antes do primeiro envio.
    const parecidos = () => dados.conferirTopicos(espaco.id, titulo, corpo, faixa)
    void envio.enviar({
      antes: parecidos,
      escrever: () => dados.criarTopico(espaco.id, titulo, corpo, faixa),
      conferir: async (antes) => {
        const agora = await parecidos()
        if (!agora.ok) return agora
        const novo = agora.valor.find((id) => !(antes ?? []).includes(id))
        return { ok: true, valor: novo ? { valor: novo } : null }
      },
      aoSucesso: (id) => {
        void navegar(`/app/comunidade/topico/${id}`, { state: { mensagemComunidade: 'topico_publicado' } })
      },
    })
  }

  if (previa) {
    return (
      <Pilha vao="grupo" className="max-w-[44rem]" data-previa="topico">
        <Pilha vao="pilha">
          <h2 ref={tituloDaPrevia} tabIndex={-1} className="cm-h4 text-titulo-4">
            {FORMULARIO_TOPICO.previa}
          </h2>
          <p>{TX.tx05}</p>
          {houveResumo ? <p>{RESUMO_NA_COMUNIDADE.avisoNaPrevia}</p> : null}
        </Pilha>
        <Cartao as="article" className="flex flex-col gap-3 border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)]">
          <Selo />
          <p className="cm-pequeno text-[var(--cor-texto-2)]">
            {FORMULARIO_TOPICO.espaco}: <span className="font-medium text-[var(--cor-texto)]">{espaco.nome}</span>
          </p>
          <h3 className="cm-h4 text-titulo-4 wrap-anywhere">{titulo}</h3>
          <Meta apelido={apelido} faixa={faixa} />
          <Texto>{corpo}</Texto>
        </Cartao>
        {erro ? (
          <ResumoDeErro texto={erro.texto} rotuloDaAcao={botaoDoErro} aoAgir={() => void envio.tentarDeNovo()} refResumo={resumo} />
        ) : null}
        <div className="flex flex-col gap-3 min-[30rem]:flex-row-reverse min-[30rem]:justify-end">
          <button type="button" disabled={envio.enviando} className={BOTAO_PRINCIPAL} onClick={gravar}>
            {envio.enviando ? COMUM_COMUNIDADE.enviando : edicao ? FORMULARIO_TOPICO.salvar : FORMULARIO_TOPICO.publicar}
          </button>
          <button
            type="button"
            disabled={envio.enviando}
            className={BOTAO_SECUNDARIO}
            onClick={() => {
              envio.limpar()
              trocouDePasso.current = true
              setPrevia(false)
            }}
          >
            {FORMULARIO_TOPICO.voltarEEditar}
          </button>
        </div>
      </Pilha>
    )
  }

  return (
    <form onSubmit={aoVerPrevia} noValidate className="flex max-w-[40rem] flex-col gap-esp-pilha">
      <CampoComContador
        id="campo-titulo"
        rotulo={FORMULARIO_TOPICO.campoTitulo}
        valor={titulo}
        aoMudar={setTitulo}
        limite={LIMITES.titulo}
        mensagemDoLimite={FORMULARIO_TOPICO.erroTitulo}
        obrigatorio
      />
      <Pilha vao="grupo">
        <CampoComContador
          id={ID_DO_CAMPO_DO_CORPO}
          rotulo={FORMULARIO_TOPICO.campoCorpo}
          valor={corpo}
          aoMudar={setCorpo}
          limite={LIMITES.corpoTopico}
          mensagemDoLimite={FORMULARIO_TOPICO.erroCorpo}
          linhas={8}
          obrigatorio
        />
        {comResumo ? (
          <>
            <div>
              <button
                ref={botaoDoResumo}
                type="button"
                className={BOTAO_DO_RESUMO}
                aria-expanded={painelAberto}
                aria-controls={painelAberto ? idDoPainel : undefined}
                onClick={abrirOuFocarPainel}
              >
                {RESUMO_NA_COMUNIDADE.botao}
              </button>
            </div>
            {painelAberto ? (
              <PainelDoResumo id={idDoPainel} idDoTitulo={idDoTituloDoPainel} nivelDoTitulo={2} aoInserir={inserirResumo} aoFechar={fecharPainel} />
            ) : null}
          </>
        ) : null}
      </Pilha>
      <EscolhaDeFaixa rotulo={COMUM_COMUNIDADE.faixaOpcional} valor={faixa} aoMudar={setFaixa} />
      <div>
        {/* `aria-disabled` em vez de `disabled`: o Tab chega ao botão e a dica ligada a ele é lida (A11Y-005). */}
        <button
          type="submit"
          aria-disabled={valido ? undefined : 'true'}
          aria-describedby={dica ? dicaId : undefined}
          className={BOTAO_PRINCIPAL}
          onClick={(evento) => {
            if (!valido) evento.preventDefault()
          }}
        >
          {FORMULARIO_TOPICO.verPrevia}
        </button>
        {dica ? (
          <p id={dicaId} className="cm-pequeno pt-2 text-[var(--cor-texto-2)]">
            {dica}
          </p>
        ) : null}
      </div>
    </form>
  )
}
