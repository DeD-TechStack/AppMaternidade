---
tipo: technology-research
status: draft
responsavel: Hermes (mobile subagent)
revisado_em: 2026-10-22
fontes_principais:
  - https://docs.expo.dev/versions/latest/
  - https://expo.dev/changelog/sdk-58
  - https://reactnative.dev/releases/overview
  - https://docs.flutter.dev/release/release-notes
  - https://kotlinlang.org/docs/multiplatform/supported-platforms.html
  - https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities
  - https://developer.android.com/develop/ui/views/notifications/live-update
  - https://expo.dev/pricing.md
  - https://developer.apple.com/news/upcoming-requirements/
---

# Mobile and platforms: alternatives for Android and iOS

Reference research for task APP-001 (stage D4, mobile workstream). Compares five alternatives: (1) React Native + Expo with TypeScript; (2) Flutter with Dart; (3) Kotlin Multiplatform (KMP) with native UI (SwiftUI on iOS, Jetpack Compose on Android); (4) KMP + Compose Multiplatform (CMP); (5) separate native apps in Swift/SwiftUI and Kotlin/Compose.

No stack is approved. This document's recommendation is from Hermes and is provisional. Backend, synchronization protocol, authentication, and BaaS pricing are covered in [Data, synchronization, and backend](Dados_Sincronizacao_e_Backend.md) and [Dated pricing](Precos_Datados.md). This document covers only what changes the mobile client choice.

All sources were accessed on 22/10/2026 (America/Sao_Paulo). The labels follow the [Vault conventions](../../00_Inicio/Convencoes.md): **[DOC]** stated in official documentation, a changelog, blog, or pricing page; **[EXEC]** query run in this session (command and result in the "Recorded executions" section, near the end); **[HIP]** inference not yet verified. MPnn codes refer to the "Sources" table; En refers to executions. No app, prototype, or SDK was installed or measured. English excerpts are verbatim; the rest is a free translation.

## Resumo

- **Versions as of 22/10/2026.** Expo SDK 58 (package `expo` 58.0.17) with React Native 0.88 [EXEC E1, E3; DOC MP01, MP02]. Flutter 3.47.7 with Dart 3.13 [EXEC E6; DOC MP32]. Kotlin 2.4.21 and Compose Multiplatform 1.12.2 [EXEC E5, E8; DOC MP49, MP53]. Xcode 27.1 with Swift 6.4 [DOC MP63, MP64]. Jetpack Compose BOM 2026.09.00 [EXEC E8].
- **Shortlist.** React Native + Expo is the provisional recommendation; Flutter is the main alternative. KMP with native UI remains a conditional alternative. KMP + CMP and fully native apps are currently outside the shortlist, with explicit conditions for reconsideration (see section 12).
- **The main difference between the options for this team is iOS development from Windows.** Only RN + Expo has an integrated, documented workflow for the entire cycle without owning a Mac: building, signing, installing a development build on an iPhone, and submitting to TestFlight, through EAS Build and EAS Submit [DOC MP11, MP14, MP15]. Flutter, KMP, and native apps build for iOS only on macOS, with Xcode [DOC MP33, MP34, MP50]. Without a team-owned Mac, they reach TestFlight through macOS CI (section 13, option B3), but without a debugger on the iPhone and with the Live Activity extension created and edited in Xcode [DOC MP42]. Clarification from the coordinator, after the independent review.
- **The second factor is ongoing activity outside the app.** On iOS, a Live Activity is always a widget extension in SwiftUI [DOC MP57]. With Expo, the official package `expo-widgets` generates this extension from Expo UI components, "without writing native code" [DOC MP17]. In Flutter, the `live_activities` plugin requires creating the extension in Xcode and designing the interface in Swift [DOC MP42]. In KMP and native apps, it is written directly in Swift.
- **On Android, a notification stopwatch does not need a running process.** The ongoing notification uses `setUsesChronometer` and `setWhen`, and Android 16+ can also promote it to a Live Update [DOC MP76, MP77]. In RN, none of the maintained libraries consulted provides this out of the box: `expo-notifications` only has `sticky`, and the custom notification from `expo-widgets` uses RemoteViews, which Live Updates prohibit. Therefore, a small Expo module in Kotlin would be needed [DOC MP20, MP17, MP76; HIP]. In Flutter, `flutter_local_notifications` already exposes a stopwatch and `ongoing` [DOC MP44].
- **Minimum cost of iOS development from Windows with RN + Expo.** US$ 99 per year for the Apple Developer Program [DOC MP67], plus EAS Free (up to 15 iOS builds/month) or Starter (US$ 19/month) [DOC MP12], plus a physical iPhone if the team does not have one. For the other options, add a Mac (Mac mini starting at US$ 899 in the US store [DOC MP74]) or a remote Mac or CI (starting at US$ 25/month, or per minute) [DOC MP92, MP47, MP89].

### What changes from the preliminary research

The package research (`02_PESQUISA_TECNOLOGIAS.md`, sources M01–M11) remains valid on the main points:
- Windows → iOS through EAS (M02) [DOC MP11].
- KMP and CMP stable for Android/iOS (M04) [DOC MP48].
- Push in Expo Go on Android requires a development build (M07) [DOC MP20].
- Background tasks have no guaranteed execution time (M08) [DOC MP22].

Updates:
- **EAS plans.** Free keeps 15 + 15 builds; Starter at US$ 19/month now includes US$ 45 in credit, and each iOS build costs US$ 2 or US$ 4 [DOC MP12].
- **New developments that affect the decision:**
  - the official `expo-widgets` exists [DOC MP17];
  - RN runs only on the New Architecture [DOC MP05];
  - Notifee and `expo-live-activity` are archived [EXEC E5];
  - `sqlcipher_flutter_libs` has reached end of life [DOC MP41];
  - Apple has required Xcode 26 since 28/04/2026 [DOC MP62];
  - Google Play has required API 36 since 31/08/2026 [DOC MP86].

## 1. Stable versions and maturity

| Alternative | Verified stable version | Maturity and requirements | Notes |
| --- | --- | --- | --- |
| RN + Expo | `expo` 58.0.17 (SDK 58). Version 58.0.0 was released on npm on 29/09/2026, and the official changelog announcement was on 15/10/2026. `react-native` 0.88.0 was published on npm on 15/10/2026, with React 19.3.0 [EXEC E1, E2, E3; DOC MP01, MP103]. The blog announced 0.88 on 19/10/2026 as a "no breaking changes" release [DOC MP08] | SDK 58: Android 7+ (compileSdk 37, targetSdk 36), iOS 16.4+, Xcode 26.4+ [DOC MP01]. "SDK 58 is built for iOS 27" [DOC MP02] | Since RN 0.82, it runs only on the New Architecture [DOC MP05]. RN 0.84 made Hermes V1 the default and removed legacy architecture components [DOC MP06]. The project moved to the React Foundation (organization `react` on GitHub) [DOC MP07]. The docs site still shows 0.87 as "latest" [DOC MP10]: the documentation is behind, not the version |
| Flutter | Flutter 3.47.7, stable channel, dated 08/10/2026, with Dart 3.13.5. 3.47.0 is the latest stable version listed in the release notes. dart.dev already lists Dart 3.13.6 [EXEC E6; DOC MP30, MP32] | Android and iOS are production targets. An iOS build requires Xcode on macOS [DOC MP34] | Version 3.47 (12/08/2026) separated Material and Cupertino into the packages `material_ui`/`cupertino_ui` 1.0 and prepared for Xcode 27/iOS 27 [DOC MP31]. Beta: 3.50.0-0.1.pre [EXEC E6] |
| KMP + native UI | Kotlin 2.4.21 (08/10/2026) [EXEC E5, E8; DOC MP49]. Android: Compose BOM 2026.09.00 [EXEC E8]. iOS: Xcode 27.1 with Swift 6.4 [DOC MP63] | KMP core with Android and iOS at "Stable" [DOC MP48]. Google officially supports KMP for shared logic [DOC MP56] | Swift export (calling Kotlin from Swift without Objective-C headers) is in Alpha [DOC MP51] |
| KMP + CMP | Compose Multiplatform 1.12.2 (15/10/2026); prerelease 1.13.0-alpha02 [EXEC E5, E8; DOC MP53] | CMP with Android and iOS at "Stable"; web (Kotlin/Wasm) in Beta [DOC MP48] | Version 1.12 improved list scrolling on iOS [DOC MP53] |
| Native | Swift 6.4, released on 15/09/2026 (tag 6.4.1 on 15/10/2026), with Xcode 27.1 [DOC MP64, MP63; EXEC E5]. Android: Kotlin 2.4.21 + Compose BOM 2026.09.00 [EXEC E8] | The reference for each platform | Since 28/04/2026, App Store Connect has required Xcode 26+ with the iOS 26 SDK [DOC MP62] |

**Update cadence** (affects maintenance):

- **React Native.** Six releases per year [DOC MP01]. The project maintains the latest three minor versions [DOC MP09]. On 22/10/2026, the releases page marked 0.86 and 0.87 as "Active" and 0.85 as "End of Cycle", and had not yet updated the 0.88 row [DOC MP09].
- **Expo.** npm publication dates: SDK 55 on 25/02/2026, 56 on 20/05, 57 on 30/06, and 58 on 29/09. That is four SDKs in 2026 [EXEC E1]. Each SDK pins an RN version [DOC MP01]. The store version of Expo Go runs one SDK at a time: the new Expo Go "will support only SDK 58" [DOC MP02].
- **Flutter.** Stable x.0 versions on 12/11/2025, 11/02/2026, 18/05/2026, and 12/08/2026, meaning quarterly [EXEC E6]. Stable Dart is released "about every three months" [DOC MP32].
- **Kotlin.** Language release (2.x.0) every six months, with tooling releases (2.x.20) in between; 2.5.0 is scheduled for dezembro de 2026 [DOC MP49].
- **Apple.** Xcode 27.0 on 14/09/2026, followed by 27.1 [DOC MP63].
- **Google Play.** Since 31/08/2026, new apps and updates must target Android 16 (API 36), with a possible extension until 01/11/2026 [DOC MP86]. Android 17 already has a platform page, and SDK 58 compiles against API 37 [DOC MP79, MP01].

## 2. iOS from Windows

### 2.1 What each alternative allows without a Mac

| Activity | RN + Expo | Flutter | KMP (native UI or CMP) | Native |
| --- | --- | --- | --- | --- |
| Develop and test Android on Windows | Yes [HIP] | Yes [HIP] | Yes; the KMP guide covers setup on Windows [DOC MP50] | Yes, for the Android app |
| Build for iOS | EAS Build in the cloud [DOC MP11]. Local iOS builds on Windows are not supported; WSL is not officially tested [DOC MP16] | Requires Xcode on macOS [DOC MP33, MP34] | "To create iOS applications, you need a macOS machine with Xcode" [DOC MP50] | Xcode on macOS [DOC MP63] |
| Signing and provisioning | EAS manages certificates and profiles with Apple login through the CLI [DOC MP15] | In Xcode or macOS CI [DOC MP34; HIP] | Same | Same |
| Install on a physical iPhone | Development build with an ad hoc profile. The UDID is added to the list through `eas device:create` (limit of 100 iPhones per year; requires a paid account) [DOC MP14]. Requires Developer Mode on iOS 16+ [DOC MP15, MP68] | iPhone connected to the Mac by USB [DOC MP33], or TestFlight from CI [HIP] | Same | Same |
| Submit to TestFlight/App Store | EAS Submit from Windows [DOC MP11] | Through macOS CI (Codemagic, GitHub Actions, Bitrise, Xcode Cloud) [DOC MP47, MP89, MP91, MP65] | Same | Same |
| Debug on an iPhone | JavaScript is served by Metro running on Windows to the development build [HIP, validate in the PoC]. Native crashes, Instruments, and Console require a Mac [HIP]. EAS Observe began recording native crashes in 07/10/2026 [DOC MP103] | Debugging with the device connected to the Mac [DOC MP33] | Same | Same |

Xcode Cloud is configured from Xcode [DOC MP65]. Even in this case, a Mac is needed at least for the initial setup [HIP].

### 2.2 Expo Go and its limits

- Expo Go is a "learning environment and sandbox" [DOC MP03]. Expo itself recommends moving to a development build to build and publish the app [DOC MP02].
- It only runs the modules it includes:
  - `expo-widgets` is not in Expo Go [DOC MP17].
  - SQLCipher does not work in Expo Go either. Worse: without SQLCipher in the binary, `PRAGMA key` does not raise an error, and the database is written without encryption [DOC MP19].
  - Remote push on Android was removed from Expo Go in SDK 53 [DOC MP20].
- Expo Go runs one SDK at a time [DOC MP02]. Since 03/09/2026, it also requires login in the CLI and the app [DOC MP04]. Until Expo Go for SDK 58 reaches the stores, `create-expo-app` creates SDK 57 projects [DOC MP02].
- **Conclusion.** Expo Go works for screen prototypes. AppMaternidade's background timer, Live Activity, SQLCipher, and push require a development build [HIP, based on the items above].

### 2.3 Cloud Macs and CI: dated pricing

Prices as of 22/10/2026, in USD, excluding taxes and currency conversion.

| Service | Displayed price or limit | Suitable for | Source |
| --- | --- | --- | --- |
| EAS Build (Expo) | **Free:** up to 15 Android + 15 iOS builds per month, low-priority queue, 45 min timeout, 1 macOS concurrency. **Starter:** US$ 19/month with US$ 45 in credit; an iOS build costs US$ 2 (medium) or US$ 4 (large). **Workflows:** macOS medium at US$ 0,075/min | React Native/Expo projects [HIP] | [DOC MP12] |
| GitHub Actions | **Per minute:** macOS 3 or 4 cores US$ 0,062; 12 cores US$ 0,077; 5-core M2 Pro US$ 0,102. **GitHub Free:** 2.000 min/month in private repositories. **Public repositories:** free standard runners | Any stack | [DOC MP89, MP90] |
| Codemagic | **Individual plan:** 500 macOS M2 min per month free, 1 parallel build. **Pay-as-you-go:** Mac mini M2 at US$ 0,095/min and M4 at US$ 0,114/min. **Fixed price:** starting at US$ 3.990/year | Any stack | [DOC MP47] |
| Bitrise | **Hobby:** free, for 1 person and a few builds per month. **Starter:** starting at US$ 89/month (annual) or US$ 99/month (monthly), recommended for up to about 100 builds/month | Any stack | [DOC MP91] |
| Xcode Cloud | 25 compute hours per month included in the Apple Developer Program; 100 h for US$ 49,99/month | Xcode projects | [DOC MP65] |
| MacinCloud | Starting at US$ 25/month (remote Mac) | Interactive Xcode use | [DOC MP92] |
| Mac purchase | Mac mini starting at US$ 899 (US store) | Local Xcode and iPhone over USB | [DOC MP74] |

On 22/10/2026, the AppMaternidade repository was public, according to the task package snapshot. Under that condition, GitHub's standard macOS runners would cost nothing [DOC MP90]. A product repository may become private, however. Do not count on this [HIP].

### 2.4 Signing, provisioning, and TestFlight

- **Apple Developer Program.** Costs "99 USD per membership year"; local pricing may vary [DOC MP67]. Required for a development build on a device, ad hoc distribution, TestFlight, and the store [DOC MP14, MP15].
- **Ad hoc distribution.** The profile contains a list of UDIDs. Only devices on the list at build time can install it; a new device requires a new build [DOC MP14].
- **TestFlight.**
  - Up to 100 internal testers, who must be team members in App Store Connect.
  - Up to 10.000 external testers. The first build for external testers goes through App Review.
  - Up to 100 shared builds [DOC MP66].
- **Developer Mode.** Applies to apps installed through Xcode or development `.ipa`. Does not affect TestFlight or the App Store [DOC MP68].

### 2.5 What "testing iOS properly" means

- **Physical device.**
  - BGTaskScheduler does not exist in the simulator [DOC MP22].
  - Shorebird patches do not run in the simulator [DOC MP45].
  - Maestro does not run tests on a physical iPhone [DOC MP97].
  - Therefore, automated E2E in the simulator plus a manual test procedure on the device [HIP].
- **Release build (TestFlight), not just debug** [HIP].
- **Live Activity.** Check the lock screen and Dynamic Island. The system ends the Live Activity after 8 h, and it remains on the lock screen for up to 4 h after ending [DOC MP57].
- **Notifications.** With permission denied and with provisional authorization [DOC MP72]; see scenario Q-10.
- **Accessibility.** VoiceOver and Dynamic Type at the largest size. The HIG calls for allowing text to be enlarged by at least 200% [DOC MP69].
- **Closing the app and shutting down the device.** Quit the app through the app switcher, restart the device, enter airplane mode, and change the time zone during a session (scenarios Q-01, Q-08, Q-09) [HIP].
- **iOS versions.** The minimum supported (iOS 16.4 in SDK 58) and the latest (iOS 27) [DOC MP01, MP02].

## 3. Local persistence and offline use

For all alternatives, the planned design is local SQLite as the device's source of truth plus an outgoing queue (outbox). The protocol is covered in [Data, synchronization, and backend](Dados_Sincronizacao_e_Backend.md). This section compares libraries, migrations, encryption, and build requirements.

| Alternative | Library (version as of 22/10/2026) | Migrations | Encryption at rest | Requires a native build? |
| --- | --- | --- | --- | --- |
| RN + Expo | `expo-sqlite` ~58.0.13, official Expo library and included in Expo Go [EXEC E3; DOC MP19] | Manual, through `PRAGMA user_version` (official example) [DOC MP19]. An ORM is optional; `drizzle-orm` is at 0.45.4, pre-1.0, and the integration was not verified [EXEC E4; HIP] | SQLCipher through the config plugin `useSQLCipher`, for Android, iOS, and macOS; does not work in Expo Go or on the web. Check `PRAGMA cipher_version`, because without SQLCipher the key is silently ignored [DOC MP19] | With SQLCipher, yes: development build [DOC MP19] |
| RN (third-party) | `@op-engineering/op-sqlite` 18.2.5; active repository, last push on 29/09/2026 [EXEC E4, E5] | Handled by the app [HIP] | Not verified in this research | Yes, it is a native module [HIP] |
| RN (third-party) | `@nozbe/watermelondb` 0.28.0; latest npm version on 24/07/2025, with repository commits in 09/2026 [EXEC E4, E5] | Provided by the library [HIP] | Not verified in this research | Yes, it is a native module [HIP]. The slow release cadence is a risk [HIP] |
| Flutter | `drift` 2.35.2, `sqlite3` 3.7.1, `sqflite` 2.4.5 [EXEC E7] | drift has a migration API (not read in this research) [HIP] | From drift 2.32 onward, the `sqlite3` package bundles SQLite3MultipleCiphers through build hooks (`source: sqlite3mc`), with `PRAGMA key`. Check `PRAGMA cipher` at runtime. `sqlcipher_flutter_libs` is at end of life (0.7.0+eol) [DOC MP40, MP41; EXEC E7] | Every Flutter app is already a native build; plugins are included without an extra step [HIP] |
| KMP (native UI or CMP) | SQLDelight 2.4.1, with android, native, and jvm drivers [EXEC E8; DOC MP55]. Stable Room 3.0.3 (`androidx.room3`) or 2.8.5, with `androidx.sqlite:sqlite-bundled` 2.7.1 in KMP [EXEC E8; DOC MP54] | Room: migration classes, including during the transition to SQLite Driver [DOC MP54]. SQLDelight: not read in this research [HIP] | Android: SQLCipher for Android 4.19.1 (Zetetic) [EXEC E8; DOC MP88]. iOS: the Room page for KMP does not cover encryption [DOC MP54], so connecting SQLCipher to the native driver needs validation [HIP] | Kotlin/Native code, with no extra restriction [HIP] |
| Native | iOS: SwiftData (iOS 17+) [DOC MP70], Core Data, or GRDB 7.11.1 (iOS 13+, Swift 6.1+, with documented migrations and SQLCipher) [EXEC E5; DOC MP71]. Android: Room 2.8.5 or 3.0.3 [EXEC E8] | GRDB: Migrations [DOC MP71]; Room [DOC MP54] | GRDB + SQLCipher [DOC MP71]; SQLCipher for Android [DOC MP88] | Not applicable |

Notes:

- The mobile choice does not settle the synchronization layer. PowerSync, one of the candidate layers in the data document, publishes an SDK for RN (`@powersync/react-native` 2.3.3) and Flutter (`powersync` 2.5.0) [EXEC E4, E7]. Both finalists keep this option open. The decision belongs in the data document.
- Offline persistence documented for native SDKs does not automatically carry over to JavaScript libraries running in RN. This is the package's warning (M11), addressed in the data document.
- Where to store the database key (Keychain or Keystore) and whether SQLCipher is required or system file protection is enough: a privacy decision, still open [HIP].

## 4. Timers and ongoing activity

### 4.1 Common principle

- **Session model.** A session (tummy time, sleep, feeding) is a persisted record with a start (observed instant), state, and end. Duration comes from timestamps. No counter runs in the background. This meets scenario Q-08 in any alternative [HIP].
- **Background tasks cannot serve as a clock.** On iOS, BGTaskScheduler decides when to run and does not exist in the simulator [DOC MP22, MP60]. On Android, periodic WorkManager has a minimum interval of 15 min [DOC MP22, MP80]. Both are suitable for opportunistic synchronization [HIP].
- **A foreground service is not needed to show a stopwatch** [HIP]. The `specialUse` type requires justification in Play Console, and apps targeting Android 14+ declare service types in the Console [DOC MP81].
- **`BGContinuedProcessingTask` (iOS 26+) is not suitable for a stopwatch.** It is a task started in the foreground that can continue in the background, with progress displayed in a system Live Activity, and that can be terminated abruptly [DOC MP61]. It was designed for work with progress, such as an upload, not for a passive stopwatch [HIP].

### 4.2 How to display a stopwatch without a running process

**iOS: Live Activity (ActivityKit)**

- Lives in a widget extension with WidgetKit and SwiftUI [DOC MP57].
- `Text(timerInterval:pauseTime:countsDown:showsHours:)` (iOS 16+) draws a timer that counts on its own [DOC MP59].
- **Limits.** Remains active for up to 8 h; then the system ends it and removes it from Dynamic Island. After ending, it stays on the lock screen for up to 4 h [DOC MP57].
- **Remote updates and starts.** Through ActivityKit push via APNs (`apns-push-type: liveactivity`) [DOC MP58]. Push-to-start requires iOS 17.2+ [DOC MP17].
- **Consequence.** Overnight sleep may exceed 8 h. The session continues in the database; the Live Activity is only a mirror, and the app must show the actual state when opened [HIP].

**Android: ongoing notification with a stopwatch**

- `ongoing` notification with `setUsesChronometer`, `setChronometerCountDown`, and `setWhen` (AndroidX `NotificationCompat.Builder`) [DOC MP77].
- Android 16 introduced progress-centric notifications (`Notification.ProgressStyle`) [DOC MP78].
- **Live Updates.** They are promoted to the lock screen, the top of the notification drawer, and a status bar chip [DOC MP76]. The requirements are:
  - standard, BigText, Call, Progress, or Metric style;
  - `POST_PROMOTED_NOTIFICATIONS` permission;
  - `setRequestPromotedOngoing`;
  - `ongoing` and a title;
  - no custom RemoteViews;
  - channel importance above MIN.
- The chip can show the stopwatch with `setUsesChronometer` [DOC MP76].
- **Live Updates usage criterion.** The activity must be ongoing, user-initiated, and time-sensitive. The rule says "Don't allow activities triggered by other parties to generate Live Updates" [DOC MP76].
- **Design consequence.** On caregiver B's device, a session started by A should appear as a regular notification, not a Live Update [HIP].
- **Without notification permission.** On Android 13+, without `POST_NOTIFICATIONS`, none of these notifications appears, including foreground service notifications [DOC MP82]. The session remains visible inside the app (scenario Q-10) [HIP].

Home screen widgets complement, but do not replace, the Live Activity or notification [HIP].

### 4.3 How each alternative gets there

| Alternative | Live Activity on iOS | Notification with stopwatch / Live Update on Android | Native code required |
| --- | --- | --- | --- |
| RN + Expo | **`expo-widgets` ~58.0.22**, official, included in SDK modules since 56 [EXEC E3]. Creates Live Activities and widgets with Expo UI components, "without writing native code". Does not run in Expo Go. Has push and push-to-start tokens [DOC MP17]. Expo UI's `Text` has `timerInterval` and `dateStyle="timer"`, "especially useful in widgets and Live Activities" [DOC MP18]. **Limit:** the widget runs in an isolated runtime, without hooks, app state, or asynchronous work [DOC MP17]. **Third-party:** `expo-live-activity` (Software Mansion Labs) is archived [EXEC E5]; `@bacons/apple-targets` 5.0.0 is for native targets written in Swift [EXEC E4; HIP about its function] | `expo-notifications` has `sticky` (ongoing), but does not document a stopwatch [DOC MP20]. `expo-widgets` creates custom notifications with RemoteViews and the `ongoing` option [DOC MP17], which do not qualify as Live Updates [DOC MP76]. Notifee, which had a stopwatch, is archived; its latest version (9.1.8) is from 12/2024 [EXEC E4, E5]. **Path:** custom Kotlin module through the Expo Modules API [DOC MP23; HIP] | A small amount of Kotlin on Android. No Swift, if `expo-widgets` meets the needs [HIP; validate in the PoC] |
| Flutter | **`live_activities` 2.6.0** (11/09/2026), iOS 16.1+. Requires creating the Widget Extension in Xcode and designing the Live Activity in Swift ("not currently possible to only use Flutter"). Supports push updates [EXEC E7; DOC MP42] | `flutter_local_notifications` 22.3.2 has `usesChronometer`, `chronometerCountDown`, `when`, and `ongoing` [EXEC E7; DOC MP44]. Promotion to a Live Update does not appear in the API consulted; it would require a platform channel in Kotlin [HIP] | Swift in the extension, plus small amounts of Kotlin. Mac required for the extension [DOC MP42] |
| KMP + native UI | ActivityKit and WidgetKit in Swift, in the iOS layer [DOC MP57]. Kotlin/Native exposes code to Swift through Objective-C headers; Swift export is in Alpha [DOC MP51]. Therefore, some Swift glue code [HIP] | `NotificationCompat` directly in Kotlin [DOC MP77] | Swift and Kotlin |
| KMP + CMP | Same: the Live Activity interface is SwiftUI, not Compose [DOC MP57; HIP] | Same | Swift (extension) and Kotlin |
| Native | Direct APIs in Swift | Direct APIs in Kotlin | Both |

### 4.4 Activity started by another caregiver

Displaying a session started by B outside the app on A's device requires the server to send push notifications. On iOS, this uses push-to-start and update tokens [DOC MP58, MP17]. On Android, it should be a regular notification, under the Live Updates criterion [DOC MP76]. The issue is the same for all alternatives and belongs in the backend push design [HIP].

## 5. Notifications

Local reminders, remote push, and synchronization are different mechanisms, and none replaces another.

| Alternative | Local | Remote push | Limits and notes |
| --- | --- | --- | --- |
| RN + Expo | `expo-notifications` ~58.1.6: scheduling, Android channels, badge [EXEC E3; DOC MP20] | Native token (FCM/APNs), or Expo token through Expo Push Service, which forwards to FCM/APNs [DOC MP20, MP21]. Sending directly to FCM/APNs is also possible [DOC MP21] | **Expo Push:** 600 notifications/s per project, and checking receipts is mandatory [DOC MP21]. Push on Android has required a development build since SDK 53 [DOC MP20] |
| Flutter | `flutter_local_notifications` 22.3.2 [EXEC E7] | `firebase_messaging` 17.0.0 (FCM) [EXEC E7], or direct APNs through another plugin [HIP] | iOS only keeps the last 64 scheduled pending notifications; Android limits alarms to 500 [DOC MP43]. Using FCM for push does not imply using Firebase as the database [HIP] |
| KMP | Platform APIs on each side (UNUserNotificationCenter; NotificationManager) [HIP] | FCM/APNs on each side [HIP] | No official multiplatform notification library was identified in this research |
| Native | Platform APIs | FCM/APNs | Not applicable |

**Permissions and rules:**

- **Android 13+.** `POST_NOTIFICATIONS` is a runtime permission for non-exempt notifications, including foreground service notifications [DOC MP82].
- **Exact alarms.**
  - `SCHEDULE_EXACT_ALARM` is not pre-granted on new installations of apps targeting 13+ [DOC MP83]. Starting with Android 14, it is denied by default for newly installed apps [DOC MP20].
  - `USE_EXACT_ALARM` is granted without a request, but is subject to Play policy [DOC MP83], which reserves it for alarm clock, timer, and calendar apps [DOC MP20].
  - Routine reminders can tolerate approximate timing. Better not to depend on exact alarms [HIP].
- **iOS.** Request permission in context. Provisional authorization delivers notifications silently, allowing the user to evaluate them [DOC MP72].
- **Privacy.** The push payload should not contain child data. It passes through FCM/APNs and, with Expo Push, through Expo as well [DOC MP21; HIP]. Address in the [privacy and stores document](../Pesquisa_Privacidade_Legal_e_Lojas.md).

## 6. Accessibility

| Alternative | What the official documentation guarantees | What to validate |
| --- | --- | --- |
| RN + Expo | APIs that integrate with VoiceOver and TalkBack [DOC MP27]. `allowFontScaling` makes text respect the system font size, and `maxFontSizeMultiplier` limits scaling [DOC MP28]. `AccessibilityInfo` detects an active screen reader [DOC MP27] | Layout at maximum font size on quick-entry screens; focus order [HIP] |
| Flutter | Font size is calculated automatically from the system; the layout needs to fit at maximum font size [DOC MP36]. Official checklist: TalkBack/VoiceOver, contrast of 4,5:1, targets of 48×48, large scales [DOC MP35]. Version 3.47 detects high contrast and color inversion on Android [DOC MP31] | Semantics of custom widgets (timer, history charts) [HIP] |
| KMP + native UI / Native | **iOS (HIG):** standard control of 44×44 pt (minimum 28×28 pt), text scalable by at least 200% through Dynamic Type, contrast of 4,5:1 [DOC MP69]. **Compose:** semantics, scalable content, and minimum target of 48 dp [DOC MP84, MP85] | The reference for each platform |
| KMP + CMP | **iOS:** Compose semantics are mapped to VoiceOver [DOC MP52]. High contrast requires a manual palette, because Material3 has no built-in support [DOC MP52]. `testTag` becomes `accessibilityIdentifier` and allows auditing through XCTest [DOC MP52]. The page consulted, dated 22/07/2025, does not mention Dynamic Type | Dynamic Type and maximum font size on iOS (gap; does not prove absence) [HIP] |

Dark mode and "night contrast" are feasible in all alternatives. In practice, this is a low-luminance dark theme that still meets minimum contrast. Validate with Accessibility Inspector (iOS) and Accessibility Scanner (Android) [HIP].

## 7. Tests

### 7.1 Layers

| Layer | RN + Expo | Flutter | KMP | Native |
| --- | --- | --- | --- | --- |
| Unit | Jest. The preset moved to its own package in RN 0.85 [DOC MP06]. Runs on Windows [HIP] | `flutter_test` [DOC MP37]. Runs on Windows [HIP] | `commonTest` on the JVM (Windows); iOS target only on Mac [HIP] | JUnit (Windows); XCTest (Mac) [HIP] |
| Integration and E2E on a device | **Maestro** (YAML, open and free) [DOC MP96]. **Detox** 20.51.4 [EXEC E4]: on iOS, simulator only, and `applesimutils` only runs on macOS; on Android, emulator or connected device [DOC MP99, MP100]. **Appium** 3.8.0: the XCUITest driver requires a macOS host, with limited support on Windows and Linux [EXEC E4; DOC MP101] | `integration_test` on a device or emulator, and in Firebase Test Lab [DOC MP37]. Patrol 4.10.0 for native interactions [EXEC E7; HIP about scope] | Espresso/Compose UI test, XCUITest, Maestro [HIP] | The same |

Maestro is framework-independent ("Swift, Objective-C, Flutter, React Native, or SwiftUI") [DOC MP98]. The CLI installs on Windows, macOS, and Linux [DOC MP102]. On iOS, it runs in a simulator managed by Xcode. On a physical device, "Executing tests on physical iOS devices is not supported yet" [DOC MP98, MP97].

### 7.2 What runs on Windows

- **Android: everything.** Emulator, USB device, Maestro, Detox Android, Espresso, and `integration_test` [DOC MP102; HIP].
- **iOS: nothing locally.** In the cloud, these options are available:
  - **EAS Workflows** with Maestro in an iOS simulator: macOS medium at US$ 0,075/min; Free includes 60 Workflows min/month [DOC MP29, MP12].
  - **Maestro Cloud:** US$ 250 per device/month, with hosted Android, iOS, and web devices [DOC MP96].
  - **Firebase Test Lab for iOS:** XCTest on a physical device, up to 45 min per test [DOC MP94]. The test package is generated with Xcode [HIP].
  - **AWS Device Farm** (pricing in the table below).

### 7.3 Device farms: dated pricing

| Service | Price or limit | Source |
| --- | --- | --- |
| Firebase Test Lab | **Spark:** 10 runs/day on virtual devices and 5 on physical devices. **Blaze:** 30 min/day on physical devices and 60 min/day on virtual devices at no cost; then US$ 5/h per physical device and US$ 1/h per virtual device, billed per minute | [DOC MP93] |
| AWS Device Farm | US$ 0,17 per device-minute. One-time trial of 1.000 min free (temporary offer; the standard is 250). Unlimited plan starting at US$ 250 per slot/month | [DOC MP95] |
| Maestro Cloud | US$ 250 per device/month | [DOC MP96] |
| BrowserStack and Sauce Labs | Not consulted at this stage | Not applicable |

## 8. OTA updates, distribution, and performance

- **EAS Update (RN + Expo).**
  - Updates JS, styles, and images. Changing native code, permissions, or the SDK requires a new binary [DOC MP24].
  - Free: 1.000 MAU. Starter: 3.000 MAU included, then US$ 0,005 per MAU (range from 3.001 to 200.000) [DOC MP12].
- **Shorebird (Flutter).**
  - Provides Dart code push. On iOS, it uses its own interpreter for physical arm64 devices (does not run in a simulator) and does not change native code [DOC MP45].
  - Free: 5.000 patch installs per month. Pro: 50.000. Business: 1.000.000. Overage: US$ 1 per 2.500 installs [DOC MP46]. The monthly price of paid plans did not appear in the extracted text.
- **KMP and native.** No code OTA, only remote configuration and feature flags [HIP].
- **Store policies.**
  - **Apple (DPLA 3.3.1(B)).** Interpreted code may be downloaded as long as it does not change the app's primary purpose, bypass signing and sandboxing, or create a store [DOC MP73].
  - **Google Play.** Prohibits downloading executable code outside Play, with an exception for code "in a virtual machine or an interpreter" [DOC MP87].
  - **Consequence:** JS or Dart logic fixes can be delivered through OTA. Live Activity, widget, and notification module code, which is native, cannot [DOC MP24, MP45; HIP].
- **Store requirements (all alternatives).** Xcode 26+ [DOC MP62]; target API 36 [DOC MP86].
- **Size and performance.** Nothing was measured at this stage, and no official source comparing frameworks was found.
  - Flutter warns that a debug build does not represent the final size and explains how to measure a release build [DOC MP39].
  - RN 0.84 made Hermes V1 and precompiled iOS binaries the default [DOC MP06].
  - CMP 1.12 improved scrolling on iOS [DOC MP53].
  - The decision needs measurements on a low-end Android device in the PoC [HIP].

## 9. Web: three possible roles

| Role | RN + Expo | Flutter | KMP / CMP | Native |
| --- | --- | --- | --- | --- |
| Public website (SEO, text) | Expo Router with static rendering for SEO [DOC MP26]. Can also be a separate website | Flutter web "is not suitable for static websites with text-rich flow-based content"; the official recommendation is Jaspr or HTML [DOC MP38]. Therefore, a separate website | Compose web in Beta (Wasm) [DOC MP48]. In practice, a separate website [HIP] | Separate website |
| Moderation dashboard | Web-only React DOM components in the Expo project [DOC MP25], or a separate React app. Shares TypeScript types [HIP] | Feasible as an SPA or PWA [DOC MP38] | Stable Kotlin/JS; CMP web in Beta [DOC MP48] | Separate |
| Web app for caregivers | React Native for web, the same component base [DOC MP25]. `expo-sqlite` lists web support, but SQLCipher only covers Android, iOS, and macOS [DOC MP19] | Feasible as an SPA or PWA [DOC MP38] | Beta [DOC MP48] | Separate |

**Interpretation [HIP].** The web should not decide the mobile stack.
- **Public website:** likely to be a separate static website, regardless of the stack.
- **Moderation dashboard:** depends more on the chosen backend (for example, the framework's admin interface) than on the app; see the data and backend document.
- **Web app for caregivers:** open product decision (ADR-001). If included in the MVP, it favors RN + Expo.

## 10. Effort and maintenance for a small team on Windows

| Aspect | RN + Expo | Flutter | KMP + native UI | KMP + CMP | Native |
| --- | --- | --- | --- | --- | --- |
| Languages | TypeScript; small amounts of Kotlin (notification module); optional Swift | Dart; Swift in the Live Activity extension; small amounts of Kotlin | Kotlin + Swift/SwiftUI | Kotlin; Swift in the extension and integration | Swift + Kotlin |
| UI codebases | 1 | 1 | 2 | 1 | 2 |
| Logic codebases (domain, outbox, sync) | 1 | 1 | 1 | 1 | 2 |
| Tools | Node and EAS; Android Studio for Android | Flutter SDK and Android Studio; Xcode on a Mac | Gradle/Android Studio + Xcode on a Mac | Same | Same |
| Breaking-change cadence | RN with 6 releases/year and Expo with 4 SDKs in 2026 [DOC MP01; EXEC E1]; Expo Go follows only the current SDK [DOC MP02] | Quarterly [EXEC E6], with migrations such as the Material separation in 3.47 [DOC MP31] | Kotlin every 6 months and Xcode every year [DOC MP49, MP63] | The same, plus CMP versions (1.12.2 in 15/10/2026) [EXEC E5] | Xcode every year; Android Gradle Plugin and Compose |
| Ecosystem risks already observed | Archived third-party libraries (Notifee, `expo-live-activity`) [EXEC E5]. Preferring official Expo packages reduces the risk [HIP] | Community plugins with a single publisher (e.g., `live_activities`) [DOC MP42]. End of life of `sqlcipher_flutter_libs`, with migration to hooks [DOC MP40, MP41] | Mature platform libraries; Swift export in Alpha [DOC MP51] | Smaller iOS-specific ecosystem [HIP] | Mature |
| Hiring (without figures) | Large JS/TS/React pool [HIP] | More specialized Dart profile [HIP] | Requires iOS and Kotlin [HIP] | Kotlin with some iOS knowledge [HIP] | Two profiles [HIP] |
| Stated learning cost | Daniel's React experience reduces the cost, as a stated criterion rather than a justification [HIP] | Dart is new | Java helps with Kotlin; Swift is new [HIP] | Java helps with Kotlin [HIP] | Swift is new |

## 11. Comparison table

There is no summed score. Each cell says strong, adequate, or weak, with a reason. The rows follow the priorities suggested in the package.

| Criterion (package priority) | RN + Expo | Flutter | KMP + native UI | KMP + CMP | Native |
| --- | --- | --- | --- | --- | --- |
| 1. Offline integrity and persistence | **Adequate:** official `expo-sqlite` with SQLCipher; pre-1.0 ORM | **Strong:** mature drift and encryption through hooks | **Strong:** Room/SQLDelight | **Strong:** same | **Strong:** GRDB/Room |
| 2. Authorization and separation between families | **Neutral:** decided on the server | **Neutral** | **Neutral** | **Neutral** | **Neutral** |
| 3. Quick entry and ongoing activity | **Strong on iOS:** Live Activity without Swift. **Adequate on Android:** Kotlin module | **Adequate:** Swift extension; Android stopwatch ready to use | **Strong:** direct APIs | **Adequate:** SwiftUI extension | **Strong** |
| 4. iOS from Windows | **Strong:** EAS Build/Submit and development build | **Weak:** builds only on macOS; without a Mac, through macOS CI and TestFlight (section 2.1) | **Weak** | **Weak** | **Weak** |
| 5. Effort and maintenance | **Adequate:** 1 codebase, but a fast upgrade pace | **Adequate:** 1 codebase, but requires Dart and a Mac or macOS CI | **Weak:** 2 UIs | **Adequate:** 1 UI, but requires a Mac or macOS CI and has gaps on iOS | **Weak:** 2 complete apps |
| 6. Client operation and cost | **Strong:** EAS from US$ 0 to 19/month [DOC MP12] | **Adequate:** Mac or CI [DOC MP47, MP74] | **Adequate** | **Adequate** | **Adequate** |
| 7. Vendor exit (client) | **Adequate:** EAS is optional, but without it iOS needs a Mac/CI again [DOC MP16; HIP] | **Strong:** Shorebird is optional | **Strong** | **Strong** | **Strong** |
| 8. Web role | **Strong:** static website and React dashboard possible | **Adequate:** apps only (SPA/PWA) | **Neutral:** separate web | **Weak:** Beta | **Neutral:** separate web |
| Accessibility (fixed requirement) | **Strong:** native components [HIP] | **Adequate:** own semantics, to be validated | **Strong** | **Weak/adequate:** documented gaps on iOS | **Strong** |

**How the ranking changes with other priorities** [HIP; Hermes's judgment]:

- **Package priority, Windows-only team, no Mac.** RN + Expo > Flutter > KMP + native UI > KMP + CMP > Native.
- **With a Mac available, prioritizing visual consistency and custom UI.** Flutter ties with RN + Expo. The PoC breaks the tie (section 14): Live Activity, accessibility with a font size of 200%, and performance on a low-end Android device.
- **If the native experience becomes central and someone knows Swift.** This includes Live Activities, widgets, watches, and maximum accessibility. Then KMP + native UI moves ahead. Fully native apps only enter the picture if synchronization logic stays almost entirely on the server.
- **If the team standardizes on Kotlin (for example, a Kotlin/Java backend) and accepts a Mac.** KMP + CMP competes with Flutter, subject to passing Dynamic Type and VoiceOver tests.
- **If the MVP requires a web app for caregivers in the same codebase.** RN + Expo gains strength, Flutter holds its position, and CMP loses ground.

## 12. Shortlist with rationale

**1. React Native + Expo: Hermes's provisional recommendation.**

Why, in terms of the product and maintenance:
- It is the only option where the entire iOS cycle (build, signing, installation of a development build on an iPhone, and TestFlight) runs from Windows in an integrated, documented workflow [DOC MP11, MP14, MP15]. The others reach TestFlight through macOS CI (section 2.1), with a separately assembled pipeline. Clarification from the coordinator after the independent review of 22/10/2026.
- Brings ongoing activity to iOS with an official package, without Swift [DOC MP17, MP18].
- Has persistence with encryption in an official module [DOC MP19].
- Has one UI codebase and one logic codebase.
- Covers the public web, if needed [DOC MP26].
- Has OTA for JS fixes [DOC MP24].

Risks and mitigation:
- Upgrade pace: 4 Expo SDKs in 2026, and RN only maintains the latest 3 minor versions [EXEC E1; DOC MP09]. Mitigation: a fixed upgrade schedule.
- Abandoned third-party libraries [EXEC E5]. Mitigation: prefer official Expo packages and custom Expo Modules.
- `expo-widgets` is recent (since SDK 56) [EXEC E3]. Validate in the PoC before relying on it.
- Native debugging without a Mac is limited [HIP]. Plan for a rented Mac for incidents.

The choice does not imply a TypeScript backend. The client communicates with any API or synchronization layer chosen in the data document.

**2. Flutter: main alternative.**

Why:
- Consistent UI in one codebase.
- Mature persistence (drift) with encryption without a discontinued plugin [DOC MP40].
- Android stopwatch ready to use in the notifications plugin [DOC MP44].
- Predictable quarterly cadence [EXEC E6].
- Code push through Shorebird [DOC MP45].

What it requires:
- macOS for building and signing: a team-owned Mac, remote Mac, or macOS CI (section 13). Full debugging on an iPhone and editing the Live Activity extension in Xcode require a team-owned or remote Mac [DOC MP33, MP34, MP42].
- Swift for the Live Activity [DOC MP42].
- Learning Dart.

The choice does not imply Firebase. `firebase_messaging` is only one push transport option.

**Conditional: KMP + native UI.** Enters the shortlist if the team has or hires iOS expertise, or if platform features become the product's distinguishing feature. Shares domain and synchronization in Kotlin, with official Google support [DOC MP56], but costs two UIs and a Mac [DOC MP50].

**Outside the shortlist for now:**

- **KMP + CMP.** A single UI, but it builds iOS only on macOS, on a team-owned Mac or CI [DOC MP50]. The Live Activity remains in SwiftUI [DOC MP57]. Accessibility on iOS has documented gaps (manual high contrast), and Dynamic Type does not appear in the documentation consulted [DOC MP52]. The web is in Beta [DOC MP48]. Becomes a candidate again if the team is Kotlin-first and a PoC passes VoiceOver and maximum font size tests on iOS.
- **Native Swift + Kotlin.** Offers the highest fidelity, but means two apps, two implementations of the outbox and synchronization, and two UI languages, plus a Mac. For a small team, duplication of offline logic is the greatest risk [HIP]. Becomes a candidate again if there are two specialists, one per platform.

## 13. Windows + iOS: a realistic minimum plan

Prices checked on 22/10/2026, in USD, excluding taxes. US stores and websites; Brazilian pricing was not checked.

### Scenario A: RN + Expo, without a Mac

Workflow:
1. Develop on Windows, with an Android emulator or device.
2. Register the iPhone (`eas device:create`, which generates the UDID in the ad hoc profile) and enable Developer Mode [DOC MP14, MP15].
3. Generate the development build in EAS and install it on the iPhone. JS-only changes arrive through Metro, without a new build. Native changes require a new build [DOC MP13; HIP].
4. For release, run `eas build` and `eas submit` through to TestFlight [DOC MP11].
5. Run iOS E2E in a simulator in EAS Workflows, if needed [DOC MP29].

| Item | Dated cost | Note |
| --- | --- | --- |
| Apple Developer Program | US$ 99/year [DOC MP67] | Required |
| Physical iPhone, if the team does not have one | iPhone 17e starting at US$ 699 [DOC MP75] | SDK 58 supports iOS 16.4+ [DOC MP01]. An older compatible device is enough [HIP] |
| EAS Build | Free: US$ 0 (15 iOS builds/month, low-priority queue, 45 min timeout). Starter: US$ 19/month (US$ 45 in credit; iOS at US$ 2 or 4 per build) [DOC MP12] | Starter provides queue priority and builds of up to 2 h [DOC MP12] |
| EAS Submit and TestFlight | Included [DOC MP12, MP66] | Up to 100 internal testers and 10.000 external testers [DOC MP66] |
| EAS Update | Free up to 1.000 MAU [DOC MP12] | Optional |
| Cloud iOS E2E (optional) | macOS medium at US$ 0,075/min; Free includes 60 min/month [DOC MP12] | Simulator, not a device [DOC MP29] |
| On-demand Mac for diagnosis (optional) | MacinCloud starting at US$ 25/month [DOC MP92], or GitHub Actions macOS at US$ 0,062/min [DOC MP89] | For native incidents |

**Minimum total:** US$ 99/year + US$ 0/month, plus an iPhone if needed.

**Realistic example [HIP]:** 30 iOS builds per month on a medium worker. That is 30 × US$ 2 = US$ 60 in usage. Starter covers US$ 45; US$ 15 remains. Total: US$ 34/month, plus Apple's program.

### Scenario B: Flutter, KMP, or native

| Option | Dated cost | Limitation |
| --- | --- | --- |
| B1. Buy a Mac mini | Starting at US$ 899 [DOC MP74], plus US$ 99/year for Apple [DOC MP67] | The only option with full debugging and an iPhone over USB [DOC MP33] |
| B2. Remote Mac | MacinCloud starting at US$ 25/month [DOC MP92] | Xcode through remote access. Connecting the local iPhone to the remote Mac for debugging was not verified [HIP] |
| B3. CI and TestFlight only | **Codemagic:** 500 M2 min free/month on the individual plan, then US$ 0,095/min [DOC MP47]. **GitHub Actions:** US$ 0,062/min (free for a public repository) [DOC MP89, MP90]. **Xcode Cloud:** 25 h/month included [DOC MP65]. **Bitrise Starter:** starting at US$ 89/month [DOC MP91] | iPhone testing only through TestFlight, without a debugger. The Live Activity extension still requires Xcode to create and edit [DOC MP42] |

**Realistic minimum total:**

- **CI and TestFlight only (B3):** US$ 99/year plus CI (US$ 0 within quotas), without a debugger on the iPhone.
- **With Live Activity, a requirement for this app:** the extension requires Xcode to create and edit [DOC MP42]. In practice, add a Mac (US$ 899 once) or a remote Mac (starting at US$ 25/month), at least for this part.

**Example [HIP]:** 30 iOS builds of 20 min each total 600 min per month. On Codemagic's individual plan, that is 100 min × US$ 0,095 = US$ 9,50. On private GitHub Actions, excluding the free quota, 600 × US$ 0,062 = US$ 37,20. How the GitHub Free quota consumes macOS minutes was not confirmed.

## 14. Suggested proof of concept to break the tie

Not executed. It would be a small slice, built in both finalists, with evidence classified as [EXEC]:

1. **Tummy time timer (Q-08).** Start, quit the app, restart the device, and reopen. Duration must come from persisted timestamps.
2. **Live Activity on the iPhone.** With the timer running: with `expo-widgets`, built from Windows through EAS; with `live_activities`, the extension is created in Xcode and written in Swift, which requires a Mac, even if the build runs in macOS CI. Measure the actual effort and termination at 8 h.
3. **Android 16+.** `ongoing` notification with a stopwatch and promotion to Live Update. Repeat with notification permission denied (Q-10).
4. **SQLite with encryption.** Migration from v1 to v2, plus checking `PRAGMA cipher_version` or `cipher` in the release build.
5. **Accessibility.** VoiceOver and TalkBack at maximum font size on the Hoje and Timer screens.
6. **Measurements.** Cloud iOS build time, release size, cold start, and history scrolling on a low-end Android device.

## Recorded executions [EXEC]

Environment: Windows 11, Node 24.20.0, npm 11.19.0, `curl` in Git Bash, and Python 3.14 only to read JSON. Date: 22/10/2026, between about 03h00 and 03h45 (America/Sao_Paulo). Only public registries were read; nothing was installed.

| ID | Command (summary) | Relevant result |
| --- | --- | --- |
| E1 | `npm view expo version dist-tags --json`; `npm view expo time --json` | latest 58.0.17 (21/10/2026). Tags: sdk-57 57.0.31, sdk-56 56.0.24, sdk-55 55.0.32. First publication: 55.0.0 on 25/02/2026, 56.0.0 on 20/05/2026, 57.0.0 on 30/06/2026, 58.0.0 on 29/09/2026 |
| E2 | `npm view react-native version dist-tags time --json` | latest 0.88.0 (15/10/2026); `next` 0.88.0-rc.6. Dates: 0.87.0 on 11/08/2026, 0.86.0 on 09/06/2026, 0.85.0 on 07/04/2026, 0.84.0 on 11/02/2026, 0.83.0 on 10/12/2025, 0.82.0 on 08/10/2025 |
| E3 | `curl https://unpkg.com/expo@<versão>/bundledNativeModules.json` (55.0.32, 56.0.24, 57.0.31, 58.0.0, 58.0.17) | **SDK 58.0.17:** react-native 0.88.0, react 19.3.0, react-native-web ~0.21.4, expo-sqlite ~58.0.13, expo-notifications ~58.1.6, expo-background-task ~58.0.11, expo-widgets ~58.0.22, @expo/ui ~58.0.22, expo-updates ~58.0.18, expo-dev-client ~58.0.14, expo-router ~58.0.25. **By SDK:** 55 uses RN 0.83.10, 56 uses 0.85.3, 57 uses 0.86.3. `expo-widgets` appears starting with 56 and is not in 55.0.32 |
| E4 | `npm view <pacote> version time.modified` | **SQLite and data:** @op-engineering/op-sqlite 18.2.5 (20/09/2026); @nozbe/watermelondb 0.28.0 (24/07/2025); drizzle-orm 0.45.4; @powersync/react-native 2.3.3 (20/10/2026). **Widgets and notifications:** @notifee/react-native 9.1.8 (20/12/2024); expo-live-activity 0.4.2 (01/06/2026); @bacons/apple-targets 5.0.0 (17/07/2026); react-native-widget-extension 0.3.0 (25/05/2026). **Tools:** eas-cli 25.3.0; detox 20.51.4; appium 3.8.0. **Other:** react-native-mmkv 4.3.2 |
| E5 | `curl https://api.github.com/repos/<repo>[/releases/latest]` | **Archived:** invertase/notifee (archived=true) and software-mansion-labs/expo-live-activity (archived=true). **Active (last push):** Nozbe/WatermelonDB on 16/09/2026; op-engineering/op-sqlite on 29/09/2026; istornz/flutter_live_activities on 11/09/2026. **Releases:** Kotlin v2.4.21 (08/10/2026), compose-multiplatform v1.12.2 (15/10/2026), GRDB.swift v7.11.1 (18/06/2026), Maestro cli-2.11.0 (29/09/2026), Shorebird v1.6.130 (18/10/2026), swiftlang/swift swift-6.4.1-RELEASE (15/10/2026) |
| E6 | `curl https://storage.googleapis.com/flutter_infra_release/releases/releases_windows.json` | **stable:** 3.47.7, with Dart 3.13.5, on 08/10/2026. **beta:** 3.50.0-0.1.pre. **x.0 versions:** 3.38.0 (12/11/2025), 3.41.0 (11/02/2026), 3.44.0 (18/05/2026), 3.47.0 (12/08/2026) |
| E7 | `curl https://pub.dev/api/packages/<pacote>` | **Data:** drift 2.35.2, sqflite 2.4.5, sqlite3 3.7.1, sqlcipher_flutter_libs 0.7.0+eol, powersync 2.5.0, drift_flutter 0.3.1. **Notifications and widgets:** flutter_local_notifications 22.3.2, live_activities 2.6.0, home_widget 0.10.0, firebase_messaging 17.0.0. **Tests and background:** patrol 4.10.0, workmanager 0.10.10 |
| E8 | `curl` of `maven-metadata.xml` on Maven Central and Google Maven | **Kotlin and Compose Multiplatform:** kotlin-stdlib 2.4.21 (pre: 2.5.0-Beta2); compose-gradle-plugin and compose runtime 1.12.2 (pre: 1.13.0-alpha02). **Databases:** sqldelight runtime 2.4.1; sqlcipher-android 4.19.1; room-runtime 2.8.5; androidx.room3 3.0.3 (pre: 3.1.0-alpha03); sqlite-bundled 2.7.1. **Android:** compose-bom 2026.09.00; work-runtime 2.12.0 |

## Fontes

Generated from this research's source register; includes only sources cited in the text. All were accessed on 22/10/2026.

| Code | Source | URL | Accessed |
| --- | --- | --- | --- |
| MP01 | Expo SDK reference — SDK/RN versions and Android/iOS/Xcode requirements | https://docs.expo.dev/versions/latest/ | 22/10/2026 |
| MP02 | Expo changelog — Expo SDK 58 | https://expo.dev/changelog/sdk-58 | 22/10/2026 |
| MP03 | Expo Go — official page | https://expo.dev/go | 22/10/2026 |
| MP04 | Expo changelog — Mandatory login in Expo Go | https://expo.dev/changelog/expo-go-57-login | 22/10/2026 |
| MP05 | React Native 0.82 — New Architecture only | https://reactnative.dev/blog/2025/10/08/react-native-0.82 | 22/10/2026 |
| MP06 | React Native blog — release index 0.80–0.88 | https://reactnative.dev/blog | 22/10/2026 |
| MP07 | React Native 0.86 — React Foundation | https://reactnative.dev/blog/2026/06/11/react-native-0.86 | 22/10/2026 |
| MP08 | React Native 0.88 | https://reactnative.dev/blog/2026/10/19/react-native-0.88 | 22/10/2026 |
| MP09 | React Native — Releases overview (schedule and support) | https://reactnative.dev/releases/overview | 22/10/2026 |
| MP10 | React Native — Docs versions | https://reactnative.dev/versions | 22/10/2026 |
| MP11 | Expo FAQ — Windows, iOS, and store policies | https://docs.expo.dev/faq/ | 22/10/2026 |
| MP12 | Expo Application Services pricing (text) | https://expo.dev/pricing.md | 22/10/2026 |
| MP13 | Expo — Introduction to development builds | https://docs.expo.dev/develop/development-builds/introduction/ | 22/10/2026 |
| MP14 | Expo — Internal distribution | https://docs.expo.dev/build/internal-distribution/ | 22/10/2026 |
| MP15 | Expo — Cloud build for iOS device | https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/ | 22/10/2026 |
| MP16 | Expo — Run EAS Build locally | https://docs.expo.dev/build-reference/local-builds/ | 22/10/2026 |
| MP17 | Expo Widgets (expo-widgets) | https://docs.expo.dev/versions/latest/sdk/widgets/ | 22/10/2026 |
| MP18 | Expo UI SwiftUI Text (date/timerInterval) | https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/text/ | 22/10/2026 |
| MP19 | Expo SQLite (expo-sqlite) | https://docs.expo.dev/versions/latest/sdk/sqlite/ | 22/10/2026 |
| MP20 | Expo Notifications (expo-notifications) | https://docs.expo.dev/versions/latest/sdk/notifications/ | 22/10/2026 |
| MP21 | Expo Push Service — sending and limits | https://docs.expo.dev/push-notifications/sending-notifications/ | 22/10/2026 |
| MP22 | Expo BackgroundTask | https://docs.expo.dev/versions/latest/sdk/background-task/ | 22/10/2026 |
| MP23 | Expo Modules API — overview | https://docs.expo.dev/modules/overview/ | 22/10/2026 |
| MP24 | EAS Update — introduction | https://docs.expo.dev/eas-update/introduction/ | 22/10/2026 |
| MP25 | Expo — Develop websites | https://docs.expo.dev/workflow/web/ | 22/10/2026 |
| MP26 | Expo Router — Static rendering | https://docs.expo.dev/router/web/static-rendering/ | 22/10/2026 |
| MP27 | React Native — Accessibility | https://reactnative.dev/docs/accessibility | 22/10/2026 |
| MP28 | React Native — Text (allowFontScaling) | https://reactnative.dev/docs/text | 22/10/2026 |
| MP29 | EAS Workflows — E2E with Maestro | https://docs.expo.dev/eas/workflows/examples/e2e-tests/ | 22/10/2026 |
| MP30 | Flutter release notes | https://docs.flutter.dev/release/release-notes | 22/10/2026 |
| MP31 | What's new in Flutter 3.47 | https://flutter.dev/blog/whats-new-in-flutter-3-47 | 22/10/2026 |
| MP32 | Get the Dart SDK | https://dart.dev/get-dart | 22/10/2026 |
| MP33 | Flutter — Set up iOS development | https://docs.flutter.dev/platform-integration/ios/setup | 22/10/2026 |
| MP34 | Flutter — Build and release an iOS app | https://docs.flutter.dev/deployment/ios | 22/10/2026 |
| MP35 | Flutter — Accessibility | https://docs.flutter.dev/ui/accessibility | 22/10/2026 |
| MP36 | Flutter — Accessibility: UI design & styling | https://docs.flutter.dev/ui/accessibility/ui-design-and-styling | 22/10/2026 |
| MP37 | Flutter — Integration tests | https://docs.flutter.dev/testing/integration-tests | 22/10/2026 |
| MP38 | Flutter — Web FAQ | https://docs.flutter.dev/platform-integration/web/faq | 22/10/2026 |
| MP39 | Flutter — Measuring app size | https://docs.flutter.dev/perf/app-size | 22/10/2026 |
| MP40 | drift — Encryption | https://drift.simonbinder.eu/platforms/encryption/ | 22/10/2026 |
| MP41 | pub.dev — sqlcipher_flutter_libs | https://pub.dev/packages/sqlcipher_flutter_libs | 22/10/2026 |
| MP42 | pub.dev — live_activities | https://pub.dev/packages/live_activities | 22/10/2026 |
| MP43 | pub.dev — flutter_local_notifications | https://pub.dev/packages/flutter_local_notifications | 22/10/2026 |
| MP44 | flutter_local_notifications — AndroidNotificationDetails | https://pub.dev/documentation/flutter_local_notifications/latest/flutter_local_notifications/AndroidNotificationDetails-class.html | 22/10/2026 |
| MP45 | Shorebird — FAQ | https://docs.shorebird.dev/faq/ | 22/10/2026 |
| MP46 | Shorebird — Pricing | https://shorebird.dev/pricing | 22/10/2026 |
| MP47 | Codemagic — Pricing | https://codemagic.io/pricing/ | 22/10/2026 |
| MP48 | Kotlin Multiplatform — Stability of supported platforms | https://kotlinlang.org/docs/multiplatform/supported-platforms.html | 22/10/2026 |
| MP49 | Kotlin release process | https://kotlinlang.org/docs/releases.html | 22/10/2026 |
| MP50 | Kotlin Multiplatform quickstart | https://kotlinlang.org/docs/multiplatform/quickstart.html | 22/10/2026 |
| MP51 | Kotlin — Swift export | https://kotlinlang.org/docs/native-swift-export.html | 22/10/2026 |
| MP52 | Compose Multiplatform — iOS accessibility | https://kotlinlang.org/docs/multiplatform/compose-ios-accessibility.html | 22/10/2026 |
| MP53 | What's new in Compose Multiplatform 1.12.2 | https://kotlinlang.org/docs/multiplatform/whats-new-compose-112.html | 22/10/2026 |
| MP54 | Room for KMP | https://developer.android.com/kotlin/multiplatform/room | 22/10/2026 |
| MP55 | SQLDelight — Multiplatform SQLite | https://sqldelight.github.io/sqldelight/latest/multiplatform_sqlite/ | 22/10/2026 |
| MP56 | Android Developers — Kotlin Multiplatform | https://developer.android.com/kotlin/multiplatform | 22/10/2026 |
| MP57 | ActivityKit — Displaying live data with Live Activities | https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities | 22/10/2026 |
| MP58 | ActivityKit — push notifications | https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications | 22/10/2026 |
| MP59 | SwiftUI Text(timerInterval:) | https://developer.apple.com/documentation/swiftui/text/init(timerinterval:pausetime:countsdown:showshours:) | 22/10/2026 |
| MP60 | BGTaskScheduler | https://developer.apple.com/documentation/backgroundtasks/bgtaskscheduler | 22/10/2026 |
| MP61 | BGContinuedProcessingTask | https://developer.apple.com/documentation/backgroundtasks/bgcontinuedprocessingtask | 22/10/2026 |
| MP62 | Apple — Upcoming requirements | https://developer.apple.com/news/upcoming-requirements/ | 22/10/2026 |
| MP63 | Xcode on the Mac App Store — version history | https://apps.apple.com/us/app/xcode/id497799835?mt=12 | 22/10/2026 |
| MP64 | Swift.org blog | https://www.swift.org/blog/ | 22/10/2026 |
| MP65 | Xcode Cloud | https://developer.apple.com/xcode-cloud/ | 22/10/2026 |
| MP66 | TestFlight | https://developer.apple.com/testflight/ | 22/10/2026 |
| MP67 | Apple Developer Program — enroll | https://developer.apple.com/programs/enroll/ | 22/10/2026 |
| MP68 | Enabling Developer Mode on a device | https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device | 22/10/2026 |
| MP69 | HIG — Accessibility | https://developer.apple.com/design/human-interface-guidelines/accessibility | 22/10/2026 |
| MP70 | SwiftData | https://developer.apple.com/documentation/swiftdata | 22/10/2026 |
| MP71 | GRDB.swift | https://github.com/groue/GRDB.swift | 22/10/2026 |
| MP72 | Asking permission to use notifications | https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications | 22/10/2026 |
| MP73 | Apple Developer Program License Agreement | https://developer.apple.com/support/terms/apple-developer-program-license-agreement/ | 22/10/2026 |
| MP74 | Apple Store (US) — Mac mini | https://www.apple.com/shop/buy-mac/mac-mini | 22/10/2026 |
| MP75 | Apple Store (US) — iPhone | https://www.apple.com/shop/buy-iphone | 22/10/2026 |
| MP76 | Android — Live Update notifications | https://developer.android.com/develop/ui/views/notifications/live-update | 22/10/2026 |
| MP77 | NotificationCompat.Builder | https://developer.android.com/reference/androidx/core/app/NotificationCompat.Builder | 22/10/2026 |
| MP78 | Android 16 — Features and APIs | https://developer.android.com/about/versions/16/features | 22/10/2026 |
| MP79 | Android 17 | https://developer.android.com/about/versions/17 | 22/10/2026 |
| MP80 | WorkManager — Define work requests | https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work | 22/10/2026 |
| MP81 | Foreground service types | https://developer.android.com/develop/background-work/services/fgs/service-types | 22/10/2026 |
| MP82 | Notification runtime permission | https://developer.android.com/develop/ui/views/notifications/notification-permission | 22/10/2026 |
| MP83 | Schedule alarms | https://developer.android.com/develop/background-work/services/alarms/schedule | 22/10/2026 |
| MP84 | Accessibility in Jetpack Compose | https://developer.android.com/develop/ui/compose/accessibility | 22/10/2026 |
| MP85 | Compose accessibility — API defaults | https://developer.android.com/develop/ui/compose/accessibility/api-defaults | 22/10/2026 |
| MP86 | Google Play — Target API level requirements | https://support.google.com/googleplay/android-developer/answer/11926878 | 22/10/2026 |
| MP87 | Google Play — Device and Network Abuse | https://support.google.com/googleplay/android-developer/answer/9888379 | 22/10/2026 |
| MP88 | SQLCipher for Android | https://www.zetetic.net/sqlcipher/sqlcipher-for-android/ | 22/10/2026 |
| MP89 | GitHub Actions runner pricing | https://docs.github.com/en/billing/reference/actions-runner-pricing | 22/10/2026 |
| MP90 | GitHub Actions billing | https://docs.github.com/en/billing/concepts/product-billing/github-actions | 22/10/2026 |
| MP91 | Bitrise pricing | https://bitrise.io/pricing | 22/10/2026 |
| MP92 | MacinCloud pricing | https://www.macincloud.com/pricing | 22/10/2026 |
| MP93 | Firebase Test Lab — quotas and pricing | https://firebase.google.com/docs/test-lab/usage-quotas-pricing | 22/10/2026 |
| MP94 | Firebase Test Lab for iOS | https://firebase.google.com/docs/test-lab/ios/get-started | 22/10/2026 |
| MP95 | AWS Device Farm pricing | https://aws.amazon.com/device-farm/pricing/ | 22/10/2026 |
| MP96 | Maestro pricing | https://maestro.dev/pricing | 22/10/2026 |
| MP97 | Maestro — iOS UIKit (limitations) | https://docs.maestro.dev/get-started/supported-platform/ios/uikit | 22/10/2026 |
| MP98 | Maestro — iOS | https://docs.maestro.dev/get-started/supported-platform/ios | 22/10/2026 |
| MP99 | Detox — Environment setup | https://wix.github.io/Detox/docs/introduction/environment-setup | 22/10/2026 |
| MP100 | Detox — Devices | https://wix.github.io/Detox/docs/config/devices/ | 22/10/2026 |
| MP101 | Appium XCUITest driver — requirements | https://appium.github.io/appium-xcuitest-driver/latest/getting-started/system-requirements/ | 22/10/2026 |
| MP102 | Maestro — How to install Maestro CLI | https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli | 22/10/2026 |
| MP103 | Expo changelog (index) | https://expo.dev/changelog | 22/10/2026 |

## Factors that would change the choice

- **The team gets a Mac** (or agrees to spend about US$ 899). Flutter ties with RN + Expo, and the PoC decides.
- **`expo-widgets` does not meet the needs in the PoC** (isolated runtime, timer, push). RN's iOS advantage drops to "requires Swift", as with Flutter. RN stays ahead only because it can build from Windows.
- **Accessibility.** If RN or Flutter fails with a font size of 200% or with VoiceOver on entry screens, native UI (KMP) moves up.
- **Someone with Swift/iOS joins** the team. KMP + native UI becomes a real candidate.
- **A Kotlin/Java backend** and the desire to share validation and models with the server. KMP gains weight, as a stated benefit rather than a convenience.
- **Web app for caregivers in the MVP.** Strengthens RN + Expo.
- **A change in EAS pricing or terms**, or discontinuation of a core Expo module. Without EAS, iOS needs a Mac or macOS CI again, and RN's cost approaches Flutter's.
- **Measured performance on a low-end Android device** outside acceptable limits in one of the options.
- **Changes in store rules** on interpreted code and OTA, or on Live Activities and Live Updates.

## Open questions

1. Is Daniel willing to buy or rent a Mac? This changes the ranking between RN + Expo and Flutter.
2. Is a physical iPhone available for testing? Which model and which iOS version?
3. What is the web's role in the MVP: public website, moderation dashboard, caregiver app (ADR-001)?
4. Are Live Activity and Live Update included in the MVP or a later phase? This also applies to "sessão iniciada por outro cuidador", which requires server push.
5. Is application-level encryption (SQLCipher) required, or is system file protection enough? Depends on the [privacy and stores document](../Pesquisa_Privacidade_Legal_e_Lojas.md).
6. Is using Expo Push Service as an intermediary acceptable, or will push go directly to FCM/APNs?
7. Will the repository remain public? This changes the cost of macOS CI on GitHub.
8. What upgrade policy (SDK, Flutter, Xcode) can the team sustain, and who handles it?
9. Is debugging native incidents without a team-owned Mac acceptable at launch?
10. Sleep sessions longer than 8 h: what should be shown after the system ends the Live Activity?

## Limits of this analysis

- No app, PoC, or benchmark was built. Size, performance, accessibility, and effort were not measured.
- **Pricing:** in USD, from US websites, excluding taxes and currency conversion. Brazil was not checked, and plans change without notice.
- **Automatic extraction:** dynamic pages may have omitted content. The monthly price of Shorebird's paid plans and the rule for macOS minute consumption on GitHub Free were left out. BrowserStack and Sauce Labs were not consulted.
- **Absence of mention does not prove absence.** Applies to Dynamic Type in CMP, SQLCipher in op-sqlite, Live Updates in `flutter_local_notifications`, and a stopwatch in `expo-notifications`.
- **Third-party library maintenance:** assessed through publication, push, and archive dates, not code quality.
- **Versions change quickly.** Expo Go for SDK 58 was not yet in stores, and the RN documentation showed 0.87 as "latest" with 0.88 already on npm.
- **There was no legal assessment** of store policies. The cited excerpts come from public documentation.
- **Outside the requested scope:** .NET MAUI, Ionic/Capacitor, NativeScript, and similar options were not evaluated.
