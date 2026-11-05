---
tipo: design-doc
status: em revisão
responsavel: lider-appmaternidade
revisado_em: 2026-11-03
tarefa: MAT-32
adr: ADR-009
fontes_principais:
  - 02_Experiencia/Fluxos_e_Telas.md
  - 02_Experiencia/Site_Mapa_e_Paginas.md
  - 07_Roadmap/Decisoes_para_Daniel.md (D11)
---

# Direção visual do site

Como o visual do site completo vai ser definido e quais portões toda tarefa de site precisa passar. A direção em si (paleta, tipografia, componentes de cada tela) sai na MAT-34; esta nota fixa o processo e as regras.

## 1. Processo

1. A direção visual é feita com a skill `claude-design`.
2. A skill `popular-web-designs` entra só como repertório de comparação. Nenhum sistema de design dela é adotado inteiro.
3. Os tokens (cores, tipografia, espaçamento, raios, sombras) são gerados e validados com a skill `design-md`, no formato `DESIGN.md`.
4. O `DESIGN.md` vai ficar em `web/DESIGN.md`, criado na MAT-34.

Os princípios de [Fluxos e telas](Fluxos_e_Telas.md), seção 1, continuam valendo no site: registro em até 2 toques, uso com uma mão, tema escuro de baixo brilho para a madrugada, erro reversível, linguagem sem cobrança, comunidade marcada como pública e fonte ampliada até 200%. As páginas são as do [mapa do site](Site_Mapa_e_Paginas.md).

## 2. Sala limpa

A referência visual externa (MAT-33) não entra no site. Um analista a estuda com a REA e entrega uma especificação abstrata. O site recebe só essa especificação, sem código, imagem, marca ou texto da referência.

A decisão é a D11 (MAT-31), tomada em 03/11/2026, com a sala limpa reduzida e declarada ([Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md)):

- a REA roda pela CLI (`rea-agents@6.8.0`);
- o analista é o líder, com rede só para a referência;
- o reconstrutor recebe só a especificação filtrada;
- o verificador (revisor-appmaternidade) só relata;
- o limite está declarado: é a mesma conta do Windows, e o isolamento é por instrução e permissão.

**REA** é a ferramenta de engenharia reversa que o analista usa na MAT-33. Esta nota não dá o nome nem o endereço da referência. O revisor confere a ausência dela pela lista de proibidos da especificação da MAT-33.

## 3. Componentes

- Só entram componentes da lista `bibliotecas-ui-react-tailwind.md`, da skill `skill-scouting`.
- Cada componente entra com a versão exata e com a licença lida no commit da biblioteca de origem.
- A origem fica registrada em `web/PROVENANCE.md`, que nasce junto com o primeiro componente.

## 4. Portões comuns do site

Valem para toda tarefa que mexe no site (MAT-27). O roadmap e as tarefas apontam para eles pelo número.

- **G1 Testes:** testes unitários e de componente da fatia passam (comando fixado na fundação), exit 0.
- **G2 Tipos e lint:** typecheck e lint, exit 0.
- **G3 Acessibilidade** (`ui-ux-pro-max-local-web`):
  - axe sem violação séria ou crítica nas telas da fatia;
  - navegação por teclado e foco visível;
  - contraste WCAG 2.2 AA;
  - texto a 200% sem perda;
  - `prefers-reduced-motion` respeitado.
- **G4 Sem cara de IA no código e na tela:** `omh-ai-slop-cleaner` sem achado aberto no diff da fatia.
- **G5 Qualidade visual:** `omh-design-quality-gate` aprovado nas telas da fatia.
- **G6 Barra de prêmio:** `omh-award-bar-score` registrado por tela, com a nota mínima definida na direção visual (MAT-34).
- **G7 Textos:** todo texto de interface e de página passa por `humanizer` e `marketing-copy-editing`.
- **G8 Componentes:** só da lista `bibliotecas-ui-react-tailwind.md` (skill `skill-scouting`), com versão exata, licença lida no commit usado e registro em `PROVENANCE.md`.
- **G9 Sala limpa:** nada copiado da referência visual (nenhum código, imagem, marca ou texto), conferido por busca no diff contra a lista de proibidos da especificação visual.
- **G10 Commits:**
  - autor Daniel Macedo;
  - cada commit com uma mudança real e verificável e mensagem clara;
  - proibido commit vazio, só de formatação ou dividido artificialmente;
  - teto de 800 por dia, que é consequência do trabalho e nunca meta;
  - conferido pelo script da política no intervalo base..HEAD.
- **G11 Revisão:** veredito APPROVED do `revisor-appmaternidade` (outra família) sobre o SHA exato; integração só com `git merge --ff-only` desse SHA.
- **G12 Dados:** só dados fictícios em teste; nenhum dado real de família.

Nota mínima do award-bar (G6): 8,0 no total ponderado, por tela, a partir da MAT-44 (protótipos, fatias e portão final). A MAT-34 usou 7,0.

A política de commits do G10 está em [Política de commits](../00_Inicio/Politica_de_Commits.md).

## Questões abertas

1. ~~Nota mínima do G6: sai na MAT-34.~~: resolvido na MAT-34, ver web/DESIGN.md
2. ~~Paleta, tipografia e tema escuro do modo madrugada: saem na MAT-34, com os tokens em `web/DESIGN.md`.~~: resolvido na MAT-34, ver web/DESIGN.md
