import { Hoje } from '../../paginas/Hoje.tsx'
import { Sessao } from '../../paginas/Sessao.tsx'
import { ContextoDoPrototipo } from '../../prototipo/contexto.ts'
import { ContextoDoRelogio } from '../../prototipo/relogio.ts'
import { ContextoDaVitrine } from '../../prototipo/vitrine.ts'
import { dadosDaVitrine } from './estadoFixo.ts'

const semAcao = () => undefined

// A tela de verdade (Hoje ou Sessão: os mesmos componentes e subcomponentes, na mesma ordem) com um
// estado fixo, um relógio parado e um `dispatch` que não faz nada. Não usa o ProvedorPrototipo do
// Layout, que muda o tema do <html>: o tema da madrugada vale só dentro da moldura (o <Aparelho>
// põe o invólucro local). Por ser vitrine (ContextoDaVitrine), a tela não move o foco, não lê nem
// escreve a URL, não mede a janela, não repete id e nada nela entra na ordem de Tab.
export function TelaReal({ tela }: { tela: 'hoje' | 'sessao' | 'madrugada' }) {
  const { estado, agora } = dadosDaVitrine(tela)
  return (
    <ContextoDaVitrine value>
      <ContextoDoRelogio value={agora}>
        <ContextoDoPrototipo value={{ estado, dispatch: semAcao }}>
          {tela === 'hoje' ? <Hoje /> : <Sessao />}
        </ContextoDoPrototipo>
      </ContextoDoRelogio>
    </ContextoDaVitrine>
  )
}
