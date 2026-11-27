import { ESTADOS } from '../../conteudo/rotina.ts'
import type { BebeAtivo } from './contexto.ts'

/**
 * O texto que ocupa o lugar do que a pessoa não pode fazer (R38-11): bebê arquivado, cuidador (muda só o que
 * registrou) ou observador (só vê). Uma tela mostra UMA destas frases, nunca duas.
 */
export const textoDoPapel = (ativo: Pick<BebeAtivo, 'arquivado' | 'papel'>): string =>
  ativo.arquivado ? ESTADOS.arquivado : ativo.papel === 'cuidador' ? ESTADOS.cuidador : ESTADOS.observador
