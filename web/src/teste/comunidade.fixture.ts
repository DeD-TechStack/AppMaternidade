import { fixtureComunidadeDemonstracao } from '../dados/comunidade.demonstracao.ts'
import type { DadosComunidade } from '../dados/comunidade.ts'
import { criarDadosComunidadeMemoria, criarEstadoComunidade, type EstadoComunidade } from '../dados/comunidade.memoria.ts'

// A Comunidade de TESTE isolada (RF12, A5): uma memória própria, cópia da fixture de demonstração, para o teste
// controlar o que foi publicado, em vez de usar a instância global do modo demonstração
// (`criarDadosComunidade`, que é uma só para a página inteira). A conta que está entrada na fixture de rotina
// (`idDaConta`) já escreve na Comunidade: tem a linha em `contas`, o aceite da versão vigente e um perfil público
// (a condição que decide se o compositor aparece, RF12 2.0). Só dados fictícios; só os testes importam este arquivo.

export interface ComunidadeDeTeste {
  dados: DadosComunidade
  /** A mesma memória que `dados` lê e grava: o teste confere nela o que foi publicado. */
  estado: EstadoComunidade
}

interface OpcoesDaComunidade {
  /** O relógio da memória; o padrão é `Date.now`. */
  agora?: () => number
}

/** Deixa a conta apta a escrever, sem mexer no que a fixture já tem dela. */
function habilitarEscritor(estado: EstadoComunidade, idDaConta: string) {
  if (!estado.contas.includes(idDaConta)) estado.contas.push(idDaConta)
  const vigente = estado.versoes.find((versao) => versao.vigente)
  if (vigente && !estado.aceites.some((aceite) => aceite.contaId === idDaConta && aceite.versao === vigente.versao)) {
    estado.aceites.push({ contaId: idDaConta, versao: vigente.versao, aceitoEm: new Date().toISOString() })
  }
  if (!estado.perfis.some((perfil) => perfil.contaId === idDaConta)) {
    estado.perfis.push({
      id: `47000000-0000-4000-8000-${idDaConta.replaceAll('-', '').slice(-12)}`,
      contaId: idDaConta,
      apelido: 'perfil_de_teste',
      bio: null,
      faixa: null,
      criadoEm: new Date().toISOString(),
    })
  }
}

/** A Comunidade em memória, isolada, com `idDaConta` entrada (`null` é ninguém), mais o `estado` dela. */
export function criarComunidadeDeTeste(idDaConta: string | null, opcoes: OpcoesDaComunidade = {}): ComunidadeDeTeste {
  const estado = criarEstadoComunidade(fixtureComunidadeDemonstracao)
  if (idDaConta !== null) habilitarEscritor(estado, idDaConta)
  const dados = criarDadosComunidadeMemoria(estado, idDaConta, opcoes)
  return { dados, estado }
}
