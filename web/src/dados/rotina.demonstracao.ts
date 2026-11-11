import { BEBE_DEMONSTRACAO, FAMILIAS_DEMONSTRACAO, PESSOAS_DEMONSTRACAO } from './conta.demonstracao.ts'
import { diaDaFamilia, inicioDoDia } from './rotina.dia.ts'
import type { FixtureRotina } from './rotina.memoria.ts'
import type { DetalhesRegistro, Nota, Registro, TipoRegistro } from './rotina.tipos.ts'

// A fixture de DEMONSTRAÇÃO da rotina (modo memória, R38-33): a rotina do seed `supabase/seeds/46_rotina.sql`
// sobre a bebê Heloísa, com os horários calculados a partir do instante em que a página abre. Os registros de
// D-7 a D-1 têm as 6 exceções do seed (por isso o teste 53 dá `16,16,16,17,16,16,16` registros por dia, sem
// contar o excluído), a sessão de sono de Bruno em andamento há 72 minutos, a nota `Pomada só à noite.` da mãe,
// em destaque por 1 dia, e a nota `Fraldas P no armário de cima.` de Bruno. As pessoas, a família e o bebê vêm
// da fixture de demonstração da conta; a rotina não cria pessoa. Os dados somem ao recarregar. É só desta
// fixture: a fixture de TESTE (`teste/rotina.fixture.ts`) é outra e não a reutiliza. Só dados fictícios.

const MINUTO = 60_000
const FUSO = 'America/Sao_Paulo'
const DESLOCAMENTO_MIN = -180

type Autor = 'mae' | 'pai'

interface Linha {
  ordem: number
  inicio: string
  fim: string | null
  tipo: TipoRegistro
  detalhes: DetalhesRegistro
  nota: string | null
  autor: Autor
}

const linha = (
  ordem: number,
  inicio: string,
  fim: string | null,
  tipo: TipoRegistro,
  detalhes: DetalhesRegistro,
  nota: string | null,
  autor: Autor,
): Linha => ({ ordem, inicio, fim, tipo, detalhes, nota, autor })

// O dia-tipo do seed: as 16 linhas de todo dia, mais a observação de D-4 (17) e a fralda excluída de D-2 (18).
const DIA_TIPO: readonly Linha[] = [
  linha(1, '00:30', '02:45', 'sono', {}, null, 'pai'),
  linha(2, '03:00', '03:20', 'mamada', { lado: 'esquerdo' }, null, 'pai'),
  linha(3, '03:25', null, 'fralda', { conteudo: 'xixi' }, null, 'pai'),
  linha(4, '03:30', '06:15', 'sono', {}, null, 'pai'),
  linha(5, '06:30', '06:50', 'mamada', { lado: 'direito' }, null, 'mae'),
  linha(6, '07:00', null, 'fralda', { conteudo: 'coco' }, null, 'mae'),
  linha(7, '09:00', '10:30', 'sono', {}, null, 'mae'),
  linha(8, '11:00', null, 'mamadeira', { ml: 90, conteudo: 'leite_materno' }, null, 'mae'),
  linha(9, '11:15', null, 'fralda', { conteudo: 'ambos' }, null, 'mae'),
  linha(10, '13:00', '14:40', 'sono', {}, null, 'mae'),
  linha(11, '15:00', '15:08', 'tummy', {}, null, 'mae'),
  linha(12, '16:00', '16:20', 'mamada', { lado: 'ambos' }, null, 'mae'),
  linha(13, '17:30', null, 'fralda', { conteudo: 'xixi' }, null, 'pai'),
  linha(14, '18:00', '18:40', 'sono', {}, null, 'pai'),
  linha(15, '19:30', null, 'mamadeira', { ml: 120, conteudo: 'formula' }, null, 'pai'),
  linha(16, '20:30', '23:50', 'sono', {}, null, 'pai'),
  // Exceção 1 (D-4): observação da mãe.
  linha(17, '14:50', null, 'observacao', {}, 'Arrotou pouco depois da mamada.', 'mae'),
  // Exceção 3 (D-2): fralda de Bruno, excluída pela mãe.
  linha(18, '12:00', null, 'fralda', { conteudo: 'xixi' }, null, 'pai'),
]

/** O id fixo no formato v7 do seed (`46` + n em hexadecimal com 6 dígitos + o resto fixo). */
const idDoSeed = (n: number) => `46${n.toString(16).padStart(6, '0')}-0000-7000-8000-000000000000`

function somarDias(dia: string, dias: number): string {
  const [ano, mes, numero] = dia.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, numero + dias)).toISOString().slice(0, 10)
}

const minutosDoDia = (hora: string) => {
  const [h, m] = hora.split(':').map(Number)
  return (h * 60 + m) * MINUTO
}

export function criarFixtureRotinaDemonstracao(agora: number): FixtureRotina {
  const { responsavel, bruno } = PESSOAS_DEMONSTRACAO
  const autorDe = (autor: Autor) => (autor === 'mae' ? responsavel.id : bruno.id)
  const iso = (instante: number) => new Date(instante).toISOString()
  const hoje = diaDaFamilia(agora, FUSO)
  let numero = 0

  function registro(
    tipo: TipoRegistro,
    inicio: number,
    fim: number | null,
    autor: string,
    resto: Partial<Pick<Registro, 'detalhes' | 'nota' | 'origem' | 'encerradoPor' | 'versao' | 'excluidoEm' | 'excluidoPor' | 'atualizadoEm'>> = {},
  ): Registro {
    // O servidor recebeu o registro quando a pessoa o enviou: no fim da sessão, ou no instante do pontual.
    const recebido = iso(fim ?? inicio)
    return {
      id: idDoSeed(numero),
      familiaId: FAMILIAS_DEMONSTRACAO.exemplo,
      bebeId: BEBE_DEMONSTRACAO,
      tipo,
      inicio: iso(inicio),
      fim: fim === null ? null : iso(fim),
      detalhes: resto.detalhes ?? {},
      nota: resto.nota ?? null,
      origem: resto.origem ?? 'retroativo',
      fuso: FUSO,
      deslocamentoMin: DESLOCAMENTO_MIN,
      criadoPor: autor,
      encerradoPor: resto.encerradoPor !== undefined ? resto.encerradoPor : fim === null ? null : autor,
      versao: resto.versao ?? 1,
      recebidoEm: recebido,
      atualizadoEm: resto.atualizadoEm ?? recebido,
      excluidoEm: resto.excluidoEm ?? null,
      excluidoPor: resto.excluidoPor ?? null,
    }
  }

  const registros: Registro[] = []
  for (let k = 7; k >= 1; k--) {
    const dia = somarDias(hoje, -k)
    const meiaNoite = inicioDoDia(dia, FUSO)
    const linhas = DIA_TIPO.filter((l) => l.ordem <= 16 || (l.ordem === 17 && k === 4) || (l.ordem === 18 && k === 2)).sort(
      (a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0),
    )
    for (const l of linhas) {
      numero += 1
      const inicio = meiaNoite + minutosDoDia(l.inicio)
      let fim = l.fim === null ? null : meiaNoite + minutosDoDia(l.fim)
      // Exceção 2 (D-3): o sono das 20:30 termina às 00:20 de D-2.
      if (k === 3 && l.ordem === 16) fim = inicioDoDia(somarDias(dia, 1), FUSO) + minutosDoDia('00:20')
      const autor = autorDe(l.autor)

      if (k === 1 && l.ordem === 10) {
        // Exceção 4 (D-1): o sono nasce em andamento, ao vivo, e Bruno o encerra às 14:40.
        registros.push(registro(l.tipo, inicio, fim, autor, { origem: 'ao_vivo', encerradoPor: bruno.id }))
      } else if (k === 1 && l.ordem === 8) {
        // Exceção 5 (D-1): a mãe corrige a mamadeira de 90 para 100 ml.
        registros.push(
          registro(l.tipo, inicio, fim, autor, {
            detalhes: { ml: 100, conteudo: 'leite_materno' },
            versao: 2,
            atualizadoEm: iso(inicio + 10 * MINUTO),
          }),
        )
      } else if (k === 2 && l.ordem === 18) {
        // Exceção 3 (D-2): a fralda de Bruno que a mãe excluiu.
        registros.push(
          registro(l.tipo, inicio, fim, autor, {
            detalhes: l.detalhes,
            excluidoEm: iso(inicio + 30 * MINUTO),
            excluidoPor: responsavel.id,
          }),
        )
      } else {
        registros.push(registro(l.tipo, inicio, fim, autor, { detalhes: l.detalhes, nota: l.nota }))
      }
    }
  }

  // Exceção 6 (hoje): a sessão de sono de Bruno em andamento, ao vivo, há 72 minutos (o id 115 do seed: os 114 registros de D-7 a D-1 vêm antes).
  numero += 1
  registros.push(registro('sono', agora - 72 * MINUTO, null, bruno.id, { origem: 'ao_vivo' }))

  const nota = (id: number, texto: string, autor: string, bebeId: string | null, destaqueAte: string | null): Nota => ({
    id: idDoSeed(id),
    familiaId: FAMILIAS_DEMONSTRACAO.exemplo,
    bebeId,
    texto,
    destaqueAte,
    criadoPor: autor,
    criadaEm: iso(agora),
    versao: 1,
    atualizadoEm: iso(agora),
    excluidaEm: null,
    excluidaPor: null,
  })
  const notas: Nota[] = [
    nota(201, 'Pomada só à noite.', responsavel.id, BEBE_DEMONSTRACAO, iso(agora + 24 * 60 * MINUTO)),
    nota(202, 'Fraldas P no armário de cima.', bruno.id, null, null),
  ]

  return { registros, notas }
}
