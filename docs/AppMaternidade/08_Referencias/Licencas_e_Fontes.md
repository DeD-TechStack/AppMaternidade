---
tipo: referencia
status: rascunho
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-10-22
tarefa: MAT-5
fontes_principais:
  - 08_Referencias/Repositorios/
  - 08_Referencias/Pesquisa_Comunidade_e_Conteudo.md
  - 08_Referencias/Concorrentes/
  - 08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md
---

# Licenças e fontes

Consolida, por tipo de material, o que pode e o que não pode entrar no AppMaternidade. Isto é **leitura técnica, não parecer jurídico**: antes de reutilizar qualquer material de terceiros, o texto da licença precisa ser conferido por profissional.

## 1. Regra adotada nesta etapa

- **Nenhum material copiado:** nenhum código, texto, imagem, ícone ou marca dos repositórios de referência ou dos concorrentes foi copiado para o AppMaternidade. Os aprendizados entram como conceitos, implementados do zero.
- **Conteúdo educativo:** texto próprio em pt-BR, escrito a partir de fontes primárias, com link e citação, e revisado por profissional registrado ([ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md)).
- **Dependências:** cada uma é escolhida pela licença dela, conferida no registro do pacote e no arquivo LICENSE antes da fundação. Os avisos vão para uma tela de licenças de terceiros no app.

## 2. Repositórios de referência

| Material | Finnberry | Baby Buddy | Sprout Track | Bebbo |
| --- | --- | --- | --- | --- |
| **Código** | MIT, "Copyright (c) 2026 bckenstler" | BSD-2-Clause, "Copyright (c) 2017 - 2022, Baby Buddy's Contributors" | Licença própria: só uso **não comercial**, com atribuição e **compartilhamento pela mesma licença**. Os titulares reservam o uso comercial | **GPL-3.0** |
| Pode reutilizar? | Sim, com o aviso MIT nas partes copiadas. Não planejado | Sim, com o aviso BSD-2 no código e na documentação do app. Não planejado | **Não**, enquanto o app puder ter qualquer receita | **Não**: obrigaria o AppMaternidade a ser GPL-3.0; na App Store, há conflito conhecido entre os termos da loja e a GPL |
| **Dependências** | Produção: MIT 340, ISC 19, Apache-2.0 17, BSD-3 4, BSD-2 2, MIT-0 1, 0BSD 1. Pontos a conferir: `@anthropic-ai/claude-agent-sdk` (termos próprios) e `@img/sharp-*` (LGPL-3.0) | Python: BSD, MIT, Apache-2.0; `psycopg2-binary` LGPL com exceções; bundles de front-end versionados sem avisos de licença | Produção, pelo `package-lock.json` (520 entradas, com binários opcionais por plataforma): MIT 381, ISC 51, Apache-2.0 44, BSD-3 7 e outras permissivas 14. Pontos a conferir (23): `heic-to` (LGPL-3.0, direta), `web-push` (MPL-2.0, direta), `@img/sharp-*` (LGPL-3.0-or-later, opcionais), `elkjs` (EPL-2.0), `caniuse-lite` (CC-BY-4.0, dados), `jszip` (MIT ou GPL-3.0), `dompurify` (MPL-2.0 ou Apache-2.0), `rgbcolor` e 2 sem licença declarada (`buffers`, `seq-queue`). [Lista](../09_Evidencias/Execucao_Referencias/Sprout_Track/13_licencas_dependencias.tsv) | Diretas: MIT 86, Apache-2.0 7, ISC 2, MIT e Apache-2.0 1, BSD-2 1; nenhuma GPL |
| **Conteúdo e textos** | Não há | Documentação no repositório BSD-2, sem licença separada | Mesma licença do código | **Proprietário da UNICEF e licenciadores**; os termos proíbem uso comercial, cópia digital e modificação |
| **Imagens e ícones** | Nenhum versionado | Fonte de ícones montada com Font Awesome, MFG Labs e Entypo (SIL OFL), com uma entrada sem URL | Imagens do README sob a licença do projeto | Ilustrações, fotos, vídeo e áudio proibidos pelos termos |
| **Dados** | — | Percentis em CSV sem fonte declarada | Curvas CDC e OMS no seed | Tabelas de desvio-padrão; origem não conferida |
| **Nome e marca** | "Finnberry"; o repositório se diz clone do Huckleberry | "Baby Buddy" e logo, sem licença | "Sprout Track", "Oak and Sprout" | UNICEF e Bebbo; nome e emblema da UNICEF protegidos |
| Ficha | [Finnberry](Repositorios/Finnberry.md) | [Baby Buddy](Repositorios/Baby_Buddy.md) | [Sprout Track](Repositorios/Sprout_Track.md) | [Bebbo](Repositorios/Bebbo.md) |

**Bebbo e App Store:** em 2010, a FSF entendeu que os termos da App Store conflitam com a seção 6 da GPLv2, e o GNU Go foi removido da loja (https://www.fsf.org/news/2010-05-app-store-compliance, consultado em 22/10/2026). A GPLv3 tem cláusula semelhante [HIP].

**Curvas de crescimento:** buscar sempre na fonte primária (OMS), com os termos dela, e não nos repositórios.

## 3. Fontes de conteúdo educativo

Resumo da [pesquisa de comunidade e conteúdo, seção 2.5](Pesquisa_Comunidade_e_Conteudo.md). Os números entre colchetes remetem às fontes dessa nota.

| Fonte | Citar e linkar | Reproduzir texto | Imagens, vídeos e logo | Atribuição exigida |
| --- | --- | --- | --- | --- |
| AAP / HealthyChildren.org [29] | Sim | Não sem permissão escrita; também proíbe usar o conteúdo com IA | Não sem permissão | — |
| CDC [24][25] | Sim; prefere link | Domínio público na maior parte, sem mudar o conteúdo; marcos não editáveis na personalização | Algumas imagens restritas; logo exige permissão | Atribuir; não sugerir endosso; informar que o material está disponível de graça |
| NHS [26] | Sim | OGL v3.0, inclusive comercial; tradução é adaptação | Imagens fora da OGL | Declaração da OGL; adaptação não pode ser atribuída ao NHS |
| OMS, diretriz de 2019 [21][22] | Sim | CC BY-NC-SA 3.0 IGO: não comercial | Logo não permitido | Citação; compartilhamento pela mesma licença |
| Pathways.org [27][28] | Sim | Só uso pessoal e não comercial, sem aprovação escrita | Idem | — |
| SBP [31] | Sim | "Todos os direitos reservados" | Idem | — |
| Ministério da Saúde [7][19] | Sim | Conferir obra a obra; o artigo da RBAFS sobre o Guia é CC BY 4.0 | Idem | Conforme a obra |
| Bebbo (UNICEF) | Sim | Proibido | Proibido | — |

**Como o conteúdo próprio usa essas fontes:**

- fatos e recomendações (por exemplo, "pelo menos 30 minutos por dia, distribuídos") podem ser reescritos com citação;
- a expressão (texto, ilustração, vídeo) só entra com licença;
- cada item guarda as fontes, com versão e data de consulta ([Desenvolvimento e conteúdo, seção 8](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md)).

## 4. Concorrentes

As oito fichas não encontraram licença de reuso para Napper, Huckleberry, Baby Daybook, Nara Baby, Kinedu, BabyCenter e Peanut. O conteúdo desses produtos é tratado como proprietário. A Pathways permite só uso pessoal e não comercial ([Concorrentes e diferenciais](../01_Produto/Concorrentes_e_Diferenciais.md), seção "Reutilização de conteúdo").

Capturas de tela e textos de loja servem só como evidência interna da análise. Não entram no produto nem em material público do AppMaternidade.

## 5. Tecnologias da arquitetura proposta

Licenças conferidas nas notas de tecnologia em 22/10/2026 [EXEC: registro npm e API do GitHub]:

| Componente | Licença | Observação |
| --- | --- | --- |
| `expo` 58.0.17 e módulos `expo-*` consultados | MIT | [Dados, sincronização e backend](Tecnologias/Dados_Sincronizacao_e_Backend.md), tabela de versões |
| `@powersync/react-native` 2.3.3 e SDKs JS | Apache-2.0 | Idem |
| Serviço PowerSync (auto-hospedado, Open Edition) | FSL-1.1-ALv2: qualquer uso, exceto "Competing Use"; cada versão vira Apache-2.0 depois de dois anos | A API do GitHub mostra `NOASSERTION`, porque não reconhece a FSL |
| Supabase (repositório `supabase/supabase`) | Apache-2.0 | No serviço gerenciado valem os termos do contrato |
| `drizzle-orm` 0.45.4 | Apache-2.0 | Se for usado no serviço de domínio |
| SQLCipher e `op-sqlite` | A conferir | Antes da prova técnica (MAT-17) |

Plataformas: Apple Developer Program License Agreement e Políticas do Google Play, citados em [Mobile e plataformas](Tecnologias/Mobile_e_Plataformas.md).

## 6. Obrigações de atribuição no app

- Uma tela "Licenças de terceiros" no app, gerada a partir das dependências do build, com o texto de cada licença.
- Se algum trecho MIT ou BSD-2 dos repositórios de referência vier a ser copiado (não planejado), registrar arquivo, commit e permalink de origem, e incluir o aviso de copyright no repositório e na tela de licenças.
- No conteúdo, citar fonte, versão e data em cada item, seguindo as exigências de atribuição da seção 3.

## 7. Questões abertas

1. Licenças do SQLCipher e do `op-sqlite` na versão escolhida para a prova.
2. Vale pedir permissão à AAP ou à Pathways, ou produzir tudo internamente (ADR-007)?
3. De onde vêm as tabelas de crescimento, se o produto incluir curvas (fora do MVP)?

## Limites desta análise

- Não é parecer jurídico.
- As licenças de dependências vêm do campo autodeclarado nos pacotes; LICENSE e NOTICE não foram conferidos um a um.
- As licenças do front-end do Baby Buddy foram inferidas.
- As dependências do Sprout Track foram levantadas depois da revisão independente, pelo `package-lock.json`. Como a licença do próprio Sprout Track já impede reutilizar o código dele, a lista só serve se o AppMaternidade escolher as mesmas bibliotecas; nesse caso, cada uma é avaliada pela própria licença.

## Relação com outros documentos

[Análise dos repositórios](Analise_dos_Repositorios.md) · [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md) · [Desenvolvimento e conteúdo](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md) · [Pesquisa de comunidade e conteúdo](Pesquisa_Comunidade_e_Conteudo.md) · [Home](../00_Inicio/Home.md)
