---
tipo: adr
id: ADR-005
status: Proposta
data: 2026-10-22
autor: Hermes (coordenador da APP-001)
aprovador: nenhum até agora
tarefas: MAT-8, MAT-12, MAT-18, MAT-19
---

# ADR-005 — Isolamento entre famílias e fronteira com a comunidade

**Status:** Proposta. Recomendação técnica do Hermes; não aprovada por Daniel.

## Contexto e requisitos

- Separação entre famílias em consultas, escritas, arquivos, sincronização e notificações (requisito fixo; Q-06).
- Acesso à comunidade não concede acesso à rotina privada; compartilhar dado privado exige ação consciente com prévia (requisitos fixos; Q-07).
- Moderador da comunidade não é alguém autorizado a ler dados infantis privados (05_DESIGN_DOCS_E_ADRS.md).
- Permissões guardadas no token podem ficar velhas (fonte B05 do pacote).

## Opções consideradas

1. **Permissões por modelo** (o padrão do Django usado pelo Baby Buddy), sem escopo por família.
2. **Escopo por família com lista de famílias no token.**
3. **Escopo por família conferido no vínculo atual a cada operação**, comunidade num contexto separado com perfil público próprio.
4. **Instância separada por família** (como uma instalação de Baby Buddy por casa).

## Evidências

- Baby Buddy: permissões por modelo e querysets que partem de todos os objetos; pensado para uma instalação por família (ficha [Baby Buddy](../08_Referencias/Repositorios/Baby_Buddy.md)).
- Sprout Track: helper de escopo por família com campos de família opcionais em partes do schema (ficha [Sprout Track](../08_Referencias/Repositorios/Sprout_Track.md)).
- Finnberry: procedimento autenticado que resolve a família do usuário (ficha [Finnberry](../08_Referencias/Repositorios/Finnberry.md)).
- Supabase: claims no JWT podem ficar desatualizadas até a renovação (fonte B05 do pacote).

## Recomendação

Opção 3, detalhada em [Modelo de dados e permissões](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md):

- todo dado de cuidado tem família; o servidor confere o vínculo vigente (estado, papel, validade e época) em cada operação, inclusive nas da sincronização e nas URLs de arquivos;
- ids de outra família respondem como inexistentes;
- comunidade num contexto próprio: perfil público pseudônimo ligado à conta só no servidor, sem nenhuma referência a família, bebê ou registro;
- compartilhamento de rotina como cópia de texto revisada e confirmada, sem vínculo de volta;
- papéis de plataforma (moderação, suporte) sem leitura de dados de cuidado;
- push só para dispositivos com vínculo ativo, sem dado sensível no texto.

## Consequências

- Positivas: isolamento verificável por testes automatizados; revogação efetiva; comunidade sem caminho técnico para a rotina.
- Negativas: duas identidades por pessoa exigem explicação clara; consultas de autorização a cada operação têm custo; o suporte não consegue investigar um problema de dados sem autorização explícita da família.

## Riscos e verificação que falta

- Testes de autorização com ids de outra família em todas as rotas e canais (Q-06), incluindo o canal de sincronização e a emissão de URLs.
- Revisão de consultas da comunidade para garantir que nenhuma junta tabelas de cuidado.
- Validação jurídica do acesso de suporte com autorização da família.

## Quando revisar

- Se surgir papel profissional (pediatra, consultora) com acesso a dados de uma família: exige novo ADR, consentimento específico e trilha de auditoria.
- Se a comunidade passar a ter grupos privados ligados à família.

## Referências

[Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) · [Privacidade e segurança](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md) · ADR-006 · tarefas MAT-8, MAT-12, MAT-18 e MAT-19.
