---
tipo: adr
id: ADR-009
status: Aceita
data: 2026-11-03
autor: lider-appmaternidade
aprovador: Daniel (rumo decidido; stack por delegação registrada na MAT-28)
tarefas: MAT-27, MAT-28, MAT-32
---

# ADR-009 — Site completo primeiro, port Android e iOS depois

**Status:** Aceita. Daniel (rumo decidido; stack por delegação registrada na MAT-28).

## 1. Contexto

A APP-001 recomendou apps de loja para Android e iOS no MVP e deixou o app web para famílias para depois ([ADR-001](ADR-001_Plataformas_e_Web.md)), com React Native e Expo como framework ([ADR-002](ADR-002_Framework_Mobile.md)). A versão 0.3 do [design doc base](../../DESIGN_DOC_BASE.md) já propunha outra ordem: um piloto web pequeno antes das lojas.

Em 03/11/2026, Daniel tomou duas decisões:

- **Rumo.** O AppMaternidade começa como site completo, com todos os requisitos RF-01 a RF-14 de [Visão e escopo](../01_Produto/Visao_e_Escopo.md) (seção 6). Android e iOS vêm depois, como port: o mesmo produto empacotado como app de loja.
- **Stack.** Daniel delegou ao líder do projeto, de forma explícita, a escolha da base técnica do site. A escolha (D8, MAT-28) está na seção 3 e foi registrada na tarefa no mesmo dia.

As exigências que o ADR-001 levantou continuam: as lojas pedem política de privacidade publicada e um link web de exclusão de conta, a comunidade precisa de denúncia, bloqueio e moderação, e o moderador não vê dados de cuidado.

## 2. Opções

### D8-A: React + TypeScript + Vite, Tailwind CSS 4, shadcn/ui e Magic UI, Supabase e PWA; port pelo Capacitor

- Pró: usa os componentes da lista aprovada para o site.
- Pró: hospedagem estática barata.
- Pró: o port reaproveita o mesmo código.
- Contra: recursos nativos avançados pedem plugin.

### D8-B: Next.js (App Router), com a mesma interface e o mesmo backend

- Pró: renderização no servidor e SEO.
- Contra: mais peças para operar.
- Contra: a hospedagem ideal é a Vercel, cujo plano Hobby não permitiria uso comercial (a confirmar: o cofre não tem fonte datada sobre isso).

### D8-C: Expo Router com React Native Web

- Pró: reaproveita melhor o código num app nativo.
- Contra: não usa shadcn/ui nem Magic UI, que dependem do DOM.
- Contra: contraria a regra de componentes do site.

## 3. Decisão

D8-A, decidida em 03/11/2026 por delegação de Daniel:

- React + TypeScript + Vite, Tailwind CSS 4 e componentes shadcn/ui e Magic UI;
- Supabase (PostgreSQL, Auth e RLS), na região São Paulo;
- PWA;
- port para Android e iOS pelo Capacitor.

D8-B e D8-C ficam registradas como alternativas avaliadas.

## 4. Caminho do port

O cofre não avaliou o Capacitor: [Mobile e plataformas](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md) o deixa fora do escopo. Por isso, o que segue é plano, a confirmar quando o port começar [HIP].

**O que se reaproveita sem mudar:**

- a interface (componentes e telas do site);
- as regras de domínio;
- o cliente do Supabase.

**O que o Capacitor exige:**

- projetos Android e iOS gerados a partir do site;
- assinatura dos builds de cada plataforma;
- contas de loja, que dependem da D3 (MAT-22).

**Recursos que pedem plugin nativo ou a volta do Expo à mesa:**

- cronômetro na tela bloqueada e Live Activity no iPhone;
- notificação contínua com cronômetro no Android;
- banco local cifrado.

**Gatilho para reavaliar:** um desses recursos ficar sem solução no Capacitor. Nesse caso, o framework nativo volta a ser decidido, e o [ADR-002](ADR-002_Framework_Mobile.md) é o ponto de partida.

## 5. O que continua valendo do ADR-001

As regras do painel interno ficam em vigor:

- papéis de plataforma separados dos papéis de família;
- autenticação forte para a equipe;
- auditoria;
- nenhuma leitura de dados de cuidado pela moderação.

## 6. Consequências

- O site deixa de ser só a página pública e o painel: ele é o produto inteiro para as famílias, com os quatro pilares.
- A primeira entrega roda no navegador, sem conta de loja, sem Mac e sem build de iOS.
- O offline do site depende do navegador: PWA com fila local em IndexedDB (MAT-41). A sincronização nativa volta a ser decidida no port.
- Lembretes locais viram Web Push enviado pelo servidor e passam a depender de rede.
- Cronômetro na tela bloqueada, Live Activity e notificação contínua ficam para o port.
- As tarefas MAT-17, MAT-18 e MAT-19 ficam congeladas até o port. O que elas tinham de produto passa para as fatias do site (MAT-36 a MAT-41).
- As decisões D1 (framework nativo) e a parte de lojas da D3 ficam para o port ([Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md)).

## 7. Questões abertas

1. D9 (MAT-29): onde o site fica publicado e com que domínio.
2. D10 (MAT-30): usar ou não o detector Impeccable no portão final.
3. Recursos nativos do port: como o Capacitor resolve cronômetro na tela bloqueada, Live Activity, notificação contínua no Android e banco local cifrado.

## Referências

[ADR-001](ADR-001_Plataformas_e_Web.md) · [ADR-002](ADR-002_Framework_Mobile.md) · [Visão e escopo](../01_Produto/Visao_e_Escopo.md) · [Roadmap](../07_Roadmap/Roadmap_e_Proxima_Fatia.md) · [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md) · [Design doc base](../../DESIGN_DOC_BASE.md) · tarefas MAT-27, MAT-28 e MAT-32.
