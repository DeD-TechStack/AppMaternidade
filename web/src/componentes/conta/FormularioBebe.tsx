import { useEffect, useRef, useState, type FormEvent } from 'react'
import { COMECAR_FAMILIA, COMUM, TEXTOS_ERRO, textoDoErro } from '../../conteudo/conta.ts'
import type { ErroDados } from '../../dados/comum.ts'
import type { Bebe } from '../../dados/conta.ts'
import { familiaMudou, useAoFalharNaFamilia } from './acoesFamilia.ts'
import { Campo } from './Campos.tsx'
import { hojeNoFuso } from './datas.ts'
import { useEnvio } from './envio.ts'
import { useFocoNoResumo } from './foco.ts'
import { AvisoDoBanco, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, ResumoErro } from './Partes.tsx'
import { useDadosConta } from './sessao.tsx'

interface Props {
  familiaId: string
  /** O fuso da família: a data de nascimento vai até o hoje dele. */
  fuso: string
  /** Com um bebê, o formulário edita; sem ele, cadastra. */
  bebe?: Bebe
  rotuloSalvar: string
  rotuloSecundario: string
  aoSecundario: () => void
  /** Depois de salvar (`bebe` falta quando o efeito se confirmou por releitura), com o nome pedido. */
  aoSalvo: (bebe: Bebe | null, nome: string) => void | Promise<void>
  /** Cadastrar cria um objeto novo: depois de um `rede`, a tela relê a lista por aqui. */
  aoPerderResposta?: () => Promise<void>
  /** Avisa a tela quando o erro é de papel ou de objeto sumido: ela relê a família (RF-15). */
  aoFalharNaFamilia?: (erro: ErroDados) => void
  /** Uma frase sob o título, como a da data de nascimento (Fluxos 4.2). */
  frase?: string
  /** O aviso do banco de demonstração acima dos campos (só no modo Supabase). */
  comAviso?: boolean
}

// O formulário do bebê: nome ou apelido e data de nascimento (obrigatórios). Serve ao primeiro
// bebê de Começar e a "Adicionar bebê" e "Editar" da Família.
export function FormularioBebe({
  familiaId,
  fuso,
  bebe,
  rotuloSalvar,
  rotuloSecundario,
  aoSecundario,
  aoSalvo,
  aoPerderResposta,
  aoFalharNaFamilia,
  frase,
  comAviso = false,
}: Props) {
  const dados = useDadosConta()
  const [nome, setNome] = useState(bebe?.nome ?? '')
  const [nascimento, setNascimento] = useState(bebe?.nascimento ?? '')
  const [erros, setErros] = useState<{ nome?: string; nascimento?: string }>({})
  const nomeRef = useRef<HTMLInputElement>(null)
  const nascimentoRef = useRef<HTMLInputElement>(null)
  const { estado, enviar, tentarDeNovo, enviando } = useEnvio()

  const erro = estado.fase === 'erro' ? estado.erro : null
  const campoDoErro = erro?.chave === 'nome_vazio' ? 'nome' : erro?.chave === 'nascimento_no_futuro' ? 'nascimento' : null
  const resumo = useFocoNoResumo(estado.fase === 'erro' && !campoDoErro ? estado : null)

  // O formulário abre por uma ação da pessoa: o foco vai ao primeiro campo.
  useEffect(() => {
    nomeRef.current?.focus()
  }, [])

  useEffect(() => {
    if (estado.fase !== 'erro') return
    if (campoDoErro === 'nome' || erro?.chave === 'parametro_obrigatorio') nomeRef.current?.focus()
    if (campoDoErro === 'nascimento') nascimentoRef.current?.focus()
  }, [estado, campoDoErro, erro])
  useAoFalharNaFamilia(erro, aoFalharNaFamilia)

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nomeLimpo = nome.trim()
    const novos: { nome?: string; nascimento?: string } = {}
    if (!nomeLimpo) novos.nome = TEXTOS_ERRO.nome_vazio
    if (!nascimento) novos.nascimento = COMUM.escrevaData
    setErros(novos)
    if (novos.nome) return nomeRef.current?.focus()
    if (novos.nascimento) return nascimentoRef.current?.focus()

    void enviar({
      escrever: async () => {
        if (bebe) return dados.atualizarBebe(bebe.id, nomeLimpo, nascimento)
        const resultado = await dados.cadastrarBebe(familiaId, nomeLimpo, nascimento)
        if (!resultado.ok && resultado.erro.classe === 'rede') await aoPerderResposta?.()
        return resultado
      },
      conferir: bebe
        ? async () => {
            const lida = await dados.detalheFamilia(familiaId)
            if (!lida.ok) return lida
            const atual = lida.valor.bebes.find((item) => item.id === bebe.id)
            return { ok: true, valor: atual?.nome === nomeLimpo && atual.nascimento === nascimento }
          }
        : undefined,
      aoSucesso: (salvo) => aoSalvo(salvo ?? null, nomeLimpo),
    })
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-5">
      {comAviso ? <AvisoDoBanco /> : null}
      {frase ? <p className="cm-medida">{frase}</p> : null}
      {erro && !campoDoErro && !(aoFalharNaFamilia && familiaMudou(erro)) ? (
        <ResumoErro
          erro={erro}
          texto={!bebe && erro.chave === 'rede' ? COMUM.conexaoCaiu : undefined}
          repetivel={estado.fase === 'erro' && estado.tentarDeNovo}
          aoTentarDeNovo={() => void tentarDeNovo()}
          refResumo={resumo}
        />
      ) : null}
      <Campo
        rotulo={COMECAR_FAMILIA.bebe.nome}
        tamanho="app"
        valor={nome}
        aoMudar={(valor) => {
          setNome(valor)
          setErros((antes) => ({ ...antes, nome: undefined }))
        }}
        erro={erros.nome ?? (campoDoErro === 'nome' && erro ? textoDoErro(erro) : null)}
        refEntrada={nomeRef}
      />
      <Campo
        rotulo={COMECAR_FAMILIA.bebe.nascimento}
        tipo="date"
        max={hojeNoFuso(fuso)}
        tamanho="app"
        valor={nascimento}
        aoMudar={(valor) => {
          setNascimento(valor)
          setErros((antes) => ({ ...antes, nascimento: undefined }))
        }}
        erro={erros.nascimento ?? (campoDoErro === 'nascimento' && erro ? textoDoErro(erro) : null)}
        refEntrada={nascimentoRef}
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
