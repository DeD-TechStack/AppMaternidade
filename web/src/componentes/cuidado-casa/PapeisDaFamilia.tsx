import { CUIDADO, VERBOS_DOS_PAPEIS } from '../../conteudo/casa/cuidado.ts'
import './cuidado-casa.css'

/** Põe os verbos que decidem em `<strong data-cc-verbo>`: a frase não muda, só ganha peso (nunca só cor). */
function ComVerbos({ texto, verbos }: { texto: string; verbos: readonly string[] }) {
  const partes: Array<string | { verbo: string }> = []
  let resto = texto
  for (const verbo of verbos) {
    const i = resto.indexOf(verbo)
    if (i === -1) continue
    if (i > 0) partes.push(resto.slice(0, i))
    partes.push({ verbo })
    resto = resto.slice(i + verbo.length)
  }
  if (resto !== '') partes.push(resto)
  return (
    <>
      {partes.map((parte, i) =>
        typeof parte === 'string' ? (
          parte
        ) : (
          <strong key={i} data-cc-verbo="" className="cc-verbo">
            {parte.verbo}
          </strong>
        ),
      )}
    </>
  )
}

/** "Cuidador" vira "cuidador", "Responsável" vira "responsavel": o gancho de CSS de cada papel. */
const gancho = (nome: string) => nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/**
 * Os três papéis, numa lista de três linhas com um fio de 1 px entre elas, nunca em cartões. Cada papel tem os mesmos
 * três campos, na mesma ordem (quem é, o que vê, o que muda), numa `<dl>` com rótulo curto. Em 1440 a lista lê como uma
 * tabela: um cabeçalho de colunas (`aria-hidden`, só desenho) e os `<dt>` ocultos só para a vista, que seguem no DOM para
 * o leitor de tela; em 390 cada campo mostra o próprio rótulo. O verbo que decide (administra, registra, edita e exclui,
 * nada) vai em negrito, e a linha do Cuidador ganha um tom de fundo discreto. O nome da lista é `aria-label`.
 */
export function PapeisDaFamilia() {
  const [rotuloQuem, rotuloVe, rotuloMuda] = CUIDADO.papeis.rotulos
  return (
    <div className="cc-papeis-bloco">
      <h2 id="cc-papeis" className="text-titulo-1 font-titulo cm-sec-titulo cc-medida">
        {CUIDADO.papeis.h2}
      </h2>
      <div className="cc-papeis-tabela">
        <div aria-hidden="true" data-cc-papeis-cab="" className="cc-papeis-cab">
          <span />
          {CUIDADO.papeis.rotulos.map((rotulo) => (
            <span key={rotulo} data-cc-rotulo-cab="" className="text-pequeno font-texto cc-rotulo">
              {rotulo}
            </span>
          ))}
        </div>
        <ul aria-label={CUIDADO.papeis.legenda} className="cc-papeis">
          {CUIDADO.papeis.linhas.map((linha) => (
            <li key={linha.nome} data-papel={gancho(linha.nome)} className="cc-papel">
              <h3 className="text-titulo-4 font-titulo cm-sec-titulo">{linha.nome}</h3>
              <dl className="cc-campos">
                <div className="cc-campo">
                  <dt className="text-pequeno font-texto cc-rotulo">{rotuloQuem}</dt>
                  <dd className="text-corpo font-texto cm-sec-texto">{linha.quem}</dd>
                </div>
                <div className="cc-campo">
                  <dt className="text-pequeno font-texto cc-rotulo">{rotuloVe}</dt>
                  <dd className="text-corpo font-texto cm-sec-texto">{linha.ve}</dd>
                </div>
                <div className="cc-campo">
                  <dt className="text-pequeno font-texto cc-rotulo">{rotuloMuda}</dt>
                  <dd className="text-corpo font-texto cm-sec-texto">
                    <ComVerbos texto={linha.muda} verbos={VERBOS_DOS_PAPEIS[linha.nome] ?? []} />
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
