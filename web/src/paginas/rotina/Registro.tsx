import { useEffect, type ReactNode } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { AvisoDaTela } from '../../componentes/app/AvisoDaTela.tsx'
import { AvisoDeErro } from '../../componentes/rotina/AvisoDeErro.tsx'
import { FormularioRegistro } from '../../componentes/rotina/FormularioRegistro.tsx'
import { TituloRotina } from '../../componentes/rotina/TituloRotina.tsx'
import { useRotina, type BebeAtivo } from '../../componentes/rotina/contexto.ts'
import { useSecao } from '../../componentes/rotina/useSecao.ts'
import { COMUM, ESTADOS, ROTULO_TIPO, TITULOS } from '../../conteudo/rotina.ts'
import type { Resultado } from '../../dados/comum.ts'
import { ehTipoRegistro, podeEscrever, type Registro, type TipoRegistro } from '../../dados/rotina.tipos.ts'
import { ehUuid } from '../../dados/rotina.uuid.ts'
import { focoDoEstado } from '../../prototipo/foco.ts'
import { useTituloDaTela } from '../../prototipo/useTituloDaTela.ts'

const PREFIXO = 'registro:'

const VOLTAR = (
  <Link
    to="/app/hoje"
    state={{ foco: 'titulo' }}
    className="alvo-toque -ml-1 mb-3 inline-flex min-h-(--alvo-toque) items-center gap-1.5 rounded-pilula px-1 text-[17px] leading-[25px] font-medium no-underline underline-offset-4 hover:underline"
    data-voltar=""
  >
    <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2} />
    <span>{COMUM.voltarParaHoje}</span>
  </Link>
)

/** O texto que ocupa o lugar do formulário para quem não pode criar nem alterar (R38-11). */
function textoDoPapel(ativo: BebeAtivo): string {
  if (ativo.arquivado) return ESTADOS.arquivado
  return ativo.papel === 'cuidador' ? ESTADOS.cuidador : ESTADOS.observador
}

/** A casca das telas de formulário: o link de volta, o título e o `<main>` único, com o aviso de demonstração. */
function Tela({ titulo, linha, children }: { titulo: string; linha: string; children: ReactNode }) {
  const location = useLocation()
  const { principal, focarTitulo } = useTituloDaTela()
  const foco = focoDoEstado(location.state)
  useEffect(() => {
    if (foco === 'titulo') focarTitulo()
  }, [foco, location.key, focarTitulo])
  return (
    <>
      <main ref={principal} className="pb-16 text-[17px] leading-[25px]" data-tela="registro">
        <TituloRotina antes={VOLTAR} titulo={titulo} linha={linha} />
        <div className="cm-area mt-6 lg:mt-10">{children}</div>
      </main>
      <AvisoDaTela />
    </>
  )
}

/**
 * `/app/registro/novo` (R38-10): abre só para quem pode criar. O `?tipo=` escolhe o tipo; sem ele, ou com um
 * tipo desconhecido, o primeiro campo é a escolha do tipo (registro retroativo, D-15).
 */
export function RegistroNovo() {
  const { ativo } = useRotina()
  const [parametros] = useSearchParams()
  if (!ativo) return null
  const tipoBruto = parametros.get('tipo')
  const tipo: TipoRegistro | '' = ehTipoRegistro(tipoBruto) ? tipoBruto : ''
  const liberado = podeEscrever(ativo.papel) && !ativo.arquivado
  return (
    <Tela titulo={TITULOS.registroNovo} linha={tipo === '' ? ativo.bebe.nome : `${ROTULO_TIPO[tipo]}, ${ativo.bebe.nome}`}>
      {liberado ? (
        <FormularioRegistro key={ativo.bebe.id} modo="novo" ativo={ativo} tipoInicial={tipo} />
      ) : (
        <p className="font-medium" data-sem-permissao="">
          {textoDoPapel(ativo)}
        </p>
      )}
    </Tela>
  )
}

interface Leitura {
  registro: Registro | null
}

/** `/app/registro/<id>/editar` (R38-10): abre só para quem pode alterar o registro. */
export function RegistroEditar() {
  const rotina = useRotina()
  const { dados, ativo, bebes, escolherBebe, podeAlterar } = rotina
  const { id } = useParams()
  const invalido = !ehUuid(id)
  const leitura = useSecao<Leitura>(invalido ? null : `${PREFIXO}${id}`, async (chave): Promise<Resultado<Leitura>> => {
    const lido = await dados.registro(chave.slice(PREFIXO.length))
    return lido.ok ? { ok: true, valor: { registro: lido.valor } } : lido
  })
  const registro = leitura.dados?.registro ?? null

  // Abrir por link um registro de outro bebê visível troca o bebê ativo para o dele (R38-03, item 1).
  const bebeDoRegistro = registro?.bebeId ?? null
  const bebeAtivoId = ativo?.bebe.id ?? null
  useEffect(() => {
    if (bebeDoRegistro !== null && bebeDoRegistro !== bebeAtivoId && bebes.some((candidato) => candidato.bebe.id === bebeDoRegistro)) {
      escolherBebe(bebeDoRegistro)
    }
  }, [bebeDoRegistro, bebeAtivoId, bebes, escolherBebe])

  if (!ativo) return null
  const dono = (registro ? bebes.find((candidato) => candidato.bebe.id === registro.bebeId) : undefined) ?? ativo
  const titulo = TITULOS.registroEditar

  if (invalido || (leitura.estado === 'pronto' && registro === null)) {
    return (
      <Tela titulo={titulo} linha={ativo.bebe.nome}>
        <p className="font-medium" data-nao-encontrado="">
          {ESTADOS.naoEncontrado}
        </p>
      </Tela>
    )
  }
  if (leitura.estado === 'erro' && leitura.dados === null && leitura.erro) {
    return (
      <Tela titulo={titulo} linha={ativo.bebe.nome}>
        <div className="max-w-[28rem]">
          <AvisoDeErro erro={leitura.erro} papel={ativo.papel} aoTentarDeNovo={leitura.recarregar} />
        </div>
      </Tela>
    )
  }
  if (registro === null) {
    return (
      <Tela titulo={titulo} linha={ativo.bebe.nome}>
        <p aria-busy="true">{COMUM.carregando}</p>
      </Tela>
    )
  }

  const linha = `${ROTULO_TIPO[registro.tipo]}, ${dono.bebe.nome}`
  return (
    <Tela titulo={titulo} linha={linha}>
      {/* Uma releitura que falhou com o registro já na tela: o aviso e `Tentar de novo` ficam junto dele, sem
          desmontar o formulário nem apagar o que a pessoa digitou (R8). */}
      {leitura.erro ? (
        <div className="mb-6 max-w-[28rem]" data-releitura-falhou="">
          <AvisoDeErro erro={leitura.erro} papel={dono.papel} aoTentarDeNovo={leitura.recarregar} />
        </div>
      ) : null}
      {registro.excluidoEm !== null ? (
        <p className="font-medium" data-registro-excluido="">
          {ESTADOS.registroExcluido}
        </p>
      ) : podeAlterar(registro) ? (
        <FormularioRegistro key={registro.id} modo="editar" ativo={dono} tipoInicial={registro.tipo} registro={registro} />
      ) : (
        <p className="font-medium" data-sem-permissao="">
          {textoDoPapel(dono)}
        </p>
      )}
    </Tela>
  )
}
