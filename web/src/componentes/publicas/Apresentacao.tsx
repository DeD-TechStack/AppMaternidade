/**
 * O parágrafo de apresentação de uma página, em `corpo-g` (28/39; 20/28 no celular), em c2–c8 e com no
 * máximo 40 rem de largura (cerca de 57 caracteres por linha). `margem` é uma das classes `sb-mt-*`.
 */
export function Apresentacao({ texto, margem }: { texto: string; margem: string }) {
  return (
    <div className={`sb-area ${margem}`} data-bloco="">
      <div className="grade-10">
        <div className="col-c2-c8">
          <p className="vp-apresentacao t-corpo-g" data-apresentacao="">
            {texto}
          </p>
        </div>
      </div>
    </div>
  )
}
