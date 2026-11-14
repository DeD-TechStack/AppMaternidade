import { useLocation } from 'react-router'
import { Cartao } from '../../componentes/base/layout/Cartao.tsx'
import { Pilha } from '../../componentes/base/layout/Pilha.tsx'
import { ErroDeLeitura, Esqueleto } from '../../componentes/comunidade/Avisos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { Faixa } from '../../componentes/comunidade/Faixa.tsx'
import { Quadro, TituloDaTela } from '../../componentes/comunidade/Quadro.tsx'
import { Status } from '../../componentes/comunidade/Status.tsx'
import { useLeitura } from '../../componentes/comunidade/useLeitura.ts'
import { DENUNCIAS, ROTULO_ESTADO_DENUNCIA, ROTULO_MOTIVO, TX, textoDaPassagemComunidade } from '../../conteudo/comunidade.ts'
import type { Resultado } from '../../dados/comum.ts'
import { formatarDataHora, type AlvosDasDenuncias, type DenunciaMinha, type TipoAlvo } from '../../dados/comunidade.ts'

interface Lidas {
  denuncias: DenunciaMinha[]
  alvos: AlvosDasDenuncias
}

/** O tipo do alvo: tópico, resposta ou perfil (também quando os três ids são nulos: perfil excluído). */
function tipoDoAlvo(denuncia: DenunciaMinha): TipoAlvo {
  if (denuncia.topicoId) return 'topico'
  return denuncia.respostaId ? 'resposta' : 'perfil'
}

/** O que a pessoa ainda lê do alvo; sem isso (ou com o perfil excluído), "Conteúdo não disponível". */
function textoDoAlvo(denuncia: DenunciaMinha, alvos: AlvosDasDenuncias): string {
  const tipo = tipoDoAlvo(denuncia)
  if (tipo === 'topico') return alvos.topicos[denuncia.topicoId ?? ''] ?? DENUNCIAS.indisponivel
  if (tipo === 'resposta') {
    const corpo = alvos.respostas[denuncia.respostaId ?? '']
    return corpo === undefined ? DENUNCIAS.indisponivel : DENUNCIAS.trecho(corpo)
  }
  return alvos.perfis[denuncia.perfilId ?? ''] ?? DENUNCIAS.indisponivel
}

// C7, /app/comunidade/denuncias: as denúncias da conta, a mais nova primeiro. Não mostra quem decidiu.
export function MinhasDenuncias() {
  const dados = useDadosComunidade()
  const location = useLocation()
  const leitura = useLeitura(async (): Promise<Resultado<Lidas>> => {
    const lidas = await dados.minhasDenuncias()
    if (!lidas.ok) return lidas
    const alvos = await dados.alvosDasDenuncias(lidas.valor)
    return alvos.ok ? { ok: true, valor: { denuncias: lidas.valor, alvos: alvos.valor } } : alvos
  }, 'denuncias')
  const { estado } = leitura

  return (
    <Quadro
      voltar="/app/comunidade"
      ocupado={estado.fase === 'carregando'}
      titulo={<TituloDaTela>{DENUNCIAS.titulo}</TituloDaTela>}
      cabeca={
        <>
          <Status mensagem={textoDaPassagemComunidade(location.state)} />
          {leitura.esqueleto ? <Esqueleto /> : null}
          {estado.fase === 'erro' ? <ErroDeLeitura erro={estado.erro} aoTentarDeNovo={() => void leitura.recarregar()} /> : null}
          {estado.fase === 'pronto' && estado.valor.denuncias.length === 0 ? <p>{TX.tx19}</p> : null}
        </>
      }
    >
      {estado.fase === 'pronto' && estado.valor.denuncias.length > 0 ? (
        <Faixa>
          <Pilha as="ul" vao="grupo" className="m-0 list-none p-0">
            {estado.valor.denuncias.map((denuncia) => (
              <li key={denuncia.id}>
                <Cartao
                  as="article"
                  aria-labelledby={`denuncia-${denuncia.id}`}
                  className="flex flex-col gap-3 border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)]"
                >
                  <p className="cm-rotulo text-[var(--cor-texto-2)]">{DENUNCIAS.tipo[tipoDoAlvo(denuncia)]}</p>
                  <h2 id={`denuncia-${denuncia.id}`} className="cm-h4 text-titulo-4 wrap-anywhere">
                    {textoDoAlvo(denuncia, estado.valor.alvos)}
                  </h2>
                  <dl className="m-0 flex flex-col gap-2">
                    <div>
                      <dt className="cm-pequeno text-[var(--cor-texto-2)]">{DENUNCIAS.motivo}</dt>
                      <dd className="m-0">{ROTULO_MOTIVO[denuncia.motivo]}</dd>
                    </div>
                    {denuncia.texto ? (
                      <div>
                        <dt className="cm-pequeno text-[var(--cor-texto-2)]">{DENUNCIAS.detalhes}</dt>
                        <dd className="m-0 whitespace-pre-wrap wrap-anywhere">{denuncia.texto}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="cm-pequeno text-[var(--cor-texto-2)]">{DENUNCIAS.estado}</dt>
                      <dd className="m-0 font-medium">{ROTULO_ESTADO_DENUNCIA[denuncia.estado]}</dd>
                    </div>
                  </dl>
                  <p className="cm-pequeno tabular text-[var(--cor-texto-2)]">{DENUNCIAS.enviadaEm(formatarDataHora(denuncia.criadaEm))}</p>
                  {denuncia.decididaEm ? (
                    <p className="cm-pequeno tabular text-[var(--cor-texto-2)]">
                      {DENUNCIAS.decididaEm(formatarDataHora(denuncia.decididaEm))}
                    </p>
                  ) : null}
                </Cartao>
              </li>
            ))}
          </Pilha>
        </Faixa>
      ) : null}
    </Quadro>
  )
}
