# Design docs e decisões esperadas

A lista define conteúdo, não volume. Combine documentos próximos se isso melhorar a clareza, mantendo cada tema rastreável. Não entregar apenas títulos, listas de tecnologias ou modelos vazios.

## Documentos

| Documento sugerido | Conteúdo mínimo |
| --- | --- |
| 00_Inicio/Home.md | Visão, etapa atual, mapa dos docs, itsaplan, progresso e decisões pendentes |
| 01_Produto/Visao_e_Escopo.md | Problema, público, quatro pilares, requisitos fixos, hipóteses, MVP e exclusões |
| 01_Produto/Concorrentes_e_Diferenciais.md | Matriz atual com fontes, evidências, limites e diferenciais ainda hipotéticos |
| 02_Experiencia/Fluxos_e_Telas.md | Navegação, jornadas críticas, telas, estados offline/conflito e acessibilidade |
| 03_Arquitetura/Comparacao_de_Arquiteturas.md | Pelo menos três conjuntos completos, critérios, custos, dependências e alternativa principal |
| 03_Arquitetura/Arquitetura_Proposta.md | Fronteiras, responsabilidades, interfaces, caminho dos dados e tradeoffs |
| 03_Arquitetura/Modelo_de_Dados_e_Permissoes.md | Entidades, relacionamentos, invariantes, escopos e matriz de acesso |
| 03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md | Protocolo, operações, conflitos, exclusão, revogação, estados e cenários |
| 04_Comunidade_Conteudo/Comunidade_e_Moderacao.md | Formato inicial, tópicos/respostas, denúncia, bloqueio, revisão e operação |
| 04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md | Tummy time, atividades, idade, fontes, revisão, versão e limites de orientação |
| 05_Privacidade_Operacao/Privacidade_e_Seguranca.md | Minimização, isolamento, consentimentos a avaliar, retenção, exportação, exclusão e incidentes |
| 05_Privacidade_Operacao/Custos_e_Operacao.md | Cenários, premissas, preços datados, backups, suporte, distribuição e plano de saída |
| 05_Privacidade_Operacao/Qualidade_e_Validacao.md | Estratégia por risco, Android/iOS, requisitos mensuráveis e provas futuras |
| 07_Roadmap/Roadmap_e_Proxima_Fatia.md | Descoberta, fundação, MVP, evoluções, dependências e aceite da próxima implementação |
| 07_Roadmap/Decisoes_para_Daniel.md | Poucas questões determinantes, opções, recomendação e impacto |
| 08_Referencias/Analise_dos_Repositorios.md | Branch/SHA, caminhos/permalinks, achados, execução real ou não e aprendizados |
| 08_Referencias/Licencas_e_Fontes.md | Código, dependências, conteúdo, imagens e atribuições tratados separadamente |
| 00_Inicio/Registro_Organizacao.md | Recibos de itsaplan/cofre, links e mapeamento de IDs |
| 00_Inicio/Progresso.md | Checkpoints, ações feitas, pendências e próxima ação |

## Critério de substância

Cada design doc relevante precisa conectar problema, proposta, alternativas e consequências. Usar diagramas compactos para fronteiras, dados e estados quando ajudarem. Propostas mensuráveis devem identificar premissa e método de validação; não apresentar metas inventadas como resultados medidos.

Por exemplo, “tem offline” é insuficiente. O documento precisa dizer o que pode ser criado/editado offline, onde fica persistido, como é enviado, quando uma autorização é reavaliada e o que o usuário vê se houver conflito ou rejeição.

“Ter moderação” também é insuficiente. Definir quem recebe uma denúncia, quais ações existem, o que fica visível, como bloquear outro usuário e quais funções operacionais estarão disponíveis no MVP.

## ADRs sugeridos

| ADR | Decisão |
| --- | --- |
| ADR-001 | Plataformas, papéis possíveis da web e limites do MVP |
| ADR-002 | Framework/linguagem mobile e estratégia Android/iOS |
| ADR-003 | Backend, persistência remota e autenticação |
| ADR-004 | Persistência local, sincronização, conflitos e temporizadores |
| ADR-005 | Isolamento entre famílias e fronteira com comunidade |
| ADR-006 | Formato de comunidade e capacidade de moderação |
| ADR-007 | Conteúdo educativo, origem/revisão e papel de IA |
| ADR-008 | Documentação, operação, custos e caminho de evolução |

A separação pode ser ajustada para evitar repetição. Cada ADR deve conter:

- identificador e título;
- status: proposta, aceita, rejeitada ou substituída;
- data, autor e aprovador quando realmente houver;
- contexto e requisitos que motivam a decisão;
- opções consideradas;
- evidências, com URLs/permalinks e data;
- recomendação e justificativa;
- consequências positivas e negativas;
- riscos e verificação que falta;
- condições que fariam revisar a decisão;
- referências a tarefas e outros documentos.

## Requisitos da proposta técnica

### Cuidado compartilhado

Papéis propostos como responsável/administrador familiar, cuidador com escrita e observador são opções a avaliar. Não confundir moderador da comunidade com alguém autorizado a ler dados infantis privados. Definir entrada/saída do grupo, transferência de responsabilidade e vida útil dos convites.

### Registro e sincronização

Modelar intenção local e aceitação no servidor. Estados propostos: salvo localmente, aguardando envio, sincronizado, conflito e rejeitado. Resolver reenvio após timeout, duas edições simultâneas, exclusão versus edição, início/fim duplicados e alteração de fuso.

Para a revogação, indicar o que ocorre com registros locais ainda não enviados e dados em cache. Não usar somente uma lista antiga de permissões em token para autorizar novas escritas.

### Conteúdo e comunidade

Separar identidade pública da comunidade dos vínculos privados do bebê. Propor como filtros de fase podem funcionar sem divulgar data exata de nascimento. Examinar privacidade de mídia, remoção de metadados quando pertinente e permissões de anexos.

### Custos

Comparar protótipo, piloto/lançamento e crescimento com premissas declaradas. Uma tabela com 100, 1.000 e 10.000 famílias pode ser usada como cenário ilustrativo, nunca previsão de demanda. Quantificar leituras/escritas, sincronizações por aparelho, armazenamento, tráfego, autenticação, e-mail, builds e moderação. Identificar os itens que ainda não têm preço confirmado.

### Próxima fatia executável

Definir uma proposta pequena que teste o núcleo: criar família/bebê, convidar outro cuidador, registrar tummy time offline, reiniciar app, sincronizar e consultar histórico. Acrescentar tópico/resposta simples para comprovar a separação de dados quando isso for viável.

Essa fatia é planejada nesta task. Sua implementação, bibliotecas e serviços definitivos dependem da decisão de arquitetura da etapa seguinte. Não usar o plano como evidência de que o fluxo já funciona.

