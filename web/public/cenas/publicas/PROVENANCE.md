# PROVENANCE of the composed scenes of the public pages (11/11/2026)

| file | source | model | date | prompt id |
|---|---|---|---|---|
| como-funciona@1x.webp, como-funciona@2x.webp | `brutos/S2_unico_mel.png` (sha256 e3557a14de3efbd2e00c619cfecf94dd9f5493d3670a8d4ad859ca7a435b8f94), green-key scene composited by `DIRECOES_20261111/ferramentas/compor.py` with one real capture of this site at 390x844, scale 2 (`/como-funciona` scrolled 1100 px) | Codex image_gen (ChatGPT plan) for the scene; the screen is our own capture | 2026-11-11 | S2_unico_mel |
| desenvolvimento@1x.webp, desenvolvimento@2x.webp | `brutos/S3_tablets_cacau.png` (sha256 8d72fa3432647217545f9387bacfa310ce167c7592ec6a1554ed6521ea3d261d), same compositor with two real captures of this site at 390x844, scale 2 (`/desenvolvimento` scrolled 1100 px and 2600 px) | Codex image_gen (ChatGPT plan) for the scene; the screens are our own captures | 2026-11-11 | S3_tablets_cacau |

Output sha256: `como-funciona@1x.webp` 26ac2d4cd38c7f3b753abcfc2ec20fc96121ae5ffc0d11b8afbad83b212983e7, `como-funciona@2x.webp` 080f5022d36bbb0f3ce7bd3e5c238601ac959af970c354d652333c01947ee19a, `desenvolvimento@1x.webp` 0df7d94fc5bb0c3aef7ae8e9542dfdbf80b20fd145b57acc30c53f49ab9b383c, `desenvolvimento@2x.webp` b1c092365c2098579c7101b11ed9f405cb82d9d2403f447d784f2b7f934d9db9. `compor.py` reported `verde_restante: 0` for both. The captures carry no "Protótipo" or "dados de exemplo" text (checked on the visible DOM text of each capture). The files keep these fixed names; card MAT-49d recomposes them later with the new app screens, with no code change.

## Recomposed by MAT-49d (2026-11-11)

Same scene sources and compositor (`compor.py`, `verde_restante: 0`); the screens are now window captures (not full-page) of the new app screens, deviceScaleFactor 2, reduced motion, from the MAT-49d worktree on base a8cad7d. Each capture height matches the aspect of its green screen, so the top of the screen is shown with no crop distortion. No "Protótipo" or "dados de exemplo" in the visible text of any capture.

- como-funciona@1x.webp: scene `brutos/S2_unico_mel.png`; captures: Hoje (day) 390x1013; 2026-11-11; sha256 df97cd2ad79ebc160ec6a07bc6c19f7ab91276fc97d2a354e2fd586d607e8da4
- como-funciona@2x.webp: scene `brutos/S2_unico_mel.png`; captures: Hoje (day) 390x1013; 2026-11-11; sha256 21a8ac7792bbbe038567711407952b89ea35eaad5f2be69e8819a6292fa88d1b
- desenvolvimento@1x.webp: scene `brutos/S4_celular_linho.png`; captures: Sessão (day) 390x850; one-device fallback, no tablet overlap; 2026-11-11; sha256 039718906c68c1356ca178051da38898b1fda0e2f24d749e4fc34a40615c3cd1
- desenvolvimento@2x.webp: scene `brutos/S4_celular_linho.png`; captures: Sessão (day) 390x850; one-device fallback, no tablet overlap; 2026-11-11; sha256 6c097b1ec9194e684e39ccee43cff831a5d800eb749910f4e81fc09a226e1c24

## Recomposed by POL-DES (2026-11-11)

Same scene sources and compositor (`compor.py`, `verde_restante: 0` for both). The screens are window captures 390 px wide, deviceScaleFactor 2 (780 px wide, at least as wide as the green key: 299 px for S2 and 594 px for S4 in the @2x output), reduced motion, demo notices hidden, from the POL-DES worktree on base e731af5. No "Protótipo" or "dados de exemplo" in the visible text of either capture (checked on the DOM text).

- como-funciona@1x.webp, como-funciona@2x.webp: scene `brutos/S2_unico_mel.png`; capture: Sessão (day, big timer, little small text) 390x1013, sha256 3f424a860c7a2ee9a210e621058a53103dff4215c72ceba181ce4cb2e721e65b; output sha256 @1x 9f0106d86fbecfca1442a26f9b2b8e97ae11525e412aec088c38658a8e82ff89, @2x 05f36ff3bc1f28ceec7e5bce6a046d45399ad256021d41f2afc4eee9cb62c805; 2026-11-11; prompt id S2_unico_mel
- desenvolvimento@1x.webp, desenvolvimento@2x.webp: scene `brutos/S4_celular_linho.png`; capture: tummy time session screen (`/app/sessao` after starting tummy time in Hoje) 390x850, sha256 ee0e7c2115b99bd323432317781e0c5872e96ccdfa51e92d27cdfe61d6d76bdb; output sha256 @1x 87cee3ba8758acd0dda3b8c25d94dc64cbedb77f80df77d7b9dcf48997bfd351, @2x a54d1a3d55644002ab2e3c3c9998aba5a4f70f09e09e8e77b005e903abe50153; 2026-11-11; prompt id S4_celular_linho

## Recomposed by POL-DES v2 (2026-11-12)

Same scene sources and compositor (`compor.py`, `verde_restante: 0` for both), base 93517e4. The screens are window captures 390 px wide at deviceScaleFactor 3 (1170 px wide, more than 1.3 times the green key box: 311 px for S2 and 598 px for S4 in the master), reduced motion, demo notices hidden, with a fictional demonstration login. No "Protótipo" or "dados de exemplo" in the visible text of either capture. The master (1024x1536 and 1536x1024) is cut to the object so the device fills the panel; `@2x` is the cut, `@1x` is the cut halved.

- como-funciona@1x.webp, como-funciona@2x.webp: scene `brutos/S2_unico_mel.png` (sha256 e3557a14de3efbd2e00c619cfecf94dd9f5493d3670a8d4ad859ca7a435b8f94); capture: Sessão with the feeding timer at 07:26, 1170x2607, sha256 13c2edcf29e6ae862bfb7efd3972e4a884e629222f7099c6409538b0eed9aef3; cut 680x1050 (@2x), 340x525 (@1x); output sha256 @1x 0db64296109f26f0a90a6d736152178395c675a027d37df22be1d9eab0707835, @2x 98863d7d37b578a3ca64261a745acbe4b411f3150b5779c04d85d962762d92bc; 2026-11-12; prompt id S2_unico_mel
- desenvolvimento@1x.webp, desenvolvimento@2x.webp: scene `brutos/S4_celular_linho.png` (sha256 569aeaa94ec46e63c08640f4476cb12da6ff93e133c822c870fdf76691844b60); capture: tummy time session with the timer at 04:26, 1170x2550, sha256 f843c3a4737d709c49e723bd52d006066ad4e4716577346e18bc9fd0d979b621; cut 800x880 (@2x), 400x440 (@1x); output sha256 @1x 73af535da4e34dde471ae4319da679b4c91c12189d35f41d9ea14ab911be116f, @2x a0948d49f9dd1aa34336574e8da217ef035addbf5db09ed49c08282426a48bbb; 2026-11-12; prompt id S4_celular_linho
