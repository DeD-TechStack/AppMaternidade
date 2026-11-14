import { BLOCO_DO_RESUMO } from '../../conteudo/resumoRotina.ts'
import { formatarMinutos } from '../rotina/totaisHistorico.ts'
import { CHAVES_DO_RESUMO, type ChaveDoNumero, type NumeroDoResumo, type ResumoCalculado } from './calculo.ts'

// O bloco de texto do resumo (RF12, RF-08 e RF-09): 1 linha de título e 1 linha por número marcado, na ordem
// sono, tummy time, mamadas, mamadeiras, fraldas, alimentação sólida. Só há números, os rótulos fixos e o título:
// nada do bebê, da família, dos registros nem de quem registrou chega até aqui, porque esta função só recebe o
// resultado da conta. O separador antes do bloco (RF-11) também é daqui.

/** `7,4`: uma casa decimal, com vírgula, sem a casa quando ela é ",0". Recebe a contagem em décimos. */
function contagemEmDecimos(decimos: number): string {
  const inteiro = Math.floor(decimos / 10)
  const casa = decimos % 10
  return casa === 0 ? String(inteiro) : `${inteiro},${casa}`
}

/** O rótulo fixo do número (`Sono`, `Mamadeiras`...). */
export const rotuloDoNumero = (chave: ChaveDoNumero): string => BLOCO_DO_RESUMO.rotulos[chave]

/** O valor da linha, sem o rótulo: `9 h 20`, `2, somando 240 ml`, `12 h 05 por dia`, `1,3 por dia, somando 180 ml por dia`. */
export function valorDoNumero(numero: NumeroDoResumo, periodo: ResumoCalculado['periodo']): string {
  const semana = periodo === 'semana'
  if (numero.chave === 'sono' || numero.chave === 'tummy') {
    const horas = formatarMinutos(numero.valor)
    return semana ? BLOCO_DO_RESUMO.porDia(horas) : horas
  }
  if (numero.chave === 'mamadeiras') {
    if (semana) {
      const contagem = contagemEmDecimos(numero.valor)
      return numero.ml === null ? BLOCO_DO_RESUMO.porDia(contagem) : BLOCO_DO_RESUMO.mamadeirasDaSemana(contagem, numero.ml)
    }
    return numero.ml === null ? String(numero.valor) : BLOCO_DO_RESUMO.mamadeirasDeHoje(numero.valor, numero.ml)
  }
  return semana ? BLOCO_DO_RESUMO.porDia(contagemEmDecimos(numero.valor)) : String(numero.valor)
}

/** A linha do bloco de um número: `- Sono: 9 h 20`. */
const linhaDoNumero = (numero: NumeroDoResumo, periodo: ResumoCalculado['periodo']): string =>
  BLOCO_DO_RESUMO.linha(rotuloDoNumero(numero.chave), valorDoNumero(numero, periodo))

/**
 * O bloco com os números `marcados` (os que o resumo traz com valor exibido positivo; os outros são ignorados),
 * sempre na ordem fixa, separados por `\n`, sem linha em branco e sem `\n` final. Sem nenhum marcado, o bloco é vazio.
 */
export function montarBloco(resumo: ResumoCalculado, marcados: readonly ChaveDoNumero[]): string {
  const linhas = CHAVES_DO_RESUMO.flatMap((chave) => {
    const numero = resumo.numeros.find((candidato) => candidato.chave === chave)
    return numero !== undefined && marcados.includes(chave) ? [linhaDoNumero(numero, resumo.periodo)] : []
  })
  if (linhas.length === 0) return ''
  const titulo = resumo.periodo === 'hoje' ? BLOCO_DO_RESUMO.tituloHoje : BLOCO_DO_RESUMO.tituloSemana(resumo.diasComRegistro ?? 0)
  return [titulo, ...linhas].join('\n')
}

/**
 * As quebras de linha que vão antes do bloco (RF-11). Corpo vazio: nenhuma. Senão, anda-se do fim do corpo para o
 * começo, pulando espaços e tabs; `n` é o número de `\n` achados antes do primeiro outro caractere (ou do começo
 * do corpo), no máximo 2; entram `2 − n` quebras. Nada do corpo é removido.
 */
export function separadorAntesDoBloco(corpo: string): string {
  if (corpo.length === 0) return ''
  let quebras = 0
  for (let posicao = corpo.length - 1; posicao >= 0 && quebras < 2; posicao--) {
    const caractere = corpo[posicao]
    if (caractere === '\n') quebras += 1
    else if (caractere !== ' ' && caractere !== '\t') break
  }
  return '\n'.repeat(2 - quebras)
}

/** O corpo com o bloco no fim, depois do separador: o que "Inserir no texto" põe no campo. */
export const anexarBloco = (corpo: string, bloco: string): string => `${corpo}${separadorAntesDoBloco(corpo)}${bloco}`
