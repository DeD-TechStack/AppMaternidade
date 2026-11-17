---
tipo: design-doc
status: proposal
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-10-22
tarefa: MAT-14
adr: ADR-008
fontes_principais:
  - tasks/hermes/APP-001-design-docs/06_CRITERIOS_DE_ACEITE.md (scenarios Q-01 to Q-12)
  - https://support.google.com/googleplay/android-developer/answer/14151465 (accessed 22/10/2026)
  - https://developer.apple.com/testflight/ (accessed 22/10/2026)
  - https://developer.apple.com/design/human-interface-guidelines/accessibility (accessed 22/10/2026)
  - https://support.google.com/accessibility/android/answer/7101858 (accessed 22/10/2026)
---

# Quality and validation

> Note from 03/11/2026: the direction changed to a full website first, with the Android and iOS port afterward ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)). Where this text mentions a native app, read it as the port; the website covers the same functions.

Hermes's proposal. It defines how to prove, in the next stages, that the application does what the documents promise. Nothing here has been executed: the scenarios are test requirements, and the numeric targets are hypotheses to be confirmed or adjusted in the technical proof (MAT-17).

## 1. Problem

What most destroys trust in this product is not an ugly screen, but rather:

- a record that disappears, duplicates or changes without warning;
- one family's data appearing to another;
- the community revealing a baby's routine;
- a timer that shows the wrong duration after the app was closed;
- developmental content without a source or with inappropriate guidance;
- an app that is hard to use with one hand, in the dark or with enlarged text.

The strategy concentrates the testing effort on these risks, on both platforms.

## 2. Risk-based strategy

| Risk | Impact | Where it is prevented | How it is proven | Required evidence |
| --- | --- | --- | --- | --- |
| Record loss or duplication | High | Transactional local queue; operation id; server-side idempotency | Integration tests with injected failures (lost response, timeout, app terminated) and testing on a physical device | Counts on the server and on the device; test log |
| Leakage between families | Critical | Authorization by the current membership on every route, sync channel, file and push | Automated tests with another family's ids for each route and channel, generated from the route list | Per-route coverage report; a failure blocks the release |
| Community exposing the routine | Critical | Separate contexts; public profile without a family key | Schema test (no community table references Care) and query review | Automated test and recorded review |
| Ineffective revocation | High | Membership epoch; server-side refusal; local cleanup | Scenario with a revoked offline device (Q-05) | Test log on both devices |
| Silent conflict | Medium | Base version; per-field merge; review flag | Two offline devices editing the same field (Q-04) | History with the versions |
| Wrong timer | Medium | Duration derived from the recorded start | Terminate the app, restart the device, change time zone (Q-08, Q-09) | Comparison against a reference clock |
| Inappropriate content | High | Editorial cycle with a qualified reviewer | Editorial checklist per version | Review record on the content version |
| Insufficient accessibility | Medium | Components with labels; scalable text; touch targets | TalkBack, VoiceOver and enlarged text on a device | Per-screen checklist |
| Sensitive data in logs, push or analytics | High | Logging policy; neutral push texts | Automated search for sensitive fields in test logs; SDK review | Scan report |

## 3. Testing ladder

Each implementation task states which rungs apply to it; a rung missing from the project becomes a recorded gap, not a skipped rung.

1. **Static analysis:** lint, types, secret scanning and dependency license scanning.
2. **Unit:** domain rules (durations, midnight, time zones, record validation, permissions matrix).
3. **Integration:** server with a real disposable database; sync protocol; authorization per route and channel; idempotency; conflicts.
4. **UI on device or emulator:** critical flows automated on both platforms, with screenshots and traces captured only for failures.
5. **Manual on a physical device:** scenarios that automation does not cover well (app terminated by the system, notifications, screen reader, dark room).
6. **Independent review:** another model family reviews design and evidence, read-only; human content review; legal review before launch.

Test data is always fictitious. No real child data goes into a test, screenshot or log.

## 4. Scenarios Q-01 to Q-12

The rules for each scenario are in [Offline, sync and timers](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) (sections 5 to 13), [Data model and permissions](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) and [Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md).

| ID | Scenario | Expected result | Rungs | Platforms | Evidence |
| --- | --- | --- | --- | --- | --- |
| Q-01 | Offline record, app terminated and reopened | Record present, with state "aguardando envio" and then "sincronizado" | 3, 4, 5 | Physical Android and iOS | Screenshots before and after; count on the server |
| Q-02 | Resend after timeout or lost response | One operation becomes one record | 3 | Server | Test with a proxy that drops the response; table of processed operations |
| Q-03 | A starts, B ends the same session | One session, "iniciado por A, encerrado por B"; double ending handled | 3, 4 | Two devices, one of each platform | Record detail and history |
| Q-04 | A and B edit the same record offline | Different fields: merge; same field: review flag with both versions | 3, 4 | Two devices | History with the versions; screenshot of the review screen |
| Q-05 | Revocation with an offline device | Operations refused on reconnect; the family's local data deleted; honest notice | 3, 5 | Two devices | Server responses; screenshot of the notice; local database checked |
| Q-06 | Another family's ids and attachments | Response identical to that for a nonexistent id, across routes, sync, file URLs and push | 2, 3 | Server | Coverage report per route and channel |
| Q-07 | Post and read in the community | No access to the family; routine summary only with preview and confirmation | 3, 4 | Android and iOS | Schema test; screenshot of the preview |
| Q-08 | Screen locked, app suspended or terminated during a session | Correct duration on reopening | 2, 5 | Physical Android and iOS | Comparison against a reference stopwatch |
| Q-09 | Time zone change, manual clock change, midnight | Instants, duration and grouping according to the rules | 2, 5 | Android and iOS | Unit tests with time zones and daylight saving time; manual time zone change test |
| Q-10 | Notification denied or push not received | Normal recording and sync; understandable message | 4, 5 | Android 13 or later and iOS | Screenshots with permission denied |
| Q-11 | Report, block, delete post | Visibility according to the moderation rules ([Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md), sections 7, 8 and 11). Blocking is mutual: neither of the two sees the other's content or replies to it. The deleted post leaves lists and search immediately | 3, 4 | Android, iOS and moderation panel | Moderation action log; screenshots |
| Q-12 | Export, delete and restore backup | Export of the family only and by a guardian; deletion propagated to devices; backup restoration does not resurrect deleted data | 3, 5 | Server and devices | Exported file with fictitious data; purge log; restoration rehearsal in a test environment |

Q-12 has a point that is often forgotten: when restoring a backup, deletions made after the copy must be reapplied. The proposal is to keep a list of deletions (only ids and dates, no content) outside the backup and reapply it on every restoration. Details in [Privacy and security](Privacidade_e_Seguranca.md).

## 5. Measurable requirements

Proposed targets for discussion. All are hypotheses until the technical proof; none has been measured.

| Requirement | Proposed target | Assumption | Validation method |
| --- | --- | --- | --- |
| Quick recording | Quick button saves in at most 2 taps and 5 seconds | Quick buttons on Hoje | Timed usability test with 5 to 8 caregivers |
| Local write | Record visible on screen within 300 ms after the tap, on an entry-level device | Local database in the same transaction as the queue | Instrumentation in the technical proof, percentile 95 |
| Loss and duplication | Zero in 200 send cycles with injected failures | Transactional queue and idempotency | Automated integration test |
| Isolation | 100% of routes and channels covered by another-family test | Route list generated from the code | Coverage report; release blocked if a route is missing |
| Timer | Difference of at most 1 second relative to the reference stopwatch after terminating and reopening | Duration derived from the recorded start | Manual test on both platforms |
| Sync between caregivers | Another caregiver's change visible within 10 seconds with both apps open and a good network | Notification channel plus change request | Measurement with two devices in the technical proof |
| Startup | Hoje open within 2 seconds from a cold start with 90 days of data, on an entry-level device | Local read | Measurement in the technical proof |
| Accessibility | Full quick recording with TalkBack and VoiceOver; text at 200% without cutting off main actions | Labels and flexible layout | Per-screen checklist |
| Contrast | Regular text with at least 4,5:1, in the light and dark themes | Palette defined in the design | Contrast tool applied to the screenshots |
| Touch targets | At least 48 x 48 dp (Android) and 44 x 44 pt (iOS) | Standardized components | Accessibility Scanner and Accessibility Inspector |

The contrast and touch target goals come from the platform guidelines (sources in the header). The others are Hermes's proposals.

## 6. Android and iOS

### Devices

- Minimum proposed lab: one entry-level Android, one mid-range Android and one iPhone on the minimum supported version, plus one on the current version. The minimum versions come from [ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md).
- The Android emulator runs on Windows. The iOS simulator runs only on macOS. Therefore, iOS validation from the current environment depends on a physical iPhone with test distribution, a Mac (local or rented) or a cloud build and test service. The path via an alternative stack is in [Mobile and platforms](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md).
- Tests with the system terminating the app, notifications and the screen reader require a physical device.

### Test distribution

| Store | Mechanism | Limits and requirements (accessed 22/10/2026) |
| --- | --- | --- |
| Google Play | Internal, closed and open testing | A personal account created after 13/11/2023 needs a closed test with at least 12 testers continuously opted in for 14 days before applying for production access; an organization account does not have this requirement. |
| App Store | TestFlight | Up to 100 internal testers (team members) and up to 10.000 external testers; the first build for external testers goes through Apple review. |

The type of developer account (personal or organization) changes timelines and costs; it is covered in [Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md).

## 7. Planned technical proofs (MAT-17)

The technical proof is small and disposable. It exists to choose the stack with evidence, not to become the product.

| Proof | Question | Passes if |
| --- | --- | --- |
| P1 Offline and reopening | Does the local queue survive termination? | Q-01 passes on both platforms |
| P2 Idempotent resend | Does resending duplicate? | Q-02 passes with 200 cycles |
| P3 Two caregivers | Do conflict and authorship work? | Q-03 and Q-04 pass |
| P4 Offline revocation | Does the server refuse and the device clean up? | Q-05 passes |
| P5 Isolation in the sync channel | Does the sync channel respect the current membership? | Q-06 passes on the sync channel |
| P6 Stopwatch outside the app | Are an ongoing notification on Android and a Live Activity on iOS feasible in the stack? | They work with the app terminated, or the cost of not having them is recorded |
| P7 iOS build from Windows | How much time and cost does it take from code to iPhone? | Build installed via TestFlight with time and cost recorded |
| P8 Basic accessibility | Do the stack's components expose labels and text scaling? | Quick recording with TalkBack and VoiceOver |
| P9 Size and startup | Does the app fit the targets in section 5? | Measurements recorded on an entry-level device |

Decision criterion: if the recommended stack fails P1 to P5 without a reasonable fix, the main alternative from [ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md) and [ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md) is tested before proceeding.

## 8. Observability

- Server and device logs without the content of records, notes, names or birth dates; ids and operation types are enough.
- Crash reports without personal data; third-party SDKs evaluated one by one and declared in the stores.
- Protocol metrics: pending operations per device, age of the oldest operation, rejections by reason and conflicts per week.
- Alerts for stalled queues, abnormal rejection rates and serial authorization failures.

## 9. Known gaps

| Gap | Effect | Smallest intervention |
| --- | --- | --- |
| No Android SDK, Flutter, Kotlin or Gradle installed on this machine | No mobile proof was done in this stage | Install what is needed in MAT-17, after the stack choice |
| No known Mac or test iPhone | iOS validation depends on a cloud service or device | Daniel's decision on the Apple account and device |
| No developer accounts | No TestFlight or closed testing on Play | Daniel's decision |
| No content reviewer or legal counsel | Content and legal texts cannot be published | Daniel's decision |

## Open questions

1. Minimum Android and iOS versions (depend on ADR-002 and the audience).
2. Who the 12 testers for the closed test will be, if the Play account is personal.
3. Budget for test devices or a cloud lab.

## Limits of this analysis

Plan without execution. The targets are proposals, not measurements; the store requirements were read on 22/10/2026 and may change.
