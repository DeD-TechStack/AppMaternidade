import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { COMUM, NOTAS } from '../../conteudo/rotina.ts'
import type { ErroDados } from '../../dados/comum.ts'
import type { Nota } from '../../dados/rotina.tipos.ts'
import { uuidV7 } from '../../dados/rotina.uuid.ts'
import { ALVO_APP } from '../app/alvo.ts'
import { Botao } from '../base/Botao.tsx'
import { AvisoDeErro } from './AvisoDeErro.tsx'
import { Controle, Selecao } from './FormularioRegistro.tsx'
import { useRotina, type BebeAtivo } from './contexto.ts'
import { dataEHora } from './datasDaRotina.ts'
import type { OrigemDasNotas } from './origemDasNotas.ts'
import { useAcoesDaRotina } from './useAcoesDaRotina.ts'

const HORA = 60 * 60 * 1000
const LIMITE_DO_TEXTO = 500

/** O que o campo `Destaque` guarda: vazio é `Sem destaque`; `manter` só existe na edição com destaque vigente. */
type Destaque = '' | '12h' | '24h' | '3d' | 'manter'
type Sobre = '' | 'bebe'

const DURACAO_DO_DESTAQUE: Readonly<Record<'12h' | '24h' | '3d', number>> = { '12h': 12 * HORA, '24h': 24 * HORA, '3d': 72 * HORA }

interface Props {
  modo: 'nova' | 'editar'
  ativo: BebeAtivo
  /** Na edição, a nota lida. */
  nota?: Nota
  /** A origem (R38-24, M1): o destino de salvar e de cancelar. */
  origem: OrigemDasNotas
}

/**
 * A chamada de escrita COMPLETA, congelada quando a pessoa envia: o id, o texto, o destinatário e o fim do destaque.
 * `Tentar de novo` repete exatamente esta chamada (mesmo id, mesmo instante de destaque); outros valores são outro
 * envio e, na criação, outra nota, com outro id.
 */
interface Chamada {
  id: string
  texto: string
  bebeId: string | null
  destaqueAte: string | null
  escolha: Destaque
}

const mesmosValores = (a: Chamada, b: Chamada) => a.texto === b.texto && a.bebeId === b.bebeId && a.escolha === b.escolha

/** O formulário de nota, nova e edição (R38-24). `Sobre` só existe como campo na criação. */
export function FormularioNota({ modo, ativo, nota, origem }: Props) {
  const { dados, atualizar, mostrarConfirmacao, podeAlterar } = useRotina()
  const acoes = useAcoesDaRotina()
  const navigate = useNavigate()
  const formulario = useRef<HTMLFormElement>(null)
  const [id] = useState(() => nota?.id ?? uuidV7())
  const [abertoEm] = useState(() => Date.now())
  const destaqueVigente = nota?.destaqueAte != null && Date.parse(nota.destaqueAte) > abertoEm
  const [texto, setTexto] = useState(nota?.texto ?? '')
  const [sobre, setSobre] = useState<Sobre>(ativo.arquivado ? '' : 'bebe')
  const [destaque, setDestaque] = useState<Destaque>(destaqueVigente ? 'manter' : '')
  const [erroDoTexto, setErroDoTexto] = useState<string | undefined>()
  const [tentativas, setTentativas] = useState(0)
  const [erroDeEnvio, setErroDeEnvio] = useState<ErroDados | null>(null)
  const [enviando, setEnviando] = useState(false)
  const pendente = useRef<Chamada | null>(null)

  useEffect(() => {
    if (tentativas > 0) formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [tentativas])

  function irParaAOrigem() {
    void navigate(origem, { state: { foco: 'titulo' } })
  }

  function prepararChamada(textoLimpo: string): Chamada {
    const bebeId = modo === 'nova' ? (sobre === 'bebe' ? ativo.bebe.id : null) : (nota?.bebeId ?? null)
    const destaqueAte =
      destaque === 'manter' ? (nota?.destaqueAte ?? null) : destaque === '' ? null : new Date(Date.now() + DURACAO_DO_DESTAQUE[destaque]).toISOString()
    const nova: Chamada = { id, texto: textoLimpo, bebeId, destaqueAte, escolha: destaque }
    const anterior = pendente.current
    if (anterior === null) return nova
    if (mesmosValores(anterior, nova)) return anterior
    return modo === 'nova' ? { ...nova, id: uuidV7() } : nova
  }

  async function gravar(chamada: Chamada) {
    pendente.current = chamada
    setEnviando(true)
    setErroDeEnvio(null)
    const resultado =
      modo === 'nova'
        ? await dados.gravarNota({ id: chamada.id, familiaId: ativo.familia.id, texto: chamada.texto, bebeId: chamada.bebeId, destaqueAte: chamada.destaqueAte })
        : await dados.editarNota(chamada.id, chamada.texto, chamada.destaqueAte)
    setEnviando(false)
    if (!resultado.ok) {
      setErroDeEnvio(resultado.erro)
      acoes.aposErro(resultado.erro)
      return
    }
    atualizar()
    mostrarConfirmacao({ texto: NOTAS.salva, acoes: [{ chave: 'fechar', rotulo: COMUM.fechar, executar: () => undefined }] })
    irParaAOrigem()
  }

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    if (enviando) return
    const limpo = texto.trim()
    if (limpo === '' || limpo.length > LIMITE_DO_TEXTO) {
      setErroDoTexto(limpo === '' ? NOTAS.erroTextoObrigatorio : NOTAS.erroTextoLongo)
      setTentativas((anterior) => anterior + 1)
      return
    }
    setErroDoTexto(undefined)
    void gravar(prepararChamada(limpo))
  }

  const nomeDoSobre = nota ? (nota.bebeId === null ? NOTAS.sobreAFamiliaToda : NOTAS.sobre(ativo.familia.bebes.find((bebe) => bebe.id === nota.bebeId)?.nome ?? COMUM.semNomeDoBebe)) : ''
  // Só quem pode alterar a nota abre a edição; a página já filtra, e aqui o botão não grava sem permissão.
  const liberado = modo === 'nova' || (nota !== undefined && podeAlterar(nota))

  return (
    <form ref={formulario} noValidate onSubmit={aoEnviar} className="flex max-w-[40rem] flex-col gap-6" data-formulario-nota={modo}>
      <Controle rotulo={NOTAS.campoTexto} erro={erroDoTexto} ajuda={NOTAS.limiteDoTexto}>
        {(propriedades) => (
          <textarea
            {...propriedades}
            rows={4}
            value={texto}
            readOnly={enviando}
            className="block min-h-[6rem] w-full resize-y rounded-campo border-[1.5px] border-(--cor-texto-2) bg-(--cor-cartao) px-4 py-3 text-[17px] leading-[25px] text-(--cor-texto) hover:border-(--cor-texto) focus-visible:border-(--cor-texto)"
            onChange={(evento) => setTexto(evento.target.value)}
          />
        )}
      </Controle>

      {modo === 'nova' ? (
        <Selecao<'bebe'>
          rotulo={NOTAS.campoSobre}
          valor={sobre}
          opcoes={ativo.arquivado ? [] : [{ valor: 'bebe', rotulo: ativo.bebe.nome }]}
          vazio={NOTAS.familiaToda}
          aoMudar={(novo) => setSobre(novo)}
          bloqueado={enviando}
        />
      ) : (
        <div className="cm-campo max-w-none" data-sobre="">
          <span className="cm-campo-rotulo">{NOTAS.campoSobre}</span>
          <p className="font-medium">{nomeDoSobre}</p>
        </div>
      )}

      <Selecao<'12h' | '24h' | '3d' | 'manter'>
        rotulo={NOTAS.campoDestaque}
        valor={destaque}
        opcoes={[
          ...(destaqueVigente && nota?.destaqueAte ? [{ valor: 'manter' as const, rotulo: NOTAS.manterAte(dataEHora(Date.parse(nota.destaqueAte))) }] : []),
          { valor: '12h', rotulo: NOTAS.por12Horas },
          { valor: '24h', rotulo: NOTAS.por24Horas },
          { valor: '3d', rotulo: NOTAS.por3Dias },
        ]}
        vazio={NOTAS.semDestaque}
        aoMudar={(novo) => setDestaque(novo)}
        bloqueado={enviando}
      />

      {erroDeEnvio ? (
        <AvisoDeErro
          erro={erroDeEnvio}
          escrita
          papel={ativo.papel}
          aoTentarDeNovo={() => {
            if (pendente.current) void gravar(pendente.current)
          }}
        />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Botao type="submit" tamanho="app" className={`min-w-[8.5rem] ${ALVO_APP}`} desativado={enviando || !liberado}>
          {enviando ? COMUM.salvando : NOTAS.salvar}
        </Botao>
        <Botao variante="texto" tamanho="app" className={ALVO_APP} onClick={irParaAOrigem}>
          {NOTAS.cancelar}
        </Botao>
      </div>
    </form>
  )
}
