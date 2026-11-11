import { Ilustracao } from '../componentes/campo/Ilustracao.tsx'
import type { TipoSessao } from './estado.ts'
import { DESCRICAO_DA_MIDIA } from './textosSessao.ts'

/**
 * A mídia da Sessão: um desenho de traço sobre o mel (nos dois temas: o traço preto nunca vai sobre o
 * cacau da madrugada). Tummy time: o bebê de bruços no tapete; mamada: a mãe ninando à noite; sono e
 * sem sessão: o mesmo desenho da noite, com a descrição dele.
 */
export function MidiaDaSessao({ tipo }: { tipo: TipoSessao | null }) {
  return (
    <div className="ha-midia-sessao" data-midia="">
      {tipo === 'tummy' ? (
        <Ilustracao nome="tummy-time" alt={DESCRICAO_DA_MIDIA.tummy} />
      ) : tipo === 'mamada' ? (
        <Ilustracao nome="mae-noite" alt={DESCRICAO_DA_MIDIA.mamada} />
      ) : (
        <Ilustracao nome="mae-noite" />
      )}
    </div>
  )
}
