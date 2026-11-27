import { COMUM, DETALHE, FORMATOS } from '../../conteudo/rotina.ts'
import { ehTipoDeSessao, type Registro } from '../../dados/rotina.tipos.ts'
import { formatarDuracao } from '../../prototipo/formatar.ts'
import { dataEHora } from './datasDaRotina.ts'

interface CampoDoDetalhe {
  rotulo: string
  valor: string
}

/**
 * Os campos do detalhe de um registro (R38-22): o horário (início e fim nas sessões), a duração, os detalhes do
 * tipo e a nota. A autoria e a origem ficam por conta da tela.
 */
export function camposDoDetalhe(registro: Registro): CampoDoDetalhe[] {
  const campos: CampoDoDetalhe[] = []
  const inicio = Date.parse(registro.inicio)
  if (ehTipoDeSessao(registro.tipo)) {
    campos.push({ rotulo: DETALHE.inicio, valor: dataEHora(inicio) })
    campos.push({ rotulo: DETALHE.fim, valor: registro.fim === null ? COMUM.emAndamento : dataEHora(Date.parse(registro.fim)) })
    if (registro.fim !== null) campos.push({ rotulo: DETALHE.duracao, valor: formatarDuracao(Date.parse(registro.fim) - inicio) })
  } else {
    campos.push({ rotulo: DETALHE.horario, valor: dataEHora(inicio) })
  }
  const { detalhes } = registro
  if (registro.tipo === 'mamada' && detalhes.lado) campos.push({ rotulo: DETALHE.lado, valor: FORMATOS.lados[detalhes.lado] })
  if (registro.tipo === 'mamadeira') {
    if (detalhes.ml) campos.push({ rotulo: DETALHE.quantidade, valor: FORMATOS.ml(detalhes.ml) })
    if (detalhes.conteudo === 'leite_materno' || detalhes.conteudo === 'formula') {
      campos.push({ rotulo: DETALHE.conteudo, valor: FORMATOS.conteudosDaMamadeira[detalhes.conteudo] })
    }
  }
  if (registro.tipo === 'fralda' && (detalhes.conteudo === 'xixi' || detalhes.conteudo === 'coco' || detalhes.conteudo === 'ambos')) {
    campos.push({ rotulo: DETALHE.conteudo, valor: FORMATOS.conteudosDaFralda[detalhes.conteudo] })
  }
  if (registro.tipo === 'solido' && detalhes.alimento) campos.push({ rotulo: DETALHE.alimento, valor: detalhes.alimento })
  if (registro.nota) campos.push({ rotulo: DETALHE.nota, valor: registro.nota })
  return campos
}
