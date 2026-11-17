---
tipo: adr
id: ADR-002
status: Proposed
data: 2026-10-22
autor: Hermes (coordinator of APP-001)
aprovador: none so far
tarefas: MAT-7, MAT-15, MAT-17
---

# ADR-002 — Mobile framework and Android and iOS strategy

> Note dated 03/11/2026: Daniel changed the direction to the complete site first and the port afterward. See [ADR-009](ADR-009_Site_Completo_Primeiro.md). The text below remains as the APP-001 record.

**Status:** Proposed. Hermes's technical recommendation; not approved by Daniel.

## Context and requirements

- Android and iOS are mandatory, with the same feature set in the MVP ([ADR-001](ADR-001_Plataformas_e_Web.md)).
- The current environment is Windows, with no Mac and no known test iPhone ([Quality and validation](../05_Privacidade_Operacao/Qualidade_e_Validacao.md), section 9).
- The app needs a local database with a durable queue, a stopwatch visible outside the app without a running process, notifications, accessibility (text at 200%, screen reader) and a release build testable on a physical device.
- Small team: the cost of maintaining two codebases or two interface languages matters more than small performance differences.
- Package rule: choose based on the product and maintenance, without coupling mobile to the backend for convenience or inheriting the stack from other projects.

## Options considered

1. React Native + Expo (TypeScript).
2. Flutter (Dart).
3. Kotlin Multiplatform with native UI (SwiftUI and Jetpack Compose).
4. Kotlin Multiplatform with Compose Multiplatform.
5. Separate native apps in Swift and Kotlin.

## Evidências

Sources accessed on 22/10/2026; details, [EXEC] versions and 103 sources in [Mobile and platforms](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md).

- Stable versions: Expo SDK 58 (`expo` 58.0.17) with React Native 0.88.0; Flutter 3.47.7; Kotlin 2.4.21; Compose Multiplatform 1.12.2; Xcode 27.1 [EXEC, mobile note, E1 to E8].
- iOS without a Mac: EAS Build compiles and signs in the cloud, and EAS Submit uploads to TestFlight from Windows (https://docs.expo.dev/faq/, https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/). Flutter, KMP and native compile iOS using Xcode on macOS (https://docs.flutter.dev/platform-integration/ios/setup, https://kotlinlang.org/docs/multiplatform/quickstart.html). Without your own Mac, building, signing and uploading to TestFlight go through macOS CI (Codemagic, GitHub Actions, Bitrise), and the iPhone receives the app through TestFlight ([Mobile and platforms, section 2.1](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md)). Xcode Cloud requires a Mac at least for initial setup [HIP].
- Live Activity: the official `expo-widgets` creates Live Activities "without writing native code" (https://docs.expo.dev/versions/latest/sdk/widgets/); the Flutter plugin `live_activities` requires the extension in Swift in Xcode (https://pub.dev/packages/live_activities). Live Activities last up to 8 hours (https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities).
- Android: ongoing notification with a system stopwatch and Live Updates, only for activities started by the user (https://developer.android.com/develop/ui/views/notifications/live-update). React Native has no maintained library ready for this (Notifee is archived), so a small Kotlin module would be needed; in Flutter, `flutter_local_notifications` already exposes a stopwatch (https://pub.dev/documentation/flutter_local_notifications/latest/flutter_local_notifications/AndroidNotificationDetails-class.html).
- Persistence: official `expo-sqlite` with SQLCipher through a config plugin; without SQLCipher in the binary, the key is silently ignored (https://docs.expo.dev/versions/latest/sdk/sqlite/). With PowerSync, the React Native SDK uses `op-sqlite`, which supports SQLCipher (https://docs.powersync.com/client-sdks/advanced/data-encryption).
- Accessibility: Compose Multiplatform has documented gaps on iOS (https://kotlinlang.org/docs/multiplatform/compose-ios-accessibility.html).
- iOS costs without a Mac using Expo: Apple Developer Program at US$ 99 per year (https://developer.apple.com/programs/enroll/); EAS Free with 15 iOS builds per month or Starter at US$ 19 per month (https://expo.dev/pricing.md). Other options add a Mac (from US$ 899), a remote Mac or CI (from US$ 25 per month or billed per minute).
- Update cadence: React Native releases six versions per year and maintains the last three (https://reactnative.dev/releases/overview); Expo published four SDKs in 2026 [EXEC, mobile note, E1].

## Recomendação

**React Native + Expo SDK 58, with development builds and EAS Build and Submit.**

- Expo Go only for screen prototypes; the real app runs in a development build (encrypted SQLite, `expo-widgets`, push).
- iOS: development build installed on the iPhone through internal distribution; TestFlight for release testing.
- Live Activity with `expo-widgets`; an Expo module in Kotlin for the stopwatch notification on Android.
- Prefer official Expo modules; use a third-party module only with an active repository and a recorded reason.
- Fixed SDK update schedule (for example, within three months after each new SDK).

Rationale based on the app's needs:

- **iOS from Windows:** this is the option in which the entire cycle runs in an integrated, documented workflow. EAS manages credentials, the development build installs directly on the iPhone, and EAS Submit uploads to TestFlight.
- **Alternatives without a Mac:** Flutter and KMP also reach TestFlight, through macOS CI. But signing and the pipeline still need to be assembled, device iteration goes through TestFlight, and Live Activity is a Swift extension in the Xcode project, difficult to create and debug without a Mac [HIP].
- **In all options,** native debugging on the iPhone remains limited without a Mac.

The recommendation also handles the iOS stopwatch without Swift (`expo-widgets`, to be validated in the technical proof); maintains one interface codebase and one logic codebase; and does not tie down the backend (the client communicates with any API, and PowerSync has a GA SDK for React Native and Flutter).

**Main alternative: Flutter**, in these cases:

- the team gains access to a Mac, or accepts macOS CI and Swift for Live Activity, and the technical proof favors Flutter;
- the recommendation fails under the conditions below.

## Consequences

- Positive: iOS testable from Windows; one codebase; OTA for JavaScript fixes within app store rules; site and panel can use React if it makes sense.
- Negative: dependence on EAS for iOS (without it, a Mac or macOS CI is needed again); frequent updates; occasional Kotlin on Android; limited native debugging on iPhone without a Mac.

## Risks and outstanding verification

- `expo-widgets` has existed since SDK 56 and is recent: prove Live Activity with a timer, termination at 8 hours and push (proof P6).
- Kotlin stopwatch module: prove it with the app terminated and notification permission denied (P6, Q-10).
- SQLCipher active in the release build (`PRAGMA cipher_version`).
- Accessibility with text at 200% and TalkBack and VoiceOver on the Hoje and Sessão screens (P8).
- Actual time and cost of cloud iOS builds (P7); performance on entry-level Android (P9).

## When to review

- The team gains access to a Mac (Flutter becomes equally viable and the proof decides).
- `expo-widgets` or the stopwatch module fail the proof.
- An accessibility failure in React Native.
- Someone with Swift and iOS experience joins: KMP with native UI becomes a candidate.
- A change in EAS pricing or terms, or discontinuation of a core Expo module.

## Referências

[Architecture comparison](../03_Arquitetura/Comparacao_de_Arquiteturas.md) · [Proposed architecture](../03_Arquitetura/Arquitetura_Proposta.md) · [Mobile and platforms](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md) · [ADR-003](ADR-003_Backend_Persistencia_Autenticacao.md) · [ADR-004](ADR-004_Offline_Sync_e_Temporizadores.md) · tasks MAT-7, MAT-15 and MAT-17.
