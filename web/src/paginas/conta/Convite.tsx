import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { apagarChave, CHAVE_CONVITE, gravarChave, lerChave } from '../../componentes/conta/armazenamento.ts'
import { Campo } from '../../componentes/conta/Campos.tsx'
import { normalizarCodigo } from '../../componentes/conta/codigoConvite.ts'
import { formatarData, formatarDataEHora } from '../../componentes/conta/datas.ts'
import { caminhoComVolta } from '../../componentes/conta/destino.ts'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { MolduraPublica } from '../../componentes/conta/MolduraPublica.tsx'
import {
  BOTAO_PRINCIPAL,
  BOTAO_SECUNDARIO,
  Carregando,
  LINK_ALVO,
  ResumoErro,
} from '../../componentes/conta/Partes.tsx'
import { useDadosConta, useSessao } from '../../componentes/conta/sessao.tsx'
import { CONVITE, MANCHETES, PAPEIS, TEXTOS_ERRO, TITULOS } from '../../conteudo/conta.ts'
import type { ErroDados } from '../../dados/comum.ts'
import { erroDaChave } from '../../dados/conta.erros.ts'
import type { FamiliaResumo, PreviaConvite } from '../../dados/conta.ts'

// Os quatro erros depois dos quais o código guardado não serve mais (RF-13).
const ERROS_QUE_LIMPAM = new Set(['convite_invalido', 'convite_revogado', 'convite_usado', 'convite_vencido'])

interface Entrada {
  codigo: string | null
  /** O erro que veio da chegada (fragmento de formato inválido) ou do último código tentado. */
  erro: ErroDados | null
}

type Leitura =
  | { codigo: string; fase: 'pronta'; previa: PreviaConvite; familiasAntes: FamiliaResumo[] }
  | { codigo: string; fase: 'erro'; erro: ErroDados }

/**
 * O fragmento da URL (`#<código>`) vale sobre o código já guardado: normalizado e de formato válido,
 * substitui o guardado; inválido, apaga o guardado e vira `convite_invalido`. Vazio (só `#`) conta
 * como sem fragmento: devolve `null`.
 */
function lerFragmento(hash: string): Entrada | null {
  const fragmento = hash.replace(/^#/, '')
  if (!fragmento) return null
  const codigo = normalizarCodigo(fragmento)
  if (codigo) {
    gravarChave('sessao', CHAVE_CONVITE, codigo)
    return { codigo, erro: null }
  }
  apagarChave('sessao', CHAVE_CONVITE)
  return { codigo: null, erro: erroDaChave('convite_invalido') }
}

// /convite (RF-13): o código chega pelo fragmento do link ou por um campo. Sem sessão a página só
// avisa que há um convite (sem chamar o banco); com sessão e conta completa mostra a prévia, e
// "Aceitar convite" leva à Família. O código vive no `sessionStorage` até ser usado ou descartado.
export function Convite() {
  const sessao = useSessao()
  const dados = useDadosConta()
  const location = useLocation()
  const navigate = useNavigate()

  const [entrada, setEntrada] = useState<Entrada>(
    () => lerFragmento(location.hash) ?? { codigo: lerChave('sessao', CHAVE_CONVITE), erro: null },
  )
  const [leitura, setLeitura] = useState<Leitura | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const [valorDoCampo, setValorDoCampo] = useState('')
  const [erroDoCampo, setErroDoCampo] = useState<string | null>(null)
  const campoRef = useRef<HTMLInputElement>(null)
  const aceitacao = useEnvio()
  const novaFamilia = useRef<string | null>(null)
  const hashLido = useRef(location.hash)

  // O fragmento sai da barra de endereço sem criar entrada no histórico. Um fragmento que chega com
  // a página já aberta segue a mesma regra de quando ela abre.
  const { hash, pathname, search } = location
  useEffect(() => {
    if (!hash) return
    if (hash !== hashLido.current) {
      hashLido.current = hash
      const lido = lerFragmento(hash)
      if (lido) queueMicrotask(() => setEntrada(lido))
    }
    void navigate({ pathname, search }, { replace: true })
  }, [hash, pathname, search, navigate])

  const conta = sessao.estado === 'com_sessao' ? sessao.conta : null
  const erroDeLeitura = leitura?.fase === 'erro' && leitura.codigo === entrada.codigo ? leitura.erro : null
  const erroDeAceite = aceitacao.estado.fase === 'erro' ? aceitacao.estado.erro : null
  const erroFatal =
    (erroDeAceite && ERROS_QUE_LIMPAM.has(erroDeAceite.chave) ? erroDeAceite : null) ??
    (erroDeLeitura && ERROS_QUE_LIMPAM.has(erroDeLeitura.chave) ? erroDeLeitura : null)
  const codigo = erroFatal ? null : entrada.codigo
  const alvo = conta ? codigo : null

  // O código morreu: sai do `sessionStorage`.
  useEffect(() => {
    if (erroFatal) apagarChave('sessao', CHAVE_CONVITE)
  }, [erroFatal])

  // A prévia e a lista de famílias de antes da 1ª tentativa de aceitar.
  useEffect(() => {
    if (!alvo) return
    let vigente = true
    async function ler(codigoLido: string) {
      const previa = await dados.verConvite(codigoLido)
      if (!vigente) return
      if (!previa.ok) return setLeitura({ codigo: codigoLido, fase: 'erro', erro: previa.erro })
      const familias = await dados.minhasFamilias()
      if (!vigente) return
      if (!familias.ok) return setLeitura({ codigo: codigoLido, fase: 'erro', erro: familias.erro })
      setLeitura({ codigo: codigoLido, fase: 'pronta', previa: previa.valor, familiasAntes: familias.valor })
    }
    queueMicrotask(() => void ler(alvo))
    return () => {
      vigente = false
    }
  }, [alvo, dados, tentativa])

  const resumoDoErro = useFocoNoResumo(erroFatal ?? erroDeLeitura ?? entrada.erro)
  const resumoDoAceite = useFocoNoResumo(erroDeAceite && !erroFatal ? aceitacao.estado : null)

  const pronta = leitura?.fase === 'pronta' && leitura.codigo === alvo ? leitura : null
  const lendo = alvo !== null && pronta === null && erroDeLeitura === null

  function continuar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const normal = normalizarCodigo(valorDoCampo)
    if (!normal) {
      setErroDoCampo(TEXTOS_ERRO.convite_invalido)
      return campoRef.current?.focus()
    }
    setErroDoCampo(null)
    gravarChave('sessao', CHAVE_CONVITE, normal)
    aceitacao.limpar()
    setLeitura(null)
    setTentativa((n) => n + 1)
    setEntrada({ codigo: normal, erro: null })
  }

  function descartar(irPara: string) {
    apagarChave('sessao', CHAVE_CONVITE)
    void navigate(irPara)
  }

  function aceitar(leituraPronta: Extract<Leitura, { fase: 'pronta' }>) {
    const antes = new Set(leituraPronta.familiasAntes.map((familia) => familia.id))
    novaFamilia.current = null
    void aceitacao.enviar({
      escrever: () => dados.aceitarConvite(leituraPronta.codigo),
      // Depois de uma resposta perdida: exatamente uma família que não estava na lista de antes.
      conferir: async () => {
        const lida = await dados.minhasFamilias()
        if (!lida.ok) return lida
        const novas = lida.valor.filter((familia) => !antes.has(familia.id))
        if (novas.length !== 1) return { ok: true, valor: false }
        novaFamilia.current = novas[0].id
        return { ok: true, valor: true }
      },
      aoSucesso: (id) => {
        const destino = id ?? novaFamilia.current
        if (!destino) return
        apagarChave('sessao', CHAVE_CONVITE)
        void navigate(`/app/familia?familia=${encodeURIComponent(destino)}`, {
          state: { mensagem: 'entrou_na_familia', familia: leituraPronta.previa.familiaNome },
        })
      },
    })
  }

  // Conta incompleta com sessão: primeiro o passo "Seu nome", com volta para cá.
  if (sessao.estado === 'com_sessao' && !sessao.conta) {
    return <Navigate to={`/app/comecar?volta=${encodeURIComponent('/convite')}`} replace />
  }

  const semSessao = sessao.estado === 'sem_sessao'
  const ocupado = sessao.estado === 'carregando' || lendo

  const campoDoCodigo = (
    <form onSubmit={continuar} noValidate className="flex flex-col gap-4">
      <Campo
        rotulo={CONVITE.campo}
        ajuda={CONVITE.ajudaCampo}
        valor={valorDoCampo}
        aoMudar={(valor) => {
          setValorDoCampo(valor)
          setErroDoCampo(null)
        }}
        erro={erroDoCampo}
        refEntrada={campoRef}
      />
      <button type="submit" className={BOTAO_PRINCIPAL}>
        {CONVITE.continuar}
      </button>
    </form>
  )

  const erroDaTela = erroFatal ?? erroDeLeitura ?? entrada.erro

  return (
    <MolduraPublica
      titulo={TITULOS.convite}
      manchete={MANCHETES.convite}
      frase={CONVITE.frase}
      ocupado={ocupado}
    >
      {sessao.estado === 'carregando' ? (
        <Carregando />
      ) : sessao.estado === 'erro' && sessao.erro ? (
        <ResumoErro erro={sessao.erro} repetivel aoTentarDeNovo={() => void sessao.recarregarConta()} />
      ) : semSessao && codigo ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3">{CONVITE.guardado}</p>
          <div className="flex flex-col gap-3">
            <Link
              to={caminhoComVolta('/entrar', '/convite')}
              className={BOTAO_PRINCIPAL}
              data-botao="primario"
            >
              {CONVITE.entrar}
            </Link>
            <Link
              to={caminhoComVolta('/criar-conta', '/convite')}
              className={`${BOTAO_SECUNDARIO} w-full`}
              data-botao="contorno"
              data-tamanho="app"
            >
              {CONVITE.criarConta}
            </Link>
            <button
              type="button"
              className={`${BOTAO_SECUNDARIO} w-full`}
              data-tamanho="app"
              onClick={() => descartar('/')}
            >
              {CONVITE.descartar}
            </button>
          </div>
        </div>
      ) : lendo ? (
        <Carregando />
      ) : pronta ? (
        <section
          aria-labelledby="titulo-previa"
          className="flex flex-col gap-5 rounded-cartao border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)] p-6"
        >
          <h2 id="titulo-previa" className="cm-h4 wrap-anywhere">
            {pronta.previa.familiaNome}
          </h2>
          <p>
            {pronta.previa.bebes.length > 0 ? (
              <>
                {CONVITE.bebes}: <strong className="wrap-anywhere">{pronta.previa.bebes.join(', ')}</strong>
              </>
            ) : (
              CONVITE.semBebes
            )}
          </p>
          <div className="flex flex-col gap-1">
            <p>
              {CONVITE.convidouComo} <strong>{PAPEIS[pronta.previa.papel].minusculo}</strong>.
            </p>
            <p className="cm-pequeno text-[var(--cor-texto-2)]">{PAPEIS[pronta.previa.papel].permite}</p>
          </div>
          <div className="tabular flex flex-col gap-1">
            {pronta.previa.validoAte ? (
              <p>{CONVITE.acessoAte(formatarData(pronta.previa.validoAte, conta?.fuso ?? 'UTC'))}</p>
            ) : null}
            <p>{CONVITE.vence(formatarDataEHora(pronta.previa.expiraEm, conta?.fuso ?? 'UTC'))}</p>
          </div>
          {erroDeAceite && !erroFatal ? (
            <ResumoErro
              erro={erroDeAceite}
              familiaNome={pronta.previa.familiaNome}
              repetivel={aceitacao.estado.fase === 'erro' && aceitacao.estado.tentarDeNovo}
              aoTentarDeNovo={() => void aceitacao.tentarDeNovo()}
              refResumo={resumoDoAceite}
            >
              {erroDeAceite.chave === 'ja_e_membro' ? (
                <Link
                  to="/app/familia"
                  className={LINK_ALVO}
                  onClick={() => apagarChave('sessao', CHAVE_CONVITE)}
                >
                  {CONVITE.irParaFamilia}
                </Link>
              ) : null}
            </ResumoErro>
          ) : null}
          <div className="flex flex-col gap-3 min-[30rem]:flex-row-reverse">
            <button
              type="button"
              disabled={aceitacao.enviando}
              className={BOTAO_PRINCIPAL}
              onClick={() => aceitar(pronta)}
            >
              {aceitacao.enviando ? CONVITE.aceitando : CONVITE.aceitar}
            </button>
            <button
              type="button"
              disabled={aceitacao.enviando}
              className={`${BOTAO_SECUNDARIO} min-[30rem]:w-full`}
              data-tamanho="app"
              onClick={() => descartar(pronta.familiasAntes.length > 0 ? '/app/familia' : '/app/comecar')}
            >
              {CONVITE.agoraNao}
            </button>
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          {erroDaTela ? (
            <ResumoErro
              erro={erroDaTela}
              repetivel={erroDeLeitura !== null && !erroFatal}
              aoTentarDeNovo={() => {
                setLeitura(null)
                setTentativa((n) => n + 1)
              }}
              refResumo={resumoDoErro}
            />
          ) : null}
          {campoDoCodigo}
        </div>
      )}
    </MolduraPublica>
  )
}
