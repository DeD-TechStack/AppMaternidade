import { useState } from 'react'
import { Link } from 'react-router'
import { LIMITES_DE_DURACAO_MIN, ROTULO_TIPO, SESSOES } from '../../conteudo/rotina.ts'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import { ehTipoDeSessao, type Registro, type TipoSessao } from '../../dados/rotina.tipos.ts'
import { formatarDuracao } from '../../prototipo/formatar.ts'
import { ALVO_APP } from '../app/alvo.ts'
import { Avatar } from '../app/Avatar.tsx'
import { Botao } from '../base/Botao.tsx'
import { Pilha } from '../base/layout/index.ts'
import { AvisoDeErro } from './AvisoDeErro.tsx'
import { PainelFimEmOutroHorario } from './PainelFimEmOutroHorario.tsx'

interface Props {
  /** As sessões em andamento do bebê, a de início mais recente primeiro. */
  sessoes: readonly Registro[]
  agora: number
  autorDe: (registro: Registro) => string
  /** Responsável e cuidador encerram qualquer sessão; observador e bebê arquivado, nenhuma. */
  podeEncerrar: boolean
  /** Se a pessoa pode excluir todas as que sairiam na união (matriz de papéis). */
  podeUnir: (grupo: Registro[]) => boolean
  /** O texto do papel, mostrado uma vez no cartão quando a pessoa não pode unir. */
  textoDoPapel: string
  ocupado: boolean
  aoEncerrar: (registro: Registro) => void
  aoEncerrarEm: (registro: Registro, momento: number) => void
  aoUnir: (grupo: Registro[]) => Promise<Resultado<null>>
  /** A sessão cujo encerramento não foi enviado porque o relógio do aparelho está antes do início dela. */
  relogioAtrasDe?: string | null
  className?: string
}

const minusculo = (texto: string) => texto.charAt(0).toLocaleLowerCase('pt-BR') + texto.slice(1)

/**
 * O que acompanha o cartão "Em andamento" quando há mais que uma sessão ou uma sessão esquecida (R38-09):
 * as outras sessões, cada uma com `Encerrar` e `Ver sessão`; o aviso e o `Unir` quando há duas ou mais do
 * mesmo tipo; e, para a sessão em andamento há mais que o limite do tipo, `Encerrar em outro horário`.
 */
export function SessoesEmParalelo({
  sessoes,
  agora,
  autorDe,
  podeEncerrar,
  podeUnir,
  textoDoPapel,
  ocupado,
  aoEncerrar,
  aoEncerrarEm,
  aoUnir,
  relogioAtrasDe = null,
  className,
}: Props) {
  const [uniao, setUniao] = useState<{ tipo: TipoSessao; erro: ErroDados | null; unindo: boolean } | null>(null)
  const [painelAberto, setPainelAberto] = useState<string | null>(null)
  const outras = sessoes.slice(1)

  const porTipo = new Map<TipoSessao, Registro[]>()
  for (const sessao of sessoes) {
    if (!ehTipoDeSessao(sessao.tipo)) continue
    porTipo.set(sessao.tipo, [...(porTipo.get(sessao.tipo) ?? []), sessao])
  }
  const repetidos = [...porTipo.entries()].filter(([, grupo]) => grupo.length >= 2)
  // "Mais que o limite": a duração maior que ele. A sessão com o relógio atrás também oferece o outro horário.
  const esquecidas = sessoes.filter(
    (sessao) =>
      sessao.id === relogioAtrasDe ||
      (ehTipoDeSessao(sessao.tipo) && agora - Date.parse(sessao.inicio) > LIMITES_DE_DURACAO_MIN[sessao.tipo] * 60_000),
  )
  const algumGrupoSemPermissao = repetidos.some(([, grupo]) => !podeUnir(grupo))

  async function unir(tipo: TipoSessao, grupo: Registro[]) {
    if (uniao?.unindo) return
    setUniao({ tipo, erro: null, unindo: true })
    const resultado = await aoUnir(grupo)
    setUniao({ tipo, erro: resultado.ok ? null : resultado.erro, unindo: false })
  }

  if (sessoes.length === 0) return null
  if (outras.length === 0 && repetidos.length === 0 && esquecidas.length === 0) return null

  return (
    <Pilha vao="pilha" className={className} data-sessoes-em-paralelo="">
      {repetidos.map(([tipo, grupo]) => (
        <Pilha
          key={tipo}
          vao="pilha"
          data-uniao={tipo}
          className="rounded-cartao border border-(--cor-fio-suave) bg-(--cor-cartao) p-4 [box-shadow:var(--sombra-cartao)]"
        >
          <p className="font-medium">{SESSOES.duasDoMesmoTipo(grupo.length, minusculo(ROTULO_TIPO[tipo]))}</p>
          {podeUnir(grupo) ? (
            <Botao
              variante="contorno"
              tamanho="app"
              className={`self-start ${ALVO_APP}`}
              desativado={uniao?.unindo === true}
              onClick={() => void unir(tipo, grupo)}
            >
              {uniao?.unindo && uniao.tipo === tipo ? SESSOES.unindo : SESSOES.unir}
            </Botao>
          ) : null}
          {uniao && uniao.tipo === tipo && uniao.erro ? (
            <AvisoDeErro erro={uniao.erro} escrita>
              <p className="font-medium">{SESSOES.uniaoIncompleta}</p>
            </AvisoDeErro>
          ) : null}
        </Pilha>
      ))}
      {algumGrupoSemPermissao ? <p className="text-pequeno text-(--cor-texto-2)">{textoDoPapel}</p> : null}

      {outras.length > 0 ? (
        <Pilha
          as="section"
          vao="junto"
          aria-label={SESSOES.outras}
          data-outras-sessoes=""
          className="rounded-cartao border border-(--cor-fio-suave) bg-(--cor-cartao) px-5 pt-4 pb-2 [box-shadow:var(--sombra-cartao)]"
        >
          <h3 className="cm-h4">{SESSOES.outras}</h3>
          <ul>
            {outras.map((sessao) => {
              const autor = autorDe(sessao)
              return (
                <li
                  key={sessao.id}
                  className="flex flex-wrap items-center gap-3 border-t border-(--cor-fio-suave) py-3.5 first:border-t-0"
                >
                  <Avatar nome={autor} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {ROTULO_TIPO[sessao.tipo]} <span className="tabular-nums">{formatarDuracao(agora - Date.parse(sessao.inicio))}</span>
                    </p>
                    <p className="text-pequeno text-(--cor-texto-2)">{SESSOES.porAutor(autor)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {podeEncerrar ? (
                      <Botao
                        variante="contorno"
                        tamanho="app"
                        className={ALVO_APP}
                        aria-label={`${SESSOES.encerrar} ${minusculo(ROTULO_TIPO[sessao.tipo])}`}
                        desativado={ocupado}
                        onClick={() => aoEncerrar(sessao)}
                      >
                        {SESSOES.encerrar}
                      </Botao>
                    ) : null}
                    <Link
                      to={`/app/sessao?id=${sessao.id}`}
                      state={{ foco: 'titulo' }}
                      className={`cm-botao cm-botao-texto alvo-toque ${ALVO_APP}`}
                      data-botao="texto"
                      data-tamanho="app"
                      aria-label={`${SESSOES.verSessao} ${minusculo(ROTULO_TIPO[sessao.tipo])}`}
                    >
                      {SESSOES.verSessao}
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </Pilha>
      ) : null}

      {podeEncerrar
        ? esquecidas.map((sessao) => (
            <Pilha
              key={sessao.id}
              vao="pilha"
              data-esquecida={sessao.id}
              className="rounded-cartao border border-(--cor-fio-suave) bg-(--cor-cartao) p-4 [box-shadow:var(--sombra-cartao)]"
            >
              <p className="font-medium">
                {sessao.id === relogioAtrasDe ? SESSOES.relogioAtras : SESSOES.esquecida(formatarDuracao(agora - Date.parse(sessao.inicio)))}
              </p>
              {painelAberto === sessao.id ? (
                <PainelFimEmOutroHorario
                  inicio={Date.parse(sessao.inicio)}
                  ocupado={ocupado}
                  aoCancelar={() => setPainelAberto(null)}
                  aoConfirmar={(momento) => aoEncerrarEm(sessao, momento)}
                />
              ) : (
                <Botao
                  variante="contorno"
                  tamanho="app"
                  className={`self-start ${ALVO_APP}`}
                  aria-label={`${SESSOES.encerrarOutroHorario}, ${minusculo(ROTULO_TIPO[sessao.tipo])}`}
                  onClick={() => setPainelAberto(sessao.id)}
                >
                  {SESSOES.encerrarOutroHorario}
                </Botao>
              )}
            </Pilha>
          ))
        : null}
    </Pilha>
  )
}
