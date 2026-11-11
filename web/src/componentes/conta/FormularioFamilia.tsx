import { useEffect, useRef, useState, type FormEvent } from 'react'
import { COMUM, TEXTOS_ERRO, textoDoErro } from '../../conteudo/conta.ts'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import { familiaMudou, useAoFalharNaFamilia } from './acoesFamilia.ts'
import { Campo, SeletorFuso } from './Campos.tsx'
import { useEnvio } from './envio.ts'
import { useFocoNoResumo } from './foco.ts'
import { AvisoDoBanco, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, ResumoErro } from './Partes.tsx'

interface Props<T> {
  nome?: string
  fuso: string
  rotuloNome: string
  rotuloFuso: string
  ajudaNome?: string
  ajudaFuso?: string
  rotuloSalvar: string
  rotuloSecundario: string
  aoSecundario: () => void
  escrever: (nome: string, fuso: string) => Promise<Resultado<T>>
  /** Lê o efeito pedido depois de uma repetição com erro (só nas escritas que se repetem sem efeito duplo). */
  conferir?: (nome: string, fuso: string) => Promise<Resultado<boolean>>
  /** Com o que a escrita devolveu (falta se o efeito se confirmou por releitura) e o que foi pedido. */
  aoSucesso: (valor: T | undefined, nome: string, fuso: string) => void | Promise<void>
  /** Criar cria um objeto novo: depois de um `rede`, a tela relê a lista por aqui. */
  aoPerderResposta?: () => Promise<void>
  /** Avisa a tela quando o erro é de papel ou de objeto sumido: ela relê a família (RF-15). */
  aoFalharNaFamilia?: (erro: ErroDados) => void
  /** O aviso do banco de demonstração acima dos campos (só no modo Supabase). */
  comAviso?: boolean
}

// O formulário da família: nome (obrigatório) e fuso. Serve a "Criar uma família" de Começar e a
// "Editar família" da Família.
export function FormularioFamilia<T>({
  nome: nomeInicial = '',
  fuso: fusoInicial,
  rotuloNome,
  rotuloFuso,
  ajudaNome,
  ajudaFuso,
  rotuloSalvar,
  rotuloSecundario,
  aoSecundario,
  escrever,
  conferir,
  aoSucesso,
  aoPerderResposta,
  aoFalharNaFamilia,
  comAviso = false,
}: Props<T>) {
  const [nome, setNome] = useState(nomeInicial)
  const [fuso, setFuso] = useState(fusoInicial)
  const [erroNome, setErroNome] = useState<string | null>(null)
  const nomeRef = useRef<HTMLInputElement>(null)
  const fusoRef = useRef<HTMLSelectElement>(null)
  const { estado, enviar, tentarDeNovo, enviando } = useEnvio()

  const erro = estado.fase === 'erro' ? estado.erro : null
  const campoDoErro = erro?.chave === 'nome_vazio' ? 'nome' : erro?.chave === 'fuso_invalido' ? 'fuso' : null
  const resumo = useFocoNoResumo(estado.fase === 'erro' && !campoDoErro ? estado : null)
  const objetoNovo = conferir === undefined

  // O formulário abre por uma ação da pessoa: o foco vai ao primeiro campo.
  useEffect(() => {
    nomeRef.current?.focus()
  }, [])

  useEffect(() => {
    if (estado.fase !== 'erro') return
    if (campoDoErro === 'nome' || erro?.chave === 'parametro_obrigatorio') nomeRef.current?.focus()
    if (campoDoErro === 'fuso') fusoRef.current?.focus()
  }, [estado, campoDoErro, erro])
  useAoFalharNaFamilia(erro, aoFalharNaFamilia)

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) {
      setErroNome(TEXTOS_ERRO.nome_vazio)
      return nomeRef.current?.focus()
    }
    setErroNome(null)
    void enviar({
      escrever: async () => {
        const resultado = await escrever(nomeLimpo, fuso)
        if (!resultado.ok && objetoNovo && resultado.erro.classe === 'rede') await aoPerderResposta?.()
        return resultado
      },
      conferir: conferir ? () => conferir(nomeLimpo, fuso) : undefined,
      aoSucesso: (valor) => aoSucesso(valor, nomeLimpo, fuso),
    })
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-5">
      {comAviso ? <AvisoDoBanco /> : null}
      {erro && !campoDoErro && !(aoFalharNaFamilia && familiaMudou(erro)) ? (
        <ResumoErro
          erro={erro}
          texto={objetoNovo && erro.chave === 'rede' ? COMUM.conexaoCaiu : undefined}
          repetivel={estado.fase === 'erro' && estado.tentarDeNovo}
          aoTentarDeNovo={() => void tentarDeNovo()}
          refResumo={resumo}
        />
      ) : null}
      <Campo
        rotulo={rotuloNome}
        ajuda={ajudaNome}
        tamanho="app"
        valor={nome}
        aoMudar={(valor) => {
          setNome(valor)
          setErroNome(null)
        }}
        erro={erroNome ?? (campoDoErro === 'nome' && erro ? textoDoErro(erro) : null)}
        refEntrada={nomeRef}
      />
      <SeletorFuso
        rotulo={rotuloFuso}
        ajuda={ajudaFuso}
        tamanho="app"
        valor={fuso}
        guardado={fusoInicial}
        aoMudar={setFuso}
        erro={campoDoErro === 'fuso' && erro ? textoDoErro(erro) : null}
        refEntrada={fusoRef}
      />
      <div className="flex flex-col gap-3 min-[30rem]:flex-row-reverse">
        <button type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
          {enviando ? COMUM.salvando : rotuloSalvar}
        </button>
        <button
          type="button"
          disabled={enviando}
          className={`${BOTAO_SECUNDARIO} min-[30rem]:w-full`}
          data-tamanho="app"
          onClick={aoSecundario}
        >
          {rotuloSecundario}
        </button>
      </div>
    </form>
  )
}
