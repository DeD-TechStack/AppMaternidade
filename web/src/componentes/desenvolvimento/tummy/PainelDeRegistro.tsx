import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { avisoDeFuso } from '../../../conteudo/desenvolvimento/textosLogada.ts'
import { TT } from '../../../conteudo/desenvolvimento/textosTummy.ts'
import { diasDaFila } from '../../../dados/desenvolvimento.ts'
import { lerAparelho } from '../../../dados/rotina.dia.ts'
import { ALVO_APP } from '../../app/alvo.ts'
import { Botao } from '../../base/Botao.tsx'
import { Campo } from '../../base/Campo.tsx'
import { CHAVE } from './foco.ts'
import { EnvioEmCurso } from './Mensagens.tsx'
import { TEXTO_DO_ERRO_DE_CAMPO, rotuloDoDia, type EntradaDoPainel, type ErroDeCampo } from './regras.ts'
import type { PainelAberto, PassoEmAberto } from './useBlocoTummy.ts'

interface Props {
  painel: PainelAberto
  fusoDaFamilia: string
  /** Operação pendente, T-41 ou confirmação em aberto: os campos ficam `readonly` e Esc não faz nada. */
  somenteLeitura: boolean
  /** Uma operação do painel está esperando a resposta (T-53). */
  salvando: boolean
  /** Só "Tentar de novo" e "Fechar" (T-41): sem Salvar nem Cancelar. */
  bloqueado: boolean
  /** Falso durante uma operação pendente: Salvar e Cancelar ficam `aria-disabled`. */
  podeAgir: boolean
  passo: PassoEmAberto | null
  erroDeCampo: ErroDeCampo | null
  /** O erro de escrita deste painel, com os botões dele. */
  erro: ReactNode
  aoSalvar: (entrada: EntradaDoPainel) => void
  aoConfirmar: () => void
  aoVoltar: () => void
  aoFechar: () => void
  aoEditar: () => void
}

const CLASSE_DA_ENTRADA = 'cm-campo-entrada [[data-tema=madrugada]_&]:[color-scheme:dark] tabular-nums'

/**
 * O painel "Fizemos agora" (duração opcional) e o formulário de outro horário (dia, início e fim). Os campos
 * ficam fora do estado do bloco: só o que a pessoa digita vive aqui, e a tela guarda o id e o resultado.
 */
export function PainelDeRegistro({
  painel,
  fusoDaFamilia,
  somenteLeitura,
  salvando,
  bloqueado,
  podeAgir,
  passo,
  erroDeCampo,
  erro,
  aoSalvar,
  aoConfirmar,
  aoVoltar,
  aoFechar,
  aoEditar,
}: Props) {
  const horario = painel.tipo === 'horario'
  const aparelho = lerAparelho(painel.abertoEm).fuso
  const dias = diasDaFila(painel.abertoEm, aparelho)

  const formulario = useRef<HTMLFormElement>(null)
  const [duracao, setDuracao] = useState('')
  const [dia, setDia] = useState(dias[0])
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')

  const idDuracao = useId()
  const idDia = useId()
  const idInicio = useId()
  const idFim = useId()
  const idErro = useId()

  // Ao abrir, o foco vai ao primeiro campo.
  useEffect(() => {
    formulario.current?.querySelector<HTMLElement>('select, input')?.focus()
  }, [])

  const travado = somenteLeitura || passo !== null
  const entrada = (): EntradaDoPainel => ({ duracao, dia, inicio, fim })
  const textoDoErro = erroDeCampo ? TEXTO_DO_ERRO_DE_CAMPO[erroDeCampo] : undefined
  const erroNoInicio = erroDeCampo === 'preencha' || erroDeCampo === 'fimAntes' || erroDeCampo === 'futuro' || erroDeCampo === 'inexistente'
  const longa = passo?.passo === 'longa'

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    if (!travado) aoSalvar(entrada())
  }

  // Esc fecha o painel, quando nada está pendente e nenhuma confirmação espera resposta.
  useEffect(() => {
    const formularioAtual = formulario.current
    if (!formularioAtual) return
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !travado) aoFechar()
    }
    formularioAtual.addEventListener('keydown', aoTeclar)
    return () => formularioAtual.removeEventListener('keydown', aoTeclar)
  }, [aoFechar, travado])

  function mudar(proximo: (valor: string) => void) {
    return (evento: { target: { value: string } }) => {
      proximo(evento.target.value)
      aoEditar()
    }
  }

  const mensagemDoCampo = textoDoErro ? (
    <p id={idErro} role="alert" className="cm-pequeno m-0 font-medium wrap-anywhere">
      {textoDoErro}
    </p>
  ) : null

  return (
    <form
      ref={formulario}
      noValidate
      data-painel-tummy={painel.tipo}
      onSubmit={aoEnviar}
      className="flex w-full flex-col items-start gap-5 rounded-cartao border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)] p-5 lg:p-6"
    >
      {horario ? (
        <>
          {aparelho !== fusoDaFamilia ? <p className="cm-pequeno cm-texto-2 m-0 max-w-[65ch]">{avisoDeFuso(aparelho, fusoDaFamilia)}</p> : null}
          <div className="grid w-full max-w-[34rem] grid-cols-2 gap-x-4 gap-y-4">
            <div className="col-span-2">
              <fieldset disabled={travado} className="m-0 min-w-0 border-0 p-0">
                <Campo
                  id={idDia}
                  rotulo={TT.dia}
                  tipo="select"
                  opcoes={dias.map((valor, indice) => ({ valor, rotulo: rotuloDoDia(indice, valor) }))}
                  value={dia}
                  onChange={mudar(setDia)}
                />
              </fieldset>
            </div>
            <div className="cm-campo">
              <label htmlFor={idInicio} className="cm-campo-rotulo">
                {TT.inicio}
              </label>
              <input
                id={idInicio}
                type="time"
                className={CLASSE_DA_ENTRADA}
                value={inicio}
                readOnly={travado}
                aria-invalid={erroNoInicio ? true : undefined}
                aria-describedby={erroNoInicio ? idErro : undefined}
                onChange={mudar(setInicio)}
              />
            </div>
            <div className="cm-campo">
              <label htmlFor={idFim} className="cm-campo-rotulo">
                {TT.fim}
              </label>
              <input
                id={idFim}
                type="time"
                className={CLASSE_DA_ENTRADA}
                value={fim}
                readOnly={travado}
                aria-invalid={erroNoInicio ? true : undefined}
                aria-describedby={erroNoInicio ? idErro : undefined}
                onChange={mudar(setFim)}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="cm-campo w-full">
          <label htmlFor={idDuracao} className="cm-campo-rotulo">
            {TT.duracao}
          </label>
          <input
            id={idDuracao}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={CLASSE_DA_ENTRADA}
            value={duracao}
            readOnly={travado}
            aria-invalid={erroDeCampo === 'duracao' ? true : undefined}
            aria-describedby={erroDeCampo === 'duracao' ? idErro : undefined}
            onChange={mudar(setDuracao)}
          />
        </div>
      )}

      {mensagemDoCampo}
      {erro}

      {bloqueado ? null : passo ? (
        <div role="group" aria-label={longa ? TT.maisDeUmaHora : TT.sobreposicao} className="flex flex-col items-start gap-3">
          <p className="m-0 max-w-[65ch] font-medium">{longa ? TT.maisDeUmaHora : TT.sobreposicao}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Botao tamanho="app" className={ALVO_APP} data-foco={CHAVE.confirmar} desativado={!podeAgir} onClick={aoConfirmar}>
              {longa ? TT.salvarAssim : TT.salvarMesmoAssim}
            </Botao>
            <Botao variante="contorno" tamanho="app" className={ALVO_APP} desativado={!podeAgir} onClick={aoVoltar}>
              {longa ? TT.corrigir : TT.voltar}
            </Botao>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Botao
            type="submit"
            tamanho="app"
            className={ALVO_APP}
            data-foco={CHAVE.salvar}
            desativado={!podeAgir}
            // O foco não sai do botão que disparou, mesmo onde o toque não foca (Safari).
            onClick={(evento) => evento.currentTarget.focus()}
          >
            {TT.salvar}
          </Botao>
          <Botao variante="contorno" tamanho="app" className={ALVO_APP} desativado={!podeAgir} onClick={aoFechar}>
            {TT.cancelar}
          </Botao>
        </div>
      )}

      <EnvioEmCurso ativo={salvando} />
    </form>
  )
}
