import { useEffect, useRef, useState, type FormEvent } from 'react'
import { COMUM, FAMILIA, PAPEIS, textoDoErro } from '../../conteudo/conta.ts'
import type { Papel } from '../../dados/comum.ts'
import type { ConviteCriado, DetalheFamilia } from '../../dados/conta.ts'
import { Cartao, Pilha } from '../base/layout/index.ts'
import { familiaMudou, useAoFalharNaFamilia, type AcoesDaFamilia } from './acoesFamilia.ts'
import { Campo } from './Campos.tsx'
import { linkDoConvite } from './codigoConvite.ts'
import { fimDoDia, formatarData, formatarDataEHora, formatarNascimento, hojeNoFuso, somarDias } from './datas.ts'
import { EscolhaDePapel } from './EscolhaDePapel.tsx'
import { useEnvio } from './envio.ts'
import { useFocoNoResumo } from './foco.ts'
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, ResumoErro } from './Partes.tsx'
import { useDadosConta } from './sessao.tsx'

interface Props {
  detalhe: DetalheFamilia
  acoes: AcoesDaFamilia
}

/** Seleciona o texto de um elemento: o recurso para quando a área de transferência falha. */
function selecionar(elemento: HTMLElement | null) {
  const selecao = window.getSelection()
  if (!elemento || !selecao) return
  const faixa = document.createRange()
  faixa.selectNodeContents(elemento)
  selecao.removeAllRanges()
  selecao.addRange(faixa)
}

// O bloco Convites (RF-15, item 4), só do responsável: os pendentes do mais novo ao mais antigo,
// o formulário de novo convite e, logo depois de criado, o código (uma única vez).
export function BlocoConvites({ detalhe, acoes }: Props) {
  const dados = useDadosConta()
  const fuso = detalhe.familia.fuso
  const [papel, setPapel] = useState<Papel>('cuidador')
  const [validade, setValidade] = useState('')
  const [criado, setCriado] = useState<ConviteCriado | null>(null)
  const validadeRef = useRef<HTMLInputElement>(null)
  const linkRef = useRef<HTMLParagraphElement>(null)
  const codigoRef = useRef<HTMLParagraphElement>(null)
  const { estado, enviar, tentarDeNovo, enviando } = useEnvio()

  const erro = estado.fase === 'erro' ? estado.erro : null
  const campoDoErro = erro?.chave === 'validade_menor' || erro?.chave === 'responsavel_sem_validade' ? 'validade' : null
  const resumo = useFocoNoResumo(estado.fase === 'erro' && !campoDoErro ? estado : null)
  useAoFalharNaFamilia(erro, acoes.aposFalha)

  useEffect(() => {
    if (campoDoErro === 'validade') validadeRef.current?.focus()
  }, [estado, campoDoErro])

  const pendentes = [...(detalhe.convites ?? [])].sort((a, b) => b.expiraEm.localeCompare(a.expiraEm))
  const minimo = somarDias(hojeNoFuso(fuso), 7)

  function criar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const validoAte = papel === 'responsavel' || !validade ? null : fimDoDia(validade, fuso)
    // O código de um convite anterior some quando outro é criado.
    setCriado(null)
    acoes.dizer(null)
    void enviar({
      escrever: async () => {
        const resultado = await dados.criarConvite(detalhe.familia.id, papel, validoAte)
        // A resposta pode ter se perdido depois de gravar: a lista relida mostra se o convite nasceu.
        if (!resultado.ok && resultado.erro.classe === 'rede') await acoes.relerDetalhe()
        return resultado
      },
      aoSucesso: async (novo) => {
        if (novo) setCriado(novo)
        await acoes.aposAcao(FAMILIA.convites.criado(PAPEIS[papel].minusculo))
      },
    })
  }

  async function copiar(texto: string, alvo: HTMLElement | null, sucesso: string) {
    acoes.dizer(null)
    try {
      await navigator.clipboard.writeText(texto)
      acoes.dizer(sucesso)
    } catch {
      // Sem área de transferência (ou negada): o texto fica selecionado para copiar à mão.
      selecionar(alvo)
      acoes.dizer(COMUM.copieManualmente)
    }
  }

  return (
    <Pilha as="section" aria-labelledby="convites" vao="grupo">
      <h2 id="convites" className="cm-h4">
        {FAMILIA.convites.titulo}
      </h2>

      {pendentes.length === 0 ? (
        <p>{FAMILIA.convites.vazio}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {pendentes.map((convite) => (
            <li
              key={convite.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--cor-fio-suave)] py-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{PAPEIS[convite.papel].nome}</p>
                {convite.validoAte ? (
                  <p className="cm-pequeno tabular text-[var(--cor-texto-2)]">
                    {FAMILIA.convites.acessoAte(formatarData(convite.validoAte, fuso))}
                  </p>
                ) : null}
                <p className="cm-pequeno tabular text-[var(--cor-texto-2)]">
                  {convite.vencido
                    ? FAMILIA.convites.venceu(formatarDataEHora(convite.expiraEm, fuso))
                    : FAMILIA.convites.venceEm(formatarDataEHora(convite.expiraEm, fuso))}
                </p>
                <p className="cm-pequeno text-[var(--cor-texto-2)] wrap-anywhere">
                  {FAMILIA.convites.criadoPor(convite.criadoPorNome ?? FAMILIA.convites.pessoaRemovida)}
                </p>
              </div>
              <button
                type="button"
                className={BOTAO_SECUNDARIO}
                data-tamanho="app"
                aria-label={`${FAMILIA.convites.cancelar} de ${PAPEIS[convite.papel].minusculo}`}
                onClick={(evento) => acoes.abrirDialogo({ tipo: 'cancelarConvite', convite }, evento.currentTarget)}
              >
                {FAMILIA.convites.cancelar}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Cartao className="border border-[var(--cor-fio-suave)]">
      <form onSubmit={criar} noValidate aria-labelledby="novo-convite" className="flex flex-col gap-5">
        <h3 id="novo-convite" className="cm-h4">
          {FAMILIA.convites.novo}
        </h3>
        {erro && !campoDoErro && !familiaMudou(erro) ? (
          <ResumoErro
            erro={erro}
            texto={erro.chave === 'rede' ? COMUM.conexaoCaiu : undefined}
            repetivel={estado.fase === 'erro' && estado.tentarDeNovo}
            aoTentarDeNovo={() => void tentarDeNovo()}
            refResumo={resumo}
          />
        ) : null}
        <EscolhaDePapel
          legenda={FAMILIA.convites.papel}
          valor={papel}
          aoMudar={(novo) => {
            setPapel(novo)
            if (novo === 'responsavel') setValidade('')
          }}
        />
        {papel === 'responsavel' ? null : (
          <Campo
            rotulo={FAMILIA.convites.validade}
            tipo="date"
            min={minimo}
            tamanho="app"
            ajuda={FAMILIA.convites.ajudaValidade(formatarNascimento(minimo))}
            valor={validade}
            aoMudar={setValidade}
            erro={campoDoErro === 'validade' && erro ? textoDoErro(erro) : null}
            refEntrada={validadeRef}
          />
        )}
        <button type="submit" disabled={enviando} className={`${BOTAO_PRINCIPAL} sm:w-auto sm:self-start sm:px-8`}>
          {enviando ? FAMILIA.convites.criando : FAMILIA.convites.criar}
        </button>
      </form>
      </Cartao>

      {criado ? (
        <Cartao
          as="section"
          aria-labelledby="codigo-do-convite"
          className="border-[1.5px] border-[var(--cor-texto)] bg-[var(--cor-cartao)]"
        >
         <Pilha vao="pilha">
          <h3 id="codigo-do-convite" className="cm-h4">
            {FAMILIA.convites.codigoTitulo}
          </h3>
          <p>{FAMILIA.convites.codigoAviso}</p>
          <Pilha vao="junto" className="min-w-0">
            <p className="cm-rotulo">{FAMILIA.convites.linkRotulo}</p>
            <p
              ref={linkRef}
              data-link-convite
              className="tabular rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3 break-all"
            >
              {linkDoConvite(criado.codigo)}
            </p>
          </Pilha>
          <Pilha vao="junto" className="min-w-0">
            <p className="cm-rotulo">{FAMILIA.convites.codigoRotulo}</p>
            <p
              ref={codigoRef}
              data-codigo-convite
              className="tabular rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3 break-all"
            >
              {criado.codigo}
            </p>
          </Pilha>
          <p className="tabular">{FAMILIA.convites.venceEm(formatarDataEHora(criado.expiraEm, fuso))}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={BOTAO_SECUNDARIO}
              data-tamanho="app"
              onClick={() => void copiar(linkDoConvite(criado.codigo), linkRef.current, FAMILIA.convites.linkCopiado)}
            >
              {FAMILIA.convites.copiarLink}
            </button>
            <button
              type="button"
              className={BOTAO_SECUNDARIO}
              data-tamanho="app"
              onClick={() => void copiar(criado.codigo, codigoRef.current, FAMILIA.convites.codigoCopiado)}
            >
              {FAMILIA.convites.copiarCodigo}
            </button>
          </div>
         </Pilha>
        </Cartao>
      ) : null}
    </Pilha>
  )
}
