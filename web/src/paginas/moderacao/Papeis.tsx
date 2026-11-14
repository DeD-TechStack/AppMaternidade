import { useRef, useState, type FormEvent } from 'react'
import { Cartao } from '../../componentes/base/layout/Cartao.tsx'
import { Pilha } from '../../componentes/base/layout/Pilha.tsx'
import { Esqueleto, ResumoDeErro } from '../../componentes/comunidade/Avisos.tsx'
import { CampoComContador } from '../../componentes/comunidade/Campos.tsx'
import { Faixa } from '../../componentes/comunidade/Faixa.tsx'
import { useFocoPendente } from '../../componentes/comunidade/foco.ts'
import { Status } from '../../componentes/comunidade/Status.tsx'
import { useLeitura } from '../../componentes/comunidade/useLeitura.ts'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { Etiqueta } from '../../componentes/base/Etiqueta.tsx'
import { ErroDeLeituraNoPainel } from '../../componentes/moderacao/Avisos.tsx'
import { usePainel } from '../../componentes/moderacao/contexto.ts'
import { TextoCopiavel } from '../../componentes/moderacao/Copiar.tsx'
import { useDadosModeracao } from '../../componentes/moderacao/dados.ts'
import { DialogoDeMotivo } from '../../componentes/moderacao/DialogoDeMotivo.tsx'
import { Escolha } from '../../componentes/moderacao/Escolha.tsx'
import { BOTAO_PRINCIPAL_QUEBRA, BOTAO_SECUNDARIO_QUEBRA, ETIQUETAS_QUEBRAM } from '../../componentes/moderacao/estilos.ts'
import { useEscritaModeracao } from '../../componentes/moderacao/escrita.ts'
import { quemAgiu } from '../../componentes/moderacao/LinhaDaAuditoria.tsx'
import { Painel } from '../../componentes/moderacao/Painel.tsx'
import { COMUM_COMUNIDADE } from '../../conteudo/comunidade.ts'
import { COMUM_MODERACAO, NOMES_DAS_TELAS, PAPEIS, ROTULO_PAPEL, TX } from '../../conteudo/moderacao.ts'
import { formatarDataHora } from '../../dados/comunidade.ts'
import { PAPEIS_PLATAFORMA, conferirLimite, ehUuid, type PapelPlataforma } from '../../dados/comunidade.regras.ts'
import { useAgora } from '../../prototipo/useAgora.ts'
import type { PapelDaLista } from '../../dados/moderacao.ts'
import { LIMITE_DO_MOTIVO, lerValidade, papelVigente } from '../../dados/moderacao.regras.ts'

const ID_DA_CONTA = 'papel-conta'
const ID_DO_MOTIVO = 'papel-motivo'
const ID_DA_VALIDADE = 'papel-validade'
const ID_DA_LISTA = 'papeis-titulo'

const CARTAO = 'flex flex-col gap-3 border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)]'

const idDoBotao = (linha: PapelDaLista) => `revogar-${linha.contaId}-${linha.papel}`

interface CampoProps {
  id: string
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  tipo?: 'text' | 'datetime-local'
  erro?: string | null
  ajuda?: string
}

/** Um campo de uma linha com rótulo visível, ajuda e a mensagem do campo (o visual é o dos `cm-campo-*`). */
function CampoSimples({ id, rotulo, valor, aoMudar, tipo = 'text', erro, ajuda }: CampoProps) {
  const ligados = [erro ? `${id}-erro` : null, ajuda ? `${id}-ajuda` : null].filter(Boolean).join(' ')
  return (
    <div className="cm-campo grid-cols-[minmax(0,1fr)] min-w-0 max-w-[40rem]">
      <label htmlFor={id} className="cm-campo-rotulo">
        {rotulo}
      </label>
      <div className="cm-campo-controle">
        <input
          id={id}
          type={tipo}
          value={valor}
          autoComplete="off"
          onChange={(evento) => aoMudar(evento.target.value)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={ligados || undefined}
          className="cm-campo-entrada alvo-toque min-w-0"
        />
      </div>
      {erro ? (
        <p id={`${id}-erro`} className="cm-campo-mensagem cm-campo-erro cm-pequeno wrap-anywhere">
          {erro}
        </p>
      ) : null}
      {ajuda ? (
        <p id={`${id}-ajuda`} className="cm-campo-mensagem cm-pequeno wrap-anywhere text-[var(--cor-texto-2)]">
          {ajuda}
        </p>
      ) : null}
    </div>
  )
}

const mesmaValidade = (a: string | null, b: string | null) =>
  a === null || b === null ? a === b : Date.parse(a) === Date.parse(b)

function ListaDePapeis() {
  // O relógio compartilhado: a situação de cada papel (vigente ou vencido) se atualiza sem recarregar a lista.
  const agora = useAgora(10_000)
  const painel = usePainel()
  const dados = useDadosModeracao()
  const lista = useLeitura(
    () =>
      painel.ler(
        () => dados.papeis(),
        (papeis) => papeis.length === 0,
      ),
    'papeis',
  )
  const [status, setStatus] = useState<string | null>(null)
  const refStatus = useRef<HTMLDivElement>(null)
  const pedirFoco = useFocoPendente()

  const [conta, setConta] = useState('')
  const [papel, setPapel] = useState<PapelPlataforma>('moderador')
  const [motivo, setMotivo] = useState('')
  const [validade, setValidade] = useState('')
  const [tentou, setTentou] = useState(false)
  const [erroDaConta, setErroDaConta] = useState<string | null>(null)
  const [erroDaValidade, setErroDaValidade] = useState<string | null>(null)
  const envio = useEscritaModeracao<unknown>()
  const erro = envio.estado.fase === 'erro' ? envio.estado : null
  const resumo = useFocoNoResumo(erro)

  const [revogando, setRevogando] = useState<{ linha: PapelDaLista; proximo: PapelDaLista | undefined } | null>(null)
  const origem = useRef<HTMLElement | null>(null)

  const papeis = lista.estado.fase === 'pronto' ? lista.estado.valor : null

  function conceder(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (envio.enviando) return
    const contaLimpa = conta.trim().toLowerCase()
    const lida = lerValidade(validade, Date.now())
    const falhaDaConta = ehUuid(contaLimpa) ? null : PAPEIS.erroConta
    const falhaDaValidade =
      lida.tipo === 'passada' ? PAPEIS.erroValidadePassada : lida.tipo === 'ilegivel' ? PAPEIS.erroValidadeIlegivel : null
    const motivoValido = conferirLimite(motivo, LIMITE_DO_MOTIVO) === 'ok'
    setTentou(true)
    setErroDaConta(falhaDaConta)
    setErroDaValidade(falhaDaValidade)
    // O campo com erro recebe o foco, e nada vai ao banco.
    if (falhaDaConta) return document.getElementById(ID_DA_CONTA)?.focus()
    if (falhaDaValidade) return document.getElementById(ID_DA_VALIDADE)?.focus()
    if (!motivoValido) return document.getElementById(ID_DO_MOTIVO)?.focus()
    const validoAte = lida.tipo === 'ok' ? lida.iso : null

    void envio.enviar({
      escrever: () => dados.concederPapel(contaLimpa, papel, motivo, validoAte),
      // Achou = a linha com a conta, o papel e a validade pedidos. A conferência passa pela guarda do painel;
      // sem a linha, a guarda relê a situação antes de a conferência dizer "não achou".
      conferir: async () => {
        const ehAPedida = (linha: PapelDaLista) =>
          linha.contaId === contaLimpa && linha.papel === papel && mesmaValidade(linha.validoAte, validoAte)
        const lidos = await painel.conferir(
          () => dados.papeis(),
          (linhas) => !linhas.some(ehAPedida),
        )
        if (!lidos.ok) return lidos
        return { ok: true, valor: lidos.valor.some(ehAPedida) ? { valor: null } : null }
      },
      aoErro: (falha) => painel.aoErroDeAcao(falha),
      aoSucesso: async (_valor, porConferencia) => {
        setConta('')
        setMotivo('')
        setValidade('')
        setTentou(false)
        await lista.reler()
        setStatus(porConferencia ? TX.tx32 : TX.tx14)
        pedirFoco([() => refStatus.current])
      },
    })
  }

  function renovar(linha: PapelDaLista) {
    envio.limpar()
    setConta(linha.contaId)
    setPapel(linha.papel)
    setMotivo('')
    setValidade('')
    setTentou(false)
    setErroDaConta(null)
    setErroDaValidade(null)
    pedirFoco([() => document.getElementById(ID_DO_MOTIVO)])
  }

  return (
    <>
      <Faixa aria-labelledby={ID_DA_LISTA} aria-busy={lista.estado.fase === 'carregando' || undefined}>
        <Pilha vao="grupo">
        <Status mensagem={status} refStatus={refStatus} />
        <h2 id={ID_DA_LISTA} tabIndex={-1} className="cm-h4 text-titulo-4 alvo-foco">
          {PAPEIS.lista}
        </h2>
        {lista.esqueleto ? <Esqueleto /> : null}
        {lista.estado.fase === 'erro' ? (
          <ErroDeLeituraNoPainel erro={lista.estado.erro} aoTentarDeNovo={() => void lista.recarregar()} />
        ) : null}
        {papeis && papeis.length === 0 ? <p>{TX.tx31}</p> : null}
        {papeis && papeis.length > 0 ? (
          <Pilha as="ul" vao="grupo" className="m-0 list-none p-0">
            {papeis.map((linha, indice) => {
              const meu = linha.contaId === painel.contaId
              const vigente = papelVigente(linha.validoAte, agora)
              return (
                <Cartao as="li" key={`${linha.contaId}-${linha.papel}`} className={CARTAO}>
                  {meu ? (
                    <p className="font-semibold">{COMUM_MODERACAO.voce}</p>
                  ) : (
                    <TextoCopiavel
                      texto={linha.contaId}
                      rotulo={PAPEIS.copiarId}
                      mensagemOk={PAPEIS.copiado}
                      mensagemFalha={PAPEIS.copieManualmente}
                    />
                  )}
                  <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${ETIQUETAS_QUEBRAM}`}>
                    <Etiqueta>{ROTULO_PAPEL[linha.papel]}</Etiqueta>
                    <Etiqueta>{vigente ? PAPEIS.vigente : PAPEIS.vencido}</Etiqueta>
                  </p>
                  <dl className="cm-pequeno m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
                    <dt className="min-w-0 wrap-anywhere text-[var(--cor-texto-2)]">{PAPEIS.concedidoPor}</dt>
                    <dd className="m-0 min-w-0 wrap-anywhere">
                      {linha.concedidoPor === null ? COMUM_MODERACAO.semRegistro : quemAgiu(linha.concedidoPor, painel.contaId)}
                    </dd>
                    <dt className="min-w-0 wrap-anywhere text-[var(--cor-texto-2)]">{PAPEIS.concedidoEm}</dt>
                    <dd className="tabular m-0 min-w-0 wrap-anywhere">{formatarDataHora(linha.concedidoEm)}</dd>
                    <dt className="min-w-0 wrap-anywhere text-[var(--cor-texto-2)]">{PAPEIS.validade}</dt>
                    <dd className="tabular m-0 min-w-0 wrap-anywhere">
                      {linha.validoAte === null ? COMUM_MODERACAO.semValidade : formatarDataHora(linha.validoAte)}
                    </dd>
                  </dl>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className={BOTAO_SECUNDARIO_QUEBRA} data-tamanho="app" onClick={() => renovar(linha)}>
                      {PAPEIS.renovar}
                    </button>
                    <button
                      id={idDoBotao(linha)}
                      type="button"
                      className={BOTAO_SECUNDARIO_QUEBRA}
                      data-tamanho="app"
                      onClick={(evento) => {
                        origem.current = evento.currentTarget
                        setRevogando({ linha, proximo: papeis[indice + 1] })
                      }}
                    >
                      {PAPEIS.revogar}
                    </button>
                  </div>
                </Cartao>
              )
            })}
          </Pilha>
        ) : null}
        <p role="note" className="max-w-[40rem] font-medium">
          {TX.tx15}
        </p>
        </Pilha>
      </Faixa>

      <Faixa aria-labelledby="papel-conceder">
        <Pilha vao="grupo">
        <h2 id="papel-conceder" className="cm-h4 text-titulo-4">
          {PAPEIS.concederTitulo}
        </h2>
        <form onSubmit={conceder} noValidate className="flex max-w-[40rem] flex-col gap-esp-pilha">
          {erro ? (
            <ResumoDeErro
              texto={erro.texto}
              rotuloDaAcao={erro.acao === 'conferir' ? COMUM_COMUNIDADE.conferir : erro.acao ? COMUM_COMUNIDADE.tentarDeNovo : undefined}
              aoAgir={() => void envio.tentarDeNovo()}
              refResumo={resumo}
            />
          ) : null}
          <CampoSimples
            id={ID_DA_CONTA}
            rotulo={PAPEIS.campoConta}
            valor={conta}
            aoMudar={(valor) => {
              setConta(valor)
              setErroDaConta(null)
              envio.limpar()
            }}
            erro={erroDaConta}
            ajuda={PAPEIS.dicaDaConta}
          />
          <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
            <legend className="cm-campo-rotulo mb-1 p-0">{PAPEIS.campoPapel}</legend>
            <div className="flex flex-wrap gap-x-6">
              {PAPEIS_PLATAFORMA.map((opcao) => (
                <Escolha
                  key={opcao}
                  tipo="radio"
                  name="papel-a-conceder"
                  value={opcao}
                  rotulo={ROTULO_PAPEL[opcao]}
                  marcado={papel === opcao}
                  aoMudar={() => {
                    setPapel(opcao)
                    envio.limpar()
                  }}
                />
              ))}
            </div>
          </fieldset>
          <CampoComContador
            id={ID_DO_MOTIVO}
            rotulo={COMUM_MODERACAO.campoMotivo}
            valor={motivo}
            aoMudar={(valor) => {
              setMotivo(valor)
              envio.limpar()
            }}
            limite={LIMITE_DO_MOTIVO}
            mensagemDoLimite={COMUM_MODERACAO.erroMotivo}
            linhas={3}
            tentou={tentou}
          />
          <CampoSimples
            id={ID_DA_VALIDADE}
            rotulo={PAPEIS.campoValidade}
            valor={validade}
            tipo="datetime-local"
            aoMudar={(valor) => {
              setValidade(valor)
              setErroDaValidade(null)
              envio.limpar()
            }}
            erro={erroDaValidade}
            ajuda={PAPEIS.dicaDaValidade}
          />
          <div className="max-w-[24rem]">
            <button type="submit" disabled={envio.enviando} className={BOTAO_PRINCIPAL_QUEBRA}>
              {envio.enviando ? COMUM_COMUNIDADE.enviando : PAPEIS.conceder}
            </button>
          </div>
        </form>
        </Pilha>

      {revogando ? (
        <DialogoDeMotivo
          titulo={PAPEIS.revogarTitulo}
          confirmar={PAPEIS.revogarConfirmar}
          origem={origem}
          aoFechar={() => setRevogando(null)}
          enviar={(texto) => dados.revogarPapel(revogando.linha.contaId, revogando.linha.papel, texto)}
          conferir={async () => {
            const { contaId, papel: papelRevogado } = revogando.linha
            const aindaTem = (linha: PapelDaLista) => linha.contaId === contaId && linha.papel === papelRevogado
            // A linha ausente é o que confirma a revogação, e também o que uma leitura sem papel devolveria:
            // a guarda relê a situação antes de a conferência confiar nisso.
            const lidos = await painel.conferir(
              () => dados.papeis(),
              (linhas) => !linhas.some(aindaTem),
            )
            if (!lidos.ok) return lidos
            return { ok: true, valor: !lidos.valor.some(aindaTem) }
          }}
          aoConcluir={async (porConferencia) => {
            const { proximo } = revogando
            const botao = origem.current
            setRevogando(null)
            await lista.reler()
            setStatus(porConferencia ? TX.tx32 : TX.tx14)
            // O botão de origem; o item seguinte da lista; a confirmação; o `h1`.
            pedirFoco([
              () => botao,
              () => (proximo ? document.getElementById(idDoBotao(proximo)) : null),
              () => document.getElementById(ID_DA_LISTA),
              () => refStatus.current,
            ])
          }}
        >
          <p role="note" className="font-medium">
            {TX.tx15}
          </p>
        </DialogoDeMotivo>
      ) : null}
      </Faixa>
    </>
  )
}

// M5, /moderacao/papeis (só admin): a lista de papéis, conceder (renovar é conceder de novo) e revogar.
export function PapeisDaPlataforma() {
  return (
    <Painel titulo={NOMES_DAS_TELAS.papeis} exigeAdmin>
      <ListaDePapeis />
    </Painel>
  )
}
