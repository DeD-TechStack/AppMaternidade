import { DETALHE, FORMATOS } from '../../conteudo/rotina.ts'
import type { Alteracao } from '../../dados/rotina.tipos.ts'
import { formatarHora } from '../../prototipo/formatar.ts'
import { diaEMesDoAparelho } from './datasDaRotina.ts'

// O que a edição mudou, campo a campo, para o "Histórico de alterações" do detalhe (R38-22): `Fim: 14:40 → 14:55`.
// Só as chaves editáveis entram; `fuso` e `deslocamento_min` ficam de fora.

interface CampoMudado {
  campo: string
  antes: string
  depois: string
}

type Detalhes = Record<string, unknown>

const CONTEUDOS: Readonly<Record<string, string>> = {
  ...FORMATOS.conteudosDaFralda,
  ...FORMATOS.conteudosDaMamadeira,
}

const comoDetalhes = (valor: unknown): Detalhes => (valor !== null && typeof valor === 'object' ? (valor as Detalhes) : {})

/** O horário de uma coluna: `HH:MM`, com `DD/MM` na frente quando é de outro dia do aparelho que o início. */
function horario(valor: unknown, referencia: number): string {
  if (typeof valor !== 'string') return DETALHE.semValor
  const instante = Date.parse(valor)
  if (Number.isNaN(instante)) return DETALHE.semValor
  return diaEMesDoAparelho(instante) === diaEMesDoAparelho(referencia)
    ? formatarHora(instante)
    : `${diaEMesDoAparelho(instante)} ${formatarHora(instante)}`
}

function valorDoDetalhe(chave: string, valor: unknown): string {
  if (valor === undefined || valor === null || valor === '') return DETALHE.semValor
  if (chave === 'lado') return FORMATOS.lados[valor as keyof typeof FORMATOS.lados] ?? String(valor)
  if (chave === 'conteudo') return CONTEUDOS[String(valor)] ?? String(valor)
  if (chave === 'ml') return FORMATOS.ml(Number(valor))
  return String(valor)
}

const ROTULO_DO_DETALHE: Readonly<Record<string, string>> = {
  lado: DETALHE.lado,
  ml: DETALHE.quantidade,
  conteudo: DETALHE.conteudo,
  alimento: DETALHE.alimento,
}

/** Os campos que a edição mudou, na ordem: início, fim, detalhes, nota. Sem `antes` ou `depois`, nenhum. */
export function camposMudados(alteracao: Alteracao): CampoMudado[] {
  const { antes, depois } = alteracao
  if (alteracao.operacao !== 'edicao' || antes === null || depois === null) return []
  const referencia = typeof antes.inicio === 'string' ? Date.parse(antes.inicio) : 0
  const mudados: CampoMudado[] = []
  if (antes.inicio !== depois.inicio) {
    mudados.push({ campo: DETALHE.inicio, antes: horario(antes.inicio, referencia), depois: horario(depois.inicio, referencia) })
  }
  if (antes.fim !== depois.fim) {
    mudados.push({ campo: DETALHE.fim, antes: horario(antes.fim, referencia), depois: horario(depois.fim, referencia) })
  }
  const detalhesAntes = comoDetalhes(antes.detalhes)
  const detalhesDepois = comoDetalhes(depois.detalhes)
  for (const chave of Object.keys(ROTULO_DO_DETALHE)) {
    if (detalhesAntes[chave] !== detalhesDepois[chave]) {
      mudados.push({
        campo: ROTULO_DO_DETALHE[chave],
        antes: valorDoDetalhe(chave, detalhesAntes[chave]),
        depois: valorDoDetalhe(chave, detalhesDepois[chave]),
      })
    }
  }
  if (antes.nota !== depois.nota) {
    const comoNota = (valor: unknown) => (typeof valor === 'string' && valor !== '' ? valor : DETALHE.semNota)
    mudados.push({ campo: DETALHE.nota, antes: comoNota(antes.nota), depois: comoNota(depois.nota) })
  }
  return mudados
}
