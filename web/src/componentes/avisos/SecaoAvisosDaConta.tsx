import { useRef, useState } from 'react'
import { AVISOS_TEXTOS } from '../../conteudo/avisos.ts'
import { Colunas, Pilha } from '../base/layout/index.ts'
import { useFocoNoResumo } from '../conta/foco.ts'
import { Carregando } from '../estado/Carregando.tsx'
import { ErroDaConta } from '../estado/ErroDaConta.tsx'
import { ehRepetivel, type ErroDados } from '../../dados/comum.ts'
import { useAvisos } from './useAvisos.ts'

// A seção "Avisos de outros cuidadores" da Conta (RF14:RF-01..04): uma caixa nativa, desligada por padrão,
// gravada na hora. As regras de leitura e de sobreposição (o que se grava vence a leitura mais velha) são do
// gancho `useAvisos`; aqui só se mostra. A tela dona da região de status passa `aoStatus`.

const SECAO = 'border-t border-[var(--cor-fio-suave)] pt-esp-bloco'

type Gravacao =
  | { fase: 'ocioso' }
  | { fase: 'salvando'; alvo: boolean }
  | { fase: 'erro'; alvo: boolean; erro: ErroDados }

interface Props {
  /** A região de status única da página: `null` limpa a mensagem anterior, um texto a anuncia. */
  aoStatus: (mensagem: string | null) => void
}

export function SecaoAvisosDaConta({ aoStatus }: Props) {
  const avisos = useAvisos()
  const [gravacao, setGravacao] = useState<Gravacao>({ fase: 'ocioso' })
  // A guarda síncrona: dois eventos no mesmo quadro não passam pelo estado, que ainda não mudou.
  const emVoo = useRef(false)
  const caixa = useRef<HTMLInputElement>(null)

  // O estado do servidor que a tela mostra; `null` antes da primeira leitura com sucesso da sessão.
  const guardado = avisos.mostrado?.ligados ?? null
  // Um erro de gravação sai de cena quando uma leitura posterior já mostra o valor que se queria gravar.
  const erroDaGravacao = gravacao.fase === 'erro' && guardado !== gravacao.alvo ? gravacao : null
  const resumoDaGravacao = useFocoNoResumo(erroDaGravacao)
  const resumoDaLeitura = useFocoNoResumo(avisos.fase === 'erro' ? avisos.erro : null)

  async function gravar(alvo: boolean) {
    if (emVoo.current) return
    emVoo.current = true
    aoStatus(null)
    setGravacao({ fase: 'salvando', alvo })
    try {
      const resultado = await avisos.definirLigados(alvo)
      if (resultado.ok) {
        setGravacao({ fase: 'ocioso' })
        aoStatus(alvo ? AVISOS_TEXTOS.statusLigados : AVISOS_TEXTOS.statusDesligados)
      } else {
        setGravacao({ fase: 'erro', alvo, erro: resultado.erro })
      }
    } finally {
      emVoo.current = false
    }
  }

  const mostrandoCaixa = avisos.fase === 'pronto'
  const marcada = gravacao.fase === 'salvando' ? gravacao.alvo : guardado === true

  return (
    <section aria-labelledby="avisos" className={SECAO}>
      <Colunas fracoes="5fr 7fr" vao="bloco" aPartirDe={1024}>
        <Pilha dataH="coluna" vao="pilha" className="wrap-anywhere">
          <h2 id="avisos" tabIndex={-1} className="cm-h4 alvo-foco">
            {AVISOS_TEXTOS.secaoTitulo}
          </h2>
          <p className="cm-medida">{AVISOS_TEXTOS.secaoFrase}</p>
        </Pilha>
        <Pilha dataH="coluna" vao="pilha" className="items-start">
          {avisos.fase === 'lendo' ? <Carregando texto={AVISOS_TEXTOS.lendoPreferencia} /> : null}
          {avisos.fase === 'erro' && avisos.erro ? (
            <ErroDaConta erro={avisos.erro} repetivel aoTentarDeNovo={() => avisos.ler()} refResumo={resumoDaLeitura} />
          ) : null}
          {mostrandoCaixa && erroDaGravacao ? (
            <ErroDaConta
              erro={erroDaGravacao.erro}
              repetivel={ehRepetivel(erroDaGravacao.erro.classe)}
              aoTentarDeNovo={() => {
                // O botão some com o resumo: o foco volta para a caixa, que é de onde a pessoa veio.
                caixa.current?.focus()
                void gravar(erroDaGravacao.alvo)
              }}
              refResumo={resumoDaGravacao}
            />
          ) : null}
          {mostrandoCaixa ? (
            <label className="alvo-toque flex min-w-0 cursor-pointer items-center gap-3 py-2">
              <input
                ref={caixa}
                type="checkbox"
                checked={marcada}
                onChange={(evento) => void gravar(evento.target.checked)}
                className="size-6 shrink-0 accent-[var(--cor-texto)]"
              />
              <span className="min-w-0 wrap-anywhere">{AVISOS_TEXTOS.rotuloDaCaixa}</span>
            </label>
          ) : null}
        </Pilha>
      </Colunas>
    </section>
  )
}
