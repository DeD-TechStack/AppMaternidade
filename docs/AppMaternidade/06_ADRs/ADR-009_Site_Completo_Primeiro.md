---
tipo: adr
id: ADR-009
status: Accepted
data: 2026-11-03
autor: lider-appmaternidade
aprovador: Daniel (direction decided; stack delegated as recorded in MAT-28)
tarefas: MAT-27, MAT-28, MAT-32
---

# ADR-009 — Complete website first, Android and iOS port later

> **Amendment of 10/11/2026: PWA postponed by Daniel.** His words were: "eu não pedi pra ter instalavel de nada, só o site". As a result, the PWA (home screen installation and offline shell, MAT-41) was removed from the current scope. The website remains a regular website, opened in a browser. The PWA had been included in the stack as a technical choice by D8-A, rather than at Daniel's request. Card MAT-41a (t_ab1bd202) was put on hold: the worktree and commits were saved, and nothing was integrated. The PWA will only return if Daniel requests it.

**Status:** Accepted. Daniel (direction decided; stack delegated as recorded in MAT-28).

## 1. Contexto

APP-001 recommended store apps for Android and iOS in the MVP and deferred the web app for families ([ADR-001](ADR-001_Plataformas_e_Web.md)), with React Native and Expo as the framework ([ADR-002](ADR-002_Framework_Mobile.md)). Version 0.3 of the [base design doc](../../DESIGN_DOC_BASE.md) already proposed a different order: a small web pilot before the stores.

On 03/11/2026, Daniel made two decisions:

- **Direction.** AppMaternidade starts as a complete website, with all requirements RF-01 through RF-14 from [Vision and scope](../01_Produto/Visao_e_Escopo.md) (section 6). Android and iOS come later, as a port: the same product packaged as a store app.
- **Stack.** Daniel explicitly delegated the choice of the website's technical foundation to the project lead. The choice (D8, MAT-28) is in section 3 and was recorded in the task on the same day.

The requirements raised by ADR-001 still apply: the stores require a published privacy policy and a web link for account deletion, the community needs reporting, blocking and moderation, and the moderator cannot see care data.

## 2. Options

### D8-A: React + TypeScript + Vite, Tailwind CSS 4, shadcn/ui and Magic UI, Supabase and PWA; port through Capacitor

- Pro: uses components from the approved list for the website.
- Pro: inexpensive static hosting.
- Pro: the port reuses the same code.
- Con: advanced native features require a plugin.

### D8-B: Next.js (App Router), with the same interface and backend

- Pro: server rendering and SEO.
- Con: more parts to operate.
- Con: the ideal hosting is Vercel, whose Hobby plan would not allow commercial use (to be confirmed: the vault has no dated source on this).

### D8-C: Expo Router with React Native Web

- Pro: better code reuse in a native app.
- Con: does not use shadcn/ui or Magic UI, which depend on the DOM.
- Con: conflicts with the website's component rule.

## 3. Decision

D8-A, decided on 03/11/2026 under Daniel's delegation:

- React + TypeScript + Vite, Tailwind CSS 4 and shadcn/ui and Magic UI components;
- Supabase (PostgreSQL, Auth and RLS), in the São Paulo region;
- PWA;
- port to Android and iOS through Capacitor.

D8-B and D8-C remain recorded as evaluated alternatives.

## 4. Port path

The vault did not evaluate Capacitor: [Mobile and platforms](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md) leaves it out of scope. Therefore, what follows is a plan, to be confirmed when the port begins [HIP].

**What is reused without changes:**

- the interface (website components and screens);
- the domain rules;
- the Supabase client.

**What Capacitor requires:**

- Android and iOS projects generated from the website;
- signing the builds for each platform;
- store accounts, which depend on D3 (MAT-22).

**Features that require a native plugin or reconsidering Expo:**

- lock screen timer and Live Activity on iPhone;
- persistent notification with a timer on Android;
- encrypted local database.

**Trigger for reevaluation:** one of these features has no solution in Capacitor. In that case, the native framework decision is reopened, and [ADR-002](ADR-002_Framework_Mobile.md) is the starting point.

## 5. What still applies from ADR-001

The internal dashboard rules remain in effect:

- platform roles separate from family roles;
- strong authentication for the team;
- auditing;
- no reading of care data by moderation.

## 6. Consequences

- The website is no longer just the public page and dashboard: it is the entire product for families, with all four pillars.
- The first release runs in the browser, without a store account, a Mac or an iOS build.
- The website's offline functionality depends on the browser: PWA with a local queue in IndexedDB (MAT-41). Native synchronization will be decided again during the port.
- Local reminders become Web Push sent by the server and become dependent on a network connection.
- The lock screen timer, Live Activity and persistent notification are deferred to the port.
- Tasks MAT-17, MAT-18 and MAT-19 are frozen until the port. Their product functionality moves to the website slices (MAT-36 through MAT-41).
- Decision D1 (native framework) and the store portion of D3 are deferred to the port ([Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md)).

## 7. Open questions

1. Native features of the port: how Capacitor handles the lock screen timer, Live Activity, persistent notification on Android and encrypted local database.

## Referências

[ADR-001](ADR-001_Plataformas_e_Web.md) · [ADR-002](ADR-002_Framework_Mobile.md) · [Vision and scope](../01_Produto/Visao_e_Escopo.md) · [Roadmap](../07_Roadmap/Roadmap_e_Proxima_Fatia.md) · [Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md) · [Base design doc](../../DESIGN_DOC_BASE.md) · tasks MAT-27, MAT-28 and MAT-32.
