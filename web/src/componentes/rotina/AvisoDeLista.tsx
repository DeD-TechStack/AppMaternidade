import { ESTADOS } from '../../conteudo/rotina.ts'

interface Props {
  /** O limite de linhas da leitura (`LIMITES`): o N da frase. */
  limite: number
  /** Qual lista passou do limite; fica no DOM para os testes e para a depuração. */
  dado: 'emAndamento' | 'notas' | 'anteriores' | 'doDia' | 'sessoes' | 'semana' | 'lixeira' | 'alteracoes'
  className?: string
}

/**
 * O aviso de uma lista que passou do limite de leitura (R38-02): "Esta lista mostra só os primeiros N itens."
 * Cada seção cuja leitura veio `incompleta` mostra o seu, com o limite dela. Texto simples, sem cor como
 * único sinal.
 */
export function AvisoDeLista({ limite, dado, className }: Props) {
  return (
    <p className={`text-pequeno text-(--cor-texto-2) ${className ?? ''}`} data-lista-incompleta={dado}>
      {ESTADOS.listaIncompleta(limite)}
    </p>
  )
}
