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
 * Faixa 3: "Quem convida escolhe o papel."
 * Três colunas em 1440 (Responsável / Cuidador / Observador), empilhadas em 390. Nome do papel na voz da hora
 * (Literata 800), os três campos rotulados abaixo e os verbos que decidem em `<strong>`.
 */
export function PapeisDaFamilia() {
  const [rotuloQuem, rotuloVe, rotuloMuda] = CUIDADO.papeis.rotulos
  return (
    <section className="cc-faixa cc-papeis-faixa" aria-labelledby="cc-papeis">
      <div className="co-texto cc-papeis-bloco">
        <h2 id="cc-papeis" className="co-h2">
          {CUIDADO.papeis.h2}
        </h2>
        <ul aria-label={CUIDADO.papeis.legenda} className="cc-papeis">
          {CUIDADO.papeis.linhas.map((linha) => (
            <li key={linha.nome} data-papel={gancho(linha.nome)} className="cc-papel">
              <h3 className="cc-papel-nome">{linha.nome}</h3>
              <dl className="cc-campos">
                <div className="cc-campo">
                  <dt className="cc-rotulo">{rotuloQuem}</dt>
                  <dd className="co-p cc-campo-valor">{linha.quem}</dd>
                </div>
                <div className="cc-campo">
                  <dt className="cc-rotulo">{rotuloVe}</dt>
                  <dd className="co-p cc-campo-valor">{linha.ve}</dd>
                </div>
                <div className="cc-campo">
                  <dt className="cc-rotulo">{rotuloMuda}</dt>
                  <dd className="co-p cc-campo-valor">
                    <ComVerbos texto={linha.muda} verbos={VERBOS_DOS_PAPEIS[linha.nome] ?? []} />
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
