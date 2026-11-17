---
tipo: repository-profile
status: draft
responsavel: Hermes (Baby Buddy subagent)
revisado_em: 2026-10-22
repositorio: https://github.com/babybuddy/babybuddy
branch: master
commit: 09629cf633cf3a2059a21ade4cea7ea4d846422f
licenca_raiz: BSD-2-Clause
fontes_principais:
  - https://github.com/babybuddy/babybuddy/tree/09629cf633cf3a2059a21ade4cea7ea4d846422f
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/LICENSE
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/permissions.py
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/views.py
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/static_src/js/timer.js
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/user-guide/managing-users.md
  - ../../09_Evidencias/Execucao_Referencias/Baby_Buddy/README.md
---

# Baby Buddy

Reference repository profile for APP-001. The labels follow the [Vault conventions](../../00_Inicio/Convencoes.md):

- **[EXEC]**: observed in the local run on 22/10/2026 (Windows 11, Python 3.12.10, SQLite, fictional data).
- **[CÓDIGO]**: confirmed at commit `09629cf`, with a permalink and line numbers.
- **[DOC]**: stated in the repository's own README or documentation.
- **[HIP]**: hypothesis.

The raw evidence is in [09_Evidencias/Execucao_Referencias/Baby_Buddy](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/README.md). Codes B, C and D refer to the functional steps in log 03. "Log 04" through "log 08" refer to the files with the same numbers in the folder. Log 03, log 06 and script `api_tests.sh` also record access tests from the first round. For this reason, they remain outside Git until decision D7 ([Decisions for Daniel](../../07_Roadmap/Decisoes_para_Daniel.md)), and this profile describes authorization solely through code review (coordinator review, 22/10/2026 at around 05:35).

No Baby Buddy code was copied into AppMaternidade.

## Resumo

- Baby Buddy is a Django web application designed for one installation per household. There is no family entity: every child and every record are visible to any user with permission for that record type. This is consistent with the documentation's warning that a caregiver has access to all children in the instance [DOC], but it does not work for a product with multiple families [CÓDIGO].
- Permissions apply by record type, never by object, child or family. The "default" profile is created as a superuser [CÓDIGO].
- Records do not store an author, creation or modification date, or version. An edit made by another caregiver leaves no trace [CÓDIGO][DOC][EXEC D-01/D-02].
- The timer has a good underlying idea: its state stays on the server, and its duration is calculated from the start time. The problems:
  - stopping a timer means deleting it;
  - there is no end, pause or record of who stopped it;
  - code review shows that the ownership check covers converting the timer and changing its owner, but not changing its start time or restarting it. Such a change would erase the elapsed time without leaving a trace [CÓDIGO]. An audit question, not a demonstrated vulnerability.
- The domain validations are good rules to reuse as ideas: nothing in the future, start before end, at most 24 h calculated in UTC, and no overlap for the same child and type [CÓDIGO][EXEC C-01 through C-08]. In AppMaternidade, which works offline, only "end before start" is rejected; the others become warnings ([Offline, section 8](../../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)). Idempotency is missing: resubmitting a diaper change creates a second record [EXEC C-10/C-11].
- Time zone: the database stores everything in UTC. The user's time zone is applied only to session access. With a token, the API returns dates in UTC and decides whether sleep was a nap using UTC time [EXEC C-09, log 04].
- There is no offline mode (the project has no service worker) [CÓDIGO]. Revocation, through expiration or account deactivation, is checked on every request [CÓDIGO].
- 528 tests and 1 additional isolated test passed locally [EXEC log 05]. The BSD-2-Clause license allows reuse with a notice; the recommendation is to use only the concepts.

## Identificação

| Item | Value | Class |
| --- | --- | --- |
| URL | https://github.com/babybuddy/babybuddy | — |
| Branch | `master` | [EXEC] `git rev-parse --abbrev-ref HEAD` ([log 01](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/01_setup.log)) |
| SHA | `09629cf633cf3a2059a21ade4cea7ea4d846422f` | [EXEC] `git rev-parse HEAD` |
| Commit date | 2026-10-12 11:42:30 -0700 ("fix(dashboard): apply the hide-data-age setting to the notes card") | [EXEC] `git log -1` |
| Comparison with the package snapshot | Same SHA as `03_REPOSITORIOS_REFERENCIA.md` in the task package (`tasks/hermes/APP-001-design-docs/`, outside the vault); no new commits in `master` up to the clone on 22/10/2026 02:56 | [EXEC] |
| History size | 2013 commits in `master` | [EXEC] `git log --oneline` |
| Root license | BSD-2-Clause, "Copyright (c) 2017 - 2022, Baby Buddy's Contributors" | [CÓDIGO] [LICENSE L1-L25](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/LICENSE#L1-L25) |
| Local clone | `C:/Projetos/AppMaternidade/_referencias/babybuddy` (outside the product's Git repository) | [EXEC] |
| Review date | 22/10/2026, America/Sao_Paulo | — |

## Confirmed stack

| Layer | Component | Version | Class and source |
| --- | --- | --- | --- |
| Language | Python | CI tests 3.10 through 3.14; `runtime.txt` requires 3.11.9; run performed with 3.12.10 | [CÓDIGO] [ci.yml L13-L14](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/.github/workflows/ci.yml#L13-L14); [EXEC] log 01 |
| Web | Django, with server-rendered templates | 5.2.17 | [CÓDIGO] [requirements.txt](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/requirements.txt); [EXEC] `pip freeze` |
| API | Django REST Framework and django-filter | 3.18.1 and 25.2 | same as above |
| Database | SQLite by default; PostgreSQL and others through `DATABASE_URL`/`DB_*` | psycopg2-binary 2.9.13 | [CÓDIGO] [base.py L114-L133](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L114-L133) |
| Authentication | Session and DRF token (one fixed token per user); django-axes blocks after 5 failures, for 1 h | axes 7.1.0 | [CÓDIGO] [base.py L346-L362](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L346-L362), [L376-L386](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L376-L386) |
| Configuration in the database | django-dbsettings (nap time range, among others) | 1.4.0 | [CÓDIGO] [site_settings.py L22-L38](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/site_settings.py#L22-L38) |
| Import/export | django-import-export, within the admin | 4.4.1 | [CÓDIGO] [core/admin.py L5-L21](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/admin.py#L5-L21) |
| Charts | Plotly (Python) and plotly.js | 6.9.0 and ^4.1.0 | [CÓDIGO] requirements.txt, [package.json](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/package.json) |
| Front-end | Bootstrap 5.3, jQuery 3.7, Popper, Masonry and pulltorefreshjs; build with gulp (Node 24); compiled bundles are versioned in `static/` | — | [CÓDIGO] package.json, [gulpfile.config.js L27-L71](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/gulpfile.config.js#L27-L71) |
| Files | FileSystemStorage or S3 (django-storages and boto3) | 1.14.6 and 1.43.97 | [CÓDIGO] [base.py L236-L277](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L236-L277) |
| Integrations | Signed webhooks with an outgoing queue in the database (outbox). The MCP server and mobile apps are in other repositories | — | [CÓDIGO] `webhooks/`; [DOC] [README L54-L78](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/README.md#L54-L78) |

## Flows analyzed

1. Period recording (sleep and tummy time) through the API, with validations and time zone: [EXEC] C-01 through C-09 and log 04; [CÓDIGO].
2. Timer: start, view as another user, modify, restart, convert to a record and convert in parallel: [EXEC] B-01 through B-17; [CÓDIGO] model, serializer and `timer.js`.
3. Multiple users: default, caregiver (`caregiver`) and read-only profiles, with an "other family" in the same installation: [EXEC] A-01 through A-10 and D-01 through D-03.
4. Revocation: access expiration and account deactivation, using the same token: [EXEC] F-01 through F-08.
5. Attachment (an image in a note) and access to the file URL without credentials: [EXEC] E-01 through E-03.
6. History, timeline, dashboard and reports: [CÓDIGO] (without opening in a browser).
7. Export/import and webhooks: [CÓDIGO][DOC] (not executed).

## Findings by topic

### Domain model

- **No family, owner or membership.** `Child` has a name, date and time of birth, due date, slug and photo; there is no foreign key to a user or group [CODE [core/models.py L197-L266](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L197-L266)]. The slug is unique across the entire installation [CODE [L215-L222](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L215-L222)]. When registering a second child named "Ana Exemplo", the API returned HTTP 500 `UNIQUE constraint failed: core_child.slug` [EXEC log 08].
- **Record types**:
  - diaper changes, temperature and medication are instantaneous; medication has an interval until the next dose;
  - feeding, sleep, tummy time and pumping have a start, end and duration;
  - weight, height, head circumference and BMI are recorded by date;
  - notes accept an optional image;
  - any record can receive tags.

  [CODE [L269-L887](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L269-L887)]
- **No authorship or history.** No record model has a user, `created_at`, `updated_at`, version or soft deletion. The only model linked to a user is `Timer` [CODE [L643-L665](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L643-L665)]. The documentation confirms: "Baby Buddy does not record which user created an entry" [DOC [managing-users.md L71-L76](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/user-guide/managing-users.md#L71-L76)]. cuidadora_b edited the sleep record created by resp_a, and the response contains neither an author nor a modification date [EXEC D-01/D-02].
- **Timer.** Stores the start time, user, name and, optionally, the child. The `active` field is not actually used, and `stop()` deletes the row [CODE [L643-L718](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L643-L718)].
- **Tummy time.** It is a period with `milestone` (free text) and notes. There is no activity catalog, age range or educational content [CODE [L721-L767](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L721-L767)].
- **Calculated nap classification.** When the `Sleep.nap` field is not submitted, the system marks sleep that starts between 06:00 and 18:00 local time as a nap (configurable range) [CODE [L593-L602](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L593-L602)].
- **Growth percentiles.** Loaded from CSV files during migrations, with no source declared in the repository [CODE `core/migrations/*_percentile_*.csv`]. The L, M and S columns suggest WHO tables [HIP].

### Validations

- **Nothing in the future.** `validate_time` rejects records with a future time according to the server clock, with no tolerance [CODE [L89-L99](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L89-L99)]. The API returned 400 "Date/time can not be in the future." [EXEC C-05]. If the device clock is ahead, a record made "now" would be rejected [HIP].
- **Start, end and duration.** `validate_duration` requires the start to precede the end and a duration of up to 24 h. The calculation is performed in UTC, which avoids errors during daylight saving time changes [CODE [L35-L51](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L35-L51); [core/utils.py L72-L79](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/utils.py#L72-L79)] [EXEC C-06, C-07].
- **Overlap.** `validate_unique_period` rejects a period that overlaps another of the same type for the same child [CODE [L58-L86](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L58-L86)]. During execution, the overlapping period was rejected (C-03), and the same period was accepted for different children (C-04 and C-04b). The rule exists only in the application; the database does not enforce it [CÓDIGO]. The error message includes HTML (`<a href=...>`) marked as safe, which also appears in the API's JSON response [EXEC C-02].
- **Dates before birth** are accepted. Sleep on 15/10 was saved for a child born on 17/10 [EXEC C-04].
- **Same rules on the web and in the API.** The serializer builds the instance and calls `clean()`, including for partial PATCH requests [CODE [api/serializers.py L29-L39](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py#L29-L39)]. This is a good pattern: a single rule applies to all channels.
- **No idempotency.** The client does not send an operation identifier, and IDs are sequential integers created by the server [CODE [base.py L397](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L397)]. Resubmitting the same diaper change created two records, 110 and 111 [EXEC C-10 through C-12]. Resubmitting the same sleep returned 400 due to overlap instead of the existing record [EXEC C-02].

### Authorization and isolation

- **Permission by record type, not by object.** `BabyBuddyDjangoModelPermissions` maps each HTTP method to a model permission: GET → view, POST → add, PATCH → change, DELETE → delete and OPTIONS → add. PUT is excluded [CODE [api/permissions.py L5-L14](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/permissions.py#L5-L14)]. All record viewsets start from `objects.all()`, without filtering by user [CODE [api/views.py L18-L167](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/views.py#L18-L167)]. The `child` field accepts any registered child [CODE [serializers.py L27](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py#L27), [L47-L52](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py#L47-L52)].
- **Profiles.**
  - Default: the creation command and form save the user as `is_superuser=True` [CODE [createuser.py L145-L157](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/management/commands/createuser.py#L145-L157); [babybuddy/forms.py L87-L90](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/forms.py#L87-L90)]. Saving a user with neither "caregiver" nor "read only" checked makes the account a superuser [DOC [managing-users.md L78-L83](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/user-guide/managing-users.md#L78-L83)].
  - Caregiver (`caregiver`): can view, create and modify care records. Cannot delete, cannot access pumping or growth measurements, and cannot administer anything [CODE [core/apps.py L6-L40](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/apps.py#L6-L40), [L80-L87](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/apps.py#L80-L87)].
  - Read-only (`read_only`): can view all types [CODE [L71-L77](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/apps.py#L71-L77)].
  - Permissions can only be added, never removed from an individual user [DOC [L44-L58](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/user-guide/managing-users.md#L44-L58)].
- **Consequence of the design.** Any account with permission for a record type can access that type for all children in the installation [CÓDIGO]. The access test results from the first round remain outside Git (D7).
- **Attachments.** With DEBUG enabled, Django itself serves `/media/` without checking permission [CODE [babybuddy/urls.py L60-L61](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/urls.py#L60-L61)]. In production, behavior depends on the configured web server [HIP]. An audit question, not a demonstrated vulnerability: how are attachments protected in an internet-facing installation?
- **Credentials.**
  - Each user has a single fixed DRF token, stored as text as the primary key [CODE [babybuddy/models.py L145-L153](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/models.py#L145-L153); `rest_framework/authtoken/models.py` L12 of DRF 3.18.1 installed in the venv].
  - The "Add a device" screen places this token in a login QR code [DOC [login-qr-code.md L16-L29](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/login-qr-code.md#L16-L29)].
  - `migrate` creates user `admin`, with password `admin`, when no superuser exists [CODE [migrate.py L9-L19](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/management/commands/migrate.py#L9-L19)].
- **Revocation.** The expiration date (`access_expires`) and account deactivation (`is_active`) are checked on every request, with token authentication [CODE [api/authentication.py L7-L16](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/authentication.py#L7-L16)] and session authentication [CODE [middleware.py L242-L261](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/middleware.py#L242-L261)].

  The `/api/caregivers/` route only accesses caregiver accounts [CODE [api/views.py L229-L238](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/views.py#L229-L238)].
- **What changes in a product with multiple independent families.** It would be necessary to:
  - create the family entity and each user's membership, with a role per family;
  - make every query start from the user's active membership;
  - check on every write that the child belongs to the family;
  - check permission by object;
  - enforce uniqueness within the family, rather than the installation;
  - serve files through short-lived signed URLs;
  - separate webhooks and notifications by family;
  - test that one family cannot access another's data.

  Details are in "Required adaptations", below.

### Timers

- **State stays on the server and duration is calculated.** The timer stores only the start time; the server calculates duration as "now − start" [CODE [core/models.py L694-L695](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L694-L695)]. This is why the timer survives closing the browser and everyone sees it [CÓDIGO]. The menu and dashboard show all timers in the installation [CODE [core/templatetags/timers.py L10-L27](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/templatetags/timers.py#L10-L27); [dashboard/templatetags/cards.py L819-L840](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/dashboard/templatetags/cards.py#L819-L840)].
- **On-screen counter.** `timer.js` adds one second at a time using `setInterval(…, 1000)`. When the window receives the `focus` event, it queries `GET /api/timers/<id>/` and corrects the display [CODE [timer.js L17-L54](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/static_src/js/timer.js#L17-L54), [L80-L97](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/static_src/js/timer.js#L80-L97)]. The script does not listen for `visibilitychange`, and the `new Date() - lastUpdate > 1` limit is 1 ms. Still, the principle is correct for Q-08: the displayed value comes from the server, not from a counter that must keep running.
- **Conversion to a record.** When a feeding, sleep, tummy time or pumping POST sends the `timer` field, the server uses the timer's start time and its own clock as the end, ignoring the submitted values. The timer is deleted in the same transaction, with `select_for_update` [CODE [api/serializers.py L75-L126](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py#L75-L126)]. During execution, a tummy time session lasting 4,9 s was created, and the timer then returned 404 [EXEC B-09/B-10].
- **Timer owner.** Converting the timer to a record (which deletes it) or changing its owner requires being the owner or having the `delete_timer` permission [CODE [core/models.py L706-L711](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L706-L711); [serializers.py L303-L339](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py#L303-L339)]. Code review shows that this check does not cover changing the start time or restarting: `change_timer` permission is enough for both actions, and the web "restart" button does the same [CODE [core/views.py L580-L591](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/views.py#L580-L591)]. Since the record does not store authorship, the change would leave no trace. An audit question, not a demonstrated vulnerability.
- **Q-03 in practice.** If A starts the timer and B, a caregiver, wants to stop it, B cannot do so without `delete_timer`. If B has that permission, the created record does not store who started or stopped it [CÓDIGO][DOC [L60-L64](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/user-guide/managing-users.md#L60-L64)].
- **Concurrency.** Six simultaneous conversions of the same timer resulted in:
  - 1 record created;
  - 1 rejection due to overlap;
  - 4 rejections because the timer no longer existed;
  - no duplicates.

  [EXEC B-13/B-14] In the exploratory round, the same race produced an HTTP 500 `database is locked` from SQLite [EXEC [log 03b](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/03b_corrida_rodada_exploratoria.log)]. In SQLite, `select_for_update` has no effect. Protection came from deleting the timer and validating overlap, and neither is a database constraint [CÓDIGO]. Behavior in PostgreSQL was not tested [HIP].
- **API defect.** The timer filter declares `end*` fields, and ordering accepts `end` and `duration`, fields that do not exist in the model. Queries `?end_min=` and `?ordering=end` return HTTP 500 FieldError [EXEC B-16/B-17; CODE [api/filters.py L105-L108](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/filters.py#L105-L108), [api/views.py L140-L145](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/views.py#L140-L145)].

### Persistence and offline

- **No offline mode.** The web application is rendered on the server, and each record is sent immediately in a POST. There is no service worker or data cache: a search for `serviceWorker` and `sw.js` in the repository found nothing. [site.webmanifest](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/static_src/root/site.webmanifest#L1-L47) only defines installation and shortcuts to start a timer and record a diaper change, feeding, pumping, sleep and tummy time [CÓDIGO].
- **Q-01 and Q-02 remain unanswered.** There is no local queue, operation identifier or "pending" state. The companion mobile apps are in other repositories and were not analyzed [DOC [README L75-L78](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/README.md#L75-L78)].
- **Only the timer persists.** It is the only ongoing activity that survives closing the app, because it is stored on the server [CÓDIGO].

### Recording and history UI

- **Quick recording.**
  - The timer is started with a single POST from the menu and is already linked to the child when there is only one [CODE [core/views.py L559-L577](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/views.py#L559-L577)].
  - Forms come prefilled: the child, when there is only one; the type and method of the last feeding (except the breast side); and nap status, based on the time [CODE [core/forms.py L37-L84](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/forms.py#L37-L84)].
  - The manifest provides action shortcuts [CÓDIGO].
- **Dashboard.** There are cards by record type: last record, recent records, total tummy time for the day, naps for the day and statistics [CODE [cards.py L41-L919](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/dashboard/templatetags/cards.py#L41-L919)].
- **Daily timeline.** Shows "começou" and "terminou" events. Sleep that crosses midnight appears as a start on one day and an end on the other. When two events have the same time, "terminou" comes before "começou". Types the user cannot view are omitted [CODE [core/timeline.py L22-L65](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/timeline.py#L22-L65), [L112-L149](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/timeline.py#L112-L149)].
- **Limitation.** The interface was not opened in a browser during this analysis.

### Reports

- There are 19 Plotly charts per child, covering diapers, feedings, sleep, tummy time, pumping, medication, weight, height, percentiles and temperature [CODE `reports/graphs/`].
- Daily sleep totals split sleep that crosses midnight between the two days, in the active time zone [CODE [sleep_totals.py L13-L45](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/reports/graphs/sleep_totals.py#L13-L45)].
- The day assigned to each record does not follow a single rule. The tummy time report groups by **start** date [CODE [tummytime_duration.py L21-L27](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/reports/graphs/tummytime_duration.py#L21-L27)], while the daily card groups by **end** date [CODE [cards.py L866-L879](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/dashboard/templatetags/cards.py#L866-L879)]. Lesson for Q-09: define a single rule to decide which day a record belongs to.

### API

- **Structure.** The REST API uses DRF, with limit/offset pagination (100 items), filters by child and date range, ordering and an OpenAPI schema versioned in the repository [CODE [base.py L346-L362](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L346-L362); `api/filters.py`; `openapi-schema.yml`]. Changes are only through PATCH, because PUT is not in the permission map [CODE [permissions.py L11](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/permissions.py#L11)].
- **API root.** The documentation says `/api` does not require authentication [DOC [api.md L6-L9](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/api.md#L6-L9)]. An audit question, not a demonstrated vulnerability: does the documentation still match the code?
- **Profile route.** `/api/profile` only exists without the trailing slash; with the slash, the response is 404 [CODE [api/urls.py L67](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/urls.py#L67)].
- **Dates and time zone.** The database stores dates in UTC (`USE_TZ=True`, `TIME_ZONE="UTC"`) [CODE [base.py L179-L181](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L179-L181)]. The user's time zone is activated by middleware that runs before DRF authentication, so it only applies to sessions [CODE [middleware.py L56-L73](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/middleware.py#L56-L73)]. With the same user, configured for the America/Sao_Paulo time zone [EXEC C-09, [log 04](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/04_fuso_sessao_vs_token.log)]:
  - **with a token**, dates came back in UTC (`Z`), and sleep at 16:30 local time was saved with `nap=false`;
  - **with a session**, dates came back in `-03:00`, and sleep at 15:00 was saved with `nap=true`;
  - **when the rule was recalculated for sleep at 16:30**, the result was `false` in UTC and `true` in São Paulo.
- **Webhooks.**
  - the event is saved in an outgoing table in the same transaction as the record (outbox);
  - each event has a `event_id` UUID, which lets the receiver discard repeats;
  - there are up to 5 attempts, with an exponentially increasing delay;
  - the signature is HMAC-SHA256 over the timestamp and body;
  - the body does not carry the record's content.

  [CODE [webhooks/models.py L61-L119](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/webhooks/models.py#L61-L119), [signals.py L35-L83](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/webhooks/signals.py#L35-L83), [delivery.py L124-L160](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/webhooks/delivery.py#L124-L160); DOC [webhooks.md L9-L31](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/configuration/webhooks.md#L9-L31)]
- **Caregiver API.** Creates caregiver accounts and returns the access key only once. There is no DELETE: access is removed with `is_active=false` or a date in `access_expires` [CODE [api/views.py L210-L252](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/views.py#L210-L252); [serializers.py L420-L479](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py#L420-L479)].

### Testes

- **Suite executed.** 528 tests passed in 67,5 s (`--parallel 4 --exclude-tag isolate`), and the isolated password reset test also passed [EXEC [log 05](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/05_testes.log)]. CI runs Python 3.10 through 3.14, plus lint through gulp [CODE [ci.yml L13-L23](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/.github/workflows/ci.yml#L13-L23)].
- **Relevant coverage.**
  - There are tests for timer ownership, conversion with a timer deleted or reassigned midway, and rollback [CODE [tests_entry_permissions.py L65-L247](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/tests/tests_entry_permissions.py#L65-L247)].
  - I found no test preventing someone who is not the owner from restarting another person's timer (search for "restart" in the tests) [CÓDIGO].
  - There is no test for isolation between families, because the family concept does not exist.
- **Not executed.** `gulp lint`, coverage measurement and front-end tests.

### Configuration and i18n

- **`.env` in parent directories.** `load_dotenv(find_dotenv())` walks up the directories until it finds a `.env` [CODE [base.py L25](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L25); [manage.py L9](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/manage.py#L9)]. To avoid this, a dummy `.env` was created inside the clone [EXEC log 01].
- **Languages.** There are 28, including pt-BR, selected per user [CODE [base.py L194-L223](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L194-L223); [middleware.py L26-L53](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/middleware.py#L26-L53)]. pt-BR has 506 strings: 469 translated, 37 empty and 70 marked as "fuzzy" (translation awaiting review). "Tummy Time" stays in English [EXEC [log 07](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/07_licencas.log); CODE [django.po L384-L385](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/locale/pt_BR/LC_MESSAGES/django.po#L384-L385)].
- **Import and export.** Available only in the admin, for those with staff access, one record type at a time, in CSV, XLSX and other formats. There is no export for an entire family or deletion of an account with its data [DOC [import-export.md L6-L40](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/import-export.md#L6-L40); CODE [core/admin.py L11-L58](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/admin.py#L11-L58)].

## Execução

Environment:

- Windows 11, git-bash;
- Python 3.12.10 in a venv inside the clone;
- disposable SQLite;
- `manage.py runserver` at 127.0.0.1:38231, with development settings (DEBUG=True);
- fictional data generated by `manage.py fake` (Faker) and four fictional users:
  - resp_a: default, superuser, America/Sao_Paulo time zone;
  - cuidadora_b: caregiver;
  - avo_c: read-only;
  - a fourth caregiver account.

| Time (22/10/2026, -03:00) | Stage | Main command | Result |
| --- | --- | --- | --- |
| 02:56 | Clone | `git clone https://github.com/babybuddy/babybuddy.git` | `master` at commit 09629cf [EXEC] |
| 03:01–03:05 | venv and dependencies | `py -3.12 -m venv .venv`; `.venv/Scripts/python.exe -m pip install -r requirements.txt` | 47 packages installed, exit 0 ([log 01](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/01_setup.log)) |
| 03:06–03:16 | Exploratory round | `migrate`, `fake`, user creation, `runserver`, request script | Discarded because of two errors in my script: the `/api/profile` route with a trailing slash and git-bash format paths (`/c/...`) passed to native curl. Showed the same behavior as the final round ([log 03b](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/03b_corrida_rodada_exploratoria.log)) |
| 03:17 | Blocker | `manage.py migrate` | Failed with `ValueError: No support for 'file'` in dj_database_url. Hermes's shell is shared, and another subagent had set `DATABASE_URL` for Prisma. Worked around with `env -u DATABASE_URL -u DB_* …` in each command, without changing the other agent's environment |
| 03:18 | New database | `migrate`; `fake --children 2 --days 5`; `setup_users.py` | OK: 2 children, 53 sleep records, 52 feedings, 108 diaper changes, 62 tummy time sessions ([log 02](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/02_migrate_fake.log)) |
| 03:19–03:21 | API | Custom script (curl) | Validations, timers and editing (codes B, C and D), plus access tests. Log 03 outside Git (D7) |
| 03:21 | Session × token | `session_tz.py` through `manage.py shell` | [log 04](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/04_fuso_sessao_vs_token.log) |
| 03:22–03:25 | Tests | `manage.py test --settings=babybuddy.settings.test --parallel 4 --exclude-tag isolate` | 528 tests OK; isolated test, 1 OK ([log 05](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/05_testes.log)) |
| 03:27 | Access without credentials | Custom script (curl) | Log 06 outside Git (D7) |
| 03:27 | Shutdown | kill of the runserver process | Port 38231 free, checked with netstat |
| 03:30–03:31 | Licenses and duplicate name | `dep_licenses.py`, `po_stats.py`, Client in `manage.py shell` | [log 07](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/07_licencas.log) and [log 08](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/08_nome_repetido.log) |

Precautions taken:

- Tokens stayed only in Hermes's scratch space; in the logs they appear as `<resp_a>` and equivalents.
- DEBUG mode error pages, which expose the process's environment variables, were reduced to a one-line summary before entering the vault.
- The scripts are copied in the `roteiros/` evidence subfolder, listed in the [Evidence README](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/README.md).
- No Docker container was created.
- Processes stopped: runserver PID 14520 (03:09–03:16), runserver PID 20108 (03:19–03:27) and the test suite (03:22–03:25).

## Licenses by material

| Material | License or status | Class | Use in AppMaternidade |
| --- | --- | --- | --- |
| Baby Buddy code (Python, JS, templates) | BSD-2-Clause | [CÓDIGO] LICENSE | Reuse allowed with a notice; recommendation: use only the concepts |
| Python dependencies | BSD-3-Clause: Django, DRF, django-imagekit, python-dotenv, django-storages, django-qr-code. BSD: django-filter, django-taggit, dj-database-url, pilkit, django-dbsettings, segno, django-import-export. MIT: plotly, whitenoise, gunicorn, Faker, django-axes, django-cors-headers, django-widget-tweaks, PyYAML, tablib, inflection, ipware. MIT-CMU: Pillow. Apache-2.0: boto3, tzdata. BSD-3-Clause OR Apache-2.0: uritemplate. LGPL with exceptions: psycopg2-binary | [EXEC] venv metadata (log 07) | Only relevant if the stack is Python; each has its own notices |
| Versioned front-end bundles (`static/babybuddy/js/vendor.js`, `graph.js`) | jQuery, Popper, Masonry, plotly.js and pulltorefreshjs minified without any license notice; `app.css` retains Bootstrap's MIT notice | [EXEC] log 07; library licenses not checked [HIP: MIT] | Do not copy the bundles; if a library is needed, obtain it from its source with the notices |
| Icons (fontello "babybuddy" font) | Font Awesome, MFG Labs and Entypo, under SIL OFL according to LICENSE.txt. The Font Awesome entry has no URL | [CÓDIGO] [fontello/LICENSE.txt L1-L30](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/static_src/fontello/LICENSE.txt#L1-L30) | Do not reuse the assembled font |
| Logo, "Baby Buddy" name, favicons, documentation screenshots and videos | No separate license; the name and logo function as a trademark | [CÓDIGO] (no specific license found); [HIP] treat as a trademark | Do not use |
| Translations (28 languages; pt-BR done through POEditor) | No specific terms; the repository's BSD-2 is presumed to apply | [HIP] | Do not copy; pt-BR is incomplete and has "fuzzy" strings |
| Weight and height percentiles (CSV) | Source not declared in the repository | [CÓDIGO] / [HIP] WHO | If needed, use the official source under its terms |
| Documentation text | In repository BSD-2, without a separate license | [HIP] | Do not copy |

## What to use as a concept

1. **Timer stored on the server, with duration calculated from the start time.** The screen recalculates elapsed time when focus returns; nothing depends on a continuously running counter (Q-08).
2. **Conversion of the timer to a record in a single transaction.** The timer is locked and deleted in the same operation, and there is a clear rule about who can perform the conversion.
3. **Domain rules in the model, reused by the API.** Nothing in the future, start before end, at most 24 h calculated in UTC, and no overlap for the same child and type, with each rule covered by tests. In AppMaternidade, offline, they become warnings, except "end before start" (Offline, section 8).
4. **Durations always in UTC, display in the user's time zone.** Sleep that crosses midnight is split between the two days in the totals.
5. **Revocation checked on every request.** The expiration date and account deactivation can be reversed. There is a temporary caregiver account with an expiration date.
6. **Ready-to-use caregiver roles.** The caregiver cannot delete records or access administrative data or growth measurements; there is also a read-only profile.
7. **Outgoing event queue (outbox).** The event is saved together with the data; a UUID allows repeats to be discarded; retries use exponential backoff; the message is signed and carries no sensitive content. It serves as a basis for notifications and synchronization (Q-06, Q-10).
8. **Quick recording.** Shortcuts to start a timer and record entries, prefilling from the last record and automatic child selection when there is only one.

## What can be reused under the license

- **What BSD-2-Clause requires.** It allows copying and adaptation under two conditions: redistributed source code must retain the copyright notice, list of conditions and warranty disclaimer; and, when the app is distributed in binary form, those same texts must appear in the documentation or other material accompanying the app. In a store app, this is usually a third-party licenses screen [CODE LICENSE]. The license does not authorize use of the name or logo.
- **Candidates, if the stack were Python/Django:**
  - `validate_duration` and `timezone_aware_duration`;
  - `validate_unique_period`;
  - the timer conversion logic;
  - the webhook outbox.

  Since the stack is still undecided and the authorization model needs to be different, the recommendation is to **not copy code** and rewrite the rules from this profile. Nothing was copied.
- **If any code is reused:**
  - record the source file, commit and permalink;
  - include the text of BSD-2 with the line "Copyright (c) 2017 - 2022, Baby Buddy's Contributors" in the repository and on the app's licenses screen.

## Required adaptations

- **Family and membership.** Create family and user–family membership entities, with a role and state (invited, active, revoked), and link each child to a family. Every query starts from the user's active membership. The server checks authorization on every write, including during synchronization.
- **Uniqueness and IDs.** Uniqueness applies within the family; no global slug derived from the name. Records made offline receive a UUID generated on the device.
- **Authorship and history.** Every record stores:
  - who created and who modified it;
  - the observed time and the time received by the server;
  - a version;
  - a soft-deletion marker (tombstone).
- **Idempotency.** Each user intent receives an operation identifier; a retry returns the original result (Q-02).
- **A dedicated timed session.**
  - Stores start, end and state (in progress, ended, discarded).
  - Records who started it, who ended it and through which device.
  - Ending is not the same as deleting.
  - Changing the start time of a session started by someone else requires a specific role and leaves a trace (Q-03).
- **Time zone.** Store the instant in UTC together with the record's offset or time zone. Define a single rule for the day (start, end or split) and for naps that does not depend on the access channel (token or session) (Q-09).
- **Attachments.** Private storage per family, short-lived signed URLs and random file names.
- **Invitations.** A single-use code with a short validity period, never the permanent token inside a QR.
- **Community.** Kept separate from the routine; Baby Buddy has nothing in this area.
- **Export and deletion by family,** outside the admin (Q-12).

## What not to reproduce

- A "default" profile with superuser powers and a `admin/admin` account created in `migrate`.
- Global queries and permission only by record type.
- A permanent token used as a device credential and placed inside a QR.
- Files served without checking authorization and with their original names.
- HTML inside API error messages.
- Stopping a timer by deleting it; allowing another person's timer to be restarted or modified with only change permission.
- Overlap that blocks recording and, under concurrency, fails without a clear warning (the race produced HTTP 500 in SQLite). In AppMaternidade, overlap produces a visible warning and does not block recording (Offline, section 8).
- A time zone that changes with the authentication type; different screens using different rules to decide the day.
- A global slug derived from the child's name.

## Risks and problems found

| # | Problem | Class | Impact if copied |
| --- | --- | --- | --- |
| R1 | There is no boundary between families: permission for each type applies to all children in the installation | [CÓDIGO][DOC] | Data leakage between families (Q-06) |
| R2 | No authorship or edit history | [EXEC D-01/D-02][DOC] | Impossible to know who recorded it; conflicts go unnoticed (Q-03, Q-04) |
| R3 | The ownership check does not cover changing the start time or restarting the timer (audit question) | [CÓDIGO] | Duration lost without warning |
| R4 | No idempotency | [EXEC C-10/C-11] | Duplicate records when submission is repeated (Q-02) |
| R5 | With DEBUG, files are served without checking permission; in production, it depends on the server (audit question) | [CÓDIGO][HIP] | Photo exposure (Q-06) |
| R6 | User time zone ignored with token access; naps classified by UTC time | [EXEC C-09, log 04] | Incorrect history for app or API users |
| R7 | HTTP 500 in three situations: timer filtering/ordering, a child with a duplicate name and "database is locked" in SQLite | [EXEC B-16/B-17, log 08, log 03b] | Lack of robustness |
| R8 | Superuser as the default profile; admin/admin account | [CÓDIGO] | Accidental grant of full privileges |
| R9 | Fixed token stored as text and displayed in a QR | [CÓDIGO][DOC] | Revocation requires deactivating or expiring the entire account; anyone who photographs the screen obtains the key [DOC [login-qr-code.md L86](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/login-qr-code.md#L86)] |
| R10 | Front-end bundles without license notices | [EXEC log 07] | Risk of license noncompliance if copied |
| R11 | `find_dotenv` searches for `.env` in parent directories | [CÓDIGO] | In a shared environment, it may accidentally load another project's configuration |

## Relationship to scenarios Q-01 through Q-12

| Scenario | What Baby Buddy shows | Class | Lesson for AppMaternidade |
| --- | --- | --- | --- |
| Q-01 record offline, close and reopen | There is no offline mode; only the timer persists, on the server | [CÓDIGO] | A persistent local queue with visible state will need to be designed from scratch |
| Q-02 retry | An instantaneous record is duplicated; a period returns 400 due to overlap | [EXEC C-02, C-10/C-11] | Device-generated operation ID and idempotent response |
| Q-03 A starts, B ends | B cannot end it without `delete_timer`; if B does, authorship is lost; the ownership check does not cover restarting | [CÓDIGO] | A session with "started by" and "ended by" and an explicit rule |
| Q-04 concurrent offline editing | The last PATCH wins, without a version or warning | [CÓDIGO][EXEC D-01] | Version per record and a visible conflict policy |
| Q-05 revocation with an offline device | Immediate revocation on every online request; there is no offline cache to revoke | [CÓDIGO] | Reevaluate operations on reconnection and set an expiration for the local cache |
| Q-06 IDs and attachments from another family | Without families, permission applies to the entire installation; with DEBUG, attachments are served without checking permission | [CÓDIGO] | Server-side authorization by membership, signed URL and access denial tests |
| Q-07 community | Does not exist | [CÓDIGO] | No reference here |
| Q-08 timer after suspension | Duration calculated from the stored start time; the screen corrects itself when focus returns | [CODE timer.js] | Same principle, with local and server state |
| Q-09 time zone and midnight | UTC in the database and durations; sleep split between days in totals; different day rules across screens; time zone depends on the channel | [CÓDIGO][EXEC C-01, C-09, log 04] | A single rule and time zone stored with the event |
| Q-10 notification denied or not received | There are no notifications; webhooks are a signed outgoing queue, without content | [CÓDIGO][DOC] | Recording and reconciliation cannot depend on notifications |
| Q-11 reporting, blocking and moderation | Does not exist | [CÓDIGO] | No reference |
| Q-12 export, delete, backup | Export by type in the admin (staff); no deletion by family; backup is the installation's entire database | [DOC import-export.md][CÓDIGO] | Export and deletion by family, including attachments |

## Open questions

1. Will AppMaternidade have a "temporary caregiver" role with an expiration date, like `access_expires`? Recommendation: yes, with expiration on the family membership, not the account.
2. Who can change the start time or end a session started by another caregiver? Proposal: any active caregiver can end it; changing the start time requires being the person who started it or having a responsible adult role; both actions record authorship.
3. Which day does a period that crosses midnight belong to: split between the two days, as in sleep totals, or assigned to the start day?
4. Should records before birth, or made during pregnancy, be accepted? Baby Buddy currently accepts them without warning.
5. How does concurrent timer conversion behave in PostgreSQL, where `select_for_update` takes effect? Not tested.
6. Do the companion mobile apps (iOS and Android), maintained in separate repositories, have any offline mode? They were not analyzed.

## Limits of this analysis

- **Environment.** Execution was local only, with SQLite, development settings (DEBUG=True) and `runserver`.
- **Not tested.** Gunicorn, PostgreSQL, S3, DEBUG=False, reverse proxy, webhook delivery, import/export through the admin and the browser interface. Session access was exercised with `django.test.Client`.
- **Front-end licenses.** Library licenses were inferred, not checked, because `node_modules` was not installed.
- **Validity.** Code findings apply to commit `09629cf`; the project is active and may change.
- **Nature of the findings.** No security audit was performed. The risk points are design observations for AppMaternidade, not a Baby Buddy vulnerability report. The absence of families appears to be a project premise, one installation per household [HIP], consistent with the warning "A caregiver has access to every child on the instance" [DOC managing-users.md L71-L76].
